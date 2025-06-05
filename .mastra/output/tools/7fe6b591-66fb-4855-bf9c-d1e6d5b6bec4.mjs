import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

const browserWaitToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  milliseconds: z.number().describe("Time to wait in milliseconds")
});
const browserWaitToolOutputSchema = z.object({
  success: z.boolean().describe("Whether wait was successful"),
  duration: z.number().describe("Actual wait duration in milliseconds"),
  message: z.string().describe("Result message")
});
const browserWaitTool = createTool({
  id: "browser-wait",
  description: "Wait for a specified amount of time. Useful for waiting for page loads, animations, or async operations.",
  inputSchema: browserWaitToolInputSchema,
  outputSchema: browserWaitToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { milliseconds } = context;
      console.log(`\u23F3 Waiting for ${milliseconds}ms...`);
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, milliseconds));
      const actualDuration = Date.now() - startTime;
      console.log(`\u2705 Wait completed (${actualDuration}ms)`);
      return {
        success: true,
        duration: actualDuration,
        message: `Waited for ${actualDuration}ms`
      };
    } catch (error) {
      console.error("Wait error:", error);
      return {
        success: false,
        duration: 0,
        message: `Wait failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserWaitTool };
//# sourceMappingURL=7fe6b591-66fb-4855-bf9c-d1e6d5b6bec4.mjs.map
