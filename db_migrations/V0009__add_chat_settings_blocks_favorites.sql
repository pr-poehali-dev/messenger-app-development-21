-- Настройки чата для пользователя (личные: mute, pin, clear, favorite)
CREATE TABLE IF NOT EXISTS chat_settings (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    muted BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    favorite BOOLEAN DEFAULT FALSE,
    cleared_at BIGINT DEFAULT 0,
    UNIQUE(user_id, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_settings_user ON chat_settings(user_id);

-- Блокировки пользователей
CREATE TABLE IF NOT EXISTS user_blocks (
    id BIGSERIAL PRIMARY KEY,
    blocker_id BIGINT NOT NULL,
    blocked_id BIGINT NOT NULL,
    created_at BIGINT,
    UNIQUE(blocker_id, blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);

-- Избранные сообщения пользователя
CREATE TABLE IF NOT EXISTS favorite_messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    message_id BIGINT NOT NULL,
    created_at BIGINT,
    UNIQUE(user_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_favorite_messages_user ON favorite_messages(user_id);
