ALTER TABLE messages ADD COLUMN IF NOT EXISTS removed_at BIGINT;
CREATE INDEX IF NOT EXISTS idx_messages_chat_removed ON messages(chat_id, removed_at);
