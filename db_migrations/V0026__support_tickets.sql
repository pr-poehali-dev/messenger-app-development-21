CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.support_tickets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    last_message_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint,
    closed_at BIGINT NULL,
    unread_for_user INTEGER NOT NULL DEFAULT 0,
    unread_for_admin INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user
    ON t_p67547116_messenger_app_develo.support_tickets (user_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON t_p67547116_messenger_app_develo.support_tickets (status, last_message_at DESC);

CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.support_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id BIGINT NOT NULL,
    sender_id BIGINT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    text TEXT NOT NULL DEFAULT '',
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()))::bigint
);

CREATE INDEX IF NOT EXISTS idx_support_messages_ticket
    ON t_p67547116_messenger_app_develo.support_messages (ticket_id, created_at);
