-- Profile business onboarding fields (run once on existing Texzy DB)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_mode VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_category_id INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
