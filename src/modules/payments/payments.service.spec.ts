import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { RazorpayService } from '../../common/payments/razorpay.service';
import { Order, OrderItem, Payment, Product } from '../../database/entities';
import { PaymentsService } from './payments.service';

function createQueryBuilderMock(executeResult: { affected: number }) {
  const qb: Record<string, jest.Mock> = {};
  qb.update = jest.fn().mockReturnValue(qb);
  qb.set = jest.fn().mockReturnValue(qb);
  qb.where = jest.fn().mockReturnValue(qb);
  qb.andWhere = jest.fn().mockReturnValue(qb);
  qb.setParameter = jest.fn().mockReturnValue(qb);
  qb.execute = jest.fn().mockResolvedValue(executeResult);
  return qb;
}

describe('PaymentsService', () => {
  let service: PaymentsService;

  const paymentsRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const ordersRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const orderItemsRepository = {
    find: jest.fn(),
  };
  const productsRepository = {
    createQueryBuilder: jest.fn(),
  };
  const razorpayService = {
    verifyPaymentSignature: jest.fn(),
    verifyWebhookSignature: jest.fn(),
  };

  const authUser = { userId: '9', email: null, roleId: 2 };
  const basePayment = {
    paymentId: '1',
    orderId: '100',
    userId: '9',
    razorpayOrderId: 'order_RZP1',
    status: 'created',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentsRepository },
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        { provide: getRepositoryToken(OrderItem), useValue: orderItemsRepository },
        { provide: getRepositoryToken(Product), useValue: productsRepository },
        { provide: RazorpayService, useValue: razorpayService },
      ],
    }).compile();

    service = module.get(PaymentsService);
    jest.clearAllMocks();
  });

  describe('verifyPayment', () => {
    it('throws BadRequest and changes nothing when the signature is invalid', async () => {
      paymentsRepository.findOne.mockResolvedValue({ ...basePayment });
      razorpayService.verifyPaymentSignature.mockReturnValue(false);

      await expect(
        service.verifyPayment(authUser as any, {
          razorpayOrderId: 'order_RZP1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'bad',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(paymentsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rejects verifying a payment that belongs to another user', async () => {
      paymentsRepository.findOne.mockResolvedValue({ ...basePayment, userId: '999' });

      await expect(
        service.verifyPayment(authUser as any, {
          razorpayOrderId: 'order_RZP1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'sig',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('confirms the order and reduces stock exactly once on the first valid verification', async () => {
      paymentsRepository.findOne
        .mockResolvedValueOnce({ ...basePayment }) // initial ownership lookup
        .mockResolvedValueOnce({ ...basePayment, status: 'paid' }); // re-fetch after update
      razorpayService.verifyPaymentSignature.mockReturnValue(true);

      const paymentsQb = createQueryBuilderMock({ affected: 1 });
      paymentsRepository.createQueryBuilder.mockReturnValue(paymentsQb);

      const ordersQb = createQueryBuilderMock({ affected: 1 });
      ordersRepository.createQueryBuilder.mockReturnValue(ordersQb);

      orderItemsRepository.find.mockResolvedValue([
        { orderId: '100', productId: '55', quantity: 2 },
      ]);

      const productsQb = createQueryBuilderMock({ affected: 1 });
      productsRepository.createQueryBuilder.mockReturnValue(productsQb);

      ordersRepository.findOne.mockResolvedValue({
        orderId: '100',
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      const result = await service.verifyPayment(authUser as any, {
        razorpayOrderId: 'order_RZP1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'good',
      });

      expect(result.order).toEqual({
        orderId: '100',
        status: 'confirmed',
        paymentStatus: 'paid',
      });
      // Payment row transitioned exactly once (idempotency guard: WHERE status != 'paid').
      expect(paymentsQb.andWhere).toHaveBeenCalledWith('status != :paid', {
        paid: 'paid',
      });
      // Stock reduced exactly once for the single order item.
      expect(productsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('does not re-confirm the order or reduce stock again on a duplicate verify call', async () => {
      // Simulates calling /payments/razorpay/verify twice with the same payload —
      // the second call finds the payment already 'paid', so the UPDATE affects 0 rows.
      paymentsRepository.findOne.mockResolvedValue({ ...basePayment, status: 'paid' });
      razorpayService.verifyPaymentSignature.mockReturnValue(true);

      const paymentsQb = createQueryBuilderMock({ affected: 0 });
      paymentsRepository.createQueryBuilder.mockReturnValue(paymentsQb);

      ordersRepository.findOne.mockResolvedValue({
        orderId: '100',
        status: 'confirmed',
        paymentStatus: 'paid',
      });

      await service.verifyPayment(authUser as any, {
        razorpayOrderId: 'order_RZP1',
        razorpayPaymentId: 'pay_1',
        razorpaySignature: 'good',
      });

      expect(ordersRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(orderItemsRepository.find).not.toHaveBeenCalled();
      expect(productsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('rejects a webhook with an invalid signature', async () => {
      razorpayService.verifyWebhookSignature.mockReturnValue(false);

      await expect(
        service.handleWebhook(Buffer.from('{}'), 'bad-signature'),
      ).rejects.toThrow(BadRequestException);
      expect(paymentsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('rejects a webhook with a missing signature header', async () => {
      await expect(service.handleWebhook(Buffer.from('{}'), undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('processes payment.captured idempotently, confirming stock reduction only once', async () => {
      razorpayService.verifyWebhookSignature.mockReturnValue(true);
      const rawBody = Buffer.from(
        JSON.stringify({
          event: 'payment.captured',
          payload: { payment: { entity: { id: 'pay_1', order_id: 'order_RZP1' } } },
        }),
      );

      const paymentsQb = createQueryBuilderMock({ affected: 1 });
      paymentsRepository.createQueryBuilder.mockReturnValue(paymentsQb);
      paymentsRepository.findOne.mockResolvedValue({ ...basePayment, status: 'paid' });

      const ordersQb = createQueryBuilderMock({ affected: 1 });
      ordersRepository.createQueryBuilder.mockReturnValue(ordersQb);
      orderItemsRepository.find.mockResolvedValue([
        { orderId: '100', productId: '55', quantity: 1 },
      ]);
      const productsQb = createQueryBuilderMock({ affected: 1 });
      productsRepository.createQueryBuilder.mockReturnValue(productsQb);

      const result = await service.handleWebhook(rawBody, 'valid-signature');
      expect(result).toEqual({ received: true });
      expect(productsRepository.createQueryBuilder).toHaveBeenCalledTimes(1);

      // Second delivery of the same event (Razorpay retries) — must be a no-op.
      const paymentsQb2 = createQueryBuilderMock({ affected: 0 });
      paymentsRepository.createQueryBuilder.mockReturnValue(paymentsQb2);
      jest.clearAllMocks();
      razorpayService.verifyWebhookSignature.mockReturnValue(true);
      paymentsRepository.createQueryBuilder.mockReturnValue(paymentsQb2);

      await service.handleWebhook(rawBody, 'valid-signature');
      expect(ordersRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(productsRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
