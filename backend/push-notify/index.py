import os
import json
import time
import psycopg2
from pywebpush import webpush, WebPushException

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
    Push-уведомления для Nova.
    subscribe  — сохранить подписку браузера
    unsubscribe — удалить подписку
    send       — отправить уведомление получателю (вызывается из chat-api)
    vapid_key  — получить публичный VAPID ключ для браузера
    """
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    params = event.get("queryStringParameters") or {}
    action = body.get("action") or params.get("action", "")
    user_id = event.get("headers", {}).get("X-User-Id") or params.get("user_id")

    # ── vapid_key — публичный ключ для фронтенда ──────────────────────────────
    if action == "vapid_key":
        pub_key = os.environ.get("VAPID_PUBLIC_KEY", "")
        return ok({"public_key": pub_key})

    conn = get_conn()
    cur = conn.cursor()

    # ── subscribe — сохранить подписку ────────────────────────────────────────
    if action == "subscribe":
        if not user_id:
            conn.close()
            return err("Нужен X-User-Id")
        endpoint = body.get("endpoint", "")
        p256dh = body.get("p256dh", "")
        auth = body.get("auth", "")
        if not endpoint or not p256dh or not auth:
            conn.close()
            return err("Нужны endpoint, p256dh, auth")

        cur.execute(
            f"""INSERT INTO {SCHEMA}.push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth""",
            (int(user_id), endpoint, p256dh, auth, int(time.time()))
        )
        conn.close()
        return ok({"ok": True})

    # ── send — отправить push уведомление пользователю ────────────────────────
    if action == "send":
        recipient_id = body.get("recipient_id")
        title = body.get("title", "Nova")
        message = body.get("message", "Новое сообщение")
        sender_name = body.get("sender_name", "")
        chat_id = body.get("chat_id")

        if not recipient_id:
            conn.close()
            return err("Нужен recipient_id")

        cur.execute(
            f"SELECT endpoint, p256dh, auth FROM {SCHEMA}.push_subscriptions WHERE user_id = %s",
            (int(recipient_id),)
        )
        subs = cur.fetchall()
        conn.close()

        if not subs:
            return ok({"ok": True, "sent": 0})

        vapid_private = os.environ.get("VAPID_PRIVATE_KEY", "")
        vapid_public = os.environ.get("VAPID_PUBLIC_KEY", "")
        if not vapid_private or not vapid_public:
            return err("VAPID ключи не настроены", 500)

        is_call = body.get("is_call", False)
        call_id = body.get("call_id")
        payload = json.dumps({
            "title": f"📞 {sender_name}" if is_call else (sender_name or title),
            "body": "Входящий звонок" if is_call else message,
            "chat_id": chat_id,
            "call_id": call_id,
            "is_call": is_call,
            "icon": "/icons/icon-192.png",
            "badge": "/icons/icon-192.png",
            "tag": f"call_{call_id}" if is_call else f"msg_{chat_id}",
            "requireInteraction": is_call,
        })

        sent = 0
        for endpoint, p256dh, auth_key in subs:
            try:
                webpush(
                    subscription_info={
                        "endpoint": endpoint,
                        "keys": {"p256dh": p256dh, "auth": auth_key},
                    },
                    data=payload,
                    vapid_private_key=vapid_private,
                    vapid_claims={"sub": "mailto:nova@poehali.dev"},
                )
                sent += 1
            except WebPushException:
                pass

        return ok({"ok": True, "sent": sent})

    conn.close()
    return err("Неизвестный action")