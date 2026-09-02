import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { RazorpayService } from './razorpay.service';

describe('RazorpayService', () => {
  const keySecret = 'test_key_secret';
  const webhookSecret = 'test_webhook_secret';

  function createService(overrides: Record<string, string> = {}) {
    const values: Record<string, string> = {
      'payments.razorpay.keyId': 'rzp_test_abc123',
      'payments.razorpay.keySecret': keySecret,
      'payments.razorpay.webhookSecret': webhookSecret,
      ...overrides,
    };
    const configService = {
      get: (key: string) => values[key],
    } as unknown as ConfigService;
    return new RazorpayService(configService);
  }

  describe('verifyPaymentSignature', () => {
    it('accepts a signature computed with the correct secret', () => {
      const service = createService();
      const orderId = 'order_ABC123';
      const paymentId = 'pay_XYZ789';
      const signature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(service.verifyPaymentSignature(orderId, paymentId, signature)).toBe(true);
    });

    it('rejects a tampered signature', () => {
      const service = createService();
      const orderId = 'order_ABC123';
      const paymentId = 'pay_XYZ789';
      const signature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(
        service.verifyPaymentSignature(orderId, 'pay_DIFFERENT', signature),
      ).toBe(false);
    });

    it('rejects a signature produced with the wrong secret', () => {
      const service = createService();
      const orderId = 'order_ABC123';
      const paymentId = 'pay_XYZ789';
      const badSignature = createHmac('sha256', 'wrong_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(service.verifyPaymentSignature(orderId, paymentId, badSignature)).toBe(
        false,
      );
    });

    it('throws if RAZORPAY_KEY_SECRET is not configured', () => {
      const service = createService({ 'payments.razorpay.keySecret': '' });
      expect(() => service.verifyPaymentSignature('a', 'b', 'c')).toThrow();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a signature computed with the webhook secret over the raw body', () => {
      const service = createService();
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const signature = createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      expect(service.verifyWebhookSignature(rawBody, signature)).toBe(true);
    });

    it('rejects a signature that does not match the raw body', () => {
      const service = createService();
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
      const wrongBody = Buffer.from(JSON.stringify({ event: 'payment.failed' }));
      const signature = createHmac('sha256', webhookSecret)
        .update(wrongBody)
        .digest('hex');

      expect(service.verifyWebhookSignature(rawBody, signature)).toBe(false);
    });
  });

  describe('getPublicKeyId / isConfigured', () => {
    it('exposes the key id but never the secret', () => {
      const service = createService();
      expect(service.getPublicKeyId()).toBe('rzp_test_abc123');
      expect(service.isConfigured()).toBe(true);
    });

    it('reports not configured when keys are missing', () => {
      const service = createService({
        'payments.razorpay.keyId': '',
        'payments.razorpay.keySecret': '',
      });
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('createOrder', () => {
    it('throws a clear error instead of crashing when not configured', async () => {
      const service = createService({
        'payments.razorpay.keyId': '',
        'payments.razorpay.keySecret': '',
      });
      await expect(
        service.createOrder({ amountInRupees: 100, receipt: 'TXZ-1' }),
      ).rejects.toThrow(/not configured/i);
    });
  });
});
