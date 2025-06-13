import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances, sessionSettings } from './browserSharedInstances';
import { detectAndSolveCaptcha } from './captchaUtils';

const browserGotoToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  url: z.string().describe('URL to navigate to'),
  waitUntil: z.enum(['commit', 'domcontentloaded', 'load', 'networkidle']).optional().default('commit').describe('When to consider navigation succeeded'),
  timeout: z.number().optional().default(60000).describe('Navigation timeout in milliseconds'),
});

const browserGotoToolOutputSchema = z.object({
  success: z.boolean().describe('Whether navigation was successful'),
  url: z.string().describe('Current page URL after navigation'),
  title: z.string().describe('Page title after navigation'),
  message: z.string().describe('Result message'),
  accessibilityTree: z.string().describe('Accessibility tree of the page for context'),
  captchaDetected: z.boolean().optional().describe('Whether CAPTCHA was detected'),
  captchaSolved: z.boolean().optional().describe('Whether CAPTCHA was solved'),
  captchaDuration: z.number().optional().describe('Time taken for CAPTCHA solving (milliseconds)'),
});

export const browserGotoTool = createTool({
  id: 'browser-goto',
  description: 'Navigate to a specified URL and get the accessibility tree',
  inputSchema: browserGotoToolInputSchema,
  outputSchema: browserGotoToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, url, waitUntil, timeout } = context;
      
      // Stagehandインスタンスを取得または作成
      let stagehand = stagehandInstances.get(sessionId);
      
      if (!stagehand) {
        // 初回はStagehandを初期化
        const { Stagehand } = await import('@browserbasehq/stagehand');
        
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!geminiApiKey) {
          throw new Error('Missing Gemini API key');
        }
        
        // 保存されたセッション設定を取得
        const settings = sessionSettings.get(sessionId);
        console.log(`🔧 セッション設定を適用中: ${sessionId}`, settings);
        
        stagehand = new Stagehand({
          browserbaseSessionID: sessionId,
          env: "BROWSERBASE",
          modelName: "google/gemini-2.5-flash-preview-05-20",
          modelClientOptions: {
            apiKey: geminiApiKey,
          },
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          disablePino: true,
        });
        
        await stagehand.init();
        stagehandInstances.set(sessionId, stagehand);
        
        if (settings?.proxies) {
          console.log('🌐 Stagehand初期化: プロキシ有効');
        }
        if (settings?.solveCaptchas !== false) {
          console.log('🔓 Stagehand初期化: CAPTCHA自動解決有効');
        }
      }
      
      const page = stagehand.page;
      
      console.log(`🌐 Navigating to: ${url}`);
      await page.goto(url, { waitUntil, timeout });
      
      // ナビゲーション後の情報を取得
      const currentUrl = page.url();
      const title = await page.title();
      
      // CAPTCHA自動検出・解決
      console.log('🔍 ページ読み込み後のCAPTCHA検出を実行中...');
      const captchaResult = await detectAndSolveCaptcha(sessionId, 30000);
      
      if (captchaResult.detected) {
        console.log(`🔓 ${captchaResult.message}`);
        if (!captchaResult.solved) {
          console.warn('⚠️ CAPTCHA解決が継続中です');
        }
      }
      
      // Get a simplified accessibility tree focusing on interactive elements
      const accessibilityTree = await page.accessibility.snapshot({ interestingOnly: true });
      
      console.log(`✅ Navigation completed: ${title}`);
      
      const output = {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}${captchaResult.detected ? `\n${captchaResult.message}` : ''}`,
        accessibilityTree: JSON.stringify(accessibilityTree),
        captchaDetected: captchaResult.detected,
        captchaSolved: captchaResult.solved,
        captchaDuration: captchaResult.duration,
      };
      
      console.log('--- BROWSER GOTO TOOL OUTPUT ---', JSON.stringify(output, null, 2));
      return output;
    } catch (error) {
      console.error('Navigation error:', error);
      return {
        success: false,
        url: context.url,
        title: '',
        message: `Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        accessibilityTree: '',
      };
    }
  },
}); 