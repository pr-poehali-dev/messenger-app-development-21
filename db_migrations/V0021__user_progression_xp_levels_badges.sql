-- Прокачка пользователей: XP, уровни, бейджи
ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS daily_streak INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS last_active_day INTEGER;

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.xp_events (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  amount        INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  created_at    BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_xp_events_user
  ON t_p67547116_messenger_app_develo.xp_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.user_badges (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  badge_code    TEXT NOT NULL,
  earned_at     BIGINT NOT NULL,
  UNIQUE(user_id, badge_code)
);
CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON t_p67547116_messenger_app_develo.user_badges(user_id);

-- Дневные счётчики (для антифарма)
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.xp_daily_counters (
  user_id       BIGINT NOT NULL,
  day           INTEGER NOT NULL,
  reason        TEXT NOT NULL,
  count         INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, reason)
);
