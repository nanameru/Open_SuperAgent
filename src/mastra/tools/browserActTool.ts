import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './browserSharedInstances';

const browserActToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  instruction: z.string().describe('Natural language instruction for the action (e.g., "click the login button", "type hello world into the search box")'),
  timeout: z.number().optional().default(30000).describe('Action timeout in milliseconds'),
});

const browserActToolOutputSchema = z.object({
  success: z.boolean().describe('Whether the action was successful'),
  action: z.string().describe('The action that was performed'),
  message: z.string().describe('Result message'),
  screenshot: z.string().optional().describe('Base64 encoded screenshot after action'),
  accessibilityTree: z.string().describe('Accessibility tree of the page after the action'),
});

export const browserActTool = createTool({
  id: 'browser-act',
  description: 'Perform an action on the page and get the updated accessibility tree.',
  inputSchema: browserActToolInputSchema,
  outputSchema: browserActToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction, timeout } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      
      const page = stagehand.page;
      
      console.log(`🎯 Performing action: ${instruction}`);
      
      // Stagehandの強力なAI駆動アクション実行
      await page.act(instruction, { timeout });
      
      // アクション後の待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get a simplified accessibility tree focusing on interactive elements
      const accessibilityTree = await page.accessibility.snapshot({ interestingOnly: true });

      // スクリーンショットを取得
      let screenshot = '';
      try {
        const screenshotBuffer = await page.screenshot({ fullPage: false, timeout: 5000 });
        screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      } catch (e) {
        console.warn('Screenshot capture failed:', e);
      }
      
      console.log(`✅ Action completed: ${instruction}`);
      
      const output = {
        success: true,
        action: instruction,
        message: `Successfully performed: ${instruction}`,
        screenshot,
        accessibilityTree: JSON.stringify(accessibilityTree),
      };

      console.log('--- BROWSER ACT TOOL OUTPUT ---', JSON.stringify(output, null, 2));
      return output;
    } catch (error) {
      console.error('Action error:', error);
      return {
        success: false,
        action: context.instruction,
        message: `Action failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        accessibilityTree: '',
      };
    }
  },
}); 