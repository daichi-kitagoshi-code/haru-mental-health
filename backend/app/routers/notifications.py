from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from app.core.config import settings
from app.services.push_service import send_daily_checkin
from pydantic import BaseModel

router = APIRouter(prefix="/notifications", tags=["notifications"])
supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        return supabase.auth.get_user(token).user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


class PushTokenRequest(BaseModel):
    token: str
    enabled: bool = True


@router.post("/register-token")
async def register_push_token(request: PushTokenRequest, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    supabase.table("users").update({
        "push_token": request.token,
        "notify_enabled": request.enabled,
    }).eq("id", user_id).execute()
    return {"message": "通知設定を保存しました"}


@router.post("/send-checkins")
async def send_checkins(authorization: str = Header(...)):
    """全ユーザーにデイリーチェックイン通知を送る（CRONジョブ用）"""
    token = authorization.replace("Bearer ", "")
    if token != settings.supabase_service_key:
        raise HTTPException(status_code=403, detail="サービスキーが必要です")

    from datetime import datetime, timezone, timedelta
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=20)).isoformat()

    users = supabase.table("users") \
        .select("id, push_token") \
        .eq("notify_enabled", True) \
        .not_.is_("push_token", "null") \
        .or_(f"last_notified_at.is.null,last_notified_at.lt.{yesterday}") \
        .execute()

    sent = 0
    for user in (users.data or []):
        char_settings = supabase.table("character_settings") \
            .select("char_name").eq("user_id", user["id"]).single().execute()
        char_name = char_settings.data["char_name"] if char_settings.data else "ハル"
        await send_daily_checkin(user["push_token"], char_name)
        supabase.table("users").update({
            "last_notified_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user["id"]).execute()
        sent += 1

    return {"sent": sent}
