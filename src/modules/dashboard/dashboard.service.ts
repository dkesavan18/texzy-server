import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Deal,
  Need,
  NeedResponse,
  OrderItem,
  Product,
  Profile,
} from '../../database/entities';
import { ORDER_ITEM_STATUS, ORDER_STATUS } from '../orders/constants/order-status.constant';
import { PRODUCT_STATUS } from '../products/constants/product-status.constant';
import {
  DASHBOARD_INTERVAL,
  DASHBOARD_METRICS,
  type DashboardIntervalValue,
} from './constants/dashboard.constant';
import { parseMetrics } from './dto/dashboard-query.dto';

type DateRange = { from?: Date; toExclusive?: Date };

/**
 * Aggregation-only dashboard service. Every KPI is a COUNT/SUM — never loads full
 * entity graphs — so the dashboard stays cheap as the catalogue/orders grow.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Profile)
    private readonly profilesRepository: Repository<Profile>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Need)
    private readonly needsRepository: Repository<Need>,
    @InjectRepository(NeedResponse)
    private readonly needResponsesRepository: Repository<NeedResponse>,
    @InjectRepository(Deal)
    private readonly dealsRepository: Repository<Deal>,
  ) {}

  async getDashboard(
    userId: string,
    query: {
      metrics?: string;
      from?: string;
      to?: string;
      interval?: string;
      status?: string;
    },
  ) {
    const metrics = parseMetrics(query.metrics);
    const range = this.parseRange(query.from, query.to);
    const interval = (query.interval ?? DASHBOARD_INTERVAL.MONTH) as DashboardIntervalValue;
    const fulfillmentStatus = query.status?.trim() || undefined;

    // Run only the requested aggregations in parallel — keeps latency flat as more
    // chart drill-downs are added later (pass metrics=ordersSeries for a single chart).
    const tasks: Promise<[string, unknown]>[] = [];

    if (metrics.includes(DASHBOARD_METRICS.PRODUCTS)) {
      tasks.push(this.productsMetrics(userId).then((data) => [DASHBOARD_METRICS.PRODUCTS, data]));
    }
    if (metrics.includes(DASHBOARD_METRICS.VIEWS)) {
      tasks.push(this.viewsMetrics(userId).then((data) => [DASHBOARD_METRICS.VIEWS, data]));
    }
    if (metrics.includes(DASHBOARD_METRICS.ORDERS)) {
      tasks.push(
        this.ordersMetrics(userId, range, fulfillmentStatus).then((data) => [
          DASHBOARD_METRICS.ORDERS,
          data,
        ]),
      );
    }
    if (metrics.includes(DASHBOARD_METRICS.RESPONSE_RATE)) {
      tasks.push(
        this.responseRateMetrics(userId).then((data) => [
          DASHBOARD_METRICS.RESPONSE_RATE,
          data,
        ]),
      );
    }
    if (metrics.includes(DASHBOARD_METRICS.ORDERS_SERIES)) {
      tasks.push(
        this.ordersSeries(userId, range, interval, fulfillmentStatus).then((data) => [
          DASHBOARD_METRICS.ORDERS_SERIES,
          data,
        ]),
      );
    }

    const settled = await Promise.all(tasks);
    const payload: Record<string, unknown> = {
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        interval,
        status: fulfillmentStatus ?? null,
        metrics,
      },
    };
    for (const [key, data] of settled) {
      payload[key] = data;
    }

    // Analytics is derived from the KPI aggregates — reuse already-fetched metrics when
    // present so requesting the full dashboard never doubles the SQL work.
    if (metrics.includes(DASHBOARD_METRICS.ANALYTICS)) {
      const products =
        (payload[DASHBOARD_METRICS.PRODUCTS] as Awaited<
          ReturnType<DashboardService['productsMetrics']>
        >) ?? (await this.productsMetrics(userId));
      const views =
        (payload[DASHBOARD_METRICS.VIEWS] as Awaited<
          ReturnType<DashboardService['viewsMetrics']>
        >) ?? (await this.viewsMetrics(userId));
      const orders =
        (payload[DASHBOARD_METRICS.ORDERS] as Awaited<
          ReturnType<DashboardService['ordersMetrics']>
        >) ?? (await this.ordersMetrics(userId, range, fulfillmentStatus));
      const responseRate =
        (payload[DASHBOARD_METRICS.RESPONSE_RATE] as Awaited<
          ReturnType<DashboardService['responseRateMetrics']>
        >) ?? (await this.responseRateMetrics(userId));
      payload[DASHBOARD_METRICS.ANALYTICS] = await this.buildAnalytics(
        userId,
        products,
        views,
        orders,
        responseRate,
      );
    }

    return payload;
  }

  private async productsMetrics(userId: string) {
    const rows = await this.productsRepository
      .createQueryBuilder('product')
      .select('product.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .where('product.user_id = :userId', { userId })
      .andWhere('product.is_active = true')
      .groupBy('product.status')
      .getRawMany<{ status: string; count: string }>();

    let active = 0;
    let draft = 0;
    for (const row of rows) {
      const count = Number(row.count) || 0;
      if (row.status === PRODUCT_STATUS.ACTIVE) active = count;
      else if (row.status === PRODUCT_STATUS.DRAFT) draft = count;
    }
    return { total: active + draft, active, draft };
  }

  private async viewsMetrics(userId: string) {
    // Raw SQL avoids TypeORM alias/property remapping quirks inside SUM().
    const [productRows, profileRows] = await Promise.all([
      this.productsRepository.query(
        `SELECT COALESCE(SUM(total_views), 0)::int AS "productViews"
         FROM products
         WHERE user_id = $1 AND is_active = true`,
        [userId],
      ) as Promise<Array<{ productViews: number | string }>>,
      this.profilesRepository.query(
        `SELECT COALESCE(SUM(total_views), 0)::int AS "profileViews"
         FROM profiles
         WHERE user_id = $1`,
        [userId],
      ) as Promise<Array<{ profileViews: number | string }>>,
    ]);

    return {
      productViews: Number(productRows[0]?.productViews) || 0,
      profileViews: Number(profileRows[0]?.profileViews) || 0,
    };
  }

  private sellerOrderItemsBase(userId: string, range: DateRange, status?: string) {
    const qb = this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.product', 'product')
      .innerJoin('item.order', 'ord')
      .where('product.user_id = :userId', { userId })
      .andWhere('ord.status = :confirmed', { confirmed: ORDER_STATUS.CONFIRMED });

    if (status) {
      qb.andWhere('item.fulfillment_status = :status', { status });
    }
    if (range.from) {
      qb.andWhere('item.created_at >= :from', { from: range.from });
    }
    if (range.toExclusive) {
      qb.andWhere('item.created_at < :toExclusive', {
        toExclusive: range.toExclusive,
      });
    }
    return qb;
  }

  private async ordersMetrics(userId: string, range: DateRange, status?: string) {
    const row = await this.sellerOrderItemsBase(userId, range, status)
      .select('COUNT(item.order_item_id)::int', 'itemCount')
      .addSelect('COUNT(DISTINCT item.order_id)::int', 'orderCount')
      .addSelect('COALESCE(SUM(item.total_price), 0)', 'revenue')
      .getRawOne<{ itemCount: string; orderCount: string; revenue: string }>();

    const pending = await this.sellerOrderItemsBase(userId, range)
      .andWhere('item.fulfillment_status = :pending', {
        pending: ORDER_ITEM_STATUS.PENDING,
      })
      .select('COUNT(item.order_item_id)::int', 'pendingCount')
      .getRawOne<{ pendingCount: string }>();

    const delivered = await this.sellerOrderItemsBase(userId, range)
      .andWhere('item.fulfillment_status = :delivered', {
        delivered: ORDER_ITEM_STATUS.DELIVERED,
      })
      .select('COUNT(item.order_item_id)::int', 'deliveredCount')
      .getRawOne<{ deliveredCount: string }>();

    return {
      orderCount: Number(row?.orderCount) || 0,
      itemCount: Number(row?.itemCount) || 0,
      pendingCount: Number(pending?.pendingCount) || 0,
      deliveredCount: Number(delivered?.deliveredCount) || 0,
      revenue: Math.round((Number(row?.revenue) || 0) * 100) / 100,
    };
  }

  private async responseRateMetrics(userId: string) {
    const [needsRow, responsesGivenRow] = await Promise.all([
      this.needsRepository
        .createQueryBuilder('need')
        .select('COUNT(*)::int', 'needCount')
        .addSelect('COALESCE(SUM(need.total_responses), 0)::int', 'responsesReceived')
        .addSelect(
          'COUNT(*) FILTER (WHERE COALESCE(need.total_responses, 0) > 0)::int',
          'needsWithResponse',
        )
        .where('need.user_id = :userId', { userId })
        .andWhere('need.is_active = true')
        .getRawOne<{
          needCount: string;
          responsesReceived: string;
          needsWithResponse: string;
        }>(),
      this.needResponsesRepository
        .createQueryBuilder('response')
        .select('COUNT(*)::int', 'responsesGiven')
        .where('response.reponsed_by = :userId', { userId })
        .andWhere('response.is_active = true')
        .getRawOne<{ responsesGiven: string }>(),
    ]);

    const needCount = Number(needsRow?.needCount) || 0;
    const needsWithResponse = Number(needsRow?.needsWithResponse) || 0;
    const responsesReceived = Number(needsRow?.responsesReceived) || 0;
    const responsesGiven = Number(responsesGivenRow?.responsesGiven) || 0;

    // Share of my requests that received at least one reply (0–100).
    const ratePercent =
      needCount > 0
        ? Math.round((needsWithResponse / needCount) * 1000) / 10
        : 0;

    return {
      needCount,
      needsWithResponse,
      responsesReceived,
      responsesGiven,
      ratePercent,
    };
  }

  private async ordersSeries(
    userId: string,
    range: DateRange,
    interval: DashboardIntervalValue,
    status?: string,
  ) {
    const trunc =
      interval === DASHBOARD_INTERVAL.DAY
        ? 'day'
        : interval === DASHBOARD_INTERVAL.WEEK
          ? 'week'
          : 'month';

    const qb = this.sellerOrderItemsBase(userId, range, status)
      .select(`date_trunc('${trunc}', item.created_at)`, 'bucket')
      .addSelect('COUNT(item.order_item_id)::int', 'itemCount')
      .addSelect('COUNT(DISTINCT item.order_id)::int', 'orderCount')
      .addSelect('COALESCE(SUM(item.total_price), 0)', 'revenue')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    // Default window: last 12 months when no from/to provided — keeps chart bounded.
    if (!range.from && !range.toExclusive) {
      const from = new Date();
      from.setUTCDate(1);
      from.setUTCHours(0, 0, 0, 0);
      from.setUTCMonth(from.getUTCMonth() - 11);
      qb.andWhere('item.created_at >= :defaultFrom', { defaultFrom: from });
    }

    const rows = await qb.getRawMany<{
      bucket: Date | string;
      itemCount: string;
      orderCount: string;
      revenue: string;
    }>();

    return {
      interval,
      points: rows.map((row) => {
        const date =
          row.bucket instanceof Date ? row.bucket : new Date(row.bucket);
        return {
          bucket: date.toISOString(),
          label: this.formatBucketLabel(date, interval),
          orderCount: Number(row.orderCount) || 0,
          itemCount: Number(row.itemCount) || 0,
          revenue: Math.round((Number(row.revenue) || 0) * 100) / 100,
        };
      }),
    };
  }

  private async buildAnalytics(
    userId: string,
    products: Awaited<ReturnType<DashboardService['productsMetrics']>>,
    views: Awaited<ReturnType<DashboardService['viewsMetrics']>>,
    orders: Awaited<ReturnType<DashboardService['ordersMetrics']>>,
    responseRate: Awaited<ReturnType<DashboardService['responseRateMetrics']>>,
  ) {
    const bulkDeals = await this.dealsRepository
      .createQueryBuilder('deal')
      .select('COUNT(*)::int', 'dealCount')
      .where(
        '(deal.buyer_user_id = :userId OR deal.seller_user_id = :userId)',
        { userId },
      )
      .getRawOne<{ dealCount: string }>();

    const conversionRate =
      views.productViews > 0
        ? Math.round((orders.itemCount / views.productViews) * 1000) / 10
        : 0;

    return {
      conversionRate,
      avgOrderValue:
        orders.orderCount > 0
          ? Math.round((orders.revenue / orders.orderCount) * 100) / 100
          : 0,
      fulfillmentRate:
        orders.itemCount > 0
          ? Math.round((orders.deliveredCount / orders.itemCount) * 1000) / 10
          : 0,
      bulkDealCount: Number(bulkDeals?.dealCount) || 0,
      snapshot: {
        products: products.total,
        productViews: views.productViews,
        profileViews: views.profileViews,
        orders: orders.orderCount,
        revenue: orders.revenue,
        responseRate: responseRate.ratePercent,
      },
    };
  }

  private parseRange(from?: string, to?: string): DateRange {
    const range: DateRange = {};
    if (from) {
      range.from = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      // Exclusive upper bound = next day at 00:00 UTC so "to" is inclusive of that calendar day.
      const end = new Date(`${to}T00:00:00.000Z`);
      end.setUTCDate(end.getUTCDate() + 1);
      range.toExclusive = end;
    }
    return range;
  }

  private formatBucketLabel(date: Date, interval: DashboardIntervalValue): string {
    if (interval === DASHBOARD_INTERVAL.DAY) {
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      });
    }
    if (interval === DASHBOARD_INTERVAL.WEEK) {
      return `Week of ${date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
      })}`;
    }
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  }
}
