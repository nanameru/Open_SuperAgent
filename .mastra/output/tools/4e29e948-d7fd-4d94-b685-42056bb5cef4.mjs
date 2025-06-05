import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserActToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe('Natural language instruction for the action (e.g., "click the login button", "type hello world into the search box")'),
  timeout: z.number().optional().default(3e4).describe("Action timeout in milliseconds")
});
const browserActToolOutputSchema = z.object({
  success: z.boolean().describe("Whether the action was successful"),
  action: z.string().describe("The action that was performed"),
  message: z.string().describe("Result message"),
  screenshot: z.string().optional().describe("Base64 encoded screenshot after action")
});
const browserActTool = createTool({
  id: "browser-act",
  description: "Perform an action on the page using natural language instructions. AI will identify the correct element and perform the action.",
  inputSchema: browserActToolInputSchema,
  outputSchema: browserActToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction, timeout } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F3AF} Performing action: ${instruction}`);
      await page.act(instruction, { timeout });
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      let screenshot = "";
      try {
        const screenshotBuffer = await page.screenshot({ fullPage: false, timeout: 5e3 });
        screenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
      } catch (e) {
        console.warn("Screenshot capture failed:", e);
      }
      console.log(`\u2705 Action completed: ${instruction}`);
      return {
        success: true,
        action: instruction,
        message: `Successfully performed: ${instruction}`,
        screenshot
      };
    } catch (error) {
      console.error("Action error:", error);
      return {
        success: false,
        action: context.instruction,
        message: `Action failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserActTool };
//# sourceMappingURL=4e29e948-d7fd-4d94-b685-42056bb5cef4.mjs.map
