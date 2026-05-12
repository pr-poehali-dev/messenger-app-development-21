CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.group_mute (
    user_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    muted_until BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created
  ON t_p67547116_messenger_app_develo.messages (chat_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON t_p67547116_messenger_app_develo.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat_unread
  ON t_p67547116_messenger_app_develo.messages (chat_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_group_messages_group_created
  ON t_p67547116_messenger_app_develo.group_messages (group_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_members_group
  ON t_p67547116_messenger_app_develo.group_members (group_id);

CREATE INDEX IF NOT EXISTS idx_group_members_user
  ON t_p67547116_messenger_app_develo.group_members (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON t_p67547116_messenger_app_develo.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_user
  ON t_p67547116_messenger_app_develo.contacts (user_id);

CREATE INDEX IF NOT EXISTS idx_typing_status_updated
  ON t_p67547116_messenger_app_develo.typing_status (updated_at);

CREATE INDEX IF NOT EXISTS idx_stories_expires
  ON t_p67547116_messenger_app_develo.stories (expires_at);
