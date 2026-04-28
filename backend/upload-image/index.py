import os
import json
import time
import base64
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id",
}


def handler(event: dict, context) -> dict:
    """Загрузка фото в S3 и возврат CDN-ссылки для отправки в чат."""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    user_id = event.get("headers", {}).get("X-User-Id", "0")
    body = json.loads(event.get("body") or "{}")
    data_b64 = body.get("data", "")
    mime = body.get("mime", "image/jpeg")

    if not data_b64:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет данных"})}

    try:
        img_data = base64.b64decode(data_b64)
    except Exception:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неверный base64"})}

    ext = "jpg" if "jpeg" in mime else mime.split("/")[-1]
    key = f"chat/{user_id}/{int(time.time())}.{ext}"

    s3 = boto3.client("s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )
    s3.put_object(Bucket="files", Key=key, Body=img_data, ContentType=mime)
    cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"url": cdn_url})}
