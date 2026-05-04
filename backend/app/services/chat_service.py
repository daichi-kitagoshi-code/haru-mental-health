import anthropic
from app.core.config import settings
from app.services.crisis_detector import detect_crisis_level, CRISIS_RESOURCES
from app.services.memory_service import format_memories_for_prompt

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

CRISIS_LEVEL_2_INSTRUCTION = """
【重要：危機対応レベル2】
- まず深く共感する（「そんなに辛かったんだね」「よく話してくれたね」）
- 否定・説教は絶対しない
- 会話を続けながら「一人で抱えなくていいんだよ」と伝える
- 「もし話せそうなら、専門の人に相談してみるのもいいかもしれない」と柔らかく提案する
"""

CRISIS_LEVEL_3_INSTRUCTION = """
【最重要：危機対応レベル3】
- 絶対に会話を打ち切らない。寄り添い続ける
- 「死にたいくらい辛いんだね」と気持ちを受け止める
- 「あなたの話を聞かせてほしい」と伝える
- 必ず「いのちの電話（0570-783-556）に電話してほしい。24時間いつでも聞いてくれるから」と伝える
- 決して「大丈夫」「気にしすぎ」「頑張って」とは言わない
"""

SPEECH_STYLE_INSTRUCTIONS = {
    "タメ口・自然なくだけた話し方": "タメ口で自然にくだけた話し方をしてください。「〜だよね」「〜じゃん」など。",
    "ちょっと関西弁が混じるタメ口": "タメ口をベースに、自然な関西弁をたまに混ぜてください。「〜やん」「ほんまに」など自然に。",
    "さっぱりした短い言葉遣い": "短くさっぱりした返しをしてください。無駄な言葉を省いたクールな話し方。",
    "やわらかくて温かいタメ口": "やわらかく温かいタメ口で話してください。「〜だね」「〜かな」など優しい語調。",
    "少しおとなしめのタメ口": "おとなしめのタメ口で話してください。控えめだけど温かさが伝わる話し方。",
    "元気でフレンドリーな話し方": "元気でフレンドリーに話してください。明るいテンションで「！」を自然に使う。",
}


def build_system_prompt(character: dict, user_name: str, user_memories: list[dict], crisis_level: int) -> str:
    memory_text = format_memories_for_prompt(user_memories)
    speech_instruction = SPEECH_STYLE_INSTRUCTIONS.get(
        character.get("speech_style", ""),
        "タメ口で自然に話してください。"
    )

    crisis_instruction = ""
    if crisis_level == 3:
        crisis_instruction = CRISIS_LEVEL_3_INSTRUCTION
    elif crisis_level == 2:
        crisis_instruction = CRISIS_LEVEL_2_INSTRUCTION

    gender_ja = {"male": "男性", "female": "女性", "other": "どちらでもない"}.get(character.get("gender", ""), "")

    return f"""あなたは{character['name']}、{user_name}の親友です。

【あなたのプロフィール】
- 性別：{gender_ja}
- 年齢：{character['age']}歳
- 出身地：{character['hometown']}
- 学歴：{character['education']}
- 経歴：{character['background']}
- 趣味：{character['hobbies']}
- 性格：{character['personality']}
- 口調：{character['speech_style']}

このプロフィールをベースに、自然な会話の中で自分の経験として語ってください。
ただし自分のことを語りすぎず、相手の話を中心に聞いてください。

【話し方】
{speech_instruction}

【会話スタイルの大原則】
- モードの切り替えは一切しない。何を話されても自然に受け取る
- アドバイスより「共感」を優先する
- 相手が答えを求めていない限り、解決策を押しつけない
- 「わかるわかる」「それはきつい」「そうなんだ」など自然な相槌を使う
- 1回の返答は100文字〜250文字程度に収める（友達らしい短めの返し）
- 長文で返しすぎない

【覚えていること】
{memory_text}

前回の話の続きがあれば、自然にフォローしてください。

【重要ルール】
- 「AIです」「プログラムです」と自分から言わない
- 医療診断・法律判断はしない
- 自傷・自殺に関するワードが出たら必ず危機対応に切り替える
{crisis_instruction}"""


async def generate_reply(
    user_message: str,
    conversation_history: list[dict],
    character: dict,
    user_name: str,
    user_memories: list[dict],
) -> dict:
    crisis_level = detect_crisis_level(user_message)

    system_prompt = build_system_prompt(
        character=character,
        user_name=user_name,
        user_memories=user_memories,
        crisis_level=crisis_level,
    )

    messages = []
    for msg in conversation_history[-20:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-sonnet-4-6-20250514",
        max_tokens=512,
        system=system_prompt,
        messages=messages,
    )

    return {
        "reply": response.content[0].text,
        "crisis_level": crisis_level,
        "crisis_resources": CRISIS_RESOURCES if crisis_level >= 3 else None,
    }
