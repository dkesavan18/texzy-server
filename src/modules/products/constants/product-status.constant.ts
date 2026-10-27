/** Product lifecycle status — independent of the `is_active` buyer-visibility flag. */
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  /** Soft-deleted: row kept, hidden from Active/Inactive catalogue lists and buyers. */
  DELETED: 'deleted',
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
