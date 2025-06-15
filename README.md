# Open-SuperAgent

AIアシスタント機能を備えたオープンソースチャットアプリケーション。Mastraエージェントと連携して、様々なタスクを自動化します。

![アプリケーションのスクリーンショット](public/screenshot.png)

## 🚀 すぐに試してみる（無料）

**最初は無料のAPIキーだけで、AIチャットと検索機能を体験できます！**

### 必要な無料APIキー（2つだけ）

1. **Google Gemini API（無料）**
   - [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
   - Googleアカウントでサインイン
   - "Create API Key" をクリック
   - **無料枠**: 1分間あたり最大15リクエスト、1日1,500リクエストまで無料

2. **Brave Search API（無料）**
   - [Brave Search API](https://api.search.brave.com/app/keys) にアクセス
   - アカウント作成（GitHubアカウントでも可）
   - "Create new key" をクリック
   - **無料枠**: 月間2,000クエリまで無料

### クイックスタート

上記の2つのAPIキーを取得したら、詳細なセットアップ手順は下記の「セットアップ手順」セクションをご確認ください。

ブラウザで http://localhost:3000 を開いて、AIチャットと検索を試してみましょう！

### 無料で使える機能

- ✅ **AIチャット**: Google Gemini 2.5 Flashによる高速な応答
- ✅ **Web検索**: Brave Searchを使った最新情報の検索
- ✅ **タスクプランニング**: 複数のタスクを効率的に実行
- ✅ **並列処理**: 独立したタスクを同時実行で高速化

他の機能（画像生成、音声生成、ブラウザ自動化など）を使いたい場合は、該当するAPIキーを追加で設定してください。

## 🐳 Docker で実行する

Dockerを使用すると、環境構築を簡単に行い、一貫した環境でアプリケーションを実行できます。

### Docker Compose を使用した起動

#### 1. 本番環境での実行

```bash
# リポジトリをクローン
git clone https://github.com/nanameru/Open_SuperAgent.git
cd Open_SuperAgent

# 環境変数ファイルを設定
cp .env.docker.example .env.local
# .env.localファイルを編集してAPIキーを設定

# Docker Composeでビルドと起動
docker-compose up -d

# ログを確認
docker-compose logs -f app
```

#### 2. 開発環境での実行

```bash
# 開発環境用設定でビルドと起動
docker-compose -f docker-compose.dev.yml up -d

# ログを確認
docker-compose -f docker-compose.dev.yml logs -f app-dev
```

### アクセス

- **アプリケーション**: http://localhost:3000
- **Mastraサーバー**: http://localhost:4111

### Docker Compose の機能

- ✅ **マルチサービス**: Next.jsアプリとMastraサーバーを同時実行
- ✅ **データ永続化**: データベースファイルと生成されたファイルを永続化
- ✅ **ブラウザ自動化**: Chromium/Puppeteer対応
- ✅ **開発環境**: ホットリロード対応の開発用設定
- ✅ **Redis**: セッション管理とキャッシュ用Redis
- ✅ **セキュリティ**: 非rootユーザーでの実行

### Docker コマンド

```bash
# サービスの停止
docker-compose down

# ボリュームも含めて完全削除
docker-compose down -v

# ログの確認
docker-compose logs app

# コンテナに接続
docker-compose exec app sh

# イメージの再ビルド
docker-compose build --no-cache
```

## 主な機能

- **AIチャット**: シンプルで使いやすいチャットインターフェース
- **ツール実行**: Mastraエージェントを活用した各種タスクの自動化
- **ツール実行の可視化**: Mastraエージェントのツール実行状況をリアルタイムに表示
- **レスポンシブデザイン**: モバイルからデスクトップまで対応したUI

## 技術スタック

- **フロントエンド**: Next.js 15、TailwindCSS、Vercel AI SDK
- **バックエンド**: Mastraエージェントフレームワーク
- **音声生成**: MiniMax T2A Large v2 API
- **デプロイ**: Vercel

### 環境変数設定

```bash
# MiniMax T2A Large v2 API Configuration
MINIMAX_API_KEY=your_minimax_api_key_here
MINIMAX_GROUP_ID=your_minimax_group_id_here

# Browserbase Configuration (for browser automation)
# Get your API key from: https://browserbase.com/dashboard/settings
BROWSERBASE_API_KEY=your_browserbase_api_key_here
BROWSERBASE_PROJECT_ID=your_browserbase_project_id_here

# Google Generative AI Configuration (for Stagehand)
# Get your API key from: https://aistudio.google.com/app/apikey
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key_here
GEMINI_API_KEY=your_google_ai_api_key_here

# Anthropic Claude API Configuration
# Get your API key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# OpenAI API Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here

# X.AI Grok API Configuration
# Get your API key from: https://x.ai/api
XAI_API_KEY=your_xai_api_key_here

# Brave Search API Configuration
# Get your API key from: https://api.search.brave.com/app/keys
BRAVE_API_KEY=your_brave_api_key_here

# V0 Code Generation API Configuration
# Get your API key from: https://v0.dev/settings
V0_API_KEY=your_v0_api_key_here

# Fal.ai API Configuration (for media generation)
# Get your API key from: https://fal.ai/dashboard/keys
FAL_KEY=your_fal_key_here

# Document Processing (Nutrient API)
# Get your API key from: https://nutrient.io/
NUTRIENT_API_KEY=your_nutrient_api_key_here

# Node Environment
NODE_ENV=development
```

## セットアップ手順

### 前提条件

- Node.js v20以上
- Mastraのローカル環境

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/open-superagent.git
cd open-superagent

# 依存パッケージをインストール
npm install

# 環境変数ファイルを作成
cp .env.example .env  # .env.exampleがない場合は手動で.envファイルを作成

# .envファイルを編集し、必要なAPIキーを設定
# 詳細は「環境変数設定」セクションを参照

# 開発サーバーを起動
npm run dev
```

### Mastraサーバーのセットアップ

1. Mastraサーバーを別のターミナルで起動:

```bash
cd open-superagent
mastra dev
```

2. Mastraエージェントのビルド:

```bash
mastra build
```

3. ブラウザで http://localhost:3000 にアクセス

## 使い方

1. チャットインターフェースでタスクや質問を入力
2. AIがタスクを理解し、適切なツールを実行
3. 結果がチャット内で表示される

## ライセンス

このプロジェクトは**二層ライセンス構造**を採用しています：

### 1. Open-SuperAgent独自コード
- **ライセンス**: MIT License with Commercial Use Restrictions
- **商用利用**: AI Freak SummitまたはAIで遊ぼうコミュニティのメンバーのみ可能
- **個人利用**: 誰でも可能（非商用・教育目的）

### 2. Mastraフレームワーク部分
- **ライセンス**: Elastic License 2.0 (ELv2)
- **重要な制限事項**:
  - ❌ **Managed Service禁止**: Mastra機能をSaaSとして第三者に提供することはできません
  - ❌ **ライセンス保護の改変禁止**: ライセンスキー機能を無効化できません
  - ❌ **著作権表示の削除禁止**: ライセンス表示を削除・改変できません

### 使用可能なケース ✅
- 個人のローカル環境での使用
- 社内ツールとしての導入（コミュニティメンバーの場合）
- ソースコードの配布・共有
- 自社製品への組み込み（コミュニティメンバーの場合）

### 禁止されているケース ❌
- Open-SuperAgentをWebサービスとしてホスティングし、他者に提供
- Mastraのライセンス表示を削除しての再配布
- コミュニティ非メンバーによる商用利用

詳細は[LICENSE](./LICENSE)および[NOTICE](./NOTICE)ファイルをご確認ください。

## 貢献について

バグレポートや機能リクエストは GitHub Issues で受け付けています。プルリクエストも大歓迎です！

## 連絡先

質問や問い合わせは GitHub Issues または以下のSNSでお願いします:

- X (Twitter): [@taiyo_ai_gakuse](https://x.com/taiyo_ai_gakuse)

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 🔑 APIキー取得手順

### Google Generative AI APIキー
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Googleアカウントでサインイン
3. "Create API Key" をクリック
4. 生成されたAPIキーをコピー
5. `.env`ファイルに `GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here` として追加

### Browserbase APIキー
1. [Browserbase Dashboard](https://browserbase.com/dashboard/settings) にアクセス
2. アカウント作成またはサインイン
3. API KeyとProject IDを取得
4. `.env`ファイルに追加

### Anthropic Claude APIキー
1. [Anthropic Console](https://console.anthropic.com/settings/keys) にアクセス
2. アカウント作成またはサインイン
3. "Create Key" をクリック
4. 生成されたAPIキーをコピー
5. `.env`ファイルに `ANTHROPIC_API_KEY=your_api_key_here` として追加

### OpenAI APIキー
1. [OpenAI Platform](https://platform.openai.com/api-keys) にアクセス
2. アカウント作成またはサインイン
3. "Create new secret key" をクリック
4. 生成されたAPIキーをコピー
5. `.env`ファイルに `OPENAI_API_KEY=your_api_key_here` として追加

### X.AI Grok APIキー
1. [X.AI API](https://x.ai/api) にアクセス
2. X (Twitter) アカウントでサインイン
3. API Keyを申請・取得
4. `.env`ファイルに `XAI_API_KEY=your_api_key_here` として追加

### Brave Search APIキー
1. [Brave Search API](https://api.search.brave.com/app/keys) にアクセス
2. アカウント作成またはサインイン
3. "Create new key" をクリック
4. 生成されたAPIキーをコピー
5. `.env`ファイルに `BRAVE_API_KEY=your_api_key_here` として追加

### V0 Code Generation APIキー
1. [V0 Settings](https://v0.dev/settings) にアクセス
2. Vercelアカウントでサインイン
3. API Keys セクションで新しいキーを生成
4. `.env`ファイルに `V0_API_KEY=your_api_key_here` として追加

### Fal.ai APIキー
1. [Fal.ai Dashboard](https://fal.ai/dashboard/keys) にアクセス
2. アカウント作成またはサインイン
3. "Create API Key" をクリック
4. 生成されたAPIキーをコピー
5. `.env`ファイルに `FAL_KEY=your_api_key_here` として追加

### Nutrient APIキー
1. [Nutrient](https://nutrient.io/) にアクセス
2. アカウント作成またはサインイン
3. ダッシュボードでAPI Keyを取得
4. `.env`ファイルに `NUTRIENT_API_KEY=your_api_key_here` として追加
5. 開発用テストキー: `pdf_live_fy1NX9djc1G2GoPVFljLgpsYUfbWrQU47Uxgj0y5py2`

### MiniMax APIキー
1. [MiniMax Platform](https://platform.minimaxi.com/) にアクセス
2. アカウント作成またはサインイン
3. API管理ページでAPI KeyとGroup IDを取得
4. `.env`ファイルに追加
