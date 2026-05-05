ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_owner_id BIGINT,
  ADD COLUMN IF NOT EXISTS bot_username TEXT,
  ADD COLUMN IF NOT EXISTS bot_token TEXT,
  ADD COLUMN IF NOT EXISTS bot_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS bot_description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_bot_username_uniq
  ON t_p67547116_messenger_app_develo.users(bot_username) WHERE bot_username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_bot_token_uniq
  ON t_p67547116_messenger_app_develo.users(bot_token) WHERE bot_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_bot_owner_idx
  ON t_p67547116_messenger_app_develo.users(bot_owner_id) WHERE bot_owner_id IS NOT NULL;
