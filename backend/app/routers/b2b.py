from fastapi import APIRouter, HTTPException, Header, Depends
from supabase import create_client
from app.core.config import settings
from app.services.risk_analyzer import analyze_risk_from_conversation
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

router = APIRouter(prefix="/b2b", tags=["b2b"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)


async def get_company_admin(authorization: str = Header(...)) -> dict:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")

    company = supabase.table("companies") \
        .select("id, name, plan") \
        .eq("admin_email", user_response.user.email) \
        .single().execute()

    if not company.data:
        raise HTTPException(status_code=403, detail="企業管理者権限がありません")

    return {"user_id": user_id, "company": company.data}


class RegisterEmployeeRequest(BaseModel):
    department: str | None = None
    role_level: str | None = None


@router.post("/register-employee")
async def register_as_employee(
    request: RegisterEmployeeRequest,
    company_code: str,
    authorization: str = Header(...),
):
    """従業員がコードを使って企業に紐付け登録する"""
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")

    company = supabase.table("companies") \
        .select("id") \
        .eq("company_code", company_code) \
        .single().execute()

    if not company.data:
        raise HTTPException(status_code=404, detail="企業コードが見つかりません")

    existing = supabase.table("employees") \
        .select("id") \
        .eq("company_id", company.data["id"]) \
        .eq("user_id", user_id) \
        .execute()

    if existing.data:
        return {"message": "既に登録済みです"}

    supabase.table("employees").insert({
        "company_id": company.data["id"],
        "user_id": user_id,
        "department": request.department,
        "role_level": request.role_level,
    }).execute()

    return {"message": "登録しました。あなたの発言は匿名で集計されます。個人を特定する情報は企業に渡りません。"}


@router.post("/analyze-risk/{user_id}")
async def trigger_risk_analysis(user_id: str, authorization: str = Header(...)):
    """会話からリスク分析を実行（バックグラウンドジョブ用）"""
    # このエンドポイントはサービスキーでのみ呼び出し可能
    token = authorization.replace("Bearer ", "")
    if token != settings.supabase_service_key:
        raise HTTPException(status_code=403, detail="サービスキーが必要です")

    employee = supabase.table("employees") \
        .select("company_id, department, role_level") \
        .eq("user_id", user_id) \
        .execute()

    if not employee.data:
        return {"analyzed": False, "reason": "企業未登録ユーザー"}

    emp = employee.data[0]

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    conversations = supabase.table("conversations") \
        .select("role, content") \
        .eq("user_id", user_id) \
        .gte("created_at", since.isoformat()) \
        .order("created_at") \
        .execute()

    if not conversations.data:
        return {"analyzed": False, "reason": "会話なし"}

    conversation_text = "\n".join(
        f"{'ユーザー' if msg['role'] == 'user' else 'ハル'}: {msg['content']}"
        for msg in conversations.data
    )

    risk = await analyze_risk_from_conversation(conversation_text)

    if not risk:
        return {"analyzed": True, "has_risk": False}

    department = risk.get("department_hint") or emp.get("department") or "不明"
    target_role = risk.get("target_role_hint") or emp.get("role_level") or "不明"

    existing = supabase.table("risk_signals") \
        .select("id, signal_count") \
        .eq("company_id", emp["company_id"]) \
        .eq("department", department) \
        .eq("target_role_level", target_role) \
        .eq("severity", risk["severity"]) \
        .gte("created_at", (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()) \
        .execute()

    if existing.data:
        existing_record = existing.data[0]
        existing_keywords = set()
        new_keywords = set(risk.get("keywords", []))
        merged = list(existing_keywords | new_keywords)[:10]

        supabase.table("risk_signals") \
            .update({
                "signal_count": existing_record["signal_count"] + 1,
                "keywords": merged,
            }) \
            .eq("id", existing_record["id"]) \
            .execute()
    else:
        supabase.table("risk_signals").insert({
            "company_id": emp["company_id"],
            "department": department,
            "target_role_level": target_role,
            "keywords": risk.get("keywords", []),
            "severity": risk["severity"],
            "signal_count": 1,
        }).execute()

    return {"analyzed": True, "has_risk": True, "severity": risk["severity"]}


@router.get("/dashboard")
async def get_dashboard(admin=Depends(get_company_admin)):
    """企業管理者向けダッシュボードデータ"""
    company_id = admin["company"]["id"]

    month_ago = datetime.now(timezone.utc) - timedelta(days=30)
    prev_month_ago = datetime.now(timezone.utc) - timedelta(days=60)

    current_signals = supabase.table("risk_signals") \
        .select("*") \
        .eq("company_id", company_id) \
        .gte("created_at", month_ago.isoformat()) \
        .order("signal_count", desc=True) \
        .execute()

    prev_signals = supabase.table("risk_signals") \
        .select("department, target_role_level, signal_count") \
        .eq("company_id", company_id) \
        .gte("created_at", prev_month_ago.isoformat()) \
        .lt("created_at", month_ago.isoformat()) \
        .execute()

    prev_map: dict[str, int] = {}
    for s in (prev_signals.data or []):
        key = f"{s['department']}_{s['target_role_level']}"
        prev_map[key] = prev_map.get(key, 0) + s["signal_count"]

    alerts = []
    for signal in (current_signals.data or []):
        key = f"{signal['department']}_{signal['target_role_level']}"
        prev_count = prev_map.get(key, 0)
        change_pct = None
        if prev_count > 0:
            change_pct = int((signal["signal_count"] - prev_count) / prev_count * 100)

        alerts.append({
            "department": signal["department"],
            "target_role_level": signal["target_role_level"],
            "keywords": signal["keywords"],
            "severity": signal["severity"],
            "signal_count": signal["signal_count"],
            "change_pct": change_pct,
        })

    employee_count = supabase.table("employees") \
        .select("id", count="exact") \
        .eq("company_id", company_id) \
        .execute()

    high_count = sum(1 for a in alerts if a["severity"] == "high")
    mid_count = sum(1 for a in alerts if a["severity"] == "medium")

    return {
        "company": admin["company"],
        "summary": {
            "employee_count": employee_count.count or 0,
            "high_risk_count": high_count,
            "medium_risk_count": mid_count,
            "total_signals": sum(a["signal_count"] for a in alerts),
        },
        "alerts": alerts,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
