ALTER TABLE t_p67547116_messenger_app_develo.chats
  ADD COLUMN IF NOT EXISTS disappearing_seconds INTEGER;

ALTER TABLE t_p67547116_messenger_app_develo.messages
  ADD COLUMN IF NOT EXISTS expires_at BIGINT;

CREATE INDEX IF NOT EXISTS idx_messages_expires
  ON t_p67547116_messenger_app_develo.messages(expires_at)
  WHERE expires_at IS NOT NULL;
