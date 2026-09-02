-- Seed user role categories (run once if not already present)
-- users.role_id references categories.category_id

INSERT INTO categories (category_id, category_name, is_active, created_at, updated_at)
VALUES
  (1, 'admin', true, NOW(), NOW()),
  (2, 'buyer', true, NOW(), NOW()),
  (3, 'seller', true, NOW(), NOW())
ON CONFLICT (category_id) DO NOTHING;
