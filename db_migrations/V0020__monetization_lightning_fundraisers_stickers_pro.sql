-- Молнии (внутренняя валюта)
ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS lightning_balance INTEGER NOT NULL DEFAULT 0;

ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS pro_trial_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS stickers_subscription_until BIGINT;

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.lightning_transactions (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL,
  amount        INTEGER NOT NULL,
  kind          TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  related_user_id BIGINT,
  balance_after INTEGER NOT NULL,
  created_at    BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lightning_tx_user
  ON t_p67547116_messenger_app_develo.lightning_transactions(user_id, created_at DESC);

-- Сборы средств
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.fundraisers (
  id              BIGSERIAL PRIMARY KEY,
  owner_id        BIGINT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  cover_url       TEXT,
  target_amount   NUMERIC(12,2) NOT NULL,
  collected_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      BIGINT NOT NULL,
  closed_at       BIGINT
);
CREATE INDEX IF NOT EXISTS idx_fundraisers_owner
  ON t_p67547116_messenger_app_develo.fundraisers(owner_id);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.fundraiser_payments (
  id              BIGSERIAL PRIMARY KEY,
  fundraiser_id   BIGINT NOT NULL,
  donor_id        BIGINT,
  donor_name      TEXT,
  amount          NUMERIC(12,2) NOT NULL,
  message         TEXT DEFAULT '',
  is_anonymous    BOOLEAN DEFAULT FALSE,
  source          TEXT NOT NULL DEFAULT 'wallet',
  yookassa_payment_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending',
  created_at      BIGINT NOT NULL,
  paid_at         BIGINT
);
CREATE INDEX IF NOT EXISTS idx_fund_payments_fund
  ON t_p67547116_messenger_app_develo.fundraiser_payments(fundraiser_id, created_at DESC);

-- Магазин стикеров
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.sticker_packs (
  id              BIGSERIAL PRIMARY KEY,
  author_id       BIGINT,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  cover_url       TEXT,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_premium      BOOLEAN NOT NULL DEFAULT FALSE,
  is_published    BOOLEAN NOT NULL DEFAULT TRUE,
  total_sales     INTEGER NOT NULL DEFAULT 0,
  created_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.sticker_items (
  id              BIGSERIAL PRIMARY KEY,
  pack_id         BIGINT NOT NULL,
  emoji           TEXT NOT NULL DEFAULT '',
  image_url       TEXT NOT NULL,
  position        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sticker_items_pack
  ON t_p67547116_messenger_app_develo.sticker_items(pack_id);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.user_sticker_packs (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  pack_id         BIGINT NOT NULL,
  acquired_at     BIGINT NOT NULL,
  acquired_via    TEXT NOT NULL DEFAULT 'free',
  UNIQUE(user_id, pack_id)
);

-- Подписки Pro (история)
CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.pro_subscriptions (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  plan            TEXT NOT NULL,
  amount          NUMERIC(10,2) NOT NULL,
  source          TEXT NOT NULL DEFAULT 'wallet',
  yookassa_payment_id TEXT,
  starts_at       BIGINT NOT NULL,
  ends_at         BIGINT NOT NULL,
  is_trial        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pro_sub_user
  ON t_p67547116_messenger_app_develo.pro_subscriptions(user_id, created_at DESC);

-- Расширим orders для всех типов покупок
ALTER TABLE t_p67547116_messenger_app_develo.orders
  ADD COLUMN IF NOT EXISTS related_id BIGINT;
ALTER TABLE t_p67547116_messenger_app_develo.orders
  ADD COLUMN IF NOT EXISTS metadata_json TEXT;

-- Расширим messages для новых типов
ALTER TABLE t_p67547116_messenger_app_develo.messages
  ADD COLUMN IF NOT EXISTS payload_json TEXT;
ALTER TABLE t_p67547116_messenger_app_develo.group_messages
  ADD COLUMN IF NOT EXISTS payload_json TEXT;
ALTER TABLE t_p67547116_messenger_app_develo.group_messages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text';
