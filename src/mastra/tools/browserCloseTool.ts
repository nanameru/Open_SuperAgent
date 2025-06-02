import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './browserSharedInstances';

const browserCloseToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
});

const browserCloseToolOutputSchema = z.object({
  success: z.boolean().describe('Whether session was closed successfully'),
  message: z.string().describe('Result message'),
});

export const browserCloseTool = createTool({
  id: 'browser-close',
  description: 'Close the browser session and clean up resources',
  inputSchema: browserCloseToolInputSchema,
  outputSchema: browserCloseToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId } = context;
      
      console.log(`🚪 Closing browser session: ${sessionId}`);
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      
      if (stagehand) {
        try {
          // Stagehandインスタンスをクローズ
          await stagehand.close();
        } catch (e) {
          console.warn('Error closing stagehand:', e);
        }
        
        // インスタンスをマップから削除
        stagehandInstances.delete(sessionId);
      }
      
      console.log(`✅ Browser session closed: ${sessionId}`);
      
      return {
        success: true,
        message: `Browser session ${sessionId} closed successfully`,
      };
    } catch (error) {
      console.error('Session close error:', error);
      return {
        success: false,
        message: `Failed to close session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
}); 