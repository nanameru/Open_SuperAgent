import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const braveSearchTool = createTool({
  id: "brave-web-search",
  description: "Search the web using Brave Search API and return the top organic results.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Search phrase to query Brave Search for."),
    count: z.number().int().min(1).max(20).default(10).describe("How many top results to return (1-20). Optional; defaults to 10.")
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        description: z.string().optional()
      })
    )
  }),
  execute: async ({ context }) => {
    const { query, count } = context;
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "BRAVE_API_KEY environment variable is not set. Please provide your Brave Search API key."
      );
    }
    const endpoint = "https://api.search.brave.com/res/v1/web/search";
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      // 日本語検索のための追加パラメータ
      country: "jp",
      // 日本からの検索として扱う
      lang: "ja",
      // 日本語の結果を優先
      safesearch: "moderate"
      // セーフサーチを中程度に設定
    });
    let retryCount = 0;
    const maxRetries = 3;
    const baseRetryDelay = 1100;
    while (retryCount < maxRetries) {
      try {
        const resp = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey
          }
        });
        if (resp.status === 429) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = baseRetryDelay * retryCount;
            console.warn(`Brave Search API rate limit hit. Retrying in ${delay}ms... (attempt ${retryCount}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
        if (!resp.ok) {
          throw new Error(`Brave Search API error: ${resp.status} ${resp.statusText}`);
        }
        const json = await resp.json();
        const webResults = json.web?.results ?? [];
        const simplified = webResults.slice(0, count).map((r) => ({
          title: r.title,
          url: r.url,
          description: r.description
        }));
        return { results: simplified };
      } catch (error) {
        if (retryCount < maxRetries - 1 && error instanceof Error && error.message.includes("429")) {
          retryCount++;
          const delay = baseRetryDelay * retryCount;
          console.warn(`Retrying Brave Search after error... (attempt ${retryCount}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Brave Search API rate limit exceeded after all retries");
  }
});

export { braveSearchTool };
//# sourceMappingURL=eb1b1170-08d6-41ce-a5e1-3271de5a5d79.mjs.map
