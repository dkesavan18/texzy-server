import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import { RazorpayService } from '../../common/payments/razorpay.service';
import {
  Order,
  OrderItem,
  OrderItemStatus,
  Payment,
  Product,
} from '../../database/entities';
import { AddressesService } from '../addresses/addresses.service';
import { CartService } from '../cart/cart.service';
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
  type NotificationTypeValue,
} from '../notifications/constants/notification-type.constant';
import { NotificationsService } from '../notifications/notifications.service';
import { PRODUCT_STATUS } from '../products/constants/product-status.constant';
import {
  ORDER_ITEM_ALLOWED_TRANSITIONS,
  ORDER_ITEM_STATUS,
  ORDER_SOURCE,
  ORDER_STATUS,
  PAYMENT_RECORD_STATUS,
  PAYMENT_STATUS,
  type OrderItemStatusValue,
  type OrderSourceValue,
} from './constants/order-status.constant';
import { BuyNowDto } from './dto/buy-now.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { UpdateOrderItemStatusDto } from './dto/update-order-item-status.dto';

const CUSTOMER_ORDER_RELATIONS = {
  items: { product: { media: true }, variant: true, statusHistory: true },
  payments: true,
} as const;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(OrderItemStatus)
    private readonly orderItemStatusRepository: Repository<OrderItemStatus>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly razorpayService: RazorpayService,
    private readonly cartService: CartService,
    private readonly notificationsService: NotificationsService,
    private readonly addressesService: AddressesService,
  ) {}

  /**
   * Buy Now / Checkout accept either a saved `addressId` or a raw `shippingAddress` object —
   * exactly one must be provided. A saved address is only ever read here, never mutated;
   * orders always snapshot the resolved fields onto `orders.shipping_address`.
   */
  private async resolveShippingAddress(
    userId: string,
    addressId: string | undefined,
    shippingAddress: Record<string, unknown> | undefined,
  ): Promise<Record<string, unknown>> {
    if (addressId) {
      const address = await this.addressesService.requireOwned(userId, addressId);
      return {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
      };
    }
    if (shippingAddress) {
      return shippingAddress;
    }
    throw new BadRequestException(
      'Provide either a saved addressId or a shippingAddress',
    );
  }

  private static readonly ITEM_STATUS_NOTIFICATION: Partial<
    Record<OrderItemStatusValue, { type: NotificationTypeValue; label: string }>
  > = {
    packed: {
      type: NOTIFICATION_TYPE.ORDER_CONFIRMED,
      label: 'confirmed and packed',
    },
    shipped: { type: NOTIFICATION_TYPE.ORDER_SHIPPED, label: 'shipped' },
    out_for_delivery: {
      type: NOTIFICATION_TYPE.ORDER_SHIPPED,
      label: 'out for delivery',
    },
    delivered: { type: NOTIFICATION_TYPE.ORDER_DELIVERED, label: 'delivered' },
    cancelled: { type: NOTIFICATION_TYPE.ORDER_CANCELLED, label: 'cancelled' },
    return_approved: {
      type: NOTIFICATION_TYPE.ORDER_RETURN_UPDATE,
      label: 'return approved',
    },
    return_rejected: {
      type: NOTIFICATION_TYPE.ORDER_RETURN_UPDATE,
      label: 'return declined',
    },
    returned: {
      type: NOTIFICATION_TYPE.ORDER_RETURN_UPDATE,
      label: 'returned — refund on the way',
    },
  };

  /**
   * Buy Now — validates the product server-side (status, stock, price), creates the Texzy
   * order + order item, then creates the matching Razorpay order. Nothing here trusts price
   * or quantity assumptions from the client beyond the requested quantity.
   */
  async buyNow(userId: string, dto: BuyNowDto) {
    const quantity = dto.quantity ?? 1;

    const product = await this.productsRepository.findOne({
      where: { productId: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }
    if (product.isActive === false) {
      throw new BadRequestException('This product is no longer available');
    }
    if (product.status !== PRODUCT_STATUS.ACTIVE) {
      throw new BadRequestException(
        'This product is not available for purchase',
      );
    }
    if (product.quantity != null && product.quantity < quantity) {
      throw new BadRequestException(
        `Only ${product.quantity} unit(s) left in stock`,
      );
    }
    if (product.price == null || product.price <= 0) {
      throw new BadRequestException('This product does not have a valid price');
    }

    // Price is always taken from the DB row above — the client only supplies productId/quantity.
    const unitPrice = product.price;
    const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

    const shippingAddress = await this.resolveShippingAddress(
      userId,
      dto.addressId,
      dto.shippingAddress as unknown as Record<string, unknown> | undefined,
    );

    return this.createOrderWithItems(
      userId,
      shippingAddress,
      [
        {
          productId: product.productId,
          productVariantId: null,
          sellerUserId: product.userId,
          quantity,
          unitPrice,
          productName: product.productName,
        },
      ],
      totalPrice,
      ORDER_SOURCE.BUY_NOW,
    );
  }

  /**
   * Cart -> Checkout — buys every item currently in the caller's cart in one order.
   * Each cart line is re-validated (stock, active status, live price) exactly like buy-now;
   * nothing about price/availability is trusted from the cart snapshot.
   *
   * The cart is deliberately NOT cleared here: nothing is "consumed" until the Razorpay
   * payment actually succeeds (mirrors buy-now, which never touches the product either
   * until payment is verified). The client clears the cart itself right after a successful
   * payment; see `PaymentsService.confirmOrderAndReduceStock` for the server-side safety net.
   */
  async checkout(userId: string, dto: CheckoutDto) {
    const items = await this.cartService.getValidatedItemsForCheckout(userId);
    const totalAmount =
      Math.round(
        items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) *
          100,
      ) / 100;

    const shippingAddress = await this.resolveShippingAddress(
      userId,
      dto.addressId,
      dto.shippingAddress as unknown as Record<string, unknown> | undefined,
    );

    return this.createOrderWithItems(
      userId,
      shippingAddress,
      items,
      totalAmount,
      ORDER_SOURCE.CART,
    );
  }

  private async createOrderWithItems(
    userId: string,
    shippingAddress: Record<string, unknown>,
    items: {
      productId: string;
      productVariantId: string | null;
      sellerUserId: string | null;
      quantity: number;
      unitPrice: number;
      productName: string | null;
    }[],
    totalAmount: number,
    source: OrderSourceValue,
  ) {
    const now = new Date();

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        userId,
        orderNumber: this.generateOrderNumber(),
        totalAmount,
        currency: 'INR',
        status: ORDER_STATUS.CREATED,
        source,
        paymentStatus: PAYMENT_STATUS.PENDING,
        shippingAddress: { ...shippingAddress },
        createdAt: now,
        updatedAt: now,
      }),
    );

    for (const item of items) {
      const totalPrice = Math.round(item.unitPrice * item.quantity * 100) / 100;
      const savedItem = await this.orderItemsRepository.save(
        this.orderItemsRepository.create({
          orderId: order.orderId,
          productId: item.productId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          fulfillmentStatus: ORDER_ITEM_STATUS.PENDING,
          createdAt: now,
        }),
      );
      await this.orderItemStatusRepository.save(
        this.orderItemStatusRepository.create({
          orderItemId: savedItem.orderItemId,
          status: ORDER_ITEM_STATUS.PENDING,
          createdAt: now,
        }),
      );
    }

    let razorpayOrder;
    try {
      razorpayOrder = await this.razorpayService.createOrder({
        amountInRupees: totalAmount,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.orderId, userId },
      });
    } catch (error) {
      order.status = ORDER_STATUS.FAILED;
      order.updatedAt = new Date();
      await this.ordersRepository.save(order);
      this.logger.error(
        `Failed to create Razorpay order for Texzy order ${order.orderId}`,
        error as Error,
      );
      throw error;
    }

    const payment = await this.paymentsRepository.save(
      this.paymentsRepository.create({
        orderId: order.orderId,
        userId,
        razorpayOrderId: razorpayOrder.razorpayOrderId,
        amount: totalAmount,
        currency: 'INR',
        status: PAYMENT_RECORD_STATUS.CREATED,
        createdAt: now,
        updatedAt: now,
      }),
    );

    return {
      order: this.toOrderResponse(order),
      payment: { paymentId: payment.paymentId, status: payment.status },
      razorpay: {
        keyId: this.razorpayService.getPublicKeyId(),
        orderId: razorpayOrder.razorpayOrderId,
        amount: razorpayOrder.amountInPaise,
        currency: razorpayOrder.currency,
      },
    };
  }

  async findAllByUser(userId: string, take = 50) {
    const orders = await this.ordersRepository.find({
      where: { userId },
      take,
      order: { orderId: 'DESC' },
      relations: CUSTOMER_ORDER_RELATIONS,
    });
    return orders.map((order) => this.toOrderResponse(order));
  }

  async findOneMine(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { orderId },
      relations: CUSTOMER_ORDER_RELATIONS,
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }
    return this.toOrderResponse(order);
  }

  /**
   * Buyer requests a return on a delivered item. Only the buyer who placed the order may
   * do this, and only while the item is currently 'delivered' — approving/rejecting the
   * request afterwards is a seller action via the existing `updateItemStatus` endpoint
   * (return_requested -> return_approved | return_rejected -> returned).
   */
  async requestReturn(
    userId: string,
    orderItemId: string,
    dto: CreateReturnRequestDto,
  ) {
    const item = await this.orderItemsRepository.findOne({
      where: { orderItemId },
      relations: {
        order: true,
        product: { media: true },
        variant: true,
        statusHistory: true,
      },
    });
    if (!item) {
      throw new NotFoundException(`Order item ${orderItemId} not found`);
    }
    if (item.order?.userId !== userId) {
      throw new ForbiddenException(
        'You can only request a return on your own order items',
      );
    }
    if (item.fulfillmentStatus !== ORDER_ITEM_STATUS.DELIVERED) {
      throw new BadRequestException(
        'Only delivered items can be returned',
      );
    }

    const now = new Date();
    item.fulfillmentStatus = ORDER_ITEM_STATUS.RETURN_REQUESTED;
    item.returnReason = dto.reason;
    item.returnNote = dto.note ?? null;
    item.updatedAt = now;
    await this.orderItemsRepository.save(item);
    await this.orderItemStatusRepository.save(
      this.orderItemStatusRepository.create({
        orderItemId: item.orderItemId,
        status: ORDER_ITEM_STATUS.RETURN_REQUESTED,
        note: dto.note ?? null,
        changedBy: userId,
        createdAt: now,
      }),
    );

    if (item.product?.userId) {
      void this.notificationsService.notify({
        userId: item.product.userId,
        type: NOTIFICATION_TYPE.ORDER_RETURN_UPDATE,
        title: 'Return requested',
        message: `A buyer requested a return for order #${item.order.orderNumber ?? item.orderId}.`,
        referenceId: item.orderItemId,
        referenceType: NOTIFICATION_REFERENCE_TYPE.ORDER_ITEM,
        data: { link: `/catalogues/orders/${item.orderItemId}` },
      });
    }

    const refreshed = await this.orderItemsRepository.findOne({
      where: { orderItemId },
      relations: {
        order: true,
        product: { media: true },
        variant: true,
        statusHistory: true,
      },
    });
    return refreshed ?? item;
  }

  // ---------------------------------------------------------------------
  // Seller order management — "Orders received"
  // ---------------------------------------------------------------------

  /**
   * Items across all orders where this seller owns the product — only from paid/confirmed
   * orders (an unpaid or failed order never reaches the seller's queue). Ownership is
   * `products.user_id` only, matching the rest of this schema.
   */
  async findSellerItems(
    sellerUserId: string,
    status?: OrderItemStatusValue,
    take = 100,
  ) {
    const query = this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.product', 'product')
      .innerJoinAndSelect('item.order', 'order')
      .leftJoinAndSelect('item.variant', 'variant')
      .leftJoinAndSelect('item.statusHistory', 'statusHistory')
      .addSelect(['product.productId', 'product.productName', 'product.userId'])
      .leftJoin('order.user', 'buyer')
      .addSelect(['buyer.userId', 'buyer.email', 'buyer.phone'])
      .leftJoinAndSelect('product.media', 'media')
      .where('product.user_id = :sellerUserId', { sellerUserId })
      .andWhere('order.status = :confirmed', {
        confirmed: ORDER_STATUS.CONFIRMED,
      })
      .orderBy('item.orderItemId', 'DESC')
      .take(take);

    if (status) {
      query.andWhere('item.fulfillment_status = :status', { status });
    }

    return query.getMany();
  }

  async findSellerItem(sellerUserId: string, orderItemId: string) {
    const item = await this.orderItemsRepository.findOne({
      where: { orderItemId },
      relations: {
        order: { user: true },
        product: { media: true },
        variant: true,
        statusHistory: true,
      },
    });
    if (!item) {
      throw new NotFoundException(`Order item ${orderItemId} not found`);
    }
    if (item.product?.userId !== sellerUserId) {
      throw new ForbiddenException('You can only view your own order items');
    }
    return item;
  }

  /**
   * Seller updates the fulfillment status of one item (packed/shipped/out for delivery/
   * delivered/cancelled). A delivery confirmation photo is required to mark an item delivered
   * — sellers own delivery/product photo capture end-to-end, per product requirements.
   */
  async updateItemStatus(
    sellerUserId: string,
    orderItemId: string,
    dto: UpdateOrderItemStatusDto,
  ) {
    const item = await this.findSellerItem(sellerUserId, orderItemId);
    const currentStatus = item.fulfillmentStatus as OrderItemStatusValue;
    const allowed = ORDER_ITEM_ALLOWED_TRANSITIONS[currentStatus] ?? [];

    if (currentStatus === dto.status) {
      // No-op transition (e.g. retrying the same call) — just append tracking info if provided.
    } else if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot move an order item from "${currentStatus}" to "${dto.status}"`,
      );
    }

    if (
      dto.status === ORDER_ITEM_STATUS.DELIVERED &&
      !dto.imageUrl &&
      !item.deliveryPhotoUrl
    ) {
      throw new BadRequestException(
        'A delivery confirmation photo is required to mark this item as delivered',
      );
    }

    const now = new Date();
    item.fulfillmentStatus = dto.status;
    item.updatedAt = now;
    if (dto.trackingNumber !== undefined)
      item.trackingNumber = dto.trackingNumber;
    if (dto.courierName !== undefined) item.courierName = dto.courierName;
    if (dto.expectedDeliveryDate !== undefined) {
      item.expectedDeliveryDate = dto.expectedDeliveryDate;
    }
    if (dto.imageUrl) item.deliveryPhotoUrl = dto.imageUrl;

    switch (dto.status) {
      case ORDER_ITEM_STATUS.PACKED:
        item.packedAt = now;
        break;
      case ORDER_ITEM_STATUS.SHIPPED:
        item.shippedAt = now;
        break;
      case ORDER_ITEM_STATUS.DELIVERED:
        item.deliveredAt = now;
        break;
      case ORDER_ITEM_STATUS.CANCELLED:
        item.cancelledAt = now;
        break;
    }

    await this.orderItemsRepository.save(item);
    await this.orderItemStatusRepository.save(
      this.orderItemStatusRepository.create({
        orderItemId: item.orderItemId,
        status: dto.status,
        note: dto.note ?? null,
        imageUrl: dto.imageUrl ?? null,
        changedBy: sellerUserId,
        createdAt: now,
      }),
    );

    const notif = OrdersService.ITEM_STATUS_NOTIFICATION[dto.status];
    if (notif && item.order?.userId) {
      void this.notificationsService.notify({
        userId: item.order.userId,
        type: notif.type,
        title: `Order ${notif.label}`,
        message: `Your order #${item.order.orderNumber ?? item.orderId} has been ${notif.label}.`,
        referenceId: item.order.orderId,
        referenceType: NOTIFICATION_REFERENCE_TYPE.ORDER,
        data: { link: `/orders/${item.order.orderId}` },
      });
    }

    return this.findSellerItem(sellerUserId, orderItemId);
  }

  private generateOrderNumber(): string {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = randomInt(1000, 9999);
    return `TXZ-${datePart}-${randomPart}`;
  }

  private toOrderResponse(order: Order) {
    return order;
  }
}
