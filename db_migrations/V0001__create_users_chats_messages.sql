-- Пользователи
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.users (
    id BIGSERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    last_seen BIGINT DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
);

-- Чаты (пара пользователей)
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.chats (
    id BIGSERIAL PRIMARY KEY,
    user1_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.users(id),
    user2_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.users(id),
    last_message TEXT,
    last_message_at BIGINT DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    UNIQUE(user1_id, user2_id)
);

-- Сообщения
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.chats(id),
    sender_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.users(id),
    text TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
    read_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON t_p67547116_messenger_app_develo.messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON t_p67547116_messenger_app_develo.chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON t_p67547116_messenger_app_develo.chats(user2_id);
