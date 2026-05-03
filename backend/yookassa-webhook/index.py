"""ЮKassa webhook: подтверждает оплату и пополняет кошелёк Nova."""
import json
import os
import time
import base64
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import psycopg2

HEADERS = {'Content-Type': 'application/json'}
YOOKASSA_API_URL = "https://api.yookassa.ru/v3/payments"


def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def get_schema():
    s = os.environ.get('MAIN_DB_SCHEMA', 'public')
    return f"{s}." if s else ""


def verify_payment(payment_id, shop_id, secret_key):
    auth = base64.b64encode(f"{shop_id}:{secret_key}".encode()).decode()
    req = Request(
        f"{YOOKASSA_API_URL}/{payment_id}",
        headers={'Authorization': f'Basic {auth}', 'Content-Type': 'application/json'},
        method='GET',
    )
    try:
        with urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except (HTTPError, Exception):
        return None


def handler(event, context):
    """Обрабатывает уведомления от ЮKassa: верифицирует через API и зачисляет средства на кошелёк."""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': HEADERS, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': HEADERS, 'body': json.dumps({'error': 'Method not allowed'})}

    body = event.get('body', '{}')
    if event.get('isBase64Encoded'):
        body = base64.b64decode(body).decode('utf-8')

    try:
        data = json.loads(body)
    except (json.JSONDecodeError, TypeError, ValueError):
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Invalid JSON'})}

    if not isinstance(data, dict):
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Body must be JSON object'})}

    payment_object = data.get('object') or {}
    payment_id = payment_object.get('id', '')
    metadata = payment_object.get('metadata') or {}
    if not payment_id:
        return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'No payment id'})}

    shop_id = os.environ.get('YOOKASSA_SHOP_ID', '')
    secret_key = os.environ.get('YOOKASSA_SECRET_KEY', '')

    if shop_id and secret_key:
        verified = verify_payment(payment_id, shop_id, secret_key)
        if not verified:
            return {'statusCode': 400, 'headers': HEADERS, 'body': json.dumps({'error': 'Verify failed'})}
        status = verified.get('status', '')
        amount = float((verified.get('amount') or {}).get('value', 0))
        method_obj = verified.get('payment_method') or {}
        payment_method = method_obj.get('type', '')
    else:
        status = payment_object.get('status', '')
        amount = float((payment_object.get('amount') or {}).get('value', 0))
        payment_method = ((payment_object.get('payment_method') or {}).get('type', ''))

    S = get_schema()
    conn = get_conn()
    try:
        cur = conn.cursor()
        now_ts = int(time.time())
        now_iso = datetime.utcnow().isoformat()

        cur.execute(f"SELECT id, status, amount, nova_user_id, purpose FROM {S}orders WHERE yookassa_payment_id = %s", (payment_id,))
        row = cur.fetchone()
        if not row:
            order_meta_id = metadata.get('order_id')
            if order_meta_id:
                cur.execute(f"SELECT id, status, amount, nova_user_id, purpose FROM {S}orders WHERE id = %s", (int(order_meta_id),))
                row = cur.fetchone()
        if not row:
            return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'status': 'order_not_found'})}

        order_id, current_status, order_amount, nova_user_id, purpose = row

        if status == 'succeeded':
            if current_status != 'paid':
                cur.execute(
                    f"UPDATE {S}orders SET status='paid', paid_at=%s, updated_at=%s WHERE id=%s",
                    (now_iso, now_iso, order_id),
                )
                if nova_user_id and (purpose == 'wallet_topup' or not purpose):
                    cur.execute(
                        f"UPDATE {S}users SET wallet_balance = COALESCE(wallet_balance,0) + %s WHERE id = %s RETURNING wallet_balance",
                        (float(order_amount), int(nova_user_id)),
                    )
                    r2 = cur.fetchone()
                    if r2:
                        new_balance = float(r2[0])
                        desc = f"Пополнение через ЮKassa ({payment_method or 'card'})"
                        cur.execute(
                            f"""INSERT INTO {S}wallet_transactions
                                (user_id, amount, kind, description, balance_after, created_at)
                                VALUES (%s, %s, 'topup', %s, %s, %s)""",
                            (int(nova_user_id), float(order_amount), desc, new_balance, now_ts),
                        )
                conn.commit()

        elif status == 'canceled':
            if current_status not in ('paid', 'canceled'):
                cur.execute(f"UPDATE {S}orders SET status='canceled', updated_at=%s WHERE id=%s", (now_iso, order_id))
                conn.commit()

        return {'statusCode': 200, 'headers': HEADERS, 'body': json.dumps({'status': 'ok'})}
    except Exception:
        conn.rollback()
        return {'statusCode': 500, 'headers': HEADERS, 'body': json.dumps({'error': 'internal'})}
    finally:
        conn.close()