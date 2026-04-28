import os
import json
import random
import time
import urllib.request
import urllib.parse
import psycopg2  # requires psycopg2-binary


def handler(event: dict, context) -> dict:
    """
    Отправка и проверка SMS-кода для авторизации в Nova.
    POST {"action": "send", "phone": "79991234567"} — отправить код
    POST {"action": "verify", "phone": "...", "code": "..."} — проверить код
    """
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Max-Age": "86400",
            },
            "body": "",
        }

    headers = {"Access-Control-Allow-Origin": "*"}
    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS sms_codes (
            phone TEXT PRIMARY KEY,
            code TEXT NOT NULL,
            created_at BIGINT NOT NULL
        )
    """)

    if action == "send":
        phone = (body.get("phone") or "").strip()
        digits = "".join(c for c in phone if c.isdigit())
        if len(digits) < 10:
            conn.close()
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Некорректный номер телефона"})}

        code = str(random.randint(100000, 999999))
        now = int(time.time())

        cur.execute(
            "INSERT INTO sms_codes (phone, code, created_at) VALUES (%s, %s, %s) ON CONFLICT (phone) DO UPDATE SET code = %s, created_at = %s",
            (digits, code, now, code, now)
        )

        login = os.environ.get("SMSC_LOGIN", "")
        password = os.environ.get("SMSC_PASSWORD", "")

        if login and password:
            params = urllib.parse.urlencode({
                "login": login,
                "psw": password,
                "phones": digits,
                "mes": f"Nova: ваш код подтверждения {code}",
                "fmt": 3,
                "charset": "utf-8",
            })
            url = f"https://smsc.ru/sys/send.php?{params}"
            req = urllib.request.urlopen(url, timeout=10)
            result = json.loads(req.read().decode("utf-8"))
            if result.get("error"):
                conn.close()
                return {"statusCode": 502, "headers": headers, "body": json.dumps({"error": f"Ошибка SMS: {result.get('error_code')}"})}

        is_demo = not bool(login)
        conn.close()
        result = {"ok": True, "demo": is_demo}
        if is_demo:
            result["code"] = code
        return {"statusCode": 200, "headers": headers, "body": json.dumps(result)}

    if action == "verify":
        phone = (body.get("phone") or "").strip()
        entered = (body.get("code") or "").strip()
        digits = "".join(c for c in phone if c.isdigit())

        cur.execute("SELECT code, created_at FROM sms_codes WHERE phone = %s", (digits,))
        row = cur.fetchone()
        conn.close()

        if not row:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Сначала запросите код"})}

        stored_code, created_at = row
        if int(time.time()) - created_at > 300:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Код устарел, запросите новый"})}

        if entered != stored_code:
            return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Неверный код"})}

        return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Укажите action: send или verify"})}