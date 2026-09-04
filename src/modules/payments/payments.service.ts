import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RazorpayService } from '../../common/payments/razorpay.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { dbTimetzNow } from '../../common/utils/auth.utils';
import {
  Order,
  OrderItem,
  Payment,
  Product,
  ProductVariant,
} from '../../database/entities';
import { CartService } from '../cart/cart.service';
import {
  NOTIFICATION_REFERENCE_TYPE,
  NOTIFICATION_TYPE,
} from '../notifications/constants/notification-type.constant';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ORDER_SOURCE,
  ORDER_STATUS,
  PAYMENT_RECORD_STATUS,
  PAYMENT_STATUS,
} from '../orders/constants/order-status.constant';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

interface RazorpayWebhookPaymentEntity {
  id: string;
  order_id: string;
}

interface RazorpayWebhookBody {
  event: string;
  payload?: {
    payment?: { entity?: RazorpayWebhookPaymentEntity };
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantsRepository: Repository<ProductVariant>,
    private readonly razorpayService: RazorpayService,
    private readonly cartService: CartService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Called from the React Checkout success handler. Verifies the signature server-side —
   * a client claiming "payment succeeded" is never trusted on its own. Safe to call more
   * than once with the same payload (e.g. a retried request): only the first call that
   * transitions the payment to `paid` reduces stock / confirms the order.
   */
  async verifyPayment(user: AuthUser, dto: VerifyPaymentDto) {
    const payment = await this.paymentsRepository.findOne({
      where: { razorpayOrderId: dto.razorpayOrderId },
    });
    if (!payment) {
      throw new NotFoundException(
        `No payment found for Razorpay order ${dto.razorpayOrderId}`,
      );
    }
    if (payment.userId !== user.userId) {
      throw new ForbiddenException('You can only verify your own payments');
    }

    const isValidSignature = this.razorpayService.verifyPaymentSignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );
    if (!isValidSignature) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    await this.markPaidIfNotAlready(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    return this.getOrderAndPaymentResponse(payment.orderId);
  }

  /**
   * Razorpay webhook — verifies `X-Razorpay-Signature` against the raw body using the
   * webhook secret (separate from the Checkout key secret). Idempotent: repeated deliveries
   * of the same event (Razorpay retries on non-2xx) never double-confirm or double-reduce stock.
   */
  async handleWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
    if (!signatureHeader) {
      throw new BadRequestException('Missing X-Razorpay-Signature header');
    }
    const isValidSignature = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signatureHeader,
    );
    if (!isValidSignature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let body: RazorpayWebhookBody;
    try {
      body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw new BadRequestException('Invalid webhook payload');
    }

    const entity = body.payload?.payment?.entity;

    switch (body.event) {
      case 'payment.captured':
      case 'order.paid': {
        if (!entity) break;
        await this.markPaidIfNotAlready(entity.order_id, entity.id, null);
        break;
      }
      case 'payment.failed': {
        if (!entity) break;
        await this.markFailedIfNotAlreadyPaid(entity.order_id, entity.id);
        break;
      }
      default:
        this.logger.log(
          `Ignoring unhandled Razorpay webhook event: ${body.event}`,
        );
    }

    return { received: true };
  }

  /**
   * Atomic, idempotent transition: `payments.status` only flips 'created' -> 'paid' once,
   * enforced by the `AND status != 'paid'` guard on the UPDATE itself (no separate
   * check-then-act race). Only the caller that actually performs the transition confirms
   * the order and reduces stock.
   */
  private async markPaidIfNotAlready(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string | null,
  ): Promise<void> {
    const updateResult = await this.paymentsRepository
      .createQueryBuilder()
      .update(Payment)
      .set({
        razorpayPaymentId,
        razorpaySignature,
        status: PAYMENT_RECORD_STATUS.PAID,
        updatedAt: new Date(),
      })
      .where('razorpay_order_id = :razorpayOrderId', { razorpayOrderId })
      .andWhere('status != :paid', { paid: PAYMENT_RECORD_STATUS.PAID })
      .execute();

    if (updateResult.affected !== 1) {
      // Already paid (duplicate webhook/verify call) or unknown order — nothing further to do.
      return;
    }

    const payment = await this.paymentsRepository.findOne({
      where: { razorpayOrderId },
    });
    if (!payment) return;

    await this.confirmOrderAndReduceStock(payment.orderId);
  }

  private async markFailedIfNotAlreadyPaid(
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ): Promise<void> {
    const updateResult = await this.paymentsRepository
      .createQueryBuilder()
      .update(Payment)
      .set({
        razorpayPaymentId,
        status: PAYMENT_RECORD_STATUS.FAILED,
        updatedAt: new Date(),
      })
      .where('razorpay_order_id = :razorpayOrderId', { razorpayOrderId })
      .andWhere('status != :paid', { paid: PAYMENT_RECORD_STATUS.PAID })
      .execute();

    if (updateResult.affected !== 1) return;

    const payment = await this.paymentsRepository.findOne({
      where: { razorpayOrderId },
    });
    if (!payment) return;

    await this.ordersRepository
      .createQueryBuilder()
      .update(Order)
      .set({
        paymentStatus: PAYMENT_STATUS.FAILED,
        status: ORDER_STATUS.FAILED,
        updatedAt: new Date(),
      })
      .where('order_id = :orderId', { orderId: payment.orderId })
      .andWhere('status != :confirmed', { confirmed: ORDER_STATUS.CONFIRMED })
      .execute();
  }

  /** Confirms the order and reduces stock — only ever called once per order (guarded above). */
  private async confirmOrderAndReduceStock(orderId: string): Promise<void> {
    const orderBeforeUpdate = await this.ordersRepository.findOne({
      where: { orderId },
    });

    await this.ordersRepository
      .createQueryBuilder()
      .update(Order)
      .set({
        paymentStatus: PAYMENT_STATUS.PAID,
        status: ORDER_STATUS.CONFIRMED,
        updatedAt: new Date(),
      })
      .where('order_id = :orderId', { orderId })
      .andWhere('status != :confirmed', { confirmed: ORDER_STATUS.CONFIRMED })
      .execute();

    // Safety net for cart-based checkouts whose client never got to call /cart clear
    // (e.g. tab closed right after paying). Gated on source='cart' so a Buy Now purchase
    // never wipes out unrelated items the buyer is still saving in their cart.
    if (orderBeforeUpdate?.source === ORDER_SOURCE.CART) {
      await this.cartService
        .clear(orderBeforeUpdate.userId)
        .catch(() => undefined);
    }

    const items = await this.orderItemsRepository.find({ where: { orderId } });
    for (const item of items) {
      const product = await this.productsRepository.findOne({
        where: { productId: item.productId },
      });

      const result = await this.productsRepository
        .createQueryBuilder()
        .update(Product)
        .set({
          quantity: () => 'quantity - :qty',
          updatedAt: dbTimetzNow(),
        })
        .where('product_id = :productId', { productId: item.productId })
        .andWhere('quantity >= :qty', { qty: item.quantity })
        .setParameter('qty', item.quantity)
        .execute();

      // Seller only learns about a paid order now — an unpaid/failed order never reaches them.
      if (product?.userId) {
        void this.notificationsService.notify({
          userId: product.userId,
          type: NOTIFICATION_TYPE.ORDER_RECEIVED,
          title: 'New order received',
          message: `${item.quantity} x ${product.productName ?? 'product'} — order #${orderBeforeUpdate?.orderNumber ?? orderId}`,
          referenceId: item.orderItemId,
          referenceType: NOTIFICATION_REFERENCE_TYPE.ORDER_ITEM,
          data: { link: `/catalogues/orders/${item.orderItemId}` },
        });
      }

      if (result.affected !== 1) {
        this.logger.warn(
          `Stock for product ${item.productId} was insufficient or untracked when confirming order ${orderId} — skipped decrement`,
        );
      }

      if (item.productVariantId) {
        await this.variantsRepository
          .createQueryBuilder()
          .update(ProductVariant)
          .set({
            quantity: () => 'quantity - :qty',
            updatedAt: new Date(),
          })
          .where('product_variant_id = :variantId', {
            variantId: item.productVariantId,
          })
          .andWhere('quantity >= :qty', { qty: item.quantity })
          .setParameter('qty', item.quantity)
          .execute()
          .catch(() => undefined);
      }
    }
  }

  private async getOrderAndPaymentResponse(orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { orderId },
      relations: { items: { product: true }, payments: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    return { order };
  }
}
