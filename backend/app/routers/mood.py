from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from app.core.config import settings
from app.models.schemas import MoodLogRequest, MoodLogResponse
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/mood", tags=["mood"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


@router.post("/log", response_model=MoodLogResponse)
async def log_mood(request: MoodLogRequest, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    result = supabase.table("mood_logs").insert({
        "user_id": user_id,
        "score": request.score,
        "note": request.note,
    }).execute()

    data = result.data[0]
    return MoodLogResponse(
        id=data["id"],
        score=data["score"],
        note=data["note"],
        created_at=data["created_at"],
    )


@router.get("/history")
async def get_mood_history(days: int = 30, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = supabase.table("mood_logs") \
        .select("score, note, created_at") \
        .eq("user_id", user_id) \
        .gte("created_at", since.isoformat()) \
        .order("created_at") \
        .execute()

    return {"logs": result.data}


@router.get("/summary")
async def get_mood_summary(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    result = supabase.table("mood_logs") \
        .select("score, created_at") \
        .eq("user_id", user_id) \
        .gte("created_at", week_ago.isoformat()) \
        .order("created_at") \
        .execute()

    if not result.data:
        return {"average": None, "trend": "no_data", "count": 0}

    scores = [entry["score"] for entry in result.data]
    average = sum(scores) / len(scores)

    if len(scores) >= 3:
        first_half = scores[:len(scores) // 2]
        second_half = scores[len(scores) // 2:]
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        if second_avg - first_avg > 0.5:
            trend = "improving"
        elif first_avg - second_avg > 0.5:
            trend = "declining"
        else:
            trend = "stable"
    else:
        trend = "insufficient_data"

    return {
        "average": round(average, 2),
        "trend": trend,
        "count": len(scores),
    }
