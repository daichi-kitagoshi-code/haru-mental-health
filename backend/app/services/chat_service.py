import anthropic
import asyncio
import logging
import time

from app.core.config import settings
from app.services.crisis_detector import detect_crisis_level, CRISIS_RESOURCES
from app.services.memory_service import format_memories_for_prompt

logger = logging.getLogger(__name__)

async_client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

# ── Retry / timeout config ─────────────────────────────────────────────────
API_TIMEOUT_SEC  = 30        # per-attempt timeout
MAX_RETRIES      = 8         # 8 attempts (was 3) — critical for smooth UX
BACKOFF_BASE_SEC = 1         # exponential backoff base
RATE_LIMIT_WAIT  = 2         # base wait for 429: 2s → 4s → 6s → 8s (capped at 10s)
MAX_HISTORY_MSGS = 20        # hard cap on history messages
TOKEN_BUDGET     = 8000      # rough total token budget before compression

# ── Model ────────────────────────────────────────────────────────────────────
# Haiku: 5-10x higher rate limits than Sonnet, faster, cheaper.
# For conversational chat the quality difference is negligible.
CHAT_MODEL = "claude-haiku-4-5-20251001"

# ── Crisis instructions ────────────────────────────────────────────────────
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


# ── Token estimation ───────────────────────────────────────────────────────
def estimate_tokens(text: str) -> int:
    """
    Rough estimate: Japanese ~1 token / 2 chars, English ~1 token / 4 chars.
    Use 2.5 chars/token as a conservative middle ground.
    """
    return max(1, len(text) // 2)


def trim_history_to_budget(
    messages: list[dict],
    system_prompt: str,
    user_message: str,
) -> list[dict]:
    """
    Trim oldest messages until estimated token count fits within TOKEN_BUDGET.
    Always keeps at least the most recent 4 messages for context continuity.
    """
    # Reserve tokens: system prompt + latest user message + response headroom
    reserved = estimate_tokens(system_prompt) + estimate_tokens(user_message) + 600
    available = TOKEN_BUDGET - reserved

    if available <= 0:
        logger.warning("[chat] system prompt alone exceeds token budget")
        return messages[-4:] if len(messages) > 4 else messages

    total = 0
    kept: list[dict] = []
    for msg in reversed(messages):
        t = estimate_tokens(msg["content"])
        if total + t > available and len(kept) >= 4:
            logger.info(f"[chat] token trim: dropped {len(messages) - len(kept)} old messages")
            break
        kept.insert(0, msg)
        total += t

    return kept


# ── System prompt builder ──────────────────────────────────────────────────
def build_system_prompt(
    character: dict,
    user_name: str,
    user_memories: list[dict],
    crisis_level: int,
) -> str:
    memory_text = format_memories_for_prompt(user_memories)
    speech_instruction = SPEECH_STYLE_INSTRUCTIONS.get(
        character.get("speech_style", ""),
        "タメ口で自然に話してください。",
    )
    crisis_instruction = ""
    if crisis_level == 3:
        crisis_instruction = CRISIS_LEVEL_3_INSTRUCTION
    elif crisis_level == 2:
        crisis_instruction = CRISIS_LEVEL_2_INSTRUCTION

    gender_ja = {"male": "男性", "female": "女性", "other": "どちらでもない"}.get(
        character.get("gender", ""), ""
    )
    education   = character.get("education")  or "学歴不明"
    background  = character.get("background") or ""
    hobbies     = character.get("hobbies")    or ""
    occupation  = character.get("occupation") or ""

    return f"""あなたは{character['name']}、{user_name}の親友です。

【あなたのプロフィール】
- 性別：{gender_ja}
- 年齢：{character['age']}歳
- 出身地：{character.get('hometown', '')}
- 学歴：{education}
- 経歴：{background}
- 趣味：{hobbies}
- 性格：{character.get('personality', '')}
- 口調：{character.get('speech_style', '')}
- 職業：{occupation}

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

【絶対にやってはいけないこと】
- 「今ちょっと混んでる」「少ししてから」など返答を先延ばしにすること。これは会話の信頼を壊す最悪の行動。
- 質問を誤魔化したり、話題をそらしたりすること
- 「わからない」と言えるはずのことを「後で」と言うこと

【答えにくい質問への対応ルール】
- 答えられない・わからないことは正直に「わからない」と言う
  例：「AIだからその答えは持ってないんだよね、ごめん」
- 答えが複雑で整理できていない場合は、相手に質問し直して理解を深める
  例：「どういう意味で聞いてるのか、もう少し教えてくれる？」
- 答えたくない理由がある場合は理由を素直に伝える
  例：「それは私には踏み込めない話かな…ごめんね」
- いずれにせよ、返答を「後で」「少ししてから」と先延ばしにしない
{crisis_instruction}"""


# ── Core reply generation with retry ──────────────────────────────────────
async def generate_reply(
    user_message: str,
    conversation_history: list[dict],
    character: dict,
    user_name: str,
    user_memories: list[dict],
) -> dict:
    # ① Crisis detection always runs first (never blocks reply generation)
    crisis_level = detect_crisis_level(user_message)
    logger.info(
        "[chat] request: char=%s crisis_level=%d msg_preview=%s",
        character.get("name"), crisis_level, user_message[:40],
    )

    # ② Build prompt
    system_prompt = build_system_prompt(
        character=character,
        user_name=user_name,
        user_memories=user_memories,
        crisis_level=crisis_level,
    )

    # ③ Prepare history with token budget management
    raw_history = [
        {"role": m["role"], "content": m["content"]}
        for m in conversation_history[-MAX_HISTORY_MSGS:]
    ]
    trimmed = trim_history_to_budget(raw_history, system_prompt, user_message)
    messages = trimmed + [{"role": "user", "content": user_message}]

    est_tokens = estimate_tokens(system_prompt) + sum(
        estimate_tokens(m["content"]) for m in messages
    )
    logger.info(
        "[chat] sending %d messages (~%d tokens estimated)",
        len(messages), est_tokens,
    )

    # ④ Retry loop
    last_error: str = "unknown"
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            t0 = time.monotonic()
            logger.info("[chat] attempt %d/%d", attempt, MAX_RETRIES)

            response = await asyncio.wait_for(
                async_client.messages.create(
                    model=CHAT_MODEL,
                    max_tokens=512,
                    system=system_prompt,
                    messages=messages,
                ),
                timeout=API_TIMEOUT_SEC,
            )

            elapsed = time.monotonic() - t0
            reply_text = response.content[0].text
            logger.info(
                "[chat] success on attempt %d (%.2fs) stop_reason=%s reply_len=%d",
                attempt, elapsed, response.stop_reason, len(reply_text),
            )

            return {
                "reply": reply_text,
                "crisis_level": crisis_level,
                "crisis_resources": CRISIS_RESOURCES if crisis_level >= 3 else None,
            }

        # ── Timeout ──────────────────────────────────────────────────────
        except asyncio.TimeoutError:
            last_error = "timeout"
            logger.warning(
                "[chat] attempt %d/%d timed out after %ds",
                attempt, MAX_RETRIES, API_TIMEOUT_SEC,
            )
            if attempt < MAX_RETRIES:
                wait = BACKOFF_BASE_SEC ** (attempt - 1)   # 1s → 2s
                logger.info("[chat] retrying in %.1fs", wait)
                await asyncio.sleep(wait)

        # ── Rate limit (429) ──────────────────────────────────────────────
        except anthropic.RateLimitError as e:
            last_error = "rate_limit_429"
            # ── Log tier/quota headers for debugging ──────────────────────
            if hasattr(e, "response") and e.response is not None:
                h = dict(e.response.headers)
                logger.warning(
                    "[chat] rate-limit headers: "
                    "requests-remaining=%s requests-reset=%s "
                    "tokens-remaining=%s tokens-reset=%s",
                    h.get("anthropic-ratelimit-requests-remaining", "N/A"),
                    h.get("anthropic-ratelimit-requests-reset", "N/A"),
                    h.get("anthropic-ratelimit-tokens-remaining", "N/A"),
                    h.get("anthropic-ratelimit-tokens-reset", "N/A"),
                )
            else:
                logger.warning(
                    "[chat] attempt %d/%d rate-limited (no headers): %s",
                    attempt, MAX_RETRIES, str(e),
                )
            if attempt < MAX_RETRIES:
                wait = min(RATE_LIMIT_WAIT * attempt, 10)  # 2s→4s→6s→8s→10s (cap)
                logger.info("[chat] retrying in %.1fs (rate limit backoff)", wait)
                await asyncio.sleep(wait)

        # ── API server errors (5xx) ───────────────────────────────────────
        except anthropic.APIStatusError as e:
            last_error = f"api_status_{e.status_code}"
            logger.error(
                "[chat] attempt %d/%d API status error: status=%d body=%s",
                attempt, MAX_RETRIES, e.status_code, str(e.message)[:200],
            )
            if e.status_code >= 500 and attempt < MAX_RETRIES:
                wait = BACKOFF_BASE_SEC ** (attempt - 1)
                logger.info("[chat] retrying in %.1fs", wait)
                await asyncio.sleep(wait)
            else:
                # 4xx (not rate limit) → don't retry
                logger.error("[chat] non-retryable error %d, aborting", e.status_code)
                break

        # ── Connection / network errors ───────────────────────────────────
        except anthropic.APIConnectionError as e:
            last_error = "connection_error"
            logger.error(
                "[chat] attempt %d/%d connection error: %s",
                attempt, MAX_RETRIES, str(e),
            )
            if attempt < MAX_RETRIES:
                wait = BACKOFF_BASE_SEC ** attempt
                logger.info("[chat] retrying in %.1fs", wait)
                await asyncio.sleep(wait)

        # ── Unexpected ────────────────────────────────────────────────────
        except Exception as e:
            last_error = f"unexpected_{type(e).__name__}"
            logger.exception(
                "[chat] attempt %d/%d unexpected error: %s",
                attempt, MAX_RETRIES, str(e),
            )
            break   # unexpected errors are not retried

    # All attempts exhausted
    logger.error(
        "[chat] all %d attempts failed. last_error=%s char=%s",
        MAX_RETRIES, last_error, character.get("name"),
    )
    raise RuntimeError(f"CHAT_API_FAILED:{last_error}")
