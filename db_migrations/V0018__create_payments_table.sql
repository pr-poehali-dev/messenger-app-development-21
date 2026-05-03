CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.payments (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL,
  yookassa_id     TEXT UNIQUE,
  amount          NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'RUB',
  status          TEXT NOT NULL DEFAULT 'pending',
  description     TEXT DEFAULT '',
  payment_method  TEXT,
  created_at      BIGINT NOT NULL,
  paid_at         BIGINT,
  metadata        TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON t_p67547116_messenger_app_develo.payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_yk   ON t_p67547116_messenger_app_develo.payments(yookassa_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON t_p67547116_messenger_app_develo.payments(status);
