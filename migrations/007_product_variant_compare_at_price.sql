-- Add compare_at_price to product variants

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS compare_at_price DOUBLE PRECISION;
