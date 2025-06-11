import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { promises as fs } from 'fs';
import path from 'path';
import { stagehandInstances } from './browserSharedInstances';

const browserScreenshotToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  fullPage: z.boolean().optional().default(false).describe('Whether to capture the full page'),
  filename: z.string().optional().describe('Optional filename for the screenshot file'),
});

const browserScreenshotToolOutputSchema = z.object({
  success: z.boolean().describe('Whether the screenshot was successful'),
  screenshotUrl: z.string().describe('URL of the captured screenshot'),
  message: z.string().describe('Result message'),
});

export const browserScreenshotTool = createTool({
  id: 'browser-screenshot',
  description: 'Take a screenshot of the current page and get its URL.',
  inputSchema: browserScreenshotToolInputSchema,
  outputSchema: browserScreenshotToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, fullPage, filename: userFilename } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      
      const page = stagehand.page;
      
      console.log(`📸 Taking screenshot (fullPage: ${fullPage})`);
      
      // スクリーンショットを撮影
      const screenshotBuffer = await page.screenshot({ 
        fullPage,
        timeout: 10000,
      });
      
      // ファイル名とパスを設定
      const filename = userFilename 
        ? (userFilename.endsWith('.png') ? userFilename : `${userFilename}.png`)
        : `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.png`;
        
      const screenshotDir = path.join(process.cwd(), 'public', 'browser-screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });
      const filePath = path.join(screenshotDir, filename);
      
      // ファイルに保存
      await fs.writeFile(filePath, screenshotBuffer);
      const screenshotUrl = `/browser-screenshots/${filename}`;
      
      console.log(`✅ Screenshot captured and saved to: ${filePath}`);
      
      return {
        success: true,
        screenshotUrl,
        message: `Screenshot captured successfully. Accessible at: ${screenshotUrl}`,
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      return {
        success: false,
        screenshotUrl: '',
        message: `Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 