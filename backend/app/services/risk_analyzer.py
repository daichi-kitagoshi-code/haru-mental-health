import anthropic
import json
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

RISK_ANALYSIS_PROMPT = """以下のユーザーの会話内容を分析して、職場のハラスメントや問題行動に関するリスク信号を検出してください。

個人を特定する情報（名前、具体的な日時、固有のエピソード）は除外し、
パターンと重大度のみを抽出してください。

以下の形式でJSONを返してください：
{
  "has_risk": true/false,
  "keywords": ["キーワード1", "キーワード2"],
  "severity": "low" | "medium" | "high",
  "department_hint": "部署のヒント（言及があれば）",
  "target_role_hint": "問題の対象となっている役職レベルのヒント",
  "pattern_summary": "個人を特定しない形でのパターン説明"
}

severity基準：
- low: 一般的なストレス・不満（「疲れた」「しんどい」程度）
- medium: 継続的な問題行動（残業強制、無視など）
- high: 明確なハラスメント（怒鳴る、パワハラ、セクハラなど）

リスクが検出されない場合は has_risk: false を返してください。

会話内容：
{conversation}"""


async def analyze_risk_from_conversation(conversation_text: str) -> dict | None:
    message = client.messages.create(
        model="claude-sonnet-4-6-20250514",
        max_tokens=512,
        messages=[
            {"role": "user", "content": RISK_ANALYSIS_PROMPT.format(conversation=conversation_text)}
        ],
    )
    try:
        text = message.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1:
            return None
        data = json.loads(text[start:end])
        if not data.get("has_risk"):
            return None
        return data
    except (json.JSONDecodeError, IndexError):
        return None
