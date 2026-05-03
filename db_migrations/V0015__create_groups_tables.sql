CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.groups (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  description      TEXT DEFAULT '',
  avatar_url       TEXT,
  owner_id         BIGINT NOT NULL,
  is_channel       BOOLEAN DEFAULT FALSE,
  invite_link      TEXT UNIQUE,
  created_at       BIGINT NOT NULL,
  last_message     TEXT DEFAULT '',
  last_message_at  BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.group_members (
  id         BIGSERIAL PRIMARY KEY,
  group_id   BIGINT NOT NULL,
  user_id    BIGINT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'member',
  joined_at  BIGINT NOT NULL,
  UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.group_messages (
  id          BIGSERIAL PRIMARY KEY,
  group_id    BIGINT NOT NULL,
  sender_id   BIGINT NOT NULL,
  text        TEXT NOT NULL DEFAULT '',
  media_type  TEXT,
  media_url   TEXT,
  file_name   TEXT,
  file_size   BIGINT,
  duration    INTEGER,
  reply_to_id BIGINT,
  created_at  BIGINT NOT NULL,
  edited_at   BIGINT,
  removed_at  BIGINT,
  kind        TEXT DEFAULT 'text'
);

CREATE INDEX IF NOT EXISTS idx_group_members_group   ON t_p67547116_messenger_app_develo.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user    ON t_p67547116_messenger_app_develo.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group  ON t_p67547116_messenger_app_develo.group_messages(group_id, created_at DESC);
