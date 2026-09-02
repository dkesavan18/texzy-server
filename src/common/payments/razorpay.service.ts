import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';

export interface CreateRazorpayOrderInput {
  /** Amount in rupees — converted to paise here (Razorpay requires the smallest currency unit). */
  amountInRupees: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
}

/**
 * Thin wrapper around the official Razorpay Node SDK — order creation + signature
 * verification only. No database access here (mirrors R2StorageService's role for uploads).
 */
@Injectable()
export class RazorpayService {
  private client: Razorpay | null = null;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('payments.razorpay.keyId') ?? '';
    this.keySecret =
      this.configService.get<string>('payments.razorpay.keySecret') ?? '';
    this.webhookSecret =
      this.configService.get<string>('payments.razorpay.webhookSecret') ?? '';
  }

  /** The publishable key ID the frontend needs to open Razorpay Checkout. Never the secret. */
  getPublicKeyId(): string {
    return this.keyId;
  }

  isConfigured(): boolean {
    return Boolean(this.keyId && this.keySecret);
  }

  async createOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<RazorpayOrderResult> {
    const client = this.getClient();
    const amountInPaise = Math.round(input.amountInRupees * 100);

    const order = await client.orders.create({
      amount: amountInPaise,
      currency: input.currency ?? 'INR',
      receipt: input.receipt,
      notes: input.notes,
    });

    return {
      razorpayOrderId: order.id,
      amountInPaise,
      currency: order.currency,
    };
  }

  /** Verifies the Checkout success payload: HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    if (!this.keySecret) {
      throw new InternalServerErrorException(
        'Razorpay is not configured (RAZORPAY_KEY_SECRET missing)',
      );
    }
    const expected = createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    return this.safeCompare(expected, razorpaySignature);
  }

  /** Verifies the `X-Razorpay-Signature` header against the raw webhook request body. */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!this.webhookSecret) {
      throw new InternalServerErrorException(
        'Razorpay webhook secret is not configured (RAZORPAY_WEBHOOK_SECRET missing)',
      );
    }
    const expected = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return this.safeCompare(expected, signature);
  }

  private safeCompare(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual ?? '');
    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }
    return timingSafeEqual(expectedBuffer, actualBuffer);
  }

  private getClient(): Razorpay {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException(
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      );
    }
    this.client ??= new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
    return this.client;
  }
}
