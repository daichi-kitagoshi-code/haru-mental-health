from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from app.core.config import settings
from app.models.schemas import CharacterSettingsRequest, CharacterSettingsResponse

router = APIRouter(prefix="/character", tags=["character"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


@router.get("/settings", response_model=CharacterSettingsResponse)
async def get_character_settings(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    result = supabase.table("character_settings") \
        .select("char_name, speech_style") \
        .eq("user_id", user_id) \
        .single().execute()

    return CharacterSettingsResponse(
        char_name=result.data["char_name"],
        speech_style=result.data["speech_style"],
    )


@router.put("/settings", response_model=CharacterSettingsResponse)
async def update_character_settings(
    request: CharacterSettingsRequest,
    authorization: str = Header(...),
):
    user_id = await get_current_user_id(authorization)

    supabase.table("character_settings") \
        .update({
            "char_name": request.char_name,
            "speech_style": request.speech_style,
        }) \
        .eq("user_id", user_id) \
        .execute()

    return CharacterSettingsResponse(
        char_name=request.char_name,
        speech_style=request.speech_style,
    )
