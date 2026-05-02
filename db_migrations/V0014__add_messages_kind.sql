ALTER TABLE t_p67547116_messenger_app_develo.messages
ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text';

CREATE INDEX IF NOT EXISTS idx_messages_kind
ON t_p67547116_messenger_app_develo.messages(kind);