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
import { Order, OrderItem, Payment, Product } from '../../database/entities';
import { PRODUCT_STATUS } from '../products/constants/product-status.constant';
import {
  ORDER_STATUS,
  PAYMENT_RECORD_STATUS,
  PAYMENT_STATUS,
} from './constants/order-status.constant';
import { BuyNowDto } from './dto/buy-now.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly razorpayService: RazorpayService,
  ) {}

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
      throw new BadRequestException('This product is not available for purchase');
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
    const now = new Date();

    const order = await this.ordersRepository.save(
      this.ordersRepository.create({
        userId,
        orderNumber: this.generateOrderNumber(),
        totalAmount: totalPrice,
        currency: 'INR',
        status: ORDER_STATUS.CREATED,
        paymentStatus: PAYMENT_STATUS.PENDING,
        shippingAddress: { ...dto.shippingAddress },
        createdAt: now,
        updatedAt: now,
      }),
    );

    await this.orderItemsRepository.save(
      this.orderItemsRepository.create({
        orderId: order.orderId,
        productId: product.productId,
        quantity,
        unitPrice,
        totalPrice,
        createdAt: now,
      }),
    );

    let razorpayOrder;
    try {
      razorpayOrder = await this.razorpayService.createOrder({
        amountInRupees: totalPrice,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: { orderId: order.orderId, userId, productId: product.productId },
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
        amount: totalPrice,
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
      relations: { items: { product: true }, payments: true },
    });
    return orders.map((order) => this.toOrderResponse(order));
  }

  async findOneMine(userId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { orderId },
      relations: { items: { product: true }, payments: true },
    });
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }
    return this.toOrderResponse(order);
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
