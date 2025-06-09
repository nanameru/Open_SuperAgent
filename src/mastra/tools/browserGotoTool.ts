import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './browserSharedInstances';

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
      }
      
      const page = stagehand.page;
      
      console.log(`🌐 Navigating to: ${url}`);
      await page.goto(url, { waitUntil, timeout });
      
      // ナビゲーション後の情報を取得
      const currentUrl = page.url();
      const title = await page.title();
      
      // Get the accessibility tree
      const accessibilityTree = await page.accessibility.snapshot();
      
      console.log(`✅ Navigation completed: ${title}`);
      
      return {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}`,
        accessibilityTree: JSON.stringify(accessibilityTree).substring(0, 10000),
      };
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