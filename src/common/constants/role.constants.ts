/** User roles — `users.role_id` maps to `categories.category_id`. */
export const ROLE_CATEGORY_IDS = {
  ADMIN: 1,
  BUYER: 2,
  SELLER: 3,
} as const;

export type RoleCategoryId =
  (typeof ROLE_CATEGORY_IDS)[keyof typeof ROLE_CATEGORY_IDS];
