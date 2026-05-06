-- Запланированные сообщения и обои чата
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.scheduled_messages (
    id BIGSERIAL PRIMARY KEY,
    chat_id BIGINT NOT NULL,
    sender_id BIGINT NOT NULL,
    text TEXT NOT NULL DEFAULT '',
    media_url TEXT NULL,
    media_type TEXT NULL,
    file_name TEXT NULL,
    file_size BIGINT NULL,
    duration INTEGER NULL,
    scheduled_at BIGINT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    sent_at BIGINT NULL,
    cancelled_at BIGINT NULL,
    sent_message_id BIGINT NULL
);

CREATE INDEX IF NOT EXISTS idx_scheduled_due
    ON t_p67547116_messenger_app_develo.scheduled_messages (scheduled_at)
    WHERE sent_at IS NULL AND cancelled_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_sender_chat
    ON t_p67547116_messenger_app_develo.scheduled_messages (sender_id, chat_id);

-- Обои чата (для каждого юзера в каждом чате)
ALTER TABLE t_p67547116_messenger_app_develo.chat_settings
    ADD COLUMN IF NOT EXISTS wallpaper TEXT NULL;
