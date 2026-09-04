-- Collection type master: category_types.collection_type + seed rows in categories.

INSERT INTO category_types (category_type, is_active, created_at, updated_at)
SELECT 'collection_type', true, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM category_types WHERE category_type = 'collection_type'
);

INSERT INTO categories (category_type_id, category_name, is_active, created_at, updated_at)
SELECT ct.category_type_id, seed.name, true, NOW(), NOW()
FROM category_types ct
CROSS JOIN (
  VALUES
    ('Trending'),
    ('Festival'),
    ('Diwali Collection'),
    ('Wedding Collection'),
    ('New Arrival'),
    ('Best Seller'),
    ('Exclusive'),
    ('Seasonal'),
    ('Bridal'),
    ('Casual Wear')
) AS seed(name)
WHERE ct.category_type = 'collection_type'
  AND NOT EXISTS (
    SELECT 1
    FROM categories c
    WHERE c.category_type_id = ct.category_type_id
      AND c.category_name = seed.name
  );
