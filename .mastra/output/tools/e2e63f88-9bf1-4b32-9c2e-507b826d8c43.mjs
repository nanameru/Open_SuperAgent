import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserExtractToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe("What data to extract from the page"),
  schema: z.any().optional().describe("Optional Zod schema for structured data extraction")
});
const browserExtractToolOutputSchema = z.object({
  success: z.boolean().describe("Whether extraction was successful"),
  data: z.any().describe("Extracted data from the page"),
  message: z.string().describe("Result message")
});
const browserExtractTool = createTool({
  id: "browser-extract",
  description: "Extract data from the current page using AI. Can extract structured data based on natural language instructions.",
  inputSchema: browserExtractToolInputSchema,
  outputSchema: browserExtractToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction, schema } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F4CA} Extracting data: ${instruction}`);
      const result = await page.extract(instruction, schema ? { schema } : void 0);
      console.log(`\u2705 Data extraction completed`);
      return {
        success: true,
        data: result.extraction,
        message: `Successfully extracted data: ${instruction}`
      };
    } catch (error) {
      console.error("Extraction error:", error);
      return {
        success: false,
        data: null,
        message: `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserExtractTool };
//# sourceMappingURL=e2e63f88-9bf1-4b32-9c2e-507b826d8c43.mjs.map
