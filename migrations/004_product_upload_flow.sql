-- Add Product upload flow + product API fields (run once on existing Texzy DB)
--
-- Notes:
-- * `products.created_at` / `updated_at` are `time with time zone` (time-of-day only, no date).
--   That makes any "N hours old" comparison meaningless, so this migration adds a proper
--   `timestamptz` column (`last_activity_at`) used exclusively for 24h draft-expiry tracking.
--   It is bumped on every product write AND on every image add/remove/reorder for that product.
-- * `status` is a new lifecycle column, independent of the existing `is_active` soft-delete flag.
--   is_active=false still means "soft deleted"; status='draft'|'active' tracks publish state.

ALTER TABLE products ADD COLUMN IF NOT EXISTS status VARCHAR(20);
UPDATE products SET status = 'active' WHERE status IS NULL;
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE products ALTER COLUMN status SET NOT NULL;

ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_subcategory_id INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS textile_attributes JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS price_type VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(30);
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_order_quantity INTEGER;
ALTER TABLE products ADD COLUMN IF NOT EXISTS allow_bulk_order BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
UPDATE products SET last_activity_at = NOW() WHERE last_activity_at IS NULL;
ALTER TABLE products ALTER COLUMN last_activity_at SET DEFAULT NOW();
ALTER TABLE products ALTER COLUMN last_activity_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_product_subcategory_id_fkey'
  ) THEN
    ALTER TABLE products
      ADD CONSTRAINT products_product_subcategory_id_fkey
      FOREIGN KEY (product_subcategory_id) REFERENCES categories(category_id) NOT VALID;
  END IF;
END $$;

-- Speeds up the draft-cleanup cron's scan (partial index — only draft rows are ever queried).
CREATE INDEX IF NOT EXISTS idx_products_draft_last_activity
  ON products (last_activity_at)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_products_user_id ON products (user_id);

-- `category_types.category_type_id = 8` ('product_sub_category') already exists but had no rows.
INSERT INTO categories (category_type_id, category_name, is_active, created_at, updated_at)
SELECT 8, name, true, NOW(), NOW()
FROM (VALUES
  ('Blouse'),
  ('Petticoat'),
  ('Dupatta'),
  ('Stole'),
  ('Running Material')
) AS seed(name)
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE category_type_id = 8
);
