# ハル - ゼロからデプロイするための手順書

## 必要なアカウント
- [Supabase](https://supabase.com)（無料プランで開始可）
- [Anthropic](https://console.anthropic.com)（Claude API）
- [Railway](https://railway.app)（バックエンドホスティング）
- [Expo](https://expo.dev)（モバイルアプリビルド）

---

## ステップ1：Supabaseのセットアップ

1. Supabaseで新規プロジェクトを作成（リージョン：Northeast Asia / Tokyo）
2. SQL Editorで以下を順番に実行：
   - `backend/migrations/001_initial_schema.sql`
   - `backend/migrations/002_b2b_additions.sql`
   - `backend/migrations/003_push_tokens.sql`
3. Project Settings → API から以下を控える：
   - `SUPABASE_URL`（Project URL）
   - `SUPABASE_KEY`（anon/public key）
   - `SUPABASE_SERVICE_KEY`（service_role key）

---

## ステップ2：バックエンドのデプロイ（Railway）

1. [Railway](https://railway.app) にログイン → New Project → Deploy from GitHub
2. `backend/` ディレクトリを含むリポジトリを接続
3. Root Directory を `backend` に設定
4. 以下の環境変数を設定：

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJhbGci...（anon key）
SUPABASE_SERVICE_KEY=eyJhbGci...（service_role key）
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=（ランダムな32文字以上の文字列）
```

5. デプロイ完了後、発行されたURLを控える（例：`https://haru-api.railway.app`）
6. ヘルスチェック確認：`https://haru-api.railway.app/health` が `{"status":"ok"}` を返せばOK

---

## ステップ3：デイリー通知のCRON設定（Railway）

Railwayのダッシュボード → New → Cron Service で設定：

| 設定 | 値 |
|---|---|
| Command | `curl -X POST https://haru-api.railway.app/notifications/send-checkins -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"` |
| Schedule | `0 19 * * *`（毎日19:00 UTC = 日本時間 04:00） |

---

## ステップ4：モバイルアプリのビルド

1. `mobile/src/constants/api.ts` を編集：
```typescript
export const API_BASE_URL = __DEV__
  ? "http://localhost:8000"
  : "https://haru-api.railway.app";  // ← RailwayのURLに変更
```

2. `mobile/app.json` を編集：
   - `ios.bundleIdentifier` を自分のIDに変更（例：`com.yourname.haru`）
   - `android.package` を同じ値に変更

3. EASでビルド：
```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform all --profile preview  # テスト用
eas build --platform all --profile production  # 本番用
```

---

## ステップ5：管理者ダッシュボードのデプロイ（Vercel）

1. `dashboard/.env` を作成：
```
VITE_API_URL=https://haru-api.railway.app
```

2. [Vercel](https://vercel.com) → Import Git Repository → `dashboard/` を指定
3. Environment Variables に `VITE_API_URL` を設定
4. デプロイ完了

---

## ステップ6：企業のB2B登録

Supabase SQL Editorで企業を手動登録（初期フェーズ）：

```sql
INSERT INTO companies (name, plan, admin_email, company_code)
VALUES ('株式会社○○', 'small', 'admin@example.com', 'ABC12345');
```

- 管理者は `admin@example.com` でダッシュボードにログイン
- 従業員はアプリの設定画面から企業コード `ABC12345` を入力して紐付け

---

## 動作確認チェックリスト

- [ ] `/health` エンドポイントが `ok` を返す
- [ ] サインアップ → ログインが通る
- [ ] チャットでメッセージを送ると返事が来る
- [ ] 10回会話後、`user_memories` テーブルに記憶が保存されている
- [ ] 気分記録ができる
- [ ] 「死にたい」と入力すると危機リソースが表示される
- [ ] ダッシュボードにログインできる

---

## 料金の目安（月額）

| サービス | プラン | 月額 |
|---|---|---|
| Supabase | Free（初期）→ Pro（$25/月） | $0〜$25 |
| Railway | Hobby（$5/月〜） | $5〜$20 |
| Anthropic API | 従量課金（sonnet: $3/MTok） | ユーザー数による |
| Vercel | Free | $0 |
| Expo | Free（EASビルドは$14/月〜） | $0〜$14 |

ユーザー100人・月1000メッセージ/人の規模で Claude APIは約 **$9/月** 程度。
