# Supabaseデータベース設定手順

## 1. Supabaseプロジェクト設定

### 必要な環境変数
以下の環境変数をVercel環境に設定してください：

```bash
# Supabase接続情報
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# データベース直接接続（LibSQL互換性のため）
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## 2. データベース初期化

### 手順1: SQLスクリプト実行
1. Supabaseダッシュボードにログイン
2. プロジェクトの「SQL Editor」を開く
3. `supabase-init.sql`の内容をコピー&ペースト
4. 「Run」ボタンをクリックして実行

### 手順2: 拡張機能確認
以下のコマンドで`vector`拡張が有効になっているか確認：
```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## 3. アプリケーション設定変更

### LibSQL設定の更新
`src/mastra/index.ts`でデータベース接続を以下に変更：

```typescript
storage: new LibSQLStore({
  url: process.env.DATABASE_URL || "file:../memory.db",
}),
```

## 4. テーブル確認

作成されるテーブル：
- `mastra_threads` - 会話スレッド
- `mastra_messages` - 個別メッセージ  
- `mastra_workflow_snapshot` - ワークフロー結果
- `mastra_evals` - 評価結果
- `mastra_traces` - トレース情報
- `memory_messages_384` - ベクトル検索用

## 5. 接続テスト

以下のSQLで動作確認：
```sql
-- テーブル存在確認
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'mastra_%';

-- ベクトル拡張確認
SELECT vector_dims(NULL::vector(384));
```

## 6. トラブルシューティング

### よくある問題
1. **vector拡張エラー**: Supabaseプロジェクトでvector拡張が有効になっていない
2. **接続エラー**: DATABASE_URLの形式が正しくない
3. **権限エラー**: SERVICE_ROLE_KEYを使用する

### 確認コマンド
```sql
-- 現在の接続情報
SELECT current_database(), current_user;

-- テーブルサイズ確認
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats WHERE tablename LIKE 'mastra_%';
```

## 7. 本番環境デプロイ

1. 環境変数をVercelに設定
2. `src/mastra/index.ts`のコード変更をコミット
3. デプロイ実行
4. チャット機能の動作確認

---

**注意**: 本番環境では必ずSSL接続を使用し、SERVICE_ROLE_KEYは慎重に管理してください。