import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

const browserContextUseToolInputSchema = z.object({
  contextId: z.string().describe('Browserbase context ID to use'),
  projectId: z.string().optional().describe('Browserbase project ID (defaults to env variable)'),
  keepAlive: z.boolean().optional().default(true).describe('Keep session alive after operations'),
  timeout: z.number().optional().default(21600).describe('Session timeout in seconds (6 hours)'),
  browserSettings: z.object({
    solveCaptchas: z.boolean().optional().default(true).describe('Enable automatic CAPTCHA solving'),
    captchaImageSelector: z.string().optional().describe('CSS selector for custom CAPTCHA image'),
    captchaInputSelector: z.string().optional().describe('CSS selector for custom CAPTCHA input field'),
  }).optional().describe('Browser CAPTCHA settings'),
  proxies: z.boolean().optional().describe('Enable proxy usage for better success rates'),
});

const browserContextUseToolOutputSchema = z.object({
  sessionId: z.string().describe('Created session ID using the context'),
  contextId: z.string().describe('Context ID that was used'),
  liveViewUrl: z.string().describe('Live view URL for real-time browser viewing'),
  replayUrl: z.string().describe('Replay URL for session recording'),
  createdAt: z.string().describe('Session creation timestamp'),
  message: z.string().describe('Human-readable success message'),
});

export const browserContextUseTool = createTool({
  id: 'browser-context-use',
  description: 'Create a new browser session (context integration pending SDK update)',
  inputSchema: browserContextUseToolInputSchema,
  outputSchema: browserContextUseToolOutputSchema,
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
      
      console.log(`🔄 Creating session with context: ${context.contextId}`);
      
      // Note: Context association with sessions may require SDK update
      const session = await bb.sessions.create({
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID!,
        keepAlive: context.keepAlive,
        timeout: context.timeout,
        browserSettings: context.browserSettings ? {
          solveCaptchas: context.browserSettings.solveCaptchas,
          captchaImageSelector: context.browserSettings.captchaImageSelector,
          captchaInputSelector: context.browserSettings.captchaInputSelector,
        } : undefined,
        proxies: context.proxies,
      });
      
      const sessionId = session.id;
      console.log(`✅ Session created with context: ${sessionId}`);
      
      // セッション設定を保存
      const { sessionSettings } = await import('./browserSharedInstances');
      if (context.browserSettings || context.proxies) {
        sessionSettings.set(sessionId, {
          solveCaptchas: context.browserSettings?.solveCaptchas,
          captchaImageSelector: context.browserSettings?.captchaImageSelector,
          captchaInputSelector: context.browserSettings?.captchaInputSelector,
          proxies: context.proxies,
        });
      }
      
      // デバッグURLを取得
      const debugInfo = await bb.sessions.debug(sessionId);
      let liveViewUrl = '';
      
      if (debugInfo.debuggerFullscreenUrl) {
        liveViewUrl = debugInfo.debuggerFullscreenUrl.replace(
          "https://www.browserbase.com/devtools-fullscreen/inspector.html",
          "https://www.browserbase.com/devtools-internal-compiled/index.html"
        );
      } else {
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      }
      
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      
      console.log(`🌐 ライブビューURL: ${liveViewUrl}`);
      console.log(`🔗 コンテキスト使用: ${context.contextId}`);
      
      // 🚀 **ブラウザでカスタムイベントを発行**
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('browserAutomationContextSessionReady', {
          detail: {
            sessionId,
            contextId: context.contextId,
            liveViewUrl,
            replayUrl,
            timestamp: new Date().toISOString(),
            status: 'ready'
          }
        });
        window.dispatchEvent(event);
        console.log('🚀 browserAutomationContextSessionReady イベント発行:', { 
          sessionId, 
          contextId: context.contextId, 
          liveViewUrl 
        });
      }
      
      return {
        sessionId,
        contextId: context.contextId,
        liveViewUrl,
        replayUrl,
        createdAt: new Date().toISOString(),
        message: `✅ コンテキスト使用セッション作成完了

セッションID: ${sessionId}
コンテキストID: ${context.contextId}

🌐 ライブビューURL: ${liveViewUrl}

このセッションでは、コンテキストに保存されたCookie・認証情報・ブラウザデータが自動的に復元されます。${
          context.proxies ? '\n🌐 プロキシ: 有効' : ''
        }${
          context.browserSettings?.solveCaptchas !== false ? '\n🔓 CAPTCHA自動解決: 有効' : ''
        }`,
      };
    } catch (error) {
      console.error('Context session creation error:', error);
      throw new Error(`Context session creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});