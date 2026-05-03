import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(expo_token: str, title: str, body: str, data: dict | None = None):
    if not expo_token or not expo_token.startswith("ExponentPushToken"):
        return

    payload = {
        "to": expo_token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
    }

    async with httpx.AsyncClient() as client:
        try:
            await client.post(EXPO_PUSH_URL, json=payload, timeout=5)
        except httpx.HTTPError:
            pass


async def send_daily_checkin(expo_token: str, char_name: str = "ハル"):
    messages = [
        f"最近どう？{char_name}はいつでもここにいるよ",
        f"今日も一日お疲れさま！話したいことあったら聞くよ",
        f"ねえ、最近元気にしてた？",
        f"ちょっと話しかけたくなっちゃった。元気？",
    ]
    import random
    body = random.choice(messages)
    await send_push_notification(expo_token, char_name, body, {"type": "checkin"})
