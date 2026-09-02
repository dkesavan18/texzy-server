/** Order lifecycle status. */
export const ORDER_STATUS = {
  CREATED: 'created',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** orders.payment_status */
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export type PaymentStatusValue =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/** payments.status — mirrors the Razorpay payment lifecycle for this record. */
export const PAYMENT_RECORD_STATUS = {
  CREATED: 'created',
  PAID: 'paid',
  FAILED: 'failed',
} as const;

export type PaymentRecordStatus =
  (typeof PAYMENT_RECORD_STATUS)[keyof typeof PAYMENT_RECORD_STATUS];
