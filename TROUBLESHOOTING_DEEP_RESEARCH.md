# DeepResearch ワークフロー トラブルシューティングガイド

## 🔍 修正された問題

### 1. **設定ファイルの重複解決** ✅
**問題**: `mastra.config.ts`と`src/mastra/index.ts`の設定競合
**修正**: `mastra.config.ts`を更新して完全なMastra設定をエクスポート

### 2. **API エンドポイントの修正** ✅
**問題**: 直接ワークフローインポートによる実行コンテキストの損失
**修正**: Mastraインスタンス経由でのワークフロー実行に変更

### 3. **環境変数検証の追加** ✅
**追加**: `ANTHROPIC_API_KEY`と`BRAVE_API_KEY`の事前検証

## 🔧 修正内容詳細

### `mastra.config.ts`
```typescript
// 完全なMastra設定をエクスポート
export { mastra } from './src/mastra/index';
```

### `app/api/deep-research/route.ts`
- 環境変数の事前検証を追加
- `mastra.getWorkflow('deep-research')`経由でワークフロー実行
- フォールバック処理も`mastra.getTool()`を使用

### `app/api/slide-creator/chat/route.ts`
- ワークフロー実行方法を`workflow.execute()`に統一
- 結果処理ロジックを修正

## 🚀 デバッグ手順

### 1. 環境変数の確認
```bash
echo $ANTHROPIC_API_KEY
echo $BRAVE_API_KEY
```

### 2. Mastra開発サーバーの起動
```bash
# 別ターミナルで実行
mastra dev
```

### 3. Next.jsサーバーの起動
```bash
npm run dev
```

### 4. ワークフローのテスト
```bash
curl -X POST http://localhost:3000/api/deep-research \
  -H "Content-Type: application/json" \
  -d '{"message": "AI技術の最新動向について教えて", "maxIterations": 1, "queriesPerIteration": 2}'
```

## 🔍 UI動作確認

1. チャット画面でDeep Researchモードを選択
2. 質問を入力して送信
3. ActivityTimelineでプロセス進捗を確認
4. 最終結果の表示を確認

## ⚠️ 注意点

- Mastra開発サーバー（ポート4111）が起動していることを確認
- 環境変数が正しく設定されていることを確認
- ブラウザの開発者コンソールでエラーをチェック

## 🐛 トラブルシューティング

### エラー: "Deep Research Workflow が見つかりません"
- `mastra dev`サーバーが起動しているか確認
- `src/mastra/index.ts`でワークフローが正しく登録されているか確認

### エラー: "必要な環境変数が設定されていません"
- `.env.local`ファイルにAPIキーが設定されているか確認
- サーバーを再起動してください

### UI部品が動作しない
- ブラウザの開発者コンソールでJavaScriptエラーをチェック
- ネットワークタブでAPI呼び出しのステータスを確認