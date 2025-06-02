import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

const browserSessionToolInputSchema = z.object({
  projectId: z.string().optional().describe('Browserbase project ID (defaults to env variable)'),
  keepAlive: z.boolean().optional().default(true).describe('Keep session alive after operations'),
  timeout: z.number().optional().default(600).describe('Session timeout in seconds'),
});

const browserSessionToolOutputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  liveViewUrl: z.string().describe('Live view URL for real-time browser viewing'),
  replayUrl: z.string().describe('Replay URL for session recording'),
  createdAt: z.string().describe('Session creation timestamp'),
  message: z.string().optional().describe('Human-readable message with session details'),
});

export const browserSessionTool = createTool({
  id: 'browser-session',
  description: 'Create a new Browserbase session and return live view URL immediately',
  inputSchema: browserSessionToolInputSchema,
  outputSchema: browserSessionToolOutputSchema,
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
      
      const session = await bb.sessions.create({
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID!,
        keepAlive: context.keepAlive,
        timeout: context.timeout,
      });
      
      const sessionId = session.id;
      console.log(`✅ セッション作成完了: ${sessionId}`);
      
      // デバッグURLを即座に取得
      const debugInfo = await bb.sessions.debug(sessionId);
      let liveViewUrl = '';
      
      if (debugInfo.debuggerFullscreenUrl) {
        // URL変換処理（参考実装と同じ）
        liveViewUrl = debugInfo.debuggerFullscreenUrl.replace(
          "https://www.browserbase.com/devtools-fullscreen/inspector.html",
          "https://www.browserbase.com/devtools-internal-compiled/index.html"
        );
      } else {
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      }
      
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      
      console.log(`🌐 ライブビューURL: ${liveViewUrl}`);
      
      // 🚀 **ブラウザでカスタムイベントを発行**
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('browserAutomationLiveViewReady', {
          detail: {
            sessionId,
            liveViewUrl,
            replayUrl,
            timestamp: new Date().toISOString(),
            status: 'ready'
          }
        });
        window.dispatchEvent(event);
        console.log('🚀 browserAutomationLiveViewReady イベント発行:', { sessionId, liveViewUrl });
      }
      
      return {
        sessionId,
        liveViewUrl,
        replayUrl,
        createdAt: new Date().toISOString(),
        message: `✅ ブラウザセッション作成完了\n\nセッションID: ${sessionId}\n\n🌐 ライブビューURL: ${liveViewUrl}\n\nこのURLから、リアルタイムでブラウザ操作の様子を確認できます。`,
      };
    } catch (error) {
      console.error('Browser session creation error:', error);
      throw error;
    }
  },
}); 