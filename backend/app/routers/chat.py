from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from supabase import create_client
from app.core.config import settings
from app.models.schemas import MessageRequest, MessageResponse
from app.services.chat_service import generate_reply
from app.services.memory_service import extract_memories
from app.services.risk_analyzer import analyze_risk_from_conversation
from datetime import datetime, timezone

MEMORY_EXTRACTION_INTERVAL = 10  # N回メッセージごとに記憶を抽出

router = APIRouter(prefix="/chat", tags=["chat"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


async def _background_post_processing(user_id: str, conversation_text: str, message_count: int):
    """メッセージ送信後のバックグラウンド処理（記憶抽出・リスク分析）"""
    if message_count % MEMORY_EXTRACTION_INTERVAL == 0:
        new_memories = await extract_memories(conversation_text)
        for memory in new_memories:
            supabase.table("user_memories").insert({
                "user_id": user_id,
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

    user_data = supabase.table("users").select("plan").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]

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

    char_settings = supabase.table("character_settings") \
        .select("char_name, speech_style") \
        .eq("user_id", user_id) \
        .single().execute()
    char_name = char_settings.data["char_name"]
    speech_style = char_settings.data["speech_style"]

    memories = supabase.table("user_memories") \
        .select("content, category, importance") \
        .eq("user_id", user_id) \
        .order("importance", desc=True) \
        .limit(settings.max_memory_items) \
        .execute()

    history = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(20) \
        .execute()
    conversation_history = list(reversed(history.data)) if history.data else []

    result = await generate_reply(
        user_message=request.content,
        conversation_history=conversation_history,
        char_name=char_name,
        speech_style=speech_style,
        mode=request.mode,
        user_memories=memories.data if memories.data else [],
    )

    supabase.table("conversations").insert({
        "user_id": user_id,
        "role": "user",
        "content": request.content,
        "mode": request.mode,
    }).execute()

    supabase.table("conversations").insert({
        "user_id": user_id,
        "role": "assistant",
        "content": result["reply"],
        "mode": request.mode,
    }).execute()

    # バックグラウンドで記憶抽出とリスク分析を実行
    all_msgs = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(30).execute()
    msg_count = supabase.table("conversations") \
        .select("id", count="exact") \
        .eq("user_id", user_id).eq("role", "user").execute().count or 0
    conversation_text = "\n".join(
        f"{'ユーザー' if m['role'] == 'user' else 'ハル'}: {m['content']}"
        for m in reversed(all_msgs.data or [])
    )
    background_tasks.add_task(_background_post_processing, user_id, conversation_text, msg_count)

    return MessageResponse(
        reply=result["reply"],
        crisis_level=result["crisis_level"],
        crisis_resources=result["crisis_resources"],
    )


@router.post("/extract-memories")
async def trigger_memory_extraction(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    recent_conversations = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .order("created_at", desc=True) \
        .limit(30) \
        .execute()

    if not recent_conversations.data:
        return {"extracted": 0}

    conversation_text = "\n".join(
        f"{'ユーザー' if msg['role'] == 'user' else 'ハル'}: {msg['content']}"
        for msg in reversed(recent_conversations.data)
    )

    new_memories = await extract_memories(conversation_text)

    for memory in new_memories:
        supabase.table("user_memories").insert({
            "user_id": user_id,
            "content": memory["content"],
            "category": memory.get("category", "general"),
            "importance": memory.get("importance", 5),
        }).execute()

    return {"extracted": len(new_memories)}
