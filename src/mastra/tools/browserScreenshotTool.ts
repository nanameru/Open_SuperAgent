import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { writeFile } from 'fs/promises';
import path from 'path';
import { stagehandInstances } from './browserSharedInstances';

const browserScreenshotToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  fullPage: z.boolean().optional().default(false).describe('Whether to capture the full page'),
  filename: z.string().optional().describe('Optional filename for saving screenshot'),
});

const browserScreenshotToolOutputSchema = z.object({
  success: z.boolean().describe('Whether screenshot was successful'),
  screenshot: z.string().describe('Base64 encoded screenshot'),
  filepath: z.string().optional().describe('File path if saved to disk'),
  message: z.string().describe('Result message'),
});

export const browserScreenshotTool = createTool({
  id: 'browser-screenshot',
  description: 'Take a screenshot of the current page',
  inputSchema: browserScreenshotToolInputSchema,
  outputSchema: browserScreenshotToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, fullPage, filename } = context;
      
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
      
      const base64Screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      
      // ファイルに保存する場合
      let filepath: string | undefined;
      if (filename) {
        const screenshotDir = path.join(process.cwd(), 'public', 'browser-screenshots');
        const fullPath = path.join(screenshotDir, filename.endsWith('.png') ? filename : `${filename}.png`);
        
        await writeFile(fullPath, screenshotBuffer);
        filepath = fullPath;
        console.log(`💾 Screenshot saved to: ${filepath}`);
      }
      
      console.log(`✅ Screenshot captured successfully`);
      
      return {
        success: true,
        screenshot: base64Screenshot,
        filepath,
        message: 'Screenshot captured successfully',
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      return {
        success: false,
        screenshot: '',
        message: `Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 