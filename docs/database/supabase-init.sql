-- Supabase用 Mastraデータベース初期化スクリプト
-- PostgreSQL用に最適化されたスキーマ

-- ベクトル検索機能を有効化
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. 会話スレッドテーブル
CREATE TABLE mastra_threads (
    id TEXT NOT NULL PRIMARY KEY,
    resourceId TEXT NOT NULL,
    title TEXT NOT NULL,
    metadata TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

-- 2. 個別メッセージテーブル
CREATE TABLE mastra_messages (
    id TEXT NOT NULL PRIMARY KEY,
    thread_id TEXT NOT NULL,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES mastra_threads(id) ON DELETE CASCADE
);

-- 3. ワークフロースナップショットテーブル
CREATE TABLE mastra_workflow_snapshot (
    workflow_name TEXT NOT NULL,
    run_id TEXT NOT NULL,
    resourceId TEXT,
    snapshot TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    PRIMARY KEY (workflow_name, run_id)
);

-- 4. 評価結果テーブル
CREATE TABLE mastra_evals (
    input TEXT NOT NULL,
    output TEXT NOT NULL,
    result JSONB NOT NULL,
    agent_name TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    instructions TEXT NOT NULL,
    test_info JSONB,
    global_run_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    createdAt TEXT
);

-- 5. トレーステーブル
CREATE TABLE mastra_traces (
    id TEXT NOT NULL PRIMARY KEY,
    parentSpanId TEXT,
    name TEXT NOT NULL,
    traceId TEXT NOT NULL,
    scope TEXT NOT NULL,
    kind INTEGER NOT NULL,
    attributes JSONB,
    status JSONB,
    events JSONB,
    links JSONB,
    other TEXT,
    startTime BIGINT NOT NULL,
    endTime BIGINT NOT NULL,
    createdAt TEXT NOT NULL
);

-- 6. ベクトル検索用テーブル（384次元）
CREATE TABLE memory_messages_384 (
    id SERIAL PRIMARY KEY,
    vector_id TEXT UNIQUE NOT NULL,
    embedding vector(384),
    metadata JSONB DEFAULT '{}'
);

-- インデックス作成
CREATE INDEX idx_mastra_messages_thread_id ON mastra_messages(thread_id);
CREATE INDEX idx_mastra_messages_created_at ON mastra_messages(createdAt);
CREATE INDEX idx_mastra_threads_created_at ON mastra_threads(createdAt);
CREATE INDEX idx_mastra_workflow_snapshot_workflow ON mastra_workflow_snapshot(workflow_name);
CREATE INDEX idx_mastra_traces_trace_id ON mastra_traces(traceId);
CREATE INDEX idx_memory_messages_vector_id ON memory_messages_384(vector_id);

-- ベクトル検索用インデックス（コサイン類似度）
CREATE INDEX idx_memory_messages_embedding ON memory_messages_384 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 実行確認用
DO $$
BEGIN
    RAISE NOTICE 'Mastraデータベースの初期化が完了しました。';
    RAISE NOTICE '作成されたテーブル: mastra_threads, mastra_messages, mastra_workflow_snapshot, mastra_evals, mastra_traces, memory_messages_384';
END $$;