import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface BraveWebSearchResult {
  title: string;
  url: string;
  description?: string;
}

interface BraveApiWebResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description?: string;
    }>;
  };
}

/**
 * braveSearchTool
 * ---------------
 * Queries Brave Web Search API and returns the top N organic web results.
 *
 * NOTE: The API key must be provided via the environment variable `BRAVE_API_KEY`.
 */
export const braveSearchTool = createTool({
  id: 'brave-web-search',
  description: 'Search the web using Brave Search API and return the top organic results.',
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe('Search phrase to query Brave Search for.'),
    count: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe('How many top results to return (1-20). Optional; defaults to 10.'),
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        description: z.string().optional(),
      }),
    ),
  }),
  execute: async ({ context }) => {
    const { query, count } = context;

    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'BRAVE_API_KEY environment variable is not set. Please provide your Brave Search API key.'
      );
    }

    const endpoint = 'https://api.search.brave.com/res/v1/web/search';
    
    // 日本語クエリに対応するため、適切にエンコード
    const params = new URLSearchParams({ 
      q: query,  // URLSearchParamsが自動的にエンコードしてくれる
      count: String(count) 
    });

    // レート制限対策: リトライロジックを追加
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒

    while (retryCount < maxRetries) {
      try {
        const resp = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
          },
        });

        if (resp.status === 429) {
          // レート制限エラーの場合、待機してリトライ
          retryCount++;
          if (retryCount < maxRetries) {
            console.warn(`Brave Search API rate limit hit. Retrying in ${retryDelay}ms... (attempt ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
            continue;
          }
        }

        if (!resp.ok) {
          throw new Error(`Brave Search API error: ${resp.status} ${resp.statusText}`);
        }

        const json = (await resp.json()) as BraveApiWebResponse;

        const webResults = json.web?.results ?? [];
        const simplified: BraveWebSearchResult[] = webResults.slice(0, count).map((r) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        }));

        return { results: simplified };
      } catch (error) {
        if (retryCount < maxRetries - 1 && error instanceof Error && error.message.includes('429')) {
          retryCount++;
          console.warn(`Retrying Brave Search after error... (attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          continue;
        }
        throw error;
      }
    }

    // すべてのリトライが失敗した場合
    throw new Error('Brave Search API rate limit exceeded after all retries');
  },
}); 