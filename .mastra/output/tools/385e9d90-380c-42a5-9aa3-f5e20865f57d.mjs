import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserObserveToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe('What to observe on the page (e.g., "clickable buttons", "form fields", "search box")')
});
const browserObserveToolOutputSchema = z.object({
  success: z.boolean().describe("Whether observation was successful"),
  observations: z.array(z.string()).describe("List of possible actions or observations"),
  message: z.string().describe("Result message")
});
const browserObserveTool = createTool({
  id: "browser-observe",
  description: "Observe elements on the current page and get suggestions for possible actions",
  inputSchema: browserObserveToolInputSchema,
  outputSchema: browserObserveToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F441}\uFE0F Observing: ${instruction}`);
      const suggestions = await page.observe(instruction);
      console.log(`\u2705 Observation completed, found ${suggestions.length} suggestions`);
      return {
        success: true,
        observations: suggestions.map((s) => typeof s === "string" ? s : JSON.stringify(s)),
        message: `Found ${suggestions.length} possible actions for: ${instruction}`
      };
    } catch (error) {
      console.error("Observation error:", error);
      return {
        success: false,
        observations: [],
        message: `Observation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserObserveTool };
//# sourceMappingURL=385e9d90-380c-42a5-9aa3-f5e20865f57d.mjs.map
