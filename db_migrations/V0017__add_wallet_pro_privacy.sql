-- Кошелёк, Pro и приватность
ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pro_until BIGINT,
  ADD COLUMN IF NOT EXISTS emoji_status TEXT,
  ADD COLUMN IF NOT EXISTS name_color TEXT,
  ADD COLUMN IF NOT EXISTS incognito BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS who_can_message TEXT DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS who_can_call TEXT DEFAULT 'everyone';

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.wallet_transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL,
  amount      NUMERIC(12,2) NOT NULL,
  kind        TEXT NOT NULL,
  description TEXT DEFAULT '',
  balance_after NUMERIC(12,2) NOT NULL,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON t_p67547116_messenger_app_develo.wallet_transactions(user_id, created_at DESC);
