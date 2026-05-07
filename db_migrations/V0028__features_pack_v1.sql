ALTER TABLE t_p67547116_messenger_app_develo.groups
    ADD COLUMN IF NOT EXISTS pinned_message_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS only_admins_post BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS slow_mode_seconds INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p67547116_messenger_app_develo.group_messages
    ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p67547116_messenger_app_develo.users
    ADD COLUMN IF NOT EXISTS theme_id TEXT NOT NULL DEFAULT 'dark',
    ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT 'violet',
    ADD COLUMN IF NOT EXISTS chat_wallpaper TEXT NULL,
    ADD COLUMN IF NOT EXISTS bubble_style TEXT NOT NULL DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS font_size INTEGER NOT NULL DEFAULT 14,
    ADD COLUMN IF NOT EXISTS app_lock_pin TEXT NULL,
    ADD COLUMN IF NOT EXISTS app_lock_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS last_seen_visibility TEXT NOT NULL DEFAULT 'everyone',
    ADD COLUMN IF NOT EXISTS profile_photo_visibility TEXT NOT NULL DEFAULT 'everyone',
    ADD COLUMN IF NOT EXISTS phone_visibility TEXT NOT NULL DEFAULT 'contacts',
    ADD COLUMN IF NOT EXISTS status_text TEXT NULL,
    ADD COLUMN IF NOT EXISTS status_until BIGINT NULL,
    ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_groups BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_calls BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS notify_sound TEXT NOT NULL DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS notify_vibration BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS quiet_hours_from INTEGER NULL,
    ADD COLUMN IF NOT EXISTS quiet_hours_to INTEGER NULL;

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.bot_commands (
    id BIGSERIAL PRIMARY KEY,
    bot_id BIGINT NOT NULL,
    command TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_bot_commands ON t_p67547116_messenger_app_develo.bot_commands (bot_id);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.payment_requests (
    id BIGSERIAL PRIMARY KEY,
    from_user_id BIGINT NOT NULL,
    to_user_id BIGINT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    chat_id BIGINT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    paid_at BIGINT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_requests
    ON t_p67547116_messenger_app_develo.payment_requests (to_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.message_drafts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NULL,
    group_id BIGINT NULL,
    text TEXT NOT NULL DEFAULT '',
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);
CREATE INDEX IF NOT EXISTS idx_drafts_user
    ON t_p67547116_messenger_app_develo.message_drafts (user_id);
