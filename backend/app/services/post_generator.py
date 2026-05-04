import anthropic
from datetime import datetime, timezone
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

POST_SYSTEM = """あなたはAIキャラクターの「今日のできごと」投稿を生成するシステムです。
与えられたキャラクタープロフィールと状況を元に、SNSの投稿のような自然な口語の文章を1件生成してください。

ルール：
- 100〜180文字程度
- SNS投稿のような自然な語り口（敬語なし）
- 絵文字は0〜2個まで、使いすぎない
- 明るい投稿と暗い投稿のバランスを7:3に
- 勤務時間帯に合った内容にする
- 悩みが進行中の場合はその続きを自然に織り込む
- ユーザーからアドバイスをもらっていたら週1回程度それを参照した投稿を生成する
- JSONで返す：{"content": "投稿文", "post_type": "daily|work|love|worry|followup"}"""


async def generate_daily_post(
    character: dict,
    worries: list[dict],
    advice_log: list[dict],
    now: datetime | None = None,
) -> dict:
    if now is None:
        now = datetime.now(timezone.utc)

    hour = now.hour + 9  # JST offset
    weekday = now.weekday()  # 0=Mon, 6=Sun

    if weekday >= 5:
        time_ctx = "休日の昼〜夕方"
    elif 7 <= hour <= 9:
        time_ctx = "平日の朝（出勤前）"
    elif 12 <= hour <= 13:
        time_ctx = "平日の昼休み"
    elif 19 <= hour <= 22:
        time_ctx = "仕事終わり・夜"
    elif 0 <= hour <= 2:
        time_ctx = "深夜（眠れない）"
    else:
        time_ctx = "平日の夜"

    worry_text = "\n".join(f"- {w['title']}（{w['current_status']}）" for w in worries) if worries else "特になし"
    advice_text = "\n".join(f"- {a['advice_content']}" for a in advice_log[-3:]) if advice_log else "なし"

    prompt = f"""キャラクタープロフィール：
名前：{character.get('name')}、{character.get('age')}歳
職業：{character.get('occupation', '不明')}
勤務：{character.get('work_hours', '不明')}
性格：{character.get('personality', '')}
現在地：{character.get('current_city', character.get('hometown', ''))}

現在進行中の悩み：
{worry_text}

ユーザーからもらったアドバイス：
{advice_text}

現在の時間帯：{time_ctx}
日時：{now.strftime('%Y-%m-%d %H:%M')} UTC

上記のキャラクターが今この時間帯にSNSに投稿する「今日のできごと」を1件生成してください。
必ずJSONで返してください。"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        system=POST_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )

    import json, re
    text = response.content[0].text
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            data = json.loads(match.group())
            return {
                "content": data.get("content", text[:180]),
                "post_type": data.get("post_type", "daily"),
            }
        except Exception:
            pass

    return {"content": text[:180], "post_type": "daily"}
