-- Multiple business categories per profile
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_category_ids JSONB;
