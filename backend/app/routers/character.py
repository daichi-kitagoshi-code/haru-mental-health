import random
from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from app.core.config import settings
from app.models.schemas import CharacterGenerateRequest, CharacterProfile

router = APIRouter(prefix="/characters", tags=["characters"])

supabase = create_client(settings.supabase_url, settings.supabase_service_key)

PLAN_LIMITS = {"free": 1, "standard": 3, "premium": 5}

NAMES_MALE = ["蓮", "陽太", "悠斗", "湊", "大翔", "颯", "翔", "樹", "柊", "隼人"]
NAMES_FEMALE = ["陽菜", "咲", "結菜", "莉子", "さくら", "美月", "七海", "凛", "澪", "ひなた"]
NAMES_OTHER = ["悠", "凪", "柊", "蒼", "海", "暁", "詩", "凛", "澄", "碧"]

HOMETOWNS = [
    "北海道・札幌", "青森", "仙台", "東京・下町育ち", "横浜", "名古屋", "京都",
    "大阪", "神戸", "福岡", "沖縄", "新潟の田舎", "長野の山の中", "海外（幼少期）育ち",
]

EDUCATIONS_BY_AGE = {
    "young": ["高校卒業後すぐ働いた", "専門学校卒", "大学中退", "大学在学中", "短大卒"],
    "adult": ["高卒で就職", "専門学校卒", "大学卒", "大学院卒", "大学中退してフリーター経験あり"],
}

BACKGROUNDS = [
    "バンドを組んでたことがある", "フリーター時代が3年ほどあった", "留学経験がある（1年間）",
    "起業に挑戦して失敗した経験がある", "体調を崩して休職したことがある",
    "趣味でSNSを発信してたら少しバズった", "地元を離れて一人暮らしを始めた",
    "転職を2回経験している", "副業でデザインや動画編集をしていた",
    "スポーツを本気でやっていた時期があった", "実家の家業を手伝っていた時期があった",
    "ボランティア活動を続けている", "ひとり旅で日本中を回ったことがある",
]

HOBBIES_LIST = [
    "映画鑑賞（特にヒューマンドラマ）", "料理・お菓子作り", "音楽（ギターをちょっと弾く）",
    "ゲーム（RPGが好き）", "読書（小説中心）", "ランニング・散歩", "カフェ巡り",
    "写真を撮ること", "アニメ・漫画", "登山・アウトドア", "ヨガ・ストレッチ",
    "ドライブ", "植物を育てること", "手芸・DIY",
]

PERSONALITIES = [
    "基本的にポジティブだけど、たまに落ち込む", "聞き上手で共感力が高い",
    "ちょっとドジで抜けてるところがある", "さっぱりしていて裏表がない",
    "面倒見がよく、放っておけないタイプ", "マイペースで周りに流されない",
    "ちょっと心配性だけど優しい", "少し毒舌だけど悪意はない",
    "天然でおもしろい発言をする", "冷静に見えて実は熱い",
]

SPEECH_STYLES_LIST = [
    "タメ口・自然なくだけた話し方", "ちょっと関西弁が混じるタメ口",
    "さっぱりした短い言葉遣い", "やわらかくて温かいタメ口",
    "少しおとなしめのタメ口", "元気でフレンドリーな話し方",
]


def get_age_range(age_group: str, user_age: int = 25) -> tuple[int, int]:
    if age_group == "same":
        return (user_age - 3, user_age + 3)
    elif age_group == "older":
        return (user_age + 3, user_age + 10)
    else:
        return (user_age - 10, user_age - 3)


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


@router.post("/generate", response_model=CharacterProfile)
async def generate_character(request: CharacterGenerateRequest, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    user_data = supabase.table("users").select("plan").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]
    limit = PLAN_LIMITS.get(plan, 1)

    current_count = supabase.table("characters") \
        .select("id", count="exact") \
        .eq("user_id", user_id).execute()
    if current_count.count >= limit:
        raise HTTPException(
            status_code=403,
            detail=f"現在のプランで作れる友達は{limit}人までです。アップグレードするともっと作れます。"
        )

    age_min, age_max = get_age_range(request.age_group)
    age = random.randint(max(18, age_min), max(19, age_max))

    if request.gender == "male":
        name = random.choice(NAMES_MALE)
    elif request.gender == "female":
        name = random.choice(NAMES_FEMALE)
    else:
        name = random.choice(NAMES_OTHER)

    edu_key = "young" if age < 23 else "adult"
    education = random.choice(EDUCATIONS_BY_AGE[edu_key])

    # Avoid contradictory combinations
    backgrounds = BACKGROUNDS.copy()
    if age < 22:
        backgrounds = [b for b in backgrounds if "起業に挑戦して失敗" not in b and "転職を2回" not in b]

    character_data = {
        "user_id": user_id,
        "name": name,
        "gender": request.gender,
        "age": age,
        "hometown": random.choice(HOMETOWNS),
        "education": education,
        "background": random.choice(backgrounds),
        "hobbies": random.choice(HOBBIES_LIST),
        "personality": random.choice(PERSONALITIES),
        "speech_style": random.choice(SPEECH_STYLES_LIST),
    }

    result = supabase.table("characters").insert(character_data).execute()
    data = result.data[0]
    return CharacterProfile(**data)


@router.post("/generate-preview", response_model=CharacterProfile)
async def generate_character_preview(request: CharacterGenerateRequest, authorization: str = Header(...)):
    """Generate a preview without saving to DB (for 'try another' flow)"""
    await get_current_user_id(authorization)

    age_min, age_max = get_age_range(request.age_group)
    age = random.randint(max(18, age_min), max(19, age_max))

    if request.gender == "male":
        name = random.choice(NAMES_MALE)
    elif request.gender == "female":
        name = random.choice(NAMES_FEMALE)
    else:
        name = random.choice(NAMES_OTHER)

    edu_key = "young" if age < 23 else "adult"
    education = random.choice(EDUCATIONS_BY_AGE[edu_key])
    backgrounds = BACKGROUNDS.copy()
    if age < 22:
        backgrounds = [b for b in backgrounds if "起業に挑戦して失敗" not in b and "転職を2回" not in b]

    from datetime import datetime, timezone
    return CharacterProfile(
        id="preview",
        name=name,
        gender=request.gender,
        age=age,
        hometown=random.choice(HOMETOWNS),
        education=education,
        background=random.choice(backgrounds),
        hobbies=random.choice(HOBBIES_LIST),
        personality=random.choice(PERSONALITIES),
        speech_style=random.choice(SPEECH_STYLES_LIST),
        created_at=datetime.now(timezone.utc),
    )


@router.post("/confirm", response_model=CharacterProfile)
async def confirm_character(
    character_data: CharacterProfile,
    authorization: str = Header(...),
):
    """Save a previewed character to DB"""
    user_id = await get_current_user_id(authorization)

    user_data = supabase.table("users").select("plan").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]
    limit = PLAN_LIMITS.get(plan, 1)

    current_count = supabase.table("characters") \
        .select("id", count="exact").eq("user_id", user_id).execute()
    if current_count.count >= limit:
        raise HTTPException(status_code=403, detail=f"友達は{limit}人までです")

    save_data = {
        "user_id": user_id,
        "name": character_data.name,
        "gender": character_data.gender,
        "age": character_data.age,
        "hometown": character_data.hometown,
        "education": character_data.education,
        "background": character_data.background,
        "hobbies": character_data.hobbies,
        "personality": character_data.personality,
        "speech_style": character_data.speech_style,
    }
    result = supabase.table("characters").insert(save_data).execute()
    return CharacterProfile(**result.data[0])


@router.get("/", response_model=list[CharacterProfile])
async def list_characters(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    result = supabase.table("characters") \
        .select("*").eq("user_id", user_id).order("created_at").execute()
    return [CharacterProfile(**c) for c in result.data]


@router.delete("/{character_id}")
async def delete_character(character_id: str, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    supabase.table("characters") \
        .delete().eq("id", character_id).eq("user_id", user_id).execute()
    return {"message": "削除しました"}
