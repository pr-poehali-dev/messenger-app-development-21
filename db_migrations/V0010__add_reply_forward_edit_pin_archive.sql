-- Reply / Forward / Edit
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_user_id BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at BIGINT;

-- Pinned message в чате (один на чат)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS pinned_message_id BIGINT;

-- Архив чатов (per-user)
ALTER TABLE chat_settings ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
