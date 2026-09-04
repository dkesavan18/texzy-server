-- Texzy Inbox + Web Push: notifications + notification_tokens tables.
-- user_id is the sole ownership field (no business_id), matching the rest of the schema.

CREATE TABLE IF NOT EXISTS notifications (
  notification_id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NULL,
  reference_id VARCHAR(64) NULL,
  reference_type VARCHAR(32) NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON notifications (type);

CREATE TABLE IF NOT EXISTS notification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(32) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_notification_tokens_token UNIQUE (token)
);

CREATE INDEX IF NOT EXISTS idx_notification_tokens_user
  ON notification_tokens (user_id);
