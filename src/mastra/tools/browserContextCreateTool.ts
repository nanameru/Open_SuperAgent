import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

const browserContextCreateToolInputSchema = z.object({
  projectId: z.string().optional().describe('Browserbase project ID (defaults to env variable)'),
  name: z.string().optional().describe('Optional name for the context'),
});

const browserContextCreateToolOutputSchema = z.object({
  contextId: z.string().describe('Unique context ID for reuse'),
  name: z.string().optional().describe('Context name if provided'),
  createdAt: z.string().describe('Context creation timestamp'),
  message: z.string().describe('Human-readable success message'),
});

export const browserContextCreateTool = createTool({
  id: 'browser-context-create',
  description: 'Create a new Browserbase context for persisting user data across multiple sessions',
  inputSchema: browserContextCreateToolInputSchema,
  outputSchema: browserContextCreateToolOutputSchema,
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
      
      console.log('🔄 Creating new Browserbase context...');
      
      const newContext = await bb.contexts.create({
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID!,
      });
      
      const contextId = newContext.id;
      console.log(`✅ Context created successfully: ${contextId}`);
      
      return {
        contextId,
        name: context.name,
        createdAt: new Date().toISOString(),
        message: `✅ ブラウザコンテキスト作成完了

コンテキストID: ${contextId}${context.name ? `
名前: ${context.name}` : ''}

このコンテキストIDを使用して、Cookie・認証情報・ブラウザデータを複数のセッション間で共有できます。
Browserbaseのコンテキストは自動的にデータを永続化し、セッション間で状態を保持します。`,
      };
    } catch (error) {
      console.error('Context creation error:', error);
      throw new Error(`Context creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});