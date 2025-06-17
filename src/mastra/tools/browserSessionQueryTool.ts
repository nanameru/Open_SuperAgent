import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

const browserSessionQueryToolInputSchema = z.object({
  projectId: z.string().optional().describe('Browserbase project ID (defaults to env variable)'),
  query: z.string().optional().describe('Metadata query using path syntax (e.g. "user_metadata[\'key\']:\'value\'")'),
  limit: z.number().optional().default(10).describe('Maximum number of sessions to return'),
  status: z.enum(['RUNNING', 'COMPLETED', 'ERROR', 'TIMEOUT']).optional().describe('Filter by session status'),
});

const browserSessionQueryToolOutputSchema = z.object({
  sessions: z.array(z.object({
    id: z.string().describe('Session ID'),
    status: z.string().describe('Session status'),
    createdAt: z.string().describe('Creation timestamp'),
    projectId: z.string().describe('Project ID'),
    metadata: z.record(z.any()).optional().describe('Session metadata'),
  })).describe('List of matching sessions'),
  totalCount: z.number().describe('Total number of matching sessions'),
  message: z.string().describe('Human-readable summary'),
});

export const browserSessionQueryTool = createTool({
  id: 'browser-session-query',
  description: 'Query and list Browserbase sessions with metadata filtering',
  inputSchema: browserSessionQueryToolInputSchema,
  outputSchema: browserSessionQueryToolOutputSchema,
  execute: async ({ context }) => {
    try {
      // 🔧 **shimsを最初にインポート（一度だけ）**
      if (!shimsImported && typeof window === 'undefined') {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      });
      
      console.log('🔍 Querying Browserbase sessions...');
      
      // クエリパラメータを構築
      const queryParams: any = {
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID!,
        limit: context.limit,
      };
      
      // メタデータクエリを追加（Browserbase公式構文に準拠）
      if (context.query) {
        // user_metadata['key']:'value' 形式をサポート
        queryParams.q = context.query;
        console.log(`📊 Metadata query: ${context.query}`);
      }
      
      // ステータスフィルターを追加
      if (context.status) {
        const statusQuery = `status:'${context.status}'`;
        queryParams.q = queryParams.q 
          ? `${queryParams.q} AND ${statusQuery}`
          : statusQuery;
        console.log(`🔍 Status filter: ${context.status}`);
      }
      
      const response = await bb.sessions.list(queryParams);
      const sessions = Array.isArray(response) ? response : [];
      
      console.log(`✅ Found ${sessions.length} sessions`);
      
      // セッション情報を整理
      const formattedSessions = sessions.map((session: any) => ({
        id: session.id,
        status: session.status,
        createdAt: session.createdAt || new Date(session.created_at).toISOString(),
        projectId: session.projectId || session.project_id,
        metadata: session.metadata || undefined,
      }));
      
      // メッセージを作成
      let message = `🔍 セッション検索結果: ${sessions.length}件`;
      
      if (context.query) {
        message += `\n📊 メタデータクエリ: ${context.query}`;
      }
      
      if (context.status) {
        message += `\n🔍 ステータスフィルター: ${context.status}`;
      }
      
      if (sessions.length > 0) {
        const statusCounts = sessions.reduce((acc: any, session: any) => {
          acc[session.status] = (acc[session.status] || 0) + 1;
          return acc;
        }, {});
        
        message += '\n\n📊 ステータス別内訳:';
        Object.entries(statusCounts).forEach(([status, count]) => {
          message += `\n  ${status}: ${count}件`;
        });
      }
      
      return {
        sessions: formattedSessions,
        totalCount: sessions.length,
        message,
      };
    } catch (error) {
      console.error('Session query error:', error);
      
      // 一般的なエラーハンドリング
      let errorMessage = 'セッション検索エラー';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        
        // 一般的なエラーケースのヒント
        if (error.message.includes('invalid query')) {
          errorMessage += '\n\n💡 ヒント: クエリ構文を確認してください\n例: user_metadata[\'task\']:\'scraping\' AND status:\'COMPLETED\'';
        }
      }
      
      return {
        sessions: [],
        totalCount: 0,
        message: errorMessage,
      };
    }
  },
});