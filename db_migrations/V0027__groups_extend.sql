-- Расширяем группы и сообщения групп
ALTER TABLE t_p67547116_messenger_app_develo.groups
    ADD COLUMN IF NOT EXISTS pinned_message_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS only_admins_post BOOLEAN NOT NULL DEFAULT FALSE;

-- Авто-инвайт для существующих групп (если пустой)
UPDATE t_p67547116_messenger_app_develo.groups
SET invite_link = substr(md5(random()::text || id::text), 1, 12)
WHERE invite_link IS NULL OR invite_link = '';

ALTER TABLE t_p67547116_messenger_app_develo.group_messages
    ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.group_message_reactions (
    id BIGSERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    emoji TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    UNIQUE(message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gmr_msg ON t_p67547116_messenger_app_develo.group_message_reactions(message_id);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.group_message_views (
    message_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    viewed_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    PRIMARY KEY (message_id, user_id)
);
