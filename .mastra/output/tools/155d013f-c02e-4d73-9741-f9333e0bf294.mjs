import { z } from 'zod';
import { createTool } from '@mastra/core/tools';

let shimsImported = false;
const browserSessionToolInputSchema = z.object({
  projectId: z.string().optional().describe("Browserbase project ID (defaults to env variable)"),
  keepAlive: z.boolean().optional().default(true).describe("Keep session alive after operations"),
  timeout: z.number().optional().default(600).describe("Session timeout in seconds")
});
const browserSessionToolOutputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  liveViewUrl: z.string().describe("Live view URL for real-time browser viewing"),
  replayUrl: z.string().describe("Replay URL for session recording"),
  createdAt: z.string().describe("Session creation timestamp"),
  message: z.string().optional().describe("Human-readable message with session details")
});
const browserSessionTool = createTool({
  id: "browser-session",
  description: "Create a new Browserbase session and return live view URL immediately",
  inputSchema: browserSessionToolInputSchema,
  outputSchema: browserSessionToolOutputSchema,
  execute: async ({ context }) => {
    try {
      if (!shimsImported && typeof window === "undefined") {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY
      });
      const session = await bb.sessions.create({
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID,
        keepAlive: context.keepAlive,
        timeout: context.timeout
      });
      const sessionId = session.id;
      console.log(`\u2705 \u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86: ${sessionId}`);
      const debugInfo = await bb.sessions.debug(sessionId);
      let liveViewUrl = "";
      if (debugInfo.debuggerFullscreenUrl) {
        liveViewUrl = debugInfo.debuggerFullscreenUrl.replace(
          "https://www.browserbase.com/devtools-fullscreen/inspector.html",
          "https://www.browserbase.com/devtools-internal-compiled/index.html"
        );
      } else {
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      }
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      console.log(`\u{1F310} \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL: ${liveViewUrl}`);
      if (typeof window !== "undefined") {
        const event = new CustomEvent("browserAutomationLiveViewReady", {
          detail: {
            sessionId,
            liveViewUrl,
            replayUrl,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            status: "ready"
          }
        });
        window.dispatchEvent(event);
        console.log("\u{1F680} browserAutomationLiveViewReady \u30A4\u30D9\u30F3\u30C8\u767A\u884C:", { sessionId, liveViewUrl });
      }
      return {
        sessionId,
        liveViewUrl,
        replayUrl,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: `\u2705 \u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86

\u30BB\u30C3\u30B7\u30E7\u30F3ID: ${sessionId}

\u{1F310} \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL: ${liveViewUrl}

\u3053\u306EURL\u304B\u3089\u3001\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30D6\u30E9\u30A6\u30B6\u64CD\u4F5C\u306E\u69D8\u5B50\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002`
      };
    } catch (error) {
      console.error("Browser session creation error:", error);
      throw error;
    }
  }
});

export { browserSessionTool };
//# sourceMappingURL=155d013f-c02e-4d73-9741-f9333e0bf294.mjs.map
