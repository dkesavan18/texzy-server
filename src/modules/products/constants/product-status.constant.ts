/** Product lifecycle status — independent of the `is_active` soft-delete flag. */
export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
} as const;

export type ProductStatus =
  (typeof PRODUCT_STATUS)[keyof typeof PRODUCT_STATUS];
