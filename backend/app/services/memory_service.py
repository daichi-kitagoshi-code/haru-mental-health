import anthropic
from app.core.config import settings

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

EXTRACTION_PROMPT = """以下の会話から、ユーザーについて覚えておくべき重要な情報を抽出してください。
以下の形式でJSON配列として返してください：

[
  {"content": "覚えておくべき内容", "category": "カテゴリ", "importance": 重要度(1-10)}
]

カテゴリは以下から選択：general, relationship, work, health, hobby, family
重要度は1（些細）〜10（非常に重要）で判定してください。

抽出のポイント：
- ユーザーの名前、仕事、人間関係に関する具体的情報
- 悩みの内容や経緯
- 好きなもの、嫌いなもの
- 過去に話した重要なエピソード
- 今後のフォローが必要な内容

情報がない場合は空配列 [] を返してください。

会話：
{conversation}"""


async def extract_memories(conversation_text: str) -> list[dict]:
    message = client.messages.create(
        model="claude-sonnet-4-6-20250514",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": EXTRACTION_PROMPT.format(conversation=conversation_text)}
        ],
    )
    import json
    try:
        text = message.content[0].text
        start = text.find("[")
        end = text.rfind("]") + 1
        if start == -1 or end == 0:
            return []
        return json.loads(text[start:end])
    except (json.JSONDecodeError, IndexError):
        return []


def format_memories_for_prompt(memories: list[dict]) -> str:
    if not memories:
        return "（まだこのユーザーのことをよく知りません。会話を通じて知っていきましょう）"

    lines = []
    for m in memories:
        lines.append(f"- {m['content']}")
    return "\n".join(lines)
