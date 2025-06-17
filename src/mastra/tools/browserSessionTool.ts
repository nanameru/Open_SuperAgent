import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { sessionSettings } from './browserSharedInstances';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

// Browserbase推奨viewport設定
const VIEWPORT_PRESETS = {
  // Desktop viewports
  'desktop-full-hd': { width: 1920, height: 1080, description: 'Standard Full HD' },
  'desktop-laptop': { width: 1366, height: 768, description: 'Widescreen Laptop' },
  'desktop-high-res': { width: 1536, height: 864, description: 'High-Resolution Laptop' },
  'desktop-small': { width: 1280, height: 720, description: 'Small Desktop Monitor' },
  'desktop-minimum': { width: 1024, height: 768, description: 'Minimum Supported' },
  
  // Mobile viewports
  'mobile-iphone-xr': { width: 414, height: 896, description: 'iPhone XR, iPhone 11' },
  'mobile-iphone-12': { width: 390, height: 844, description: 'iPhone 12, 13, 14' },
  'mobile-iphone-x': { width: 375, height: 812, description: 'iPhone X, XS' },
  'mobile-android': { width: 360, height: 800, description: 'Standard Android Phone' },
  'mobile-small': { width: 320, height: 568, description: 'iPhone SE, Small Devices' },
} as const;

const browserSessionToolInputSchema = z.object({
  projectId: z.string().optional().describe('Browserbase project ID (defaults to env variable)'),
  keepAlive: z.boolean().optional().default(true).describe('Keep session alive after operations'),
  timeout: z.number().optional().default(21600).describe('Session timeout in seconds (6 hours)'),
  browserSettings: z.object({
    solveCaptchas: z.boolean().optional().default(true).describe('Enable automatic CAPTCHA solving'),
    captchaImageSelector: z.string().optional().describe('CSS selector for custom CAPTCHA image'),
    captchaInputSelector: z.string().optional().describe('CSS selector for custom CAPTCHA input field'),
  }).optional().describe('Browser CAPTCHA settings'),
  proxies: z.boolean().optional().describe('Enable proxy usage for better success rates'),
  viewport: z.union([
    z.enum([
      'desktop-full-hd', 'desktop-laptop', 'desktop-high-res', 'desktop-small', 'desktop-minimum',
      'mobile-iphone-xr', 'mobile-iphone-12', 'mobile-iphone-x', 'mobile-android', 'mobile-small'
    ]).describe('Predefined viewport preset'),
    z.object({
      width: z.number().min(320).max(3840).describe('Viewport width (320-3840)'),
      height: z.number().min(240).max(2160).describe('Viewport height (240-2160)'),
    }).describe('Custom viewport dimensions'),
    z.literal('auto').describe('Use Browserbase automatic viewport generation')
  ]).optional().default('auto').describe('Viewport configuration'),
  metadata: z.record(z.any()).optional().describe('Custom metadata (JSON object, max 512 chars when stringified)'),
});

const browserSessionToolOutputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  liveViewUrl: z.string().describe('Live view URL for real-time browser viewing'),
  replayUrl: z.string().describe('Replay URL for session recording'),
  createdAt: z.string().describe('Session creation timestamp'),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
    preset: z.string().optional(),
  }).optional().describe('Applied viewport configuration'),
  metadata: z.record(z.any()).optional().describe('Applied metadata'),
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
      
      // Metadata検証（Browserbase公式制限に準拠）
      let validatedMetadata = context.metadata;
      if (context.metadata) {
        // JSON-serializable objectであることを確認
        try {
          const metadataString = JSON.stringify(context.metadata);
          if (metadataString.length > 512) {
            throw new Error(`Metadata too large: ${metadataString.length} chars (max 512). Consider using string values for better query support.`);
          }
          console.log(`📊 Metadata set: ${metadataString.length} chars`);
        } catch (error) {
          throw new Error(`Invalid metadata: Must be JSON-serializable object. ${error instanceof Error ? error.message : ''}`);
        }
      }
      
      // Viewport設定の処理
      let viewportConfig: any = undefined;
      let appliedViewport: { width: number; height: number; preset?: string } | undefined;
      
      if (context.viewport && context.viewport !== 'auto') {
        if (typeof context.viewport === 'string') {
          // プリセット使用
          const preset = VIEWPORT_PRESETS[context.viewport as keyof typeof VIEWPORT_PRESETS];
          if (preset) {
            viewportConfig = { width: preset.width, height: preset.height };
            appliedViewport = { width: preset.width, height: preset.height, preset: context.viewport };
            console.log(`📱 Viewport preset: ${context.viewport} (${preset.width}x${preset.height} - ${preset.description})`);
          }
        } else {
          // カスタム設定
          viewportConfig = { width: context.viewport.width, height: context.viewport.height };
          appliedViewport = { width: context.viewport.width, height: context.viewport.height };
          console.log(`📱 Custom viewport: ${context.viewport.width}x${context.viewport.height}`);
        }
      }
      
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
        userMetadata: validatedMetadata,
      });
      
      const sessionId = session.id;
      console.log(`✅ セッション作成完了: ${sessionId}`);
      
      // セッション設定を保存
      if (context.browserSettings || context.proxies) {
        sessionSettings.set(sessionId, {
          solveCaptchas: context.browserSettings?.solveCaptchas,
          captchaImageSelector: context.browserSettings?.captchaImageSelector,
          captchaInputSelector: context.browserSettings?.captchaInputSelector,
          proxies: context.proxies,
        });
      }
      if (context.proxies) {
        console.log('🌐 プロキシ: 有効');
      }
      
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
        viewport: appliedViewport,
        metadata: validatedMetadata,
        message: `✅ ブラウザセッション作成完了

セッションID: ${sessionId}

🌐 ライブビューURL: ${liveViewUrl}

このURLから、リアルタイムでブラウザ操作の様子を確認できます。${
          appliedViewport ? `\n📱 ビューポート: ${appliedViewport.width}x${appliedViewport.height}${appliedViewport.preset ? ` (${appliedViewport.preset})` : ''}` : ''
        }${
          context.proxies ? '\n🌐 プロキシ: 有効' : ''
        }${
          context.browserSettings?.solveCaptchas !== false ? '\n🔓 CAPTCHA自動解決: 有効' : ''
        }${
          context.metadata ? `\n📊 メタデータ: ${Object.keys(context.metadata).length}項目` : ''
        }`,
      };
    } catch (error) {
      console.error('Browser session creation error:', error);
      throw error;
    }
  },
}); 