# ハル - AI友達アプリ

## プロジェクト構造

```
backend/          FastAPI バックエンド
  app/
    main.py       エントリポイント
    core/         設定
    routers/      APIエンドポイント (auth, chat, mood, character)
    services/     ビジネスロジック (chat_service, memory_service, crisis_detector)
    models/       Pydanticスキーマ
  migrations/     Supabase SQL

mobile/           React Native (Expo) フロントエンド
  src/
    screens/      画面コンポーネント
    services/     APIクライアント
    hooks/        状態管理 (Zustand)
    navigation/   ナビゲーション設定
    constants/    テーマ・定数
```

## 起動方法

### バックエンド
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # 環境変数を設定
uvicorn app.main:app --reload
```

### フロントエンド
```bash
cd mobile
npm install
npx expo start
```

## 重要な設計判断
- AIの記憶: 会話終了時にClaude APIで重要情報を抽出→DBに保存→次回プロンプトに注入
- 危機対応: 3段階エスカレーション（会話を打ち切らずに寄り添いながら橋渡し）
- B2B匿名集計: 個人を特定できない「役職×部署×行動パターン」の形で集計
