CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.stories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  expires_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS stories_user_idx ON t_p67547116_messenger_app_develo.stories(user_id);
CREATE INDEX IF NOT EXISTS stories_expires_idx ON t_p67547116_messenger_app_develo.stories(expires_at);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.story_views (
  story_id BIGINT NOT NULL,
  viewer_id BIGINT NOT NULL,
  viewed_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
  PRIMARY KEY (story_id, viewer_id)
);
