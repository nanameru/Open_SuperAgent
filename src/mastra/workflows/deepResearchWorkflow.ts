import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { braveSearchTool } from '../tools/braveSearchTool';

// Deep Researchワークフローの定義
export const deepResearchWorkflow = createWorkflow({
  id: 'deep-research-workflow',
  description: '詳細な調査と分析を行うワークフロー',
  inputSchema: z.object({
    message: z.string().describe('ユーザーからの質問'),
    maxQueries: z.number().optional().default(3).describe('生成する検索クエリの最大数'),
    searchResultsPerQuery: z.number().optional().default(5).describe('各クエリの検索結果数'),
  }),
  outputSchema: z.object({
    answer: z.string(),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })),
    searchQueries: z.array(z.string()).optional(),
    totalSourcesFound: z.number().optional(),
  }),
})
  // ステップ1: 検索クエリ生成
  .then(createStep({
    id: 'generate-search-queries',
    description: '質問から効果的な検索クエリを生成',
    inputSchema: z.object({
      message: z.string(),
      maxQueries: z.number().optional().default(3),
      searchResultsPerQuery: z.number().optional().default(5),
    }),
    outputSchema: z.object({
      queries: z.array(z.string()),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514'); // htmlSlideToolと同じモデル
      
      const queryPrompt = `ユーザーの質問: ${inputData.message}

この質問に答えるために、${inputData.maxQueries}個の効果的なWeb検索クエリを生成してください。
各クエリは異なる側面をカバーし、最新の情報を取得できるようにしてください。
現在の日付: ${new Date().toLocaleDateString('ja-JP')}

クエリのみを改行区切りで出力してください。`;

      try {
        const queryResponse = await generateText({
          model,
          prompt: queryPrompt,
        });

        const queries = queryResponse.text
          .split('\n')
          .filter(q => q.trim())
          .slice(0, inputData.maxQueries);

        if (queries.length === 0) {
          throw new Error('検索クエリの生成に失敗しました');
        }

        return { queries };
      } catch (error) {
        console.error('クエリ生成エラー:', error);
        // フォールバック: 元の質問をそのまま使用
        return { queries: [inputData.message] };
      }
    },
  }))
  // ステップ2: 各クエリで検索実行
  .then(createStep({
    id: 'execute-searches',
    description: '各クエリでBrave検索を実行',
    inputSchema: z.object({
      queries: z.array(z.string()),
      searchResultsPerQuery: z.number(),
    }),
    outputSchema: z.object({
      searchResults: z.array(z.object({
        query: z.string(),
        results: z.array(z.object({
          title: z.string(),
          url: z.string(),
          description: z.string().optional(),
        })),
        error: z.string().optional(),
      })),
    }),
    execute: async ({ inputData }) => {
      // レート制限を避けるため、順次実行に変更
      const searchResults = [];
      
      for (let i = 0; i < inputData.queries.length; i++) {
        const query = inputData.queries[i];
        
        // レート制限対策: 1秒あたり1リクエストの制限に対応
        if (i > 0) {
          console.log(`Waiting 1.1 seconds before next search query (${i + 1}/${inputData.queries.length})...`);
          await new Promise(resolve => setTimeout(resolve, 1100)); // 1.1秒待機（安全マージン含む）
        }
        
        try {
          // braveSearchToolを使用
          const braveResults = await braveSearchTool.execute({
            context: { query, count: inputData.searchResultsPerQuery }
          } as any);
          
          searchResults.push({
            query,
            results: braveResults.results,
          });
        } catch (error) {
          console.warn(`Brave Search failed for query "${query}":`, error);
          // エラー時のフォールバック
          searchResults.push({
            query,
            results: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { searchResults };
    },
  }))
  // ステップ3: 検索結果の要約
  .then(createStep({
    id: 'summarize-results',
    description: '各検索結果を要約',
    inputSchema: z.object({
      searchResults: z.array(z.object({
        query: z.string(),
        results: z.array(z.object({
          title: z.string(),
          url: z.string(),
          description: z.string().optional(),
        })),
        error: z.string().optional(),
      })),
    }),
    outputSchema: z.object({
      summaries: z.array(z.object({
        query: z.string(),
        summary: z.string(),
        sources: z.array(z.object({
          title: z.string(),
          url: z.string(),
        })),
      })),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      const summaries = await Promise.all(
        inputData.searchResults.map(async ({ query, results, error }) => {
          if (error || results.length === 0) {
            return {
              query,
              summary: `${query}に関する情報の取得に失敗しました。`,
              sources: [],
            };
          }

          const searchPrompt = `以下の検索結果を要約してください：

検索クエリ: ${query}

${results.map((r: any) => `タイトル: ${r.title}\nURL: ${r.url}\n内容: ${r.description || 'No description available'}`).join('\n\n')}

重要な情報を抽出し、簡潔に要約してください。`;

          try {
            const searchResponse = await generateText({
              model,
              prompt: searchPrompt,
            });

            return {
              query,
              summary: searchResponse.text,
              sources: results.map((r: any) => ({ title: r.title, url: r.url })),
            };
          } catch (error) {
            console.error(`要約生成エラー (${query}):`, error);
            return {
              query,
              summary: '要約の生成に失敗しました。',
              sources: results.map((r: any) => ({ title: r.title, url: r.url })),
            };
          }
        })
      );

      return { summaries };
    },
  }))
  // ステップ4: 最終回答生成
  .then(createStep({
    id: 'generate-final-answer',
    description: '収集した情報から最終的な回答を生成',
    inputSchema: z.object({
      message: z.string(),
      summaries: z.array(z.object({
        query: z.string(),
        summary: z.string(),
        sources: z.array(z.object({
          title: z.string(),
          url: z.string(),
        })),
      })),
    }),
    outputSchema: z.object({
      answer: z.string(),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
      })),
      searchQueries: z.array(z.string()),
      totalSourcesFound: z.number(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      // すべてのソースを収集
      const allSources = inputData.summaries.flatMap(s => s.sources);
      const uniqueSources = Array.from(
        new Map(allSources.map(s => [s.url, s])).values()
      );
      
      // 要約を結合
      const combinedSummaries = inputData.summaries
        .map(s => `【${s.query}】\n${s.summary}`)
        .join('\n\n---\n\n');
      
      const answerPrompt = `ユーザーの質問: ${inputData.message}

以下の情報を基に、包括的で正確な回答を生成してください：

${combinedSummaries}

回答には適切に情報源を引用してください。`;

      try {
        const answerResponse = await generateText({
          model,
          prompt: answerPrompt,
        });

        return {
          answer: answerResponse.text,
          sources: uniqueSources,
          searchQueries: inputData.summaries.map(s => s.query),
          totalSourcesFound: uniqueSources.length,
        };
      } catch (error) {
        console.error('最終回答生成エラー:', error);
        // エラー時のフォールバック回答
        return {
          answer: '申し訳ございません。情報の処理中にエラーが発生しました。',
          sources: uniqueSources,
          searchQueries: inputData.summaries.map(s => s.query),
          totalSourcesFound: uniqueSources.length,
        };
      }
    },
  }));

// ワークフローをコミット
deepResearchWorkflow.commit(); 