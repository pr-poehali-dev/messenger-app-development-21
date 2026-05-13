-- Rate limit на send_message и register
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.rate_limits (
    key TEXT NOT NULL,
    window_start BIGINT NOT NULL,
    counter INT NOT NULL DEFAULT 0,
    PRIMARY KEY (key)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_window
  ON t_p67547116_messenger_app_develo.rate_limits (window_start);

-- DAU/MAU: индекс по last_seen для быстрых аналитик в админке
CREATE INDEX IF NOT EXISTS idx_users_last_seen
  ON t_p67547116_messenger_app_develo.users (last_seen);

-- Подсказка незнакомца: есть таблица contacts; нужна быстрая проверка существования
CREATE INDEX IF NOT EXISTS idx_contacts_pair
  ON t_p67547116_messenger_app_develo.contacts (user_id, contact_id);
