from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client
from app.core.config import settings
from app.models.schemas import SignUpRequest, SignInRequest, UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])

supabase_auth = create_client(settings.supabase_url, settings.supabase_key)
supabase_admin = create_client(settings.supabase_url, settings.supabase_service_key)


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/signup")
async def sign_up(request: SignUpRequest):
    try:
        auth_response = supabase_auth.auth.sign_up({
            "email": request.email,
            "password": request.password,
        })

        if auth_response.user is None:
            raise HTTPException(status_code=400, detail="登録に失敗しました")

        supabase_admin.table("users").insert({
            "id": auth_response.user.id,
            "email": request.email,
            "name": request.name,
            "plan": "free",
        }).execute()

        supabase_admin.table("character_settings").insert({
            "user_id": auth_response.user.id,
            "char_name": "ハル",
            "speech_style": "casual",
        }).execute()

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user_id": auth_response.user.id,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/signin")
async def sign_in(request: SignInRequest):
    try:
        auth_response = supabase_auth.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password,
        })

        if auth_response.user is None:
            raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")

        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "user_id": auth_response.user.id,
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが正しくありません")


@router.post("/refresh")
async def refresh_token(request: RefreshRequest):
    """Refresh a Supabase JWT using the refresh token."""
    try:
        auth_response = supabase_auth.auth.refresh_session(request.refresh_token)
        if auth_response.session is None:
            raise HTTPException(status_code=401, detail="トークンの更新に失敗しました")
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
        }
    except Exception:
        raise HTTPException(status_code=401, detail="トークンの更新に失敗しました")


@router.post("/signout")
async def sign_out():
    supabase_auth.auth.sign_out()
    return {"message": "ログアウトしました"}
