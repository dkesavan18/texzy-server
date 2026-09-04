-- Tracks how an order was placed so payment confirmation can safely decide whether to
-- clear the buyer's cart (only cart-checkout orders should ever touch the cart — a Buy Now
-- purchase must never wipe out unrelated items the buyer is still saving for later).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'buy_now';
