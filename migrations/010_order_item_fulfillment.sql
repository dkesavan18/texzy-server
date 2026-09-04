-- Per-item fulfillment/tracking for orders — seller order management + customer tracking
-- (run once on existing Texzy DB)
--
-- Notes:
-- * Fulfillment status lives on order_items (not orders) so a multi-seller cart tracks each
--   seller's shipment independently — orders.status stays payment/creation-only.
-- * order_item_status_history mirrors the existing deal_status history-table pattern.
-- * delivery_photo_url / order_item_status_history.image_url reuse the uploads module's R2
--   flow (new 'order-item-delivery' single-field entity type) — no new storage code needed.
-- * product_variant_id lets order_items reference the specific colour/variant purchased
--   (buy-now/checkout already resolve this server-side; NULL means "no variant chosen").

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS product_variant_id BIGINT REFERENCES product_variants(product_variant_id),
  ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(64),
  ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS expected_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_fulfillment_status ON order_items (fulfillment_status);

CREATE TABLE IF NOT EXISTS order_item_status_history (
  order_item_status_id BIGSERIAL PRIMARY KEY,
  order_item_id BIGINT NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL,
  note TEXT,
  image_url TEXT,
  changed_by BIGINT REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_item_status_history_order_item_id
  ON order_item_status_history (order_item_id);

-- Seed a 'pending' history row for every existing order item so the tracking timeline
-- always has a starting point, even for orders placed before this migration.
INSERT INTO order_item_status_history (order_item_id, status, created_at)
SELECT order_item_id, 'pending', created_at FROM order_items
ON CONFLICT DO NOTHING;
