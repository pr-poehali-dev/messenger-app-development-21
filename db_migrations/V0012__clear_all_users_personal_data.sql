UPDATE t_p67547116_messenger_app_develo.users
SET name = '',
    avatar_url = NULL,
    last_seen = 0,
    phone = 'cleared_' || id::text;
