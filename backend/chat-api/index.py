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
    Actions: register, get_me, get_users, get_chats, get_or_create_chat,
    get_messages, send_message, mark_read, set_typing, get_typing,
    delete_message, get_contacts, add_contact, remove_contact,
    update_profile, call_signal, get_call_signals, poll_incoming_call,
    add_reaction, get_reactions.
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

        cur.execute(f"SELECT id, phone, name, avatar_url, created_at FROM {SCHEMA}.users WHERE phone = %s", (phone,))
        existing = cur.fetchone()
        if existing:
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
        archived_flag = str(body.get("archived") or params.get("archived") or "").lower() in ("1", "true")
        cur.execute(
            f"""SELECT c.id, c.last_message, c.last_message_at,
                       u.id, u.name, u.phone, u.avatar_url, u.last_seen,
                       COALESCE(cs.muted, FALSE),
                       COALESCE(cs.pinned, FALSE),
                       COALESCE(cs.favorite, FALSE),
                       COALESCE(cs.cleared_at, 0),
                       COALESCE(cs.archived, FALSE)
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.users u ON (
                    CASE WHEN c.user1_id = %s THEN c.user2_id ELSE c.user1_id END = u.id
                )
                LEFT JOIN {SCHEMA}.chat_settings cs
                    ON cs.chat_id = c.id AND cs.user_id = %s
                WHERE (c.user1_id = %s OR c.user2_id = %s)
                  AND u.id NOT IN (
                      SELECT blocked_id FROM {SCHEMA}.user_blocks WHERE blocker_id = %s
                  )
                  AND COALESCE(cs.archived, FALSE) = %s
                ORDER BY COALESCE(cs.pinned, FALSE) DESC,
                         c.last_message_at DESC NULLS LAST""",
            (int(user_id), int(user_id), int(user_id), int(user_id), int(user_id), archived_flag)
        )
        rows = cur.fetchall()

        unread_map = {}
        if rows:
            chat_ids = [r[0] for r in rows]
            placeholders = ",".join(["%s"] * len(chat_ids))
            cur.execute(
                f"""SELECT m.chat_id, COUNT(*) FROM {SCHEMA}.messages m
                    LEFT JOIN {SCHEMA}.chat_settings cs
                        ON cs.chat_id = m.chat_id AND cs.user_id = %s
                    WHERE m.chat_id IN ({placeholders})
                      AND m.sender_id != %s
                      AND m.read_at IS NULL
                      AND m.created_at > COALESCE(cs.cleared_at, 0)
                    GROUP BY m.chat_id""",
                (int(user_id), *chat_ids, int(user_id))
            )
            for r in cur.fetchall():
                unread_map[r[0]] = r[1]

        chats = [{
            "id": r[0], "last_message": r[1], "last_message_at": r[2],
            "partner": {"id": r[3], "name": r[4], "phone": r[5], "avatar_url": r[6], "last_seen": r[7]},
            "unread": unread_map.get(r[0], 0),
            "muted": r[8], "pinned": r[9], "favorite": r[10], "cleared_at": r[11], "archived": r[12],
        } for r in rows]

        # количество архивированных (для бэйджа)
        cur.execute(
            f"""SELECT COUNT(*) FROM {SCHEMA}.chat_settings cs
                JOIN {SCHEMA}.chats c ON c.id = cs.chat_id
                WHERE cs.user_id = %s AND cs.archived = TRUE
                  AND (c.user1_id = %s OR c.user2_id = %s)""",
            (int(user_id), int(user_id), int(user_id))
        )
        archived_count = cur.fetchone()[0] or 0
        conn.close()
        return ok({"chats": chats, "archived_count": archived_count})

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

        cleared_at = 0
        if user_id:
            cur.execute(
                f"SELECT cleared_at FROM {SCHEMA}.chat_settings WHERE user_id = %s AND chat_id = %s",
                (int(user_id), int(chat_id))
            )
            r = cur.fetchone()
            if r and r[0]:
                cleared_at = int(r[0])
        effective_since = max(int(since), cleared_at)

        cur.execute(
            f"""SELECT m.id, m.sender_id, m.text, m.created_at, m.read_at, u.name,
                       m.image_url, m.media_type, m.media_url, m.file_name, m.file_size, m.duration,
                       m.reply_to_id, m.forwarded_from_user_id, m.forwarded_from_name, m.edited_at
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON m.sender_id = u.id
                WHERE m.chat_id = %s AND m.created_at > %s AND m.removed_at IS NULL
                ORDER BY m.created_at ASC LIMIT 100""",
            (int(chat_id), effective_since)
        )
        rows = cur.fetchall()

        # Подгружаем краткую инфу для reply_to (id, sender_name, text)
        reply_map = {}
        reply_ids = [r[12] for r in rows if r[12]]
        if reply_ids:
            placeholders = ",".join(["%s"] * len(reply_ids))
            cur.execute(
                f"""SELECT m.id, u.name, m.text, m.media_type
                    FROM {SCHEMA}.messages m
                    JOIN {SCHEMA}.users u ON u.id = m.sender_id
                    WHERE m.id IN ({placeholders})""",
                reply_ids
            )
            for rr in cur.fetchall():
                reply_map[rr[0]] = {"id": rr[0], "sender_name": rr[1], "text": rr[2], "media_type": rr[3]}

        # Получаем реакции для этих сообщений
        reactions_map = {}
        if rows:
            msg_ids = [r[0] for r in rows]
            placeholders = ",".join(["%s"] * len(msg_ids))
            cur.execute(
                f"""SELECT mr.message_id, mr.emoji, u.name, mr.user_id
                    FROM {SCHEMA}.message_reactions mr
                    JOIN {SCHEMA}.users u ON u.id = mr.user_id
                    WHERE mr.message_id IN ({placeholders})""",
                msg_ids
            )
            for r in cur.fetchall():
                mid = r[0]
                if mid not in reactions_map:
                    reactions_map[mid] = []
                reactions_map[mid].append({"emoji": r[1], "user_name": r[2], "user_id": r[3]})

        # ids удалённых за период (чтобы фронт убрал их из DOM)
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.messages
                WHERE chat_id = %s AND removed_at IS NOT NULL""",
            (int(chat_id),)
        )
        removed_ids = [r[0] for r in cur.fetchall()]

        conn.close()
        messages = [{
            "id": r[0], "sender_id": r[1], "text": r[2], "created_at": r[3],
            "read_at": r[4], "sender_name": r[5],
            "image_url": r[6],
            "media_type": r[7], "media_url": r[8],
            "file_name": r[9], "file_size": r[10], "duration": r[11],
            "reply_to": reply_map.get(r[12]) if r[12] else None,
            "forwarded_from_user_id": r[13],
            "forwarded_from_name": r[14],
            "edited_at": r[15],
            "reactions": reactions_map.get(r[0], []),
        } for r in rows]
        return ok({"messages": messages, "removed_ids": removed_ids, "now": int(time.time())})

    # ── send_message ──────────────────────────────────────────────────────────
    if action == "send_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        text = (body.get("text") or "").strip()
        image_url = (body.get("image_url") or "").strip()
        media_type = (body.get("media_type") or "").strip()
        media_url = (body.get("media_url") or "").strip()
        file_name = (body.get("file_name") or "").strip() or None
        file_size = body.get("file_size") or None
        duration = body.get("duration") or None
        reply_to_id = body.get("reply_to_id") or None
        forwarded_from_user_id = body.get("forwarded_from_user_id") or None
        forwarded_from_name = (body.get("forwarded_from_name") or "").strip() or None

        # Совместимость: image_url → media
        if image_url and not media_url:
            media_url = image_url
            media_type = "image"

        if not chat_id or (not text and not media_url):
            conn.close()
            return err("Укажите chat_id и text или media")

        # Автотекст по типу медиа
        if not text and media_url:
            auto_text = {"image": "📷 Фото", "video": "🎥 Видео", "audio": "🎵 Голосовое", "file": f"📎 {file_name or 'Файл'}"}.get(media_type, "📎 Файл")
            text = auto_text

        now = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.messages
                (chat_id, sender_id, text, image_url, media_type, media_url, file_name, file_size, duration, created_at,
                 reply_to_id, forwarded_from_user_id, forwarded_from_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (int(chat_id), int(user_id), text,
             media_url if media_type == "image" else None,
             media_type or None, media_url or None,
             file_name, file_size, duration, now,
             int(reply_to_id) if reply_to_id else None,
             int(forwarded_from_user_id) if forwarded_from_user_id else None,
             forwarded_from_name)
        )
        msg_id = cur.fetchone()[0]
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET last_message = %s, last_message_at = %s WHERE id = %s",
            (text[:100], now, int(chat_id))
        )
        cur.execute(f"UPDATE {SCHEMA}.users SET last_seen = %s WHERE id = %s", (now, int(user_id)))

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

        return ok({"id": msg_id, "created_at": now, "media_url": media_url or None, "media_type": media_type or None, "image_url": media_url if media_type == "image" else None})

    # ── add_reaction ──────────────────────────────────────────────────────────
    if action == "add_reaction":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        msg_id = body.get("message_id")
        emoji = (body.get("emoji") or "").strip()
        if not msg_id or not emoji:
            conn.close()
            return err("Укажите message_id и emoji")
        now = int(time.time())
        # Если уже такая реакция — удаляем (toggle)
        cur.execute(
            f"SELECT id, emoji FROM {SCHEMA}.message_reactions WHERE message_id = %s AND user_id = %s",
            (int(msg_id), int(user_id))
        )
        existing = cur.fetchone()
        if existing:
            if existing[1] == emoji:
                # Та же реакция — убираем
                cur.execute(f"UPDATE {SCHEMA}.message_reactions SET emoji = %s WHERE id = %s", (None, existing[0]))
                # Нельзя SET NULL в уникальной строке, просто обновим на другое значение или удалим через update
                # Используем флаг удаления через обновление поля created_at на 0
                cur.execute(f"UPDATE {SCHEMA}.message_reactions SET emoji = %s WHERE id = %s", ('__removed__', existing[0]))
                conn.close()
                return ok({"ok": True, "removed": True})
            else:
                cur.execute(
                    f"UPDATE {SCHEMA}.message_reactions SET emoji = %s, created_at = %s WHERE id = %s",
                    (emoji, now, existing[0])
                )
        else:
            cur.execute(
                f"""INSERT INTO {SCHEMA}.message_reactions (message_id, user_id, emoji, created_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (message_id, user_id) DO UPDATE SET emoji = EXCLUDED.emoji, created_at = EXCLUDED.created_at""",
                (int(msg_id), int(user_id), emoji, now)
            )
        conn.close()
        return ok({"ok": True})

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

    # ── set_typing ────────────────────────────────────────────────────────────
    if action == "set_typing":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        now = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.typing_status (chat_id, user_id, updated_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (chat_id, user_id) DO UPDATE SET updated_at = EXCLUDED.updated_at""",
            (int(chat_id), int(user_id), now)
        )
        conn.close()
        return ok({"ok": True})

    # ── get_typing ────────────────────────────────────────────────────────────
    if action == "get_typing":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id") or params.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        now = int(time.time())
        cur.execute(
            f"""SELECT user_id FROM {SCHEMA}.typing_status
                WHERE chat_id = %s AND user_id != %s AND updated_at > %s""",
            (int(chat_id), int(user_id), now - 4)
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"typing": len(rows) > 0})

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
        cur.execute(f"SELECT sender_id, chat_id FROM {SCHEMA}.messages WHERE id = %s", (int(msg_id),))
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Сообщение не найдено", 404)
        if int(row[0]) != int(user_id):
            conn.close()
            return err("Нельзя удалить чужое сообщение", 403)
        chat_id_v = int(row[1])
        now = int(time.time())
        # мягкое удаление: метка removed_at + чистим контент
        cur.execute(
            f"""UPDATE {SCHEMA}.messages
                SET removed_at = %s, text = '', media_url = NULL, media_type = NULL,
                    image_url = NULL, file_name = NULL, file_size = NULL, duration = NULL,
                    reply_to_id = NULL
                WHERE id = %s""",
            (now, int(msg_id))
        )
        # обновим last_message в чате, если удалили последнее
        cur.execute(
            f"""SELECT text FROM {SCHEMA}.messages
                WHERE chat_id = %s AND removed_at IS NULL
                ORDER BY created_at DESC LIMIT 1""",
            (chat_id_v,)
        )
        last = cur.fetchone()
        new_last = (last[0] if last else "") or ""
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET last_message = %s WHERE id = %s",
            (new_last[:100], chat_id_v)
        )
        conn.close()
        return ok({"ok": True, "id": int(msg_id), "removed_at": now})

    # ── get_contacts ──────────────────────────────────────────────────────────
    if action == "get_contacts":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        cur.execute(
            f"""SELECT u.id, u.name, u.phone, u.avatar_url, u.last_seen, c.name_override
                FROM {SCHEMA}.contacts c
                JOIN {SCHEMA}.users u ON u.id = c.contact_id
                WHERE c.user_id = %s AND (c.name_override IS NULL OR c.name_override != 'DELETED')
                ORDER BY COALESCE(c.name_override, u.name) ASC""",
            (int(user_id),)
        )
        rows = cur.fetchall()
        conn.close()
        contacts = [{"id": r[0], "name": r[5] or r[1], "real_name": r[1], "phone": r[2], "avatar_url": r[3], "last_seen": r[4]} for r in rows]
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
            f"UPDATE {SCHEMA}.contacts SET name_override = 'DELETED' WHERE user_id = %s AND contact_id = %s",
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
        if signal_type == "offer":
            cur.execute(f"SELECT name FROM {SCHEMA}.users WHERE id = %s", (int(user_id),))
            caller = cur.fetchone()
            conn.close()
            push_url = os.environ.get("PUSH_NOTIFY_URL", "")
            if push_url and caller:
                try:
                    push_body = json.dumps({
                        "action": "send",
                        "recipient_id": int(to_user_id),
                        "sender_name": caller[0],
                        "is_call": True,
                        "call_id": call_id,
                        "message": "Входящий звонок",
                    }).encode("utf-8")
                    req = urllib.request.Request(push_url, data=push_body, headers={"Content-Type": "application/json"})
                    urllib.request.urlopen(req, timeout=5)
                except Exception:
                    pass
        else:
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

    # ── set_chat_setting (muted / pinned / favorite) ─────────────────────────
    if action == "set_chat_setting":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        field = body.get("field")  # muted | pinned | favorite
        value = bool(body.get("value"))
        if not chat_id or field not in ("muted", "pinned", "favorite"):
            conn.close()
            return err("Неверные параметры")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.chat_settings (user_id, chat_id, {field})
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, chat_id) DO UPDATE SET {field} = EXCLUDED.{field}""",
            (int(user_id), int(chat_id), value)
        )
        conn.close()
        return ok({"ok": True, "field": field, "value": value})

    # ── clear_history ─────────────────────────────────────────────────────────
    if action == "clear_history":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        ts = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.chat_settings (user_id, chat_id, cleared_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, chat_id) DO UPDATE SET cleared_at = EXCLUDED.cleared_at""",
            (int(user_id), int(chat_id), ts)
        )
        conn.close()
        return ok({"ok": True, "cleared_at": ts})

    # ── block_user / unblock_user ─────────────────────────────────────────────
    if action == "block_user":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        target = body.get("target_user_id")
        if not target:
            conn.close()
            return err("Укажите target_user_id")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.user_blocks (blocker_id, blocked_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (blocker_id, blocked_id) DO NOTHING""",
            (int(user_id), int(target), int(time.time()))
        )
        conn.close()
        return ok({"ok": True, "blocked": True})

    if action == "unblock_user":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        target = body.get("target_user_id")
        if not target:
            conn.close()
            return err("Укажите target_user_id")
        cur.execute(
            f"DELETE FROM {SCHEMA}.user_blocks WHERE blocker_id = %s AND blocked_id = %s",
            (int(user_id), int(target))
        )
        conn.close()
        return ok({"ok": True, "blocked": False})

    if action == "is_blocked":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        target = body.get("target_user_id") or params.get("target_user_id")
        if not target:
            conn.close()
            return err("Укажите target_user_id")
        cur.execute(
            f"SELECT 1 FROM {SCHEMA}.user_blocks WHERE blocker_id = %s AND blocked_id = %s",
            (int(user_id), int(target))
        )
        is_b = cur.fetchone() is not None
        conn.close()
        return ok({"blocked": is_b})

    # ── favorites (pin message) ───────────────────────────────────────────────
    if action == "toggle_favorite_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        msg_id = body.get("message_id")
        if not msg_id:
            conn.close()
            return err("Укажите message_id")
        cur.execute(
            f"SELECT id FROM {SCHEMA}.favorite_messages WHERE user_id = %s AND message_id = %s",
            (int(user_id), int(msg_id))
        )
        existing = cur.fetchone()
        if existing:
            cur.execute(
                f"DELETE FROM {SCHEMA}.favorite_messages WHERE user_id = %s AND message_id = %s",
                (int(user_id), int(msg_id))
            )
            conn.close()
            return ok({"ok": True, "favorite": False})
        cur.execute(
            f"""INSERT INTO {SCHEMA}.favorite_messages (user_id, message_id, created_at)
                VALUES (%s, %s, %s)""",
            (int(user_id), int(msg_id), int(time.time()))
        )
        conn.close()
        return ok({"ok": True, "favorite": True})

    if action == "get_favorite_messages":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        cur.execute(
            f"""SELECT m.id, m.chat_id, m.sender_id, m.text, m.created_at, u.name,
                       m.media_type, m.media_url, m.file_name
                FROM {SCHEMA}.favorite_messages fm
                JOIN {SCHEMA}.messages m ON m.id = fm.message_id
                JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE fm.user_id = %s
                ORDER BY fm.created_at DESC LIMIT 200""",
            (int(user_id),)
        )
        rows = cur.fetchall()
        conn.close()
        return ok({"messages": [{
            "id": r[0], "chat_id": r[1], "sender_id": r[2], "text": r[3],
            "created_at": r[4], "sender_name": r[5],
            "media_type": r[6], "media_url": r[7], "file_name": r[8],
        } for r in rows]})

    # ── edit_message ──────────────────────────────────────────────────────────
    if action == "edit_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        msg_id = body.get("message_id")
        new_text = (body.get("text") or "").strip()
        if not msg_id or not new_text:
            conn.close()
            return err("Укажите message_id и text")
        cur.execute(
            f"SELECT sender_id, chat_id FROM {SCHEMA}.messages WHERE id = %s",
            (int(msg_id),)
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return err("Сообщение не найдено", 404)
        if int(row[0]) != int(user_id):
            conn.close()
            return err("Можно редактировать только свои сообщения", 403)
        now = int(time.time())
        cur.execute(
            f"UPDATE {SCHEMA}.messages SET text = %s, edited_at = %s WHERE id = %s",
            (new_text, now, int(msg_id))
        )
        # обновим last_message в чате если это последнее сообщение
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.messages WHERE chat_id = %s
                ORDER BY created_at DESC LIMIT 1""",
            (int(row[1]),)
        )
        last = cur.fetchone()
        if last and int(last[0]) == int(msg_id):
            cur.execute(
                f"UPDATE {SCHEMA}.chats SET last_message = %s WHERE id = %s",
                (new_text[:100], int(row[1]))
            )
        conn.close()
        return ok({"ok": True, "edited_at": now})

    # ── pin_message / unpin_message / get_pinned ──────────────────────────────
    if action == "pin_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        msg_id = body.get("message_id")
        chat_id = body.get("chat_id")
        if not msg_id or not chat_id:
            conn.close()
            return err("Укажите message_id и chat_id")
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET pinned_message_id = %s WHERE id = %s",
            (int(msg_id), int(chat_id))
        )
        conn.close()
        return ok({"ok": True})

    if action == "unpin_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET pinned_message_id = NULL WHERE id = %s",
            (int(chat_id),)
        )
        conn.close()
        return ok({"ok": True})

    if action == "get_pinned_message":
        chat_id = body.get("chat_id") or params.get("chat_id")
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"""SELECT m.id, m.sender_id, u.name, m.text, m.media_type, m.created_at
                FROM {SCHEMA}.chats c
                JOIN {SCHEMA}.messages m ON m.id = c.pinned_message_id
                JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE c.id = %s""",
            (int(chat_id),)
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return ok({"pinned": None})
        return ok({"pinned": {
            "id": row[0], "sender_id": row[1], "sender_name": row[2],
            "text": row[3], "media_type": row[4], "created_at": row[5],
        }})

    # ── archive_chat / unarchive_chat ─────────────────────────────────────────
    if action == "archive_chat":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        chat_id = body.get("chat_id")
        archived = bool(body.get("archived", True))
        if not chat_id:
            conn.close()
            return err("Укажите chat_id")
        cur.execute(
            f"""INSERT INTO {SCHEMA}.chat_settings (user_id, chat_id, archived)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, chat_id) DO UPDATE SET archived = EXCLUDED.archived""",
            (int(user_id), int(chat_id), archived)
        )
        conn.close()
        return ok({"ok": True, "archived": archived})

    # ── forward_message (создаёт новое сообщение в указанном чате) ────────────
    if action == "forward_message":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        src_id = body.get("message_id")
        target_chat_id = body.get("target_chat_id")
        if not src_id or not target_chat_id:
            conn.close()
            return err("Укажите message_id и target_chat_id")
        cur.execute(
            f"""SELECT m.text, m.media_type, m.media_url, m.image_url, m.file_name, m.file_size,
                       m.duration, m.sender_id, u.name
                FROM {SCHEMA}.messages m
                JOIN {SCHEMA}.users u ON u.id = m.sender_id
                WHERE m.id = %s""",
            (int(src_id),)
        )
        s = cur.fetchone()
        if not s:
            conn.close()
            return err("Сообщение не найдено", 404)
        text, m_type, m_url, img_url, f_name, f_size, dur, orig_sender, orig_name = s
        now = int(time.time())
        cur.execute(
            f"""INSERT INTO {SCHEMA}.messages
                (chat_id, sender_id, text, image_url, media_type, media_url, file_name, file_size, duration, created_at,
                 forwarded_from_user_id, forwarded_from_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (int(target_chat_id), int(user_id), text or "", img_url, m_type, m_url, f_name, f_size, dur, now,
             int(orig_sender), orig_name)
        )
        new_id = cur.fetchone()[0]
        cur.execute(
            f"UPDATE {SCHEMA}.chats SET last_message = %s, last_message_at = %s WHERE id = %s",
            ((text or "[медиа]")[:100], now, int(target_chat_id))
        )
        conn.close()
        return ok({"id": new_id, "created_at": now})

    conn.close()
    return err("Неизвестный action")