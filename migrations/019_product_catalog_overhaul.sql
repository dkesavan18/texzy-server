-- Product catalogue overhaul (schema only — data is seeded by `npm run seed:catalog`).
--
--  * categories / category_types get a stable UPPER_SNAKE `code`
--  * categories become hierarchical (parent_id), ordered (display_order) and can carry
--    option metadata (e.g. colour HEX) in a JSONB column
--  * category_input_mapping drives the dynamic "Add product" form (fields per product type)
--  * product_attribute_values stores the dynamic attribute values of a product
--  * product_variants gain SKU / MOQ / weight / barcode / combination_key, with their
--    selected attribute values in product_variant_attributes
--  * product_price_tiers stores bulk / wholesale price breaks
--  * products gain a handful of frequently-queried structured columns
--
-- Fully idempotent: safe to run more than once.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Category code + hierarchy
-- ---------------------------------------------------------------------------
ALTER TABLE category_types ADD COLUMN IF NOT EXISTS code VARCHAR(60);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS code VARCHAR(80);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id BIGINT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS metadata JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES categories (category_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Backfill codes for rows that already exist (UPPER_SNAKE of the current name).
UPDATE category_types
SET code = UPPER(REGEXP_REPLACE(TRIM(category_type), '[^A-Za-z0-9]+', '_', 'g'))
WHERE code IS NULL AND category_type IS NOT NULL;

WITH ranked AS (
  SELECT
    category_id,
    UPPER(REGEXP_REPLACE(TRIM(category_name), '[^A-Za-z0-9]+', '_', 'g')) AS base_code,
    ROW_NUMBER() OVER (
      PARTITION BY category_type_id,
                   UPPER(REGEXP_REPLACE(TRIM(category_name), '[^A-Za-z0-9]+', '_', 'g'))
      ORDER BY category_id
    ) AS rn
  FROM categories
  WHERE code IS NULL AND category_name IS NOT NULL
)
UPDATE categories c
SET code = CASE WHEN r.rn = 1 THEN r.base_code ELSE r.base_code || '_' || r.rn END
FROM ranked r
WHERE c.category_id = r.category_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_types_code
  ON category_types (code) WHERE code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_type_code
  ON categories (category_type_id, code) WHERE code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id
  ON categories (parent_id) WHERE parent_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Dynamic input configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_input_mapping (
  id BIGSERIAL PRIMARY KEY,
  -- NULL = applies to every product category; a root category = whole product group;
  -- a leaf category = that product type only. More specific rows override less specific ones.
  category_id BIGINT REFERENCES categories (category_id) ON DELETE CASCADE,
  input_key VARCHAR(80) NOT NULL,
  input_label VARCHAR(150) NOT NULL,
  input_type VARCHAR(30) NOT NULL,
  -- category_types.code that supplies dropdown options (e.g. COLOUR, MATERIAL)
  option_category_type VARCHAR(60),
  -- optionally restrict dropdown options to the children of this category
  option_parent_id BIGINT REFERENCES categories (category_id) ON DELETE SET NULL,
  -- form step the field belongs to: 'details' | 'pricing'
  step_key VARCHAR(30) NOT NULL DEFAULT 'details',
  section_key VARCHAR(60) NOT NULL DEFAULT 'basic',
  section_label VARCHAR(120) NOT NULL DEFAULT 'Basic Information',
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_variant_attribute BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  -- {min,max,step,minLength,maxLength,pattern,multiple,optionsRootOnly,gteKey,requiredWhen:{...}}
  validation_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- conditional visibility, e.g. {"key":"zari_work_present","op":"truthy"}
  visibility_rule JSONB,
  unit VARCHAR(30),
  unit_options JSONB,
  default_value TEXT,
  placeholder VARCHAR(200),
  help_text VARCHAR(300),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_category_input_type CHECK (input_type IN (
    'TEXT', 'TEXTAREA', 'NUMBER', 'DECIMAL', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT',
    'DATE', 'COLOR_SELECT', 'IMAGE', 'FILE', 'MEASUREMENT', 'TAG_SELECT'
  )),
  CONSTRAINT chk_category_input_step CHECK (step_key IN ('details', 'pricing'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_input_mapping_category_key
  ON category_input_mapping (category_id, input_key) WHERE category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_input_mapping_global_key
  ON category_input_mapping (input_key) WHERE category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_category_input_mapping_category
  ON category_input_mapping (category_id) WHERE is_active = true;

-- ---------------------------------------------------------------------------
-- 3. Product structured columns (frequently queried / validated values)
-- ---------------------------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS lead_time_days INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_made_to_order BOOLEAN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS wholesale_price DOUBLE PRECISION;
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_weight DOUBLE PRECISION;   -- grams
ALTER TABLE products ADD COLUMN IF NOT EXISTS package_dimensions JSONB;          -- {length,width,height} in cm

CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (product_category_id);

-- ---------------------------------------------------------------------------
-- 4. Dynamic attribute values
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_attribute_values (
  product_attribute_value_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
  input_key VARCHAR(80) NOT NULL,
  -- single select / colour: one row. multi select: one row per selected option.
  option_category_id BIGINT REFERENCES categories (category_id) ON DELETE RESTRICT,
  value_text TEXT,
  value_number DOUBLE PRECISION,
  value_boolean BOOLEAN,
  value_date DATE,
  value_json JSONB,
  unit VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_attr_option
  ON product_attribute_values (product_id, input_key, option_category_id)
  WHERE option_category_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_attr_scalar
  ON product_attribute_values (product_id, input_key)
  WHERE option_category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_attr_option
  ON product_attribute_values (input_key, option_category_id)
  WHERE option_category_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Variants
-- ---------------------------------------------------------------------------
ALTER TABLE product_variants ALTER COLUMN variant_name TYPE VARCHAR(255);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS moq INT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION;   -- package weight, grams
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS barcode VARCHAR(64);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS combination_key VARCHAR(500);
-- Seller-controlled "sellable" switch. is_active stays the soft-delete flag.
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN NOT NULL DEFAULT true;

-- One active variant per attribute combination of a product.
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_combination
  ON product_variants (product_id, combination_key)
  WHERE is_active = true AND combination_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku
  ON product_variants (product_id, LOWER(sku))
  WHERE is_active = true AND sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS product_variant_attributes (
  product_variant_attribute_id BIGSERIAL PRIMARY KEY,
  product_variant_id BIGINT NOT NULL REFERENCES product_variants (product_variant_id) ON DELETE CASCADE,
  input_key VARCHAR(80) NOT NULL,
  option_category_id BIGINT REFERENCES categories (category_id) ON DELETE RESTRICT,
  value_text VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_variant_id, input_key)
);

CREATE INDEX IF NOT EXISTS idx_product_variant_attributes_option
  ON product_variant_attributes (input_key, option_category_id)
  WHERE option_category_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Bulk / wholesale pricing tiers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_price_tiers (
  product_price_tier_id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products (product_id) ON DELETE CASCADE,
  product_variant_id BIGINT REFERENCES product_variants (product_variant_id) ON DELETE CASCADE,
  min_quantity INT NOT NULL CHECK (min_quantity > 0),
  max_quantity INT CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  price DOUBLE PRECISION NOT NULL CHECK (price >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_price_tiers_qty
  ON product_price_tiers (product_id, COALESCE(product_variant_id, 0), min_quantity)
  WHERE is_active = true;

COMMIT;
