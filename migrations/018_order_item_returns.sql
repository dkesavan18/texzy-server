-- Adds buyer-initiated return request fields to order_items.
-- fulfillment_status already supports arbitrary varchar values (return_requested /
-- return_approved / return_rejected / returned) — this migration only adds the reason/note
-- columns needed to record why a buyer requested a return.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS return_reason varchar(40),
  ADD COLUMN IF NOT EXISTS return_note text;
