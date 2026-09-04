/** Order lifecycle status — payment/creation only (see ORDER_ITEM_STATUS for fulfillment). */
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

/** orders.source — decides whether payment confirmation is allowed to clear the buyer's cart. */
export const ORDER_SOURCE = {
  BUY_NOW: 'buy_now',
  CART: 'cart',
} as const;

export type OrderSourceValue = (typeof ORDER_SOURCE)[keyof typeof ORDER_SOURCE];

/**
 * order_items.fulfillment_status — the seller-managed delivery pipeline for a single item.
 * Deliberately per-item (not per-order) so a multi-seller cart tracks each shipment
 * independently, mirroring how Flipkart/Amazon show separate tracking per seller shipment.
 */
export const ORDER_ITEM_STATUS = {
  PENDING: 'pending',
  PACKED: 'packed',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

export type OrderItemStatusValue =
  (typeof ORDER_ITEM_STATUS)[keyof typeof ORDER_ITEM_STATUS];

/** Ordered pipeline — used to validate that a seller can't skip backwards or jump stages. */
export const ORDER_ITEM_STATUS_SEQUENCE: OrderItemStatusValue[] = [
  ORDER_ITEM_STATUS.PENDING,
  ORDER_ITEM_STATUS.PACKED,
  ORDER_ITEM_STATUS.SHIPPED,
  ORDER_ITEM_STATUS.OUT_FOR_DELIVERY,
  ORDER_ITEM_STATUS.DELIVERED,
];

/** From any given status, which statuses a seller is allowed to move an item to next. */
export const ORDER_ITEM_ALLOWED_TRANSITIONS: Record<
  OrderItemStatusValue,
  OrderItemStatusValue[]
> = {
  [ORDER_ITEM_STATUS.PENDING]: [
    ORDER_ITEM_STATUS.PACKED,
    ORDER_ITEM_STATUS.CANCELLED,
  ],
  [ORDER_ITEM_STATUS.PACKED]: [
    ORDER_ITEM_STATUS.SHIPPED,
    ORDER_ITEM_STATUS.CANCELLED,
  ],
  [ORDER_ITEM_STATUS.SHIPPED]: [
    ORDER_ITEM_STATUS.OUT_FOR_DELIVERY,
    ORDER_ITEM_STATUS.DELIVERED,
  ],
  [ORDER_ITEM_STATUS.OUT_FOR_DELIVERY]: [ORDER_ITEM_STATUS.DELIVERED],
  [ORDER_ITEM_STATUS.DELIVERED]: [],
  [ORDER_ITEM_STATUS.CANCELLED]: [],
};
