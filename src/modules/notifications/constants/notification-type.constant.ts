/** All notification types the Texzy Inbox can render. Extend here — never duplicate creation logic elsewhere. */
export const NOTIFICATION_TYPE = {
  ORDER_RECEIVED: 'ORDER_RECEIVED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  REQUEST_RESPONSE: 'REQUEST_RESPONSE',
  REQUEST_MESSAGE: 'REQUEST_MESSAGE',
  QUOTE_REQUEST: 'QUOTE_REQUEST',
  QUOTE_RESPONSE: 'QUOTE_RESPONSE',
  QUOTE_MESSAGE: 'QUOTE_MESSAGE',
  PRODUCT_UPDATE: 'PRODUCT_UPDATE',
  PRODUCT_BACK_IN_STOCK: 'PRODUCT_BACK_IN_STOCK',
  ADMIN_TEXTILE_NOTIFICATION: 'ADMIN_TEXTILE_NOTIFICATION',
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
} as const;

export type NotificationTypeValue =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

/** Polymorphic pointer used to build the frontend deep link. */
export const NOTIFICATION_REFERENCE_TYPE = {
  ORDER: 'order',
  ORDER_ITEM: 'order_item',
  NEED: 'need',
  DEAL: 'deal',
  PRODUCT: 'product',
  CATEGORY: 'category',
  SYSTEM: 'system',
} as const;

export type NotificationReferenceTypeValue =
  (typeof NOTIFICATION_REFERENCE_TYPE)[keyof typeof NOTIFICATION_REFERENCE_TYPE];

/** Inbox tab sections — a subset of types belongs to each section (besides "all"). */
export const NOTIFICATION_SECTION = {
  ALL: 'all',
  ORDERS: 'orders',
  REQUESTS: 'requests',
  QUOTATIONS: 'quotations',
  PRODUCTS: 'products',
  SYSTEM: 'system',
} as const;

export type NotificationSectionValue =
  (typeof NOTIFICATION_SECTION)[keyof typeof NOTIFICATION_SECTION];

export const NOTIFICATION_SECTION_TYPES: Record<
  Exclude<NotificationSectionValue, 'all'>,
  NotificationTypeValue[]
> = {
  orders: [
    NOTIFICATION_TYPE.ORDER_RECEIVED,
    NOTIFICATION_TYPE.ORDER_CONFIRMED,
    NOTIFICATION_TYPE.ORDER_SHIPPED,
    NOTIFICATION_TYPE.ORDER_DELIVERED,
    NOTIFICATION_TYPE.ORDER_CANCELLED,
  ],
  requests: [
    NOTIFICATION_TYPE.REQUEST_RESPONSE,
    NOTIFICATION_TYPE.REQUEST_MESSAGE,
  ],
  quotations: [
    NOTIFICATION_TYPE.QUOTE_REQUEST,
    NOTIFICATION_TYPE.QUOTE_RESPONSE,
    NOTIFICATION_TYPE.QUOTE_MESSAGE,
  ],
  products: [
    NOTIFICATION_TYPE.PRODUCT_UPDATE,
    NOTIFICATION_TYPE.PRODUCT_BACK_IN_STOCK,
    NOTIFICATION_TYPE.ADMIN_TEXTILE_NOTIFICATION,
  ],
  system: [NOTIFICATION_TYPE.SYSTEM_NOTIFICATION],
};

export function typesForSection(
  section?: NotificationSectionValue,
): NotificationTypeValue[] | undefined {
  if (!section || section === NOTIFICATION_SECTION.ALL) return undefined;
  return NOTIFICATION_SECTION_TYPES[section];
}
