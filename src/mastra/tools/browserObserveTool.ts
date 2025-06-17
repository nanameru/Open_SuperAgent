import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './browserSharedInstances';

const browserObserveToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  instruction: z.string().describe('What to observe on the page (e.g., "clickable buttons", "form fields", "search box")'),
});

const browserObserveToolOutputSchema = z.object({
  success: z.boolean().describe('Whether observation was successful'),
  observations: z.array(z.string()).describe('List of possible actions or observations'),
  message: z.string().describe('Result message'),
});

export const browserObserveTool = createTool({
  id: 'browser-observe',
  description: 'Observe elements on the current page and get suggestions for possible actions',
  inputSchema: browserObserveToolInputSchema,
  outputSchema: browserObserveToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      
      const page = stagehand.page;
      
      console.log(`👁️ Observing: ${instruction}`);
      
      // Stagehandの観察機能
      const suggestions = await page.observe(instruction);
      
      console.log(`✅ Observation completed, found ${suggestions.length} suggestions`);
      
      return {
        success: true,
        observations: suggestions.map((s: any) => typeof s === 'string' ? s : JSON.stringify(s)),
        message: `Found ${suggestions.length} possible actions for: ${instruction}`,
      };
    } catch (error) {
      console.error('Observation error:', error);
      return {
        success: false,
        observations: [],
        message: `Observation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 