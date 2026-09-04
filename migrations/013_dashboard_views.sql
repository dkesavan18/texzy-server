-- Lightweight denormalized view counters for business dashboard KPIs.
-- Incremented on public product/profile GET only (never on owner "mine" lookups).

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS total_views INT NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_views INT NOT NULL DEFAULT 0;
