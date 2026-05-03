import re

LEVEL_3_PATTERNS = [
    r"死にたい",
    r"自殺",
    r"死のう",
    r"殺して",
    r"首を吊",
    r"飛び降り",
    r"リスカ",
    r"手首を切",
    r"もう終わりにしたい",
    r"この世から消えたい",
    r"生きてる意味.*ない",
    r"死んだ方がいい",
    r"遺書",
    r"最後に.*伝えたい",
    r"薬.*大量",
    r"OD",
]

LEVEL_2_PATTERNS = [
    r"消えたい",
    r"いなくなりたい",
    r"生きるのが辛い",
    r"もう無理",
    r"限界",
    r"誰にも.*必要とされて.*ない",
    r"価値がない",
    r"居場所がない",
    r"何のために生きて",
    r"疲れた.*全部",
    r"逃げたい.*全部",
    r"もう頑張れない",
]

CRISIS_RESOURCES = [
    "いのちの電話: 0570-783-556（24時間対応）",
    "よりそいホットライン: 0120-279-338（24時間無料）",
    "こころの健康相談統一ダイヤル: 0570-064-556",
]


def detect_crisis_level(text: str) -> int:
    for pattern in LEVEL_3_PATTERNS:
        if re.search(pattern, text):
            return 3
    for pattern in LEVEL_2_PATTERNS:
        if re.search(pattern, text):
            return 2
    return 1
