-- Profile columns aligned with webapp business registration (run once)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_mode_id INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_category_ids JSONB;

-- Backfill multi-select categories from legacy single column
UPDATE profiles
SET business_category_ids = jsonb_build_array(business_category_id)
WHERE business_category_id IS NOT NULL
  AND business_category_ids IS NULL;
