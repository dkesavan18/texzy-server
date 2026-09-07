-- Preferred display currency for profile / explore sub-header sync.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_currency varchar(10) DEFAULT 'INR';
