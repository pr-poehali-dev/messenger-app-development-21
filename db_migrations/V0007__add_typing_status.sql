CREATE TABLE IF NOT EXISTS t_p67547116_messenger_app_develo.typing_status (
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (chat_id, user_id)
);
