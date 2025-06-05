import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserGotoToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  url: z.string().describe("URL to navigate to"),
  waitUntil: z.enum(["commit", "domcontentloaded", "load", "networkidle"]).optional().default("commit").describe("When to consider navigation succeeded"),
  timeout: z.number().optional().default(6e4).describe("Navigation timeout in milliseconds")
});
const browserGotoToolOutputSchema = z.object({
  success: z.boolean().describe("Whether navigation was successful"),
  url: z.string().describe("Current page URL after navigation"),
  title: z.string().describe("Page title after navigation"),
  message: z.string().describe("Result message")
});
const browserGotoTool = createTool({
  id: "browser-goto",
  description: "Navigate to a specified URL in the browser session",
  inputSchema: browserGotoToolInputSchema,
  outputSchema: browserGotoToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, url, waitUntil, timeout } = context;
      let stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        const { Stagehand } = await import('@browserbasehq/stagehand');
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!geminiApiKey) {
          throw new Error("Missing Gemini API key");
        }
        stagehand = new Stagehand({
          browserbaseSessionID: sessionId,
          env: "BROWSERBASE",
          modelName: "google/gemini-2.5-flash-preview-05-20",
          modelClientOptions: {
            apiKey: geminiApiKey
          },
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          disablePino: true
        });
        await stagehand.init();
        stagehandInstances.set(sessionId, stagehand);
      }
      const page = stagehand.page;
      console.log(`\u{1F310} Navigating to: ${url}`);
      await page.goto(url, { waitUntil, timeout });
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`\u2705 Navigation completed: ${title}`);
      return {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}`
      };
    } catch (error) {
      console.error("Navigation error:", error);
      return {
        success: false,
        url: context.url,
        title: "",
        message: `Navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserGotoTool };
//# sourceMappingURL=293a9d03-f1f6-452a-9c48-261256da7715.mjs.map
