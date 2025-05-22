# Open-SuperAgent

AIアシスタント機能を備えたオープンソースチャットアプリケーション。Mastraエージェントと連携して、様々なタスクを自動化します。

![アプリケーションのスクリーンショット](public/screenshot.png)

## 主な機能

- **AIチャット**: シンプルで使いやすいチャットインターフェース
- **ツール実行**: Mastraエージェントを活用した各種タスクの自動化
- **ツール実行の可視化**: Mastraエージェントのツール実行状況をリアルタイムに表示
- **レスポンシブデザイン**: モバイルからデスクトップまで対応したUI

## 技術スタック

- **フロントエンド**: Next.js 15、TailwindCSS、Vercel AI SDK
- **バックエンド**: Mastraエージェントフレームワーク
- **デプロイ**: Vercel

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

このプロジェクトはMITライセンスの下で公開されています。

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

## プレゼンテーション作成機能の拡張

### htmlSlideTool（拡張版）

プロフェッショナルなプレゼンテーションスライドをHTML/CSSで生成するためのツール。
企業の経営陣やカンファレンスでも使用できる高品質なスライドを作成します。

#### 主な拡張機能：

1. **追加パラメータ**
   - `slideIndex`/`totalSlides`: スライドのページネーション情報
   - `layoutType`: 12種類のレイアウトテンプレートをサポート
   - `diagramType`: 11種類の図解タイプをサポート
   - `colorScheme`: カラーパレット（テーマ、アクセント、背景色）
   - `designElements`: 特定のデザイン要素（グラデーション、影など）
   - `fontFamily`: カスタムフォント
   - `forceInclude`: スライドに必ず含めるべき内容
   - `variant`: 同じ内容の異なるデザインバージョン（1〜3）

2. **拡張されたレイアウトタイプ**
   - default: 標準的なタイトル・本文・図解のレイアウト
   - image-left/right: 左右レイアウト
   - full-graphic: 全面グラフィック
   - quote: 引用スタイル
   - comparison: 比較レイアウト
   - timeline: タイムライン表示
   - list: リスト表示
   - title: メインタイトル用
   - section-break: セクション区切り用
   - data-visualization: データ可視化中心
   - photo-with-caption: 写真とキャプション

3. **バリアントサポート**
   - 同じ内容で異なるデザインの複数バージョンを生成可能
   - バリアント1: 標準的でクリーンなデザイン
   - バリアント2: より大胆で視覚的なインパクトを重視
   - バリアント3: よりミニマリストでエレガントなデザイン

### presentationPreviewTool（拡張版）

複数スライドの表示をサポートするプレビュー機能。

#### 主な拡張機能：

1. **複数スライドのサポート**
   - 単一スライド（`htmlContent`）または複数スライド（`slidesArray`）をサポート
   - スライドショー表示機能

2. **プレビュー制御**
   - `showSlideControls`: ナビゲーションコントロールの表示/非表示
   - `startSlide`: 開始スライド番号の指定
   - `theme`: ライト/ダークモード切り替え

3. **拡張されたレスポンス**
   - スライド総数のレポート
   - 複数スライドのケースを処理
   - スライドコントロールのカスタマイズオプション

### 使用例

```typescript
// 単一スライドの生成
const slide1 = await htmlSlideTool.invoke({
  topic: "AIの未来",
  outline: "機械学習の基礎概念",
  layoutType: "image-left",
  diagramType: "flow",
  variant: 1
});

// 別バリアントの生成
const slide1variant2 = await htmlSlideTool.invoke({
  topic: "AIの未来",
  outline: "機械学習の基礎概念",
  layoutType: "image-left",
  diagramType: "flow",
  variant: 2
});

// 複数スライドのプレビュー表示
await presentationPreviewTool.invoke({
  slidesArray: [slide1.htmlContent, slide1variant2.htmlContent],
  title: "AIの未来 - コンセプト比較",
  showSlideControls: true,
  theme: "dark"
});
```
