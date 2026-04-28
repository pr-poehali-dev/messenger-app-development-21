import os
import json
import time
import urllib.request
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

        # Проверяем — есть ли уже пользователь с таким номером
        cur.execute(f"SELECT id, phone, name, avatar_url, created_at FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        existing = cur.fetchone()
        if existing:
            # Номер уже занят — просто входим (обновляем last_seen)
            cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = %s WHERE phone = %s", (int(time.time()), phone))
            conn.close()
            return ok({"user": {"id": existing[0], "phone": existing[1], "name": existing[2], "avatar_url": existing[3], "created_at": existing[4]}, "existed": True})

        cur.execute(
            f"""INSERT INTO {SCHEMA}.users (phone, name, last_seen, created_at)
                VALUES (%s, %s, %s, %s)
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
            f"""SELECT m.id, m.sender_id, m.text, m.created_at, m.read_at, u.name, m.image_url
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON m.sender_id = u.id
                WHERE m.chat_id = %s AND m.created_at > %s
                ORDER BY m.created_at ASC LIMIT 100""",
            (int(chat_id), int(since))
        )
        rows = cur.fetchall()
        conn.close()
        messages = [{"id": r[0], "sender_id": r[1], "text": r[2], "created_at": r[3], "read_at": r[4], "sender_name": r[5], "image_url": r[6]} for r in rows]
        return ok({"messages": messages, "now": int(time.time())})

    # ── send_message ──────────────────────────────────────────────────────────
    if action == "send_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        text = (body.get("text") or "").strip()
        image_url = (body.get("image_url") or "").strip()
        if not chat_id or (not text and not image_url):
            conn.close()
            return err("Укажите chat_id и text или image_url")
        if not text and image_url:
            text = "📷 Фото"
        now = int(time.time())
        cur.execute(
            f"INSERT INTO {SCHEMA}.messages (chat_id, sender_id, text, image_url, created_at) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (int(chat_id), int(user_id), text, image_url or None, now)
        )
        msg_id = cur.fetchone()[0]
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET last_message = %s, last_message_at = %s WHERE id = %s",
            (text[:100], now, int(chat_id))
        )
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = %s WHERE id = %s", (now, int(user_id)))

        # Узнать имя отправителя и получателя для push
        cur.execute(
            f"""SELECT u.name,
                       CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END AS recipient_id
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.users u ON u.id = %s
                WHERE c.id = %s""",
            (int(user_id), int(user_id), int(chat_id))
        )
        row = cur.fetchone()
        conn.close()

        # Отправить push уведомление получателю (асинхронно через HTTP)
        if row:
            sender_name, recipient_id = row
            push_url = os.environ.get("PUSH_NOTIFY_URL", "")
            if push_url:
                try:
                    push_body = json.dumps({
                        "action": "send",
                        "recipient_id": recipient_id,
                        "sender_name": sender_name,
                        "message": text[:100],
                        "chat_id": int(chat_id),
                    }).encode("utf-8")
                    req = urllib.request.Request(push_url, data=push_body, headers={"Content-Type": "application/json"})
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass

        return ok({"id": msg_id, "created_at": now, "image_url": image_url or None})

    # ── update_profile ────────────────────────────────────────────────────────
    if action == "update_profile":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        new_name = (body.get("name") or "").strip()
        if not new_name or len(new_name) < 2:
            conn.close()
            return err("Имя слишком короткое")
        cur.execute(
            f"UPDATE {SCHEMA}.users SET name = %s WHERE id = %s RETURNING id, phone, name, avatar_url, created_at",
            (new_name, int(user_id))
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return err("Пользователь не найден", 404)
        return ok({"user": {"id": row[0], "phone": row[1], "name": row[2], "avatar_url": row[3], "created_at": row[4]}})

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

    # ── delete_message ────────────────────────────────────────────────────────
    if action == "delete_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        msg_id = body.get("message_id")
        if not msg_id:
            conn.close()
            return err("Укажите message_id")
        cur.execute(
            f"SELECT sender_id FROM {SCHEMA}.messages WHERE id = %s",
            (int(msg_id),)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Сообщение не найдено", 404)
        if row[0] != int(user_id):
            conn.close()
            return err("Нельзя удалить чужое сообщение", 403)
        cur.execute(f"DELETE FROM {SCHEMA}.messages WHERE id = %s", (int(msg_id),))
        conn.close()
        return ok({"ok": True})

    # ── get_contacts ──────────────────────────────────────────────────────────
    if action == "get_contacts":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        cur.execute(
            f"""SELECT u.id, u.name, u.phone, u.avatar_url, u.last_seen, c.name_override
                FROM {SCHEMA}.contacts c
                JOIN {SCHEMA}.users u ON u.id = c.contact_id
                WHERE c.user_id = %s
                ORDER BY COALESCE(c.name_override, u.name) ASC""",
            (int(user_id),)
        )
        rows = cur.fetchall()
        conn.close()
        contacts = [{"id": r[0], "name": r[4+1] or r[1], "real_name": r[1], "phone": r[2], "avatar_url": r[3], "last_seen": r[4]} for r in rows]
        return ok({"contacts": contacts})

    # ── add_contact ───────────────────────────────────────────────────────────
    if action == "add_contact":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        phone = (body.get("phone") or "").strip().replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
        if phone.startswith("8"):
            phone = "7" + phone[1:]
        if phone.startswith("+"):
            phone = phone[1:]
        name_override = (body.get("name") or "").strip() or None
        if not phone:
            conn.close()
            return err("Укажите phone")
        cur.execute(f"SELECT id, name FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        found = cur.fetchone()
        if not found:
            conn.close()
            return err("Пользователь с таким номером не найден")
        if found[0] == int(user_id):
            conn.close()
            return err("Нельзя добавить себя")
        now = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.contacts (user_id, contact_id, name_override, created_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, contact_id) DO UPDATE SET name_override = EXCLUDED.name_override
                RETURNING id""",
            (int(user_id), found[0], name_override, now)
        )
        conn.close()
        return ok({"ok": True, "contact": {"id": found[0], "name": name_override or found[1], "phone": phone}})

    # ── remove_contact ────────────────────────────────────────────────────────
    if action == "remove_contact":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        contact_id = body.get("contact_id")
        if not contact_id:
            conn.close()
            return err("Укажите contact_id")
        cur.execute(
            f"DELETE FROM {SCHEMA}.contacts WHERE user_id = %s AND contact_id = %s",
            (int(user_id), int(contact_id))
        )
        conn.close()
        return ok({"ok": True})

    # ── call_signal ───────────────────────────────────────────────────────────
    if action == "call_signal":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        call_id = (body.get("call_id") or "").strip()
        to_user_id = body.get("to_user_id")
        signal_type = (body.get("type") or "").strip()
        payload = body.get("payload")
        if not call_id or not to_user_id or not signal_type:
            conn.close()
            return err("Укажите call_id, to_user_id, type")
        now = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.call_signals (call_id, from_user_id, to_user_id, type, payload, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)""",
            (call_id, int(user_id), int(to_user_id), signal_type, json.dumps(payload) if payload else None, now)
        )
        conn.close()
        return ok({"ok": True})

    # ── get_call_signals ──────────────────────────────────────────────────────
    if action == "get_call_signals":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        call_id = (body.get("call_id") or params.get("call_id") or "").strip()
        since = int(body.get("since") or params.get("since") or 0)
        if not call_id:
            conn.close()
            return err("Укажите call_id")
        cur.execute(
            f"""SELECT id, from_user_id, type, payload, created_at
                FROM {SCHEMA}.call_signals
                WHERE call_id = %s AND to_user_id = %s AND created_at > %s
                ORDER BY id ASC LIMIT 20""",
            (call_id, int(user_id), since)
        )
        rows = cur.fetchall()
        conn.close()
        signals = [{"id": r[0], "from_user_id": r[1], "type": r[2], "payload": json.loads(r[3]) if r[3] else None, "created_at": r[4]} for r in rows]
        return ok({"signals": signals})

    # ── poll_incoming_call ────────────────────────────────────────────────────
    if action == "poll_incoming_call":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        since = int(body.get("since") or params.get("since") or (int(time.time()) - 30))
        cur.execute(
            f"""SELECT cs.call_id, cs.from_user_id, u.name, cs.created_at
                FROM {SCHEMA}.call_signals cs
                JOIN {SCHEMA}.users u ON u.id = cs.from_user_id
                WHERE cs.to_user_id = %s AND cs.type = 'offer' AND cs.created_at > %s
                ORDER BY cs.created_at DESC LIMIT 1""",
            (int(user_id), since)
        )
        row = cur.fetchone()
        conn.close()
        if row:
            return ok({"call": {"call_id": row[0], "from_user_id": row[1], "from_name": row[2], "created_at": row[3]}})
        return ok({"call": None})

    conn.close()
    return err("Неизвестный action")