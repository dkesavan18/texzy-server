-- Product variants: colour/size SKUs with their own price, stock, and linked media ids.

CREATE TABLE IF NOT EXISTS product_variants (
  product_variant_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL,
  price DOUBLE PRECISION,
  quantity INT,
  media_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON product_variants (product_id)
  WHERE is_active = true;
