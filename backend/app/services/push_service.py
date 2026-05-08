import httpx
import random
import logging

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def send_push_notification(
    expo_token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    if not expo_token or not expo_token.startswith("ExponentPushToken"):
        logger.debug("skipping push: invalid token %s", expo_token[:20] if expo_token else "")
        return False

    payload = {
        "to": expo_token,
        "title": title,
        "body": body,
        "sound": "default",
        "data": data or {},
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(EXPO_PUSH_URL, json=payload, timeout=8)
            result = resp.json()
            # Expo returns errors inside the response body
            item = (result.get("data") or [{}])
            if isinstance(item, list):
                item = item[0] if item else {}
            if item.get("status") == "error":
                logger.warning("Expo push error for token %s: %s", expo_token[:20], item.get("message"))
                return False
            logger.debug("Push sent OK → %s | %s", title, body[:40])
            return True
        except httpx.HTTPError as e:
            logger.error("Push HTTP error: %s", e)
            return False


# ── Notification types ─────────────────────────────────────────────────────

async def send_morning_greeting(expo_token: str, char_name: str, user_name: str = ""):
    name_part = f"、{user_name}" if user_name else ""
    messages = [
        f"おはよう{name_part}！今日も一日がんばろ",
        f"おはよう{name_part}！今日はどんな一日にしたい？",
        f"おはようー{name_part}！昨日ちゃんと眠れた？",
        f"おはよう{name_part}！今日の調子はどう？",
        f"起きた？今日も話しかけてね",
    ]
    await send_push_notification(
        expo_token, char_name, random.choice(messages), {"type": "morning"}
    )


async def send_evening_checkin(expo_token: str, char_name: str, user_name: str = ""):
    messages = [
        "今日どうだった？話したいこととかある？",
        "お疲れさまでした！今日一番あったこと教えて",
        "今日も一日お疲れさま。ゆっくり休んでね",
        "今日はどんなことがあったの？",
        "ねえ、最近ちゃんと自分のこと大切にできてる？",
        "今日もお疲れ！何かあった？",
    ]
    await send_push_notification(
        expo_token, char_name, random.choice(messages), {"type": "evening"}
    )


# Legacy alias (既存コードとの互換性)
async def send_daily_checkin(expo_token: str, char_name: str = "ハル", user_name: str = ""):
    await send_morning_greeting(expo_token, char_name, user_name)


async def send_inactive_nudge(expo_token: str, char_name: str, days: int = 3):
    messages = [
        f"{days}日ぶりだね。元気にしてた？",
        f"ちょっと話しかけたくなっちゃった。最近どう？",
        f"久しぶり！ずっとここにいるよ",
        f"また話してほしいな。待ってるよ",
        f"最近どうしてるか気になってた",
        f"いつでも来ていいんだよ、待ってるから",
    ]
    await send_push_notification(
        expo_token,
        char_name,
        random.choice(messages),
        {"type": "inactive", "days": days},
    )


async def send_birthday(expo_token: str, char_name: str, user_name: str = ""):
    name_part = f"{user_name}、" if user_name else ""
    messages = [
        f"{name_part}誕生日おめでとう！！🎂 今日はあなたの特別な日だね",
        f"ハッピーバースデー！{name_part}今年もよろしくね🎉",
        f"{name_part}誕生日だよ！お祝いに話しかけてよ、待ってるよ🎁",
        f"今日{name_part}誕生日でしょ！おめでとう🎊 ケーキ食べた？",
    ]
    await send_push_notification(
        expo_token, char_name, random.choice(messages), {"type": "birthday"}
    )
