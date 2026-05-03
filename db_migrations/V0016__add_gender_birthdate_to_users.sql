ALTER TABLE t_p67547116_messenger_app_develo.users
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS birthdate DATE;
