import os
import json
import time
import psycopg2

SCHEMA = os.environ.get("MAIN_DB_SCHEMA", "t_p67547116_messenger_app_develo")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def get_conn():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    return conn


def ok(data):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data, ensure_ascii=False)}


def err(msg, code=400):
    return {"statusCode": code, "headers": CORS, "body": json.dumps({"error": msg}, ensure_ascii=False)}


def handler(event: dict, context) -> dict:
    """
    Chat API для Nova мессенджера.
    Все действия передаются через поле action в теле запроса или query-параметре.

    Actions:
    - register       — создать/обновить профиль пользователя
    - get_me         — получить свой профиль
    - get_users      — список всех пользователей (для поиска)
    - get_chats      — список чатов текущего пользователя
    - get_or_create_chat — открыть чат с пользователем
    - get_messages   — сообщения чата (с поддержкой since для polling)
    - send_message   — отправить сообщение
    - mark_read      — пометить сообщения прочитанными
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    params = event.get("queryStringParameters") or {}
    action = body.get("action") or params.get("action", "")
    user_id = event.get("headers", {}).get("X-User-Id") or params.get("user_id")

    conn = get_conn()
    cur = conn.cursor()

    # ── register ──────────────────────────────────────────────────────────────
    if action == "register":
        phone = (body.get("phone") or "").strip()
        name = (body.get("name") or "").strip()
        if not phone or not name:
            conn.close()
            return err("Укажите phone и name")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (phone, name, last_seen, created_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name, last_seen = EXCLUDED.last_seen
                RETURNING id, phone, name, avatar_url, created_at""",
            (phone, name, int(time.time()), int(time.time()))
        )
        row = cur.fetchone()
        conn.close()
        return ok({"user": {"id": row[0], "phone": row[1], "name": row[2], "avatar_url": row[3], "created_at": row[4]}})

    # ── get_me ────────────────────────────────────────────────────────────────
    if action == "get_me":
        phone = (body.get("phone") or params.get("phone") or "").strip()
        if not phone:
            conn.close()
            return err("Укажите phone")
        cur.execute(f"SELECT id, phone, name, avatar_url, created_at FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Пользователь не найден", 404)
        return ok({"user": {"id": row[0], "phone": row[1], "name": row[2], "avatar_url": row[3], "created_at": row[4]}})

    # ── get_users ─────────────────────────────────────────────────────────────
    if action == "get_users":
        query = (body.get("query") or params.get("query") or "").strip()
        exclude_id = body.get("exclude_id") or params.get("exclude_id")
        if query:
            cur.execute(
                f"SELECT id, name, phone, avatar_url, last_seen FROM {SCHEMA}.users WHERE (name ILIKE %s OR phone LIKE %s) AND id != %s LIMIT 30",
                (f"%{query}%", f"%{query}%", exclude_id or 0)
            )
        else:
            cur.execute(
                f"SELECT id, name, phone, avatar_url, last_seen FROM {SCHEMA}.users WHERE id != %s ORDER BY last_seen DESC LIMIT 50",
                (exclude_id or 0,)
            )
        rows = cur.fetchall()
        conn.close()
        users = [{"id": r[0], "name": r[1], "phone": r[2], "avatar_url": r[3], "last_seen": r[4]} for r in rows]
        return ok({"users": users})

    # ── get_chats ─────────────────────────────────────────────────────────────
    if action == "get_chats":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        cur.execute(
            f"""SELECT c.id, c.last_message, c.last_message_at,
                       u.id, u.name, u.phone, u.avatar_url, u.last_seen
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.users u ON (
                    CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END = u.id
                )
                WHERE c.user1_id = %s OR c.user2_id = %s
                ORDER BY c.last_message_at DESC NULLS LAST""",
            (int(user_id), int(user_id), int(user_id))
        )
        rows = cur.fetchall()

        # Непрочитанные для каждого чата
        unread_map = {}
        if rows:
            chat_ids = [r[0] for r in rows]
            placeholders = ",".join(["%s"] * len(chat_ids))
            cur.execute(
                f"""SELECT chat_id, COUNT(*) FROM {SCHEMA}.messages
                    WHERE chat_id IN ({placeholders}) AND sender_id != %s AND read_at IS NULL
                    GROUP BY chat_id""",
                (*chat_ids, int(user_id))
            )
            for r in cur.fetchall():
                unread_map[r[0]] = r[1]

        conn.close()
        chats = [{
            "id": r[0], "last_message": r[1], "last_message_at": r[2],
            "partner": {"id": r[3], "name": r[4], "phone": r[5], "avatar_url": r[6], "last_seen": r[7]},
            "unread": unread_map.get(r[0], 0)
        } for r in rows]
        return ok({"chats": chats})

    # ── get_or_create_chat ────────────────────────────────────────────────────
    if action == "get_or_create_chat":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        partner_id = body.get("partner_id")
        if not partner_id:
            conn.close()
            return err("Укажите partner_id")
        uid, pid = sorted([int(user_id), int(partner_id)])
        cur.execute(
            f"""INSERT INTO {SCHEMA}.chats (user1_id, user2_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user1_id, user2_id) DO UPDATE SET user1_id = EXCLUDED.user1_id
                RETURNING id""",
            (uid, pid, int(time.time()))
        )
        chat_id = cur.fetchone()[0]
        conn.close()
        return ok({"chat_id": chat_id})

    # ── get_messages ──────────────────────────────────────────────────────────
    if action == "get_messages":
        chat_id = body.get("chat_id") or params.get("chat_id")
        since = body.get("since") or params.get("since") or 0
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"""SELECT m.id, m.sender_id, m.text, m.created_at, m.read_at, u.name
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON m.sender_id = u.id
                WHERE m.chat_id = %s AND m.created_at > %s
                ORDER BY m.created_at ASC LIMIT 100""",
            (int(chat_id), int(since))
        )
        rows = cur.fetchall()
        conn.close()
        messages = [{"id": r[0], "sender_id": r[1], "text": r[2], "created_at": r[3], "read_at": r[4], "sender_name": r[5]} for r in rows]
        return ok({"messages": messages, "now": int(time.time())})

    # ── send_message ──────────────────────────────────────────────────────────
    if action == "send_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        text = (body.get("text") or "").strip()
        if not chat_id or not text:
            conn.close()
            return err("Укажите chat_id и text")
        now = int(time.time())
        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, created_at) VALUES (%s, %s, %s, %s) RETURNING id",
            (int(chat_id), int(user_id), text, now)
        )
        msg_id = cur.fetchone()[0]
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET last_message = %s, last_message_at = %s WHERE id = %s",
            (text[:100], now, int(chat_id))
        )
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = %s WHERE id = %s", (now, int(user_id)))
        conn.close()
        return ok({"id": msg_id, "created_at": now})

    # ── mark_read ─────────────────────────────────────────────────────────────
    if action == "mark_read":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        now = int(time.time())
        cur.execute(
            f"UPDATE {SCHEMA}.messages SET read_at = %s WHERE chat_id = %s AND sender_id != %s AND read_at IS NULL",
            (now, int(chat_id), int(user_id))
        )
        conn.close()
        return ok({"ok": True})

    conn.close()
    return err("Неизвестный action")
