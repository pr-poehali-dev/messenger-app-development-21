import os
import json
import time
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p67547116_messenger_app_develo")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
}


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def check_auth(event):
    token = event.get("headers", {}).get("X-Admin-Token", "")
    password = os.environ.get("ADMIN_PASSWORD", "")
    return token == password and password != ""


def handler(event: dict, context) -> dict:
    """Панель администратора Nova — статистика, пользователи, управление."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if not check_auth(event):
        return err("Нет доступа", 403)

    body = json.loads(event.get("body") or "{}")
    params = event.get("queryStringParameters") or {}
    action = body.get("action") or params.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    # ── stats — общая статистика и нагрузка ──────────────────────────────────
    if action == "stats":
        now = int(time.time())

        # Пользователи
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
        total_users = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE last_seen > %s", (now - 300,))
        online_users = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users WHERE created_at > %s", (now - 86400,))
        new_users_24h = cur.fetchone()[0]

        # Сообщения
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages")
        total_messages = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE created_at > %s", (now - 3600,))
        messages_1h = cur.fetchone()[0]

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE created_at > %s", (now - 86400,))
        messages_24h = cur.fetchone()[0]

        # Чаты
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.chats")
        total_chats = cur.fetchone()[0]

        # Push подписки
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.push_subscriptions")
        push_subs = cur.fetchone()[0]

        # Сигналы звонков за последний час
        cur.execute(f"SELECT COUNT(DISTINCT call_id) FROM {SCHEMA}.call_signals WHERE created_at > %s", (now - 3600,))
        calls_1h = cur.fetchone()[0]

        # Нагрузка: сообщений в минуту за последние 5 минут
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE created_at > %s", (now - 300,))
        msg_5min = cur.fetchone()[0]
        msg_per_min = round(msg_5min / 5, 1)

        conn.close()

        # Оценка нагрузки
        if msg_per_min > 10:
            load_level = "high"
            load_tip = "Высокая нагрузка. Рассмотри кэширование запросов и индексы БД."
        elif msg_per_min > 3:
            load_level = "medium"
            load_tip = "Умеренная нагрузка. Всё работает хорошо."
        else:
            load_level = "low"
            load_tip = "Низкая нагрузка. Сервер работает спокойно."

        return ok({
            "users": {
                "total": total_users,
                "online": online_users,
                "new_24h": new_users_24h,
            },
            "messages": {
                "total": total_messages,
                "last_1h": messages_1h,
                "last_24h": messages_24h,
                "per_min": msg_per_min,
            },
            "chats": total_chats,
            "push_subs": push_subs,
            "calls_1h": calls_1h,
            "load": {
                "level": load_level,
                "tip": load_tip,
                "msg_per_min": msg_per_min,
            },
            "timestamp": now,
        })

    # ── users — список пользователей ─────────────────────────────────────────
    if action == "users":
        limit = int(body.get("limit") or params.get("limit") or 50)
        offset = int(body.get("offset") or params.get("offset") or 0)
        search = (body.get("search") or params.get("search") or "").strip()

        if search:
            cur.execute(
                f"""SELECT id, phone, name, avatar_url, last_seen, created_at
                    FROM {SCHEMA}.users
                    WHERE name ILIKE %s OR phone LIKE %s
                    ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                (f"%{search}%", f"%{search}%", limit, offset)
            )
        else:
            cur.execute(
                f"""SELECT id, phone, name, avatar_url, last_seen, created_at
                    FROM {SCHEMA}.users
                    ORDER BY created_at DESC LIMIT %s OFFSET %s""",
                (limit, offset)
            )
        rows = cur.fetchall()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users" + (f" WHERE name ILIKE %s OR phone LIKE %s" if search else ""),
                    *([( f"%{search}%", f"%{search}%")] if search else []))
        total = cur.fetchone()[0]
        conn.close()

        now = int(time.time())
        users = [{
            "id": r[0],
            "phone": r[1],
            "name": r[2],
            "avatar_url": r[3],
            "last_seen": r[4],
            "created_at": r[5],
            "online": (now - (r[4] or 0)) < 300,
        } for r in rows]
        return ok({"users": users, "total": total})

    # ── update_user — редактирование пользователя ─────────────────────────────
    if action == "update_user":
        user_id = body.get("user_id")
        new_name = (body.get("name") or "").strip()
        if not user_id or not new_name:
            conn.close()
            return err("Нужен user_id и name")
        cur.execute(
            f"UPDATE {SCHEMA}.users SET name = %s WHERE id = %s RETURNING id, phone, name, last_seen, created_at",
            (new_name, int(user_id))
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Пользователь не найден", 404)
        return ok({"user": {"id": row[0], "phone": row[1], "name": row[2], "last_seen": row[3], "created_at": row[4]}})

    # ── delete_user — удаление пользователя ──────────────────────────────────
    if action == "delete_user":
        user_id = body.get("user_id")
        if not user_id:
            conn.close()
            return err("Нужен user_id")
        cur.execute(f"DELETE FROM {SCHEMA}.messages WHERE sender_id = %s", (int(user_id),))
        cur.execute(f"DELETE FROM {SCHEMA}.push_subscriptions WHERE user_id = %s", (int(user_id),))
        cur.execute(f"DELETE FROM {SCHEMA}.contacts WHERE user_id = %s OR contact_id = %s", (int(user_id), int(user_id)))
        cur.execute(f"DELETE FROM {SCHEMA}.users WHERE id = %s", (int(user_id),))
        conn.close()
        return ok({"ok": True})

    # ── user_detail — детальная информация ───────────────────────────────────
    if action == "user_detail":
        user_id = body.get("user_id") or params.get("user_id")
        if not user_id:
            conn.close()
            return err("Нужен user_id")
        cur.execute(
            f"SELECT id, phone, name, avatar_url, last_seen, created_at FROM {SCHEMA}.users WHERE id = %s",
            (int(user_id),)
        )
        u = cur.fetchone()
        if not u:
            conn.close()
            return err("Не найден", 404)
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.messages WHERE sender_id = %s", (int(user_id),))
        msg_count = cur.fetchone()[0]
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.chats WHERE user1_id = %s OR user2_id = %s", (int(user_id), int(user_id)))
        chat_count = cur.fetchone()[0]
        conn.close()
        return ok({"user": {
            "id": u[0], "phone": u[1], "name": u[2], "avatar_url": u[3],
            "last_seen": u[4], "created_at": u[5],
            "msg_count": msg_count, "chat_count": chat_count,
        }})

    conn.close()
    return err("Неизвестный action")
