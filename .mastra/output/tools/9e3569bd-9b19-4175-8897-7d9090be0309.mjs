import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserCloseToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID")
});
const browserCloseToolOutputSchema = z.object({
  success: z.boolean().describe("Whether session was closed successfully"),
  message: z.string().describe("Result message")
});
const browserCloseTool = createTool({
  id: "browser-close",
  description: "Close the browser session and clean up resources",
  inputSchema: browserCloseToolInputSchema,
  outputSchema: browserCloseToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId } = context;
      console.log(`\u{1F6AA} Closing browser session: ${sessionId}`);
      const stagehand = stagehandInstances.get(sessionId);
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (e) {
          console.warn("Error closing stagehand:", e);
        }
        stagehandInstances.delete(sessionId);
      }
      console.log(`\u2705 Browser session closed: ${sessionId}`);
      return {
        success: true,
        message: `Browser session ${sessionId} closed successfully`
      };
    } catch (error) {
      console.error("Session close error:", error);
      return {
        success: false,
        message: `Failed to close session: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserCloseTool };
//# sourceMappingURL=9e3569bd-9b19-4175-8897-7d9090be0309.mjs.map
