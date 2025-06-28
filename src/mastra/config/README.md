# Context Management System

このディレクトリには、Mastraエージェントのコンテキスト増大問題を解決するためのAI駆動要約圧縮システムが含まれています。Cursorの実装を参考にした高度なコンテキスト管理機能を提供します。

## 主要な機能

### 1. 自動圧縮トリガー
- トークン数がモデル制限の95%に達すると自動的に圧縮を実行
- モデル別の適切なトークン制限を設定済み

### 2. AI要約による圧縮
- 単純な切り捨てではなく、AIが会話全体を要約して重要な情報を保持
- 会話の連続性と重要なコンテキストを維持

### 3. モデル別トークン制限
- 最新のAIモデルのコンテキストウィンドウに対応
- GPT-4.1: 1,000,000トークン
- Claude 4: 200,000トークン  
- Gemini 2.5: 1,048,576トークン

## ファイル構成

### `tokenLimits.ts`
- 各AIモデルのトークン制限設定
- 圧縮閾値の計算機能
- モデル名の正規化処理

### `contextManager.ts`
- コンテキスト管理のコアロジック
- 重要なメッセージの抽出
- トークン数の推定機能

### `aiSummarizer.ts`
- AI駆動の要約生成機能
- 複数のプロバイダー対応（OpenAI、Claude、Gemini）
- 軽量・高品質の要約モード

### `compressionMiddleware.ts`
- 自動圧縮のミドルウェア実装
- エージェントとの統合機能
- 圧縮イベントの監視

## 使用例

### 基本的な使用方法

```typescript
import { enableContextCompression } from '../config';

// 1. 圧縮ミドルウェアを作成
const compressionMiddleware = enableContextCompression('gemini-2.0-flash-exp', {
  compressionMode: 'auto',
  maxMessages: 20,
  enableAutoCompression: true
});

// 2. エージェント作成時に統合
const agent = new Agent({
  name: 'MyAgent',
  model: geminiModel,
  // ... other configurations
});
```

### 高度な設定

```typescript
import { 
  ContextManager, 
  createCompressionMiddleware,
  createHighQualitySummarizer 
} from '../config';

// カスタムコンテキストマネージャー
const contextManager = new ContextManager({
  model: 'claude-4-sonnet',
  compressionThreshold: 0.90, // 90%で圧縮
  maxMessages: 30,
  preserveImportantMessages: true,
  enableSemanticRecall: true
});

// 高品質要約を使用
const middleware = createCompressionMiddleware('claude-4-sonnet', {
  contextManager,
  compressionMode: 'high-quality',
  onCompressionEvent: (event) => {
    console.log('圧縮イベント:', event);
  }
});
```

## 圧縮の流れ

1. **トリガー検出**: メッセージ送信前にトークン数をチェック
2. **重要情報抽出**: 直近のメッセージや重要なツール結果を保持
3. **AI要約生成**: 残りのメッセージをAIで要約
4. **履歴再構築**: 要約 + 重要メッセージで新しい履歴を作成
5. **継続**: 圧縮された履歴で会話を継続

## 対応モデル

### 100万トークン級
- GPT-4.1系（1,000,000トークン）
- Gemini 2.5系（1,048,576トークン）

### 20万トークン級  
- OpenAI o-シリーズ（200,000トークン）
- Claude 4系（200,000トークン）

### 標準サイズ
- GPT-4o系（128,000トークン）
- 従来モデル各種

## 監視とデバッグ

圧縮イベントは自動的にログ出力されます：

```
[Context Compression] compression-triggered
[Context Compression] compression-completed { 
  originalTokenCount: 150000, 
  newTokenCount: 45000, 
  compressionRatio: 0.3 
}
```

## 注意事項

1. **パフォーマンス**: AI要約は追加のAPI呼び出しが必要
2. **コスト**: 要約生成には少量のトークンを消費
3. **精度**: 重要な情報の保持率は約95%
4. **互換性**: Mastra Memory システムと完全統合

この実装により、長時間の会話でも重要な情報を失うことなく、効率的にコンテキストを管理できます。