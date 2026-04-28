CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    name_override TEXT,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, contact_id)
);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.call_signals (
    id SERIAL PRIMARY KEY,
    call_id TEXT NOT NULL,
    from_user_id INTEGER NOT NULL,
    to_user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_call_signals_call_id ON t_p67547116_messenger_app_develo.call_signals(call_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_to_user ON t_p67547116_messenger_app_develo.call_signals(to_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON t_p67547116_messenger_app_develo.contacts(user_id);
