-- Buyer address book — up to 3 saved delivery addresses per user (cap enforced in
-- AddressesService, not here). Selected at Buy Now / Cart checkout instead of retyping
-- the address every time; the chosen address is still snapshotted onto orders.shipping_address
-- at order-creation time (orders never re-read this table after the order is placed).

CREATE TABLE IF NOT EXISTS addresses (
  address_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id),
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address_line1 VARCHAR(200) NOT NULL,
  address_line2 VARCHAR(200),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode VARCHAR(10) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  label VARCHAR(40) NOT NULL DEFAULT 'Home',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses (user_id);
