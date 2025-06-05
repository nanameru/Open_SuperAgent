import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { writeFile } from 'fs/promises';
import path__default from 'path';
import { stagehandInstances } from './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';

const browserScreenshotToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  fullPage: z.boolean().optional().default(false).describe("Whether to capture the full page"),
  filename: z.string().optional().describe("Optional filename for saving screenshot")
});
const browserScreenshotToolOutputSchema = z.object({
  success: z.boolean().describe("Whether screenshot was successful"),
  screenshot: z.string().describe("Base64 encoded screenshot"),
  filepath: z.string().optional().describe("File path if saved to disk"),
  message: z.string().describe("Result message")
});
const browserScreenshotTool = createTool({
  id: "browser-screenshot",
  description: "Take a screenshot of the current page",
  inputSchema: browserScreenshotToolInputSchema,
  outputSchema: browserScreenshotToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, fullPage, filename } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F4F8} Taking screenshot (fullPage: ${fullPage})`);
      const screenshotBuffer = await page.screenshot({
        fullPage,
        timeout: 1e4
      });
      const base64Screenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
      let filepath;
      if (filename) {
        const screenshotDir = path__default.join(process.cwd(), "public", "browser-screenshots");
        const fullPath = path__default.join(screenshotDir, filename.endsWith(".png") ? filename : `${filename}.png`);
        await writeFile(fullPath, screenshotBuffer);
        filepath = fullPath;
        console.log(`\u{1F4BE} Screenshot saved to: ${filepath}`);
      }
      console.log(`\u2705 Screenshot captured successfully`);
      return {
        success: true,
        screenshot: base64Screenshot,
        filepath,
        message: "Screenshot captured successfully"
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        screenshot: "",
        message: `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

export { browserScreenshotTool };
//# sourceMappingURL=ff78c37d-66ab-44eb-9c1e-bbc952c57e9b.mjs.map
