-- Добавляем медиа поля в messages
ALTER TABLE t_p67547116_messenger_app_develo.messages
  ADD COLUMN IF NOT EXISTS media_type TEXT NULL,
  ADD COLUMN IF NOT EXISTS media_url TEXT NULL,
  ADD COLUMN IF NOT EXISTS file_name TEXT NULL,
  ADD COLUMN IF NOT EXISTS file_size BIGINT NULL,
  ADD COLUMN IF NOT EXISTS duration INTEGER NULL;

-- Таблица реакций на сообщения
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.message_reactions (
  id BIGSERIAL PRIMARY KEY,
  message_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.messages(id),
  user_id BIGINT NOT NULL REFERENCES t_p67547116_messenger_app_develo.users(id),
  emoji TEXT NOT NULL,
  created_at BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
  UNIQUE(message_id, user_id)
);
