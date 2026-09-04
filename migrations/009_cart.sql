-- Cart + cart items — persisted "Add to Cart" (run once on existing Texzy DB)
--
-- Notes:
-- * One cart per user (unique user_id) — created lazily on first add-to-cart call.
-- * product_variant_id is nullable — a plain product (no colour/variant chosen) has NULL here.
-- * Quantities/prices are re-validated server-side at checkout time; nothing here is trusted
--   as a price snapshot (unlike order_items, which does snapshot price at purchase time).

CREATE TABLE IF NOT EXISTS carts (
  cart_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT carts_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(product_id),
  product_variant_id BIGINT REFERENCES product_variants(product_variant_id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items (product_id);

-- One row per (cart, product, variant) — re-adding the same line increments quantity instead
-- of creating a duplicate row. Two partial-unique indexes because NULL != NULL in Postgres.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_with_variant
  ON cart_items (cart_id, product_id, product_variant_id)
  WHERE product_variant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_without_variant
  ON cart_items (cart_id, product_id)
  WHERE product_variant_id IS NULL;
