import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GrokSearchResult {
  content: string;
  citations?: string[];
}

/**
 * grokXSearchTool
 * ---------------
 * Uses Grok's X.ai API to perform searches and return results with live data.
 *
 * NOTE: The API key must be provided via the environment variable `XAI_API_KEY`.
 */
export const grokXSearchTool = createTool({
  id: 'grok-x-search',
  description: 'Search for information using Grok\'s X.ai API with live data from web, X, news, and RSS sources.',
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe('The search query or question to ask Grok.'),
    mode: z
      .enum(['auto', 'on', 'off'])
      .default('auto')
      .describe('Search mode: "auto" (model decides), "on" (force search), "off" (no search).'),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe('Maximum number of search results to consider (1-50). Default: 20.'),
    returnCitations: z
      .boolean()
      .default(true)
      .describe('Whether to return citations/sources with results.'),
    fromDate: z
      .string()
      .optional()
      .describe('Start date for search data in ISO8601 format (YYYY-MM-DD).'),
    toDate: z
      .string()
      .optional()
      .describe('End date for search data in ISO8601 format (YYYY-MM-DD).'),
    sources: z
      .array(
        z.object({
          type: z.enum(['web', 'x', 'news', 'rss']),
          excludedWebsites: z.array(z.string()).optional(),
          xHandles: z.array(z.string()).optional(),
          links: z.array(z.string()).optional(),
          country: z.string().length(2).optional(),
          safeSearch: z.boolean().optional(),
        })
      )
      .optional()
      .describe('Specific data sources to use for the search.'),
  }),
  outputSchema: z.object({
    content: z.string(),
    citations: z.array(z.string()).optional(),
  }),
  execute: async ({ context }) => {
    const { 
      query, 
      mode, 
      maxResults, 
      returnCitations, 
      fromDate, 
      toDate, 
      sources 
    } = context;

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'XAI_API_KEY environment variable is not set. Please provide your X.ai API key.'
      );
    }

    const endpoint = 'https://api.x.ai/v1/chat/completions';

    // Transform sources to match API format
    const formattedSources = sources?.map(source => {
      const formattedSource: any = { type: source.type };
      
      if (source.excludedWebsites && source.excludedWebsites.length > 0) {
        formattedSource.excluded_websites = source.excludedWebsites;
      }
      
      if (source.xHandles && source.xHandles.length > 0) {
        formattedSource.x_handles = source.xHandles;
      }
      
      if (source.links && source.links.length > 0) {
        formattedSource.links = source.links;
      }
      
      if (source.country) {
        formattedSource.country = source.country;
      }
      
      if (source.safeSearch !== undefined) {
        formattedSource.safe_search = source.safeSearch;
      }
      
      return formattedSource;
    });

    const payload = {
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
      search_parameters: {
        mode,
        return_citations: returnCitations,
        max_search_results: maxResults,
        ...(fromDate && { from_date: fromDate }),
        ...(toDate && { to_date: toDate }),
        ...(formattedSources && { sources: formattedSources }),
      },
      model: 'grok-3-latest',
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(`Grok X.ai API error: ${resp.status} ${resp.statusText}`);
    }

    const data = await resp.json();
    
    // Extract content and citations
    const content = data.choices[0]?.message?.content || '';
    const citations = data.choices[0]?.message?.citations || [];

    return {
      content,
      ...(citations.length > 0 && { citations }),
    };
  },
}); 