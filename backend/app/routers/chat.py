import logging
from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from supabase import create_client
from app.core.config import settings
from app.models.schemas import MessageRequest, MessageResponse
from app.services.chat_service import generate_reply
from app.services.memory_service import extract_memories
from app.services.risk_analyzer import analyze_risk_from_conversation
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

MEMORY_EXTRACTION_INTERVAL = 10

router = APIRouter(prefix="/chat", tags=["chat"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


async def _background_post_processing(user_id: str, character_id: str, conversation_text: str, message_count: int):
    if message_count % MEMORY_EXTRACTION_INTERVAL == 0:
        new_memories = await extract_memories(conversation_text)
        for memory in new_memories:
            supabase.table("user_memories").insert({
                "user_id": user_id,
                "character_id": character_id,
                "content": memory["content"],
                "category": memory.get("category", "general"),
                "importance": memory.get("importance", 5),
            }).execute()

    employee = supabase.table("employees") \
        .select("company_id, department, role_level") \
        .eq("user_id", user_id).execute()
    if employee.data:
        risk = await analyze_risk_from_conversation(conversation_text)
        if risk:
            emp = employee.data[0]
            department = risk.get("department_hint") or emp.get("department") or "不明"
            target_role = risk.get("target_role_hint") or emp.get("role_level") or "不明"
            month_ago = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            existing = supabase.table("risk_signals") \
                .select("id, signal_count, keywords") \
                .eq("company_id", emp["company_id"]) \
                .eq("department", department) \
                .eq("severity", risk["severity"]) \
                .gte("created_at", month_ago.isoformat()).execute()
            if existing.data:
                rec = existing.data[0]
                merged = list(set(rec.get("keywords") or []) | set(risk.get("keywords") or []))[:10]
                supabase.table("risk_signals").update({
                    "signal_count": rec["signal_count"] + 1,
                    "keywords": merged,
                }).eq("id", rec["id"]).execute()
            else:
                supabase.table("risk_signals").insert({
                    "company_id": emp["company_id"],
                    "department": department,
                    "target_role_level": target_role,
                    "keywords": risk.get("keywords", []),
                    "severity": risk["severity"],
                    "signal_count": 1,
                }).execute()


@router.post("/message", response_model=MessageResponse)
async def send_message(request: MessageRequest, background_tasks: BackgroundTasks, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    user_data = supabase.table("users").select("plan, name").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]
    user_name = user_data.data.get("name", "あなた")

    if plan == "free":
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_messages = supabase.table("conversations") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .eq("role", "user") \
            .gte("created_at", today_start.isoformat()) \
            .execute()
        if today_messages.count >= settings.max_free_messages_per_day:
            raise HTTPException(
                status_code=429,
                detail="無料プランの1日の会話回数上限に達しました。スタンダードプランにアップグレードすると無制限で会話できます。"
            )

    character_result = supabase.table("characters") \
        .select("*").eq("id", request.character_id).eq("user_id", user_id).single().execute()
    if not character_result.data:
        raise HTTPException(status_code=404, detail="キャラクターが見つかりません")
    character = character_result.data

    memories = supabase.table("user_memories") \
        .select("content, category, importance") \
        .eq("user_id", user_id) \
        .eq("character_id", request.character_id) \
        .order("importance", desc=True) \
        .limit(settings.max_memory_items) \
        .execute()

    history = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .eq("character_id", request.character_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()
    conversation_history = list(reversed(history.data)) if history.data else []

    try:
        result = await generate_reply(
            user_message=request.content,
            conversation_history=conversation_history,
            character=character,
            user_name=user_name,
            user_memories=memories.data if memories.data else [],
        )
    except RuntimeError as e:
        err = str(e)
        logger.error("[chat router] generate_reply failed: %s user_id=%s", err, user_id)
        if "rate_limit" in err:
            raise HTTPException(
                status_code=503,
                detail="RATE_LIMIT: しばらく時間をおいてからもう一度試してね",
            )
        elif "timeout" in err:
            raise HTTPException(
                status_code=504,
                detail="TIMEOUT: 応答に時間がかかりすぎました。もう一度試してね",
            )
        else:
            raise HTTPException(
                status_code=502,
                detail="API_ERROR: 応答の生成に失敗しました。もう一度試してね",
            )
    except Exception as e:
        logger.exception("[chat router] unexpected error: %s user_id=%s", str(e), user_id)
        raise HTTPException(status_code=500, detail="INTERNAL_ERROR: サーバーエラーが発生しました")

    supabase.table("conversations").insert({
        "user_id": user_id,
        "character_id": request.character_id,
        "role": "user",
        "content": request.content,
    }).execute()

    supabase.table("conversations").insert({
        "user_id": user_id,
        "character_id": request.character_id,
        "role": "assistant",
        "content": result["reply"],
    }).execute()

    all_msgs = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .eq("character_id", request.character_id) \
        .order("created_at", desc=True) \
        .limit(30).execute()
    msg_count = supabase.table("conversations") \
        .select("id", count="exact") \
        .eq("user_id", user_id).eq("role", "user").execute().count or 0
    conversation_text = "\n".join(
        f"{'ユーザー' if m['role'] == 'user' else character['name']}: {m['content']}"
        for m in reversed(all_msgs.data or [])
    )
    background_tasks.add_task(_background_post_processing, user_id, request.character_id, conversation_text, msg_count)

    return MessageResponse(
        reply=result["reply"],
        crisis_level=result["crisis_level"],
        crisis_resources=result["crisis_resources"],
    )
