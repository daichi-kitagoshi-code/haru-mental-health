import random
import hashlib
import urllib.parse
import anthropic
from fastapi import APIRouter, Header, HTTPException
from supabase import create_client
from app.core.config import settings
from app.models.schemas import CharacterGenerateRequest, CharacterProfile

router = APIRouter(prefix="/characters", tags=["characters"])
supabase = create_client(settings.supabase_url, settings.supabase_service_key)
async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

PLAN_LIMITS = {"free": 2, "standard": 3, "premium": 5}

NAMES_MALE = ["蓮", "陽太", "悠斗", "湊", "大翔", "颯", "翔", "樹", "柊", "隼人", "奏", "律"]
NAMES_FEMALE = ["陽菜", "咲", "結菜", "莉子", "さくら", "美月", "七海", "凛", "澪", "ひなた", "琴音", "朱里"]
NAMES_OTHER = ["悠", "凪", "柊", "蒼", "海", "暁", "詩", "凛", "澄", "碧"]

HOMETOWNS = [
    "北海道・札幌", "青森", "仙台", "東京・下町育ち", "横浜", "名古屋", "京都",
    "大阪", "神戸", "福岡", "沖縄", "新潟の田舎", "長野の山の中", "海外（幼少期）育ち",
]

CURRENT_CITIES = [
    "東京", "大阪", "名古屋", "福岡", "横浜", "札幌", "仙台", "広島",
    "神戸", "地元のまま",
]

EDUCATIONS_BY_AGE = {
    "young": ["高校卒業後すぐ働いた", "専門学校卒", "大学中退", "大学在学中", "短大卒"],
    "adult": ["高卒で就職", "専門学校卒", "大学卒", "大学院卒", "大学中退してフリーター経験あり"],
}

OCCUPATIONS = [
    "広告代理店のアシスタント", "ITベンチャーのエンジニア（2年目）", "カフェのスタッフ",
    "公務員（市役所）", "フリーランスのデザイナー", "看護師（総合病院）",
    "アパレル販売員", "営業職（中堅メーカー）", "塾の講師", "Webライター（フリー）",
    "飲食店のスタッフ", "事務職（中小企業）", "保育士", "美容師アシスタント",
]

WORK_HOURS = [
    "平日9時〜18時、残業月20〜30時間",
    "シフト制（週4〜5日）",
    "フレックス（だいたい10時〜19時）",
    "夜勤あり（2交代制）",
    "9時〜17時・残業ほぼなし",
    "不規則（プロジェクト次第）",
]

BACKGROUNDS = [
    "バンドを組んでたことがある", "フリーター時代が3年ほどあった", "留学経験がある（1年間）",
    "起業に挑戦して失敗した経験がある", "体調を崩して休職したことがある",
    "趣味でSNSを発信してたら少しバズった", "地元を離れて一人暮らしを始めた",
    "転職を2回経験している", "副業でデザインや動画編集をしていた",
    "スポーツを本気でやっていた時期があった", "実家の家業を手伝っていた時期があった",
    "ボランティア活動を続けている", "ひとり旅で日本中を回ったことがある",
]

FAMILY_BACKGROUNDS = [
    "父は会社員、母はパート。兄が一人いる。家族仲は普通で、たまに帰省する。",
    "一人っ子で両親が少し過保護だった。今はそれがちょっとプレッシャーになってる気がする。",
    "母子家庭で育った。お母さんが頑張ってくれてたのを見てたぶん、自分も頑張らなきゃって気持ちが強い。",
    "父は地元で自営業。自分は都会に出てきて、親には少し申し訳ない気持ちもある。",
    "兄弟3人の末っ子。賑やかな家庭で育ったから、一人暮らしは少し寂しい。",
    "両親仲は良かったけど父が早くに他界した。母と二人で暮らしてた時期がある。",
    "親同士が仲悪くて、家に帰るのが少し辛かった。だから早く自立したかった。",
    "祖父母と同居で育った。年配の人との付き合い方は自然と身についた。",
]

CHILDHOOD_STORIES = [
    "中学時代は少し浮いてた。クラスに馴染めなかったわけじゃないけど、深い友達ができにくかった。",
    "小学校のころはスポーツが得意で人気者だったのに、中学でそのキャラが崩れてから自信をなくした。",
    "高校のとき好きな人に告白して見事に振られた。それからしばらく恋愛が怖かった。",
    "部活に本気で打ち込んでた時期がある。あの純粋さが今でも懐かしい。",
    "あまり目立たないタイプだったけど、先生には気に入られてた。",
    "転校を経験してる。新しい場所に馴染むのが辛かったけど、適応力はついた気がする。",
    "わりとやんちゃで、先生を困らせてた。今思えば何がしたかったのかよくわからない。",
    "本ばかり読んでた。現実より物語の中のほうがずっと居心地よかった。",
]

LOVE_HISTORIES = [
    "一番長く付き合ったのは2年。突然別れを告げられて、しばらく立ち直れなかった。",
    "浮気されたことがある。それ以来、人を信じるのが少し怖くなった。",
    "遠距離恋愛をしてた。離れてることで大切さがわかったけど、結局続かなかった。",
    "恋愛経験は少なめ。好きになるのに時間がかかるタイプ。",
    "学生のころからずっと好きな人がいた。でも言えないまま終わった。",
    "傷つけてしまった側でもある。それが今でも引っかかってる。",
    "割と多く付き合ってきたけど、なぜか長続きしない。自分のせいかもって思ってる。",
    "恋愛に本気になれたのは一度だけ。あの人を超える人がまだいない。",
]

ROMANCE_STATUSES = [
    "フリー。しばらく恋愛してない",
    "片思い中の人がいる",
    "最近別れたばかり",
    "好きかどうかわからない人がいる",
    "恋愛に疲れた時期",
    "友達以上恋人未満みたいな感じの人がいる",
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

WORRY_POOL = [
    {"title": "転職するかどうか迷ってる", "worry_type": "work"},
    {"title": "上司との関係がしんどい", "worry_type": "work"},
    {"title": "このまま今の仕事を続けていいのか", "worry_type": "work"},
    {"title": "お金が全然貯まらない", "worry_type": "money"},
    {"title": "将来のことを考えると不安になる", "worry_type": "future"},
    {"title": "一人暮らしの孤独感が最近きつい", "worry_type": "life"},
    {"title": "友達と疎遠になってきた", "worry_type": "relationship"},
    {"title": "恋人ができない", "worry_type": "love"},
    {"title": "体の調子がなんとなく優れない", "worry_type": "health"},
    {"title": "やりたいことが見つからない", "worry_type": "future"},
    {"title": "家族への申し訳なさ", "worry_type": "family"},
    {"title": "自分に自信が持てない", "worry_type": "general"},
]


def get_age_range(age_group: str, user_age: int = 25) -> tuple[int, int]:
    if age_group == "same":
        return (user_age - 3, user_age + 3)
    elif age_group == "older":
        return (user_age + 3, user_age + 10)
    else:
        return (user_age - 10, user_age - 3)


def generate_avatar_url(char: dict) -> str:
    gender_en = "woman" if char["gender"] == "female" else "man" if char["gender"] == "male" else "person"
    age = char["age"]
    occupation = char.get("occupation", "")
    seed = int(hashlib.md5(char["name"].encode()).hexdigest()[:8], 16) % 100000
    prompt = (
        f"portrait photo, japanese {gender_en}, {age} years old, {occupation}, "
        "friendly natural smile, soft natural lighting, photorealistic, high quality, "
        "face closeup, warm background, casual style"
    )
    encoded = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded}?width=512&height=512&nologo=true&seed={seed}&model=flux-realism"


async def generate_narrative_with_claude(char: dict) -> str:
    worries = char.get("current_worries_list", [])
    worry_text = ""
    if worries:
        titles = [w["title"] for w in worries[:2]]
        worry_text = f"最近の悩みは「{titles[0]}」こと。" + (f"「{titles[1]}」も気になってる。" if len(titles) > 1 else "")

    prompt = f"""以下のプロフィールを持つ人物の自己紹介文を生成してください。

名前: {char['name']} / 年齢: {char['age']}歳 / 出身: {char['hometown']} / 現在地: {char.get('current_city', '')}
職業: {char.get('occupation', '')} / 学歴: {char.get('education', '')}
家族背景: {char.get('family_background', '')}
幼少期: {char.get('childhood_story', '')}
経歴: {char.get('background', '')}
趣味: {char.get('hobbies', '')} / 性格: {char.get('personality', '')}
恋愛遍歴: {char.get('love_history', '')}
現在の恋愛状況: {char.get('current_romance_status', '')}
{worry_text}

条件:
- 700〜850文字で書く
- 一人称は「私」か「俺」（性別に合わせて）
- 友達に話すような温かくてリアルな口調
- 情報を羅列せず、自然なエピソードとして流れるように書く
- 改行を適度に入れて読みやすくする
- 最後は今の自分の気持ちや悩みで締める

自己紹介文のみを出力してください（説明や前置き不要）。"""

    response = await async_client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()


async def get_current_user_id(authorization: str = Header(...)) -> str:
    token = authorization.replace("Bearer ", "")
    try:
        user_response = supabase.auth.get_user(token)
        return user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="認証が必要です")


def _build_character_data(request: CharacterGenerateRequest, user_id: str | None = None) -> dict:
    age_min, age_max = get_age_range(request.age_group)
    age = random.randint(max(18, age_min), max(19, age_max))

    name = random.choice(
        NAMES_MALE if request.gender == "male" else
        NAMES_FEMALE if request.gender == "female" else
        NAMES_OTHER
    )

    edu_key = "young" if age < 23 else "adult"
    education = random.choice(EDUCATIONS_BY_AGE[edu_key])

    backgrounds = BACKGROUNDS.copy()
    if age < 22:
        backgrounds = [b for b in backgrounds if "起業に挑戦して失敗" not in b and "転職を2回" not in b]

    hometown = random.choice(HOMETOWNS)
    current_city_raw = random.choice(CURRENT_CITIES)
    current_city = hometown.split("・")[0] if current_city_raw == "地元のまま" else current_city_raw

    worries_list = random.sample(WORRY_POOL, k=random.randint(2, 3))

    char = {
        "name": name,
        "gender": request.gender,
        "age": age,
        "hometown": hometown,
        "current_city": current_city,
        "education": education,
        "background": random.choice(backgrounds),
        "hobbies": random.choice(HOBBIES_LIST),
        "personality": random.choice(PERSONALITIES),
        "speech_style": random.choice(SPEECH_STYLES_LIST),
        "occupation": random.choice(OCCUPATIONS),
        "work_hours": random.choice(WORK_HOURS),
        "family_background": random.choice(FAMILY_BACKGROUNDS),
        "childhood_story": random.choice(CHILDHOOD_STORIES),
        "love_history": random.choice(LOVE_HISTORIES),
        "current_romance_status": random.choice(ROMANCE_STATUSES),
        "current_worries_list": worries_list,
    }

    if user_id:
        char["user_id"] = user_id

    return char


@router.post("/generate-preview", response_model=CharacterProfile)
async def generate_character_preview(request: CharacterGenerateRequest, authorization: str = Header(...)):
    await get_current_user_id(authorization)
    from datetime import datetime, timezone
    char = _build_character_data(request)
    char["narrative_profile"] = await generate_narrative_with_claude(char)
    char["avatar_url"] = generate_avatar_url(char)
    char.pop("current_worries_list", None)
    return CharacterProfile(id="preview", created_at=datetime.now(timezone.utc), **char)


@router.post("/confirm", response_model=CharacterProfile)
async def confirm_character(character_data: CharacterProfile, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    user_data = supabase.table("users").select("plan").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]
    limit = PLAN_LIMITS.get(plan, 1)

    current_count = supabase.table("characters").select("id", count="exact").eq("user_id", user_id).execute()
    if current_count.count >= limit:
        raise HTTPException(status_code=403, detail=f"友達は{limit}人までです")

    save_data = {
        "user_id": user_id,
        "name": character_data.name,
        "gender": character_data.gender,
        "age": character_data.age,
        "hometown": character_data.hometown,
        "current_city": character_data.current_city,
        "education": character_data.education,
        "background": character_data.background,
        "hobbies": character_data.hobbies,
        "personality": character_data.personality,
        "speech_style": character_data.speech_style,
        "occupation": character_data.occupation,
        "work_hours": character_data.work_hours,
        "family_background": character_data.family_background,
        "childhood_story": character_data.childhood_story,
        "love_history": character_data.love_history,
        "current_romance_status": character_data.current_romance_status,
        "narrative_profile": character_data.narrative_profile,
        "avatar_url": character_data.avatar_url,
    }
    result = supabase.table("characters").insert(save_data).execute()
    saved = result.data[0]

    # Save worries to character_worries table (re-generate from pools since preview doesn't persist them)
    worries = random.sample(WORRY_POOL, k=random.randint(2, 3))
    for w in worries:
        supabase.table("character_worries").insert({
            "character_id": saved["id"],
            "title": w["title"],
            "worry_type": w["worry_type"],
            "current_status": "beginning",
        }).execute()

    return CharacterProfile(**saved)


@router.post("/generate", response_model=CharacterProfile)
async def generate_and_save_character(request: CharacterGenerateRequest, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)

    user_data = supabase.table("users").select("plan").eq("id", user_id).single().execute()
    plan = user_data.data["plan"]
    limit = PLAN_LIMITS.get(plan, 1)

    current_count = supabase.table("characters").select("id", count="exact").eq("user_id", user_id).execute()
    if current_count.count >= limit:
        raise HTTPException(status_code=403, detail=f"友達は{limit}人までです")

    char = _build_character_data(request, user_id=user_id)
    worries_list = char.pop("current_worries_list", [])

    result = supabase.table("characters").insert(char).execute()
    saved = result.data[0]

    for w in worries_list:
        supabase.table("character_worries").insert({
            "character_id": saved["id"],
            "title": w["title"],
            "worry_type": w["worry_type"],
            "current_status": "beginning",
        }).execute()

    return CharacterProfile(**saved)


@router.get("/", response_model=list[CharacterProfile])
async def list_characters(authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    result = supabase.table("characters").select("*").eq("user_id", user_id).order("created_at").execute()
    return [CharacterProfile(**c) for c in result.data]


@router.delete("/{character_id}")
async def delete_character(character_id: str, authorization: str = Header(...)):
    user_id = await get_current_user_id(authorization)
    supabase.table("characters").delete().eq("id", character_id).eq("user_id", user_id).execute()
    return {"message": "削除しました"}
