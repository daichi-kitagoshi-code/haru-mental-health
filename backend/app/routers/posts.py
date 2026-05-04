from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from datetime import datetime, timezone
from app.core.config import settings
from app.models.schemas import CharacterPost, PostFeedItem, CharacterProfile
from app.services.post_generator import generate_daily_post

router = APIRouter(prefix="/posts", tags=["posts"])
supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


@router.get("/feed")
async def get_feed(authorization: str = Header(...)):
    """Get today's posts from all user's characters. Generate if none exist."""
    user_id = await get_current_user_id(authorization)

    characters = supabase.table("characters").select("*").eq("user_id", user_id).execute()
    if not characters.data:
        return []

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    feed = []
    for char in characters.data:
        # Check if posts exist for today
        existing = supabase.table("character_posts") \
            .select("*") \
            .eq("character_id", char["id"]) \
            .gte("created_at", today_start.isoformat()) \
            .order("scheduled_at", desc=True) \
            .execute()

        if not existing.data:
            # Generate a new post for today
            await _generate_and_save_post(char)
            existing = supabase.table("character_posts") \
                .select("*") \
                .eq("character_id", char["id"]) \
                .gte("created_at", today_start.isoformat()) \
                .execute()

        for post in (existing.data or []):
            feed.append({
                "post": post,
                "character": char,
            })

    # Sort by scheduled_at descending
    feed.sort(key=lambda x: x["post"]["scheduled_at"], reverse=True)
    return feed


@router.post("/generate/{character_id}")
async def generate_post_for_character(character_id: str, authorization: str = Header(...)):
    """Manually generate a new post for a character."""
    user_id = await get_current_user_id(authorization)

    char_result = supabase.table("characters") \
        .select("*").eq("id", character_id).eq("user_id", user_id).single().execute()
    if not char_result.data:
        raise HTTPException(status_code=404, detail="キャラクターが見つかりません")

    post = await _generate_and_save_post(char_result.data)
    return post


async def _generate_and_save_post(char: dict) -> dict:
    char_id = char["id"]

    worries = supabase.table("character_worries") \
        .select("title, current_status, worry_type") \
        .eq("character_id", char_id) \
        .neq("current_status", "resolved") \
        .execute()

    advice = supabase.table("user_advice_log") \
        .select("advice_content") \
        .eq("character_id", char_id) \
        .order("given_at", desc=True) \
        .limit(5).execute()

    generated = await generate_daily_post(
        character=char,
        worries=worries.data or [],
        advice_log=advice.data or [],
    )

    result = supabase.table("character_posts").insert({
        "character_id": char_id,
        "content": generated["content"],
        "post_type": generated["post_type"],
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
        "is_published": True,
    }).execute()

    return result.data[0] if result.data else {}


@router.get("/character/{character_id}", response_model=list[CharacterPost])
async def get_character_posts(character_id: str, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    char = supabase.table("characters") \
        .select("id").eq("id", character_id).eq("user_id", user_id).single().execute()
    if not char.data:
        raise HTTPException(status_code=404, detail="キャラクターが見つかりません")

    result = supabase.table("character_posts") \
        .select("*") \
        .eq("character_id", character_id) \
        .order("scheduled_at", desc=True) \
        .limit(30).execute()

    return [CharacterPost(**p) for p in result.data]
