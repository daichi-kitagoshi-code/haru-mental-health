"""
通知ルーター

エンドポイント一覧:
  POST /notifications/register-token     ─ Expo プッシュトークン登録
  GET  /notifications/settings           ─ 通知設定取得
  PATCH /notifications/settings          ─ 通知設定更新 (誕生日・各種トグル)

  ── CRON ジョブ用 (Railway Cron → Authorization: Bearer <SERVICE_KEY>) ──
  POST /notifications/cron/morning       ─ 朝 08:00 JST 「おはよう」
  POST /notifications/cron/evening       ─ 夜 22:00 JST 「今日どうだった？」
  POST /notifications/cron/inactive      ─ 毎日 12:00 JST 3日未ログインのユーザーへ
  POST /notifications/cron/birthday      ─ 毎日 08:30 JST 誕生日ユーザーへ
"""

import logging
from datetime import datetime, timezone, timedelta, date

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from supabase import create_client

from app.core.config import settings
from app.services.push_service import (
    send_morning_greeting,
    send_evening_checkin,
    send_inactive_nudge,
    send_birthday,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["notifications"])
supabase = create_client(settings.supabase_url, settings.supabase_service_key)


# ── Auth helpers ────────────────────────────────────────────────────────────

async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return supabase.auth.get_user(token).user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


def require_service_key(authorization: str = Header(...)):
    """CRON エンドポイント用：サービスキーのみ受け付ける"""
    token = authorization.replace("Bearer ", "")
    if token != settings.supabase_service_key:
        raise HTTPException(status_code=403, detail="サービスキーが必要です")


# ── Request / Response models ───────────────────────────────────────────────

class PushTokenRequest(BaseModel):
    token: str
    enabled: bool = True


class NotificationSettingsUpdate(BaseModel):
    birthday: str | None = None          # "MM-DD" format  e.g. "03-15"
    notify_morning: bool | None = None
    notify_evening: bool | None = None
    notify_inactive: bool | None = None


# ── User endpoints ──────────────────────────────────────────────────────────

@router.post("/register-token")
async def register_push_token(
    request: PushTokenRequest,
    authorization: str = Header(...),
):
    user_id = await get_current_user_id(authorization)
    supabase.table("users").update({
        "push_token": request.token,
        "notify_enabled": request.enabled,
    }).eq("id", user_id).execute()
    logger.info("Push token registered for user %s", user_id)
    return {"message": "通知設定を保存しました"}


@router.get("/settings")
async def get_notification_settings(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    row = supabase.table("users").select(
        "push_token, notify_enabled, notify_morning, notify_evening, notify_inactive, birthday"
    ).eq("id", user_id).single().execute()

    if not row.data:
        raise HTTPException(status_code=404, detail="ユーザーが見つかりません")

    return {
        "push_token":      row.data.get("push_token"),
        "notify_enabled":  row.data.get("notify_enabled", True),
        "notify_morning":  row.data.get("notify_morning", True),
        "notify_evening":  row.data.get("notify_evening", True),
        "notify_inactive": row.data.get("notify_inactive", True),
        "birthday":        row.data.get("birthday"),   # "MM-DD" or None
    }


@router.patch("/settings")
async def update_notification_settings(
    request: NotificationSettingsUpdate,
    authorization: str = Header(...),
):
    user_id = await get_current_user_id(authorization)
    update_data: dict = {}

    if request.birthday is not None:
        # Validate "MM-DD" format
        try:
            month, day = request.birthday.split("-")
            assert 1 <= int(month) <= 12 and 1 <= int(day) <= 31
            update_data["birthday"] = request.birthday
        except Exception:
            raise HTTPException(status_code=400, detail="誕生日は MM-DD 形式で入力してください")

    if request.notify_morning is not None:
        update_data["notify_morning"] = request.notify_morning
    if request.notify_evening is not None:
        update_data["notify_evening"] = request.notify_evening
    if request.notify_inactive is not None:
        update_data["notify_inactive"] = request.notify_inactive

    if update_data:
        supabase.table("users").update(update_data).eq("id", user_id).execute()
        logger.info("Notification settings updated for user %s: %s", user_id, update_data)

    return {"message": "設定を保存しました"}


# ── CRON endpoints ──────────────────────────────────────────────────────────
# Railway Cron で以下のように設定する:
#   08:00 JST → POST /notifications/cron/morning
#   22:00 JST → POST /notifications/cron/evening
#   12:00 JST → POST /notifications/cron/inactive
#   08:30 JST → POST /notifications/cron/birthday


def _get_notifiable_users(notify_column: str) -> list[dict]:
    """push_token があり notify_enabled=true かつ指定カラムが true のユーザーを取得"""
    result = supabase.table("users").select(
        "id, name, push_token, notify_enabled, " + notify_column
    ).eq("notify_enabled", True).eq(notify_column, True).not_.is_(
        "push_token", "null"
    ).execute()
    return result.data or []


async def _get_first_character_name(user_id: str) -> str:
    """ユーザーの最初のキャラクター名を取得（なければ「ハル」）"""
    char = supabase.table("characters").select("name").eq(
        "user_id", user_id
    ).order("created_at").limit(1).execute()
    if char.data:
        return char.data[0]["name"]
    return "ハル"


@router.post("/cron/morning")
async def cron_morning(authorization: str = Header(...)):
    """朝 08:00 JST — 全ユーザーへ「おはよう」通知"""
    require_service_key(authorization)

    users = _get_notifiable_users("notify_morning")
    sent = 0
    for user in users:
        char_name = await _get_first_character_name(user["id"])
        await send_morning_greeting(
            user["push_token"], char_name, user.get("name", "")
        )
        sent += 1

    logger.info("[cron/morning] sent=%d", sent)
    return {"sent": sent}


@router.post("/cron/evening")
async def cron_evening(authorization: str = Header(...)):
    """夜 22:00 JST — 全ユーザーへ「今日どうだった？」通知"""
    require_service_key(authorization)

    users = _get_notifiable_users("notify_evening")
    sent = 0
    for user in users:
        char_name = await _get_first_character_name(user["id"])
        await send_evening_checkin(
            user["push_token"], char_name, user.get("name", "")
        )
        sent += 1

    logger.info("[cron/evening] sent=%d", sent)
    return {"sent": sent}


@router.post("/cron/inactive")
async def cron_inactive(authorization: str = Header(...)):
    """毎日 12:00 JST — 3日以上未ログインのユーザーへ通知"""
    require_service_key(authorization)

    threshold = (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()

    # last_active_at が3日以上前 OR NULL（一度も使っていない新規ユーザーは除外）
    result = supabase.table("users").select(
        "id, name, push_token, notify_enabled, notify_inactive, last_active_at"
    ).eq("notify_enabled", True).eq("notify_inactive", True).not_.is_(
        "push_token", "null"
    ).not_.is_(
        "last_active_at", "null"
    ).lt("last_active_at", threshold).execute()

    users = result.data or []
    sent = 0
    for user in users:
        last = user.get("last_active_at", "")
        days_ago = 3
        if last:
            try:
                diff = datetime.now(timezone.utc) - datetime.fromisoformat(last.replace("Z", "+00:00"))
                days_ago = max(3, int(diff.total_seconds() // 86400))
            except Exception:
                pass

        char_name = await _get_first_character_name(user["id"])
        await send_inactive_nudge(user["push_token"], char_name, days_ago)
        sent += 1

    logger.info("[cron/inactive] sent=%d (threshold=%s)", sent, threshold)
    return {"sent": sent}


@router.post("/cron/birthday")
async def cron_birthday(authorization: str = Header(...)):
    """毎日 08:30 JST — 今日が誕生日のユーザーへ通知"""
    require_service_key(authorization)

    today = datetime.now(timezone.utc).strftime("%m-%d")   # "MM-DD"
    # birthday カラムは "MM-DD" 形式で保存
    result = supabase.table("users").select(
        "id, name, push_token, notify_enabled, birthday"
    ).eq("notify_enabled", True).eq("birthday", today).not_.is_(
        "push_token", "null"
    ).execute()

    users = result.data or []
    sent = 0
    for user in users:
        char_name = await _get_first_character_name(user["id"])
        await send_birthday(user["push_token"], char_name, user.get("name", ""))
        sent += 1

    logger.info("[cron/birthday] today=%s sent=%d", today, sent)
    return {"sent": sent}


# ── Legacy endpoint (既存コードとの互換性) ──────────────────────────────────

@router.post("/send-checkins")
async def send_checkins(authorization: str = Header(...)):
    """後方互換: 朝の通知を全ユーザーへ送る"""
    return await cron_morning(authorization)
