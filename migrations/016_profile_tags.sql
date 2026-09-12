-- Seller profile service tags (e.g. Fast Delivery, Bulk order Welcome).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tags jsonb;
