import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { braveSearchTool } from '../tools/braveSearchTool';

// 検索クエリの型定義
const SearchQuerySchema = z.object({
  query: z.string(),
  reason: z.string(),
});

// 検索結果の型定義
const SearchResultSchema = z.object({
  query: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
  })),
  summary: z.string(),
  citations: z.array(z.object({
    text: z.string(),
    url: z.string(),
  })),
});

// 知識ギャップの型定義
const KnowledgeGapSchema = z.object({
  gap: z.string(),
  suggestedQuery: z.string(),
});

// Deep Researchワークフローの定義
export const deepResearchWorkflow = createWorkflow({
  id: 'deep-research-workflow',
  description: 'LangGraphスタイルの高度な研究エージェントシステム',
  inputSchema: z.object({
    message: z.string().describe('ユーザーからの質問'),
    maxIterations: z.number().optional().default(2).describe('最大反復回数'),
    queriesPerIteration: z.number().optional().default(3).describe('各反復での検索クエリ数'),
  }),
  outputSchema: z.object({
    answer: z.string(),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })),
    searchQueries: z.array(z.string()),
    iterations: z.number(),
    knowledgeGaps: z.array(z.string()).optional(),
  }),
})
  // ステップ1: 初期クエリ生成
  .then(createStep({
    id: 'generate-initial-queries',
    description: 'ユーザーの質問から複数の検索クエリを生成',
    inputSchema: z.object({
      message: z.string(),
      maxIterations: z.number().optional().default(2),
      queriesPerIteration: z.number().optional().default(3),
    }),
    outputSchema: z.object({
      queries: z.array(SearchQuerySchema),
      iteration: z.number(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      const prompt = `あなたは研究アシスタントです。以下の質問に答えるために、${inputData.queriesPerIteration}個の効果的なWeb検索クエリを生成してください。

質問: ${inputData.message}

各クエリについて、なぜそのクエリが有効かの理由も含めてください。
現在の日付: ${new Date().toLocaleDateString('ja-JP')}

以下のJSON形式で出力してください：
[
  {
    "query": "検索クエリ1",
    "reason": "このクエリが有効な理由"
  },
  ...
]`;

      try {
        const response = await generateText({
          model,
          prompt,
        });

        // JSONパースを試みる
        let queries: Array<{ query: string; reason: string }>;
        try {
          queries = JSON.parse(response.text);
        } catch {
          // JSONパースに失敗した場合、テキストから抽出
          const lines = response.text.split('\n').filter(line => line.trim());
          queries = lines.slice(0, inputData.queriesPerIteration).map(line => ({
            query: line.trim(),
            reason: '効果的な検索クエリ',
          }));
        }

        return {
          queries: queries.slice(0, inputData.queriesPerIteration),
          iteration: 1,
        };
      } catch (error) {
        console.error('クエリ生成エラー:', error);
        return {
          queries: [{
            query: inputData.message,
            reason: 'フォールバック: 元の質問を使用',
          }],
          iteration: 1,
        };
      }
    },
  }))
  // ステップ2: 並列Web検索実行
  .then(createStep({
    id: 'parallel-web-search',
    description: '生成されたクエリで並列にWeb検索を実行',
    inputSchema: z.object({
      queries: z.array(SearchQuerySchema),
      iteration: z.number(),
    }),
    outputSchema: z.object({
      searchResults: z.array(SearchResultSchema),
      iteration: z.number(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      // 並列検索の実行（レート制限を考慮）
      const searchResults: Array<typeof SearchResultSchema._type> = [];
      
      for (let i = 0; i < inputData.queries.length; i++) {
        const { query, reason } = inputData.queries[i];
        
        // レート制限対策
        if (i > 0) {
          console.log(`[Iteration ${inputData.iteration}] Waiting 1.1s before search ${i + 1}/${inputData.queries.length}...`);
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
        
        try {
          console.log(`[Iteration ${inputData.iteration}] Searching: "${query}" (Reason: ${reason})`);
          
          // Brave検索実行
          const braveResults = await braveSearchTool.execute({
            context: { query, count: 5 }
          } as any);
          
          // 検索結果から引用を抽出
          const citationPrompt = `以下の検索結果から、質問に関連する重要な情報を抽出し、引用として整理してください。

検索クエリ: ${query}
検索結果:
${braveResults.results.map((r: any) => `
タイトル: ${r.title}
URL: ${r.url}
説明: ${r.description || 'なし'}
`).join('\n')}

以下の形式で要約と引用を提供してください：
1. 全体の要約（2-3文）
2. 重要な引用（各引用にはURLを含める）`;

          const citationResponse = await generateText({
            model,
            prompt: citationPrompt,
          });

          // 引用の抽出（簡易的な実装）
          const citations = braveResults.results.slice(0, 3).map((r: any) => ({
            text: r.description || r.title,
            url: r.url,
          }));

          searchResults.push({
            query,
            results: braveResults.results,
            summary: citationResponse.text,
            citations,
          });
        } catch (error) {
          console.error(`検索エラー (${query}):`, error);
          searchResults.push({
            query,
            results: [],
            summary: `検索エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
            citations: [],
          });
        }
      }

      return {
        searchResults,
        iteration: inputData.iteration,
      };
    },
  }))
  // ステップ3: 振り返りと評価
  .then(createStep({
    id: 'reflection-and-evaluation',
    description: '収集した情報を評価し、知識ギャップを特定',
    inputSchema: z.object({
      message: z.string(),
      searchResults: z.array(SearchResultSchema),
      iteration: z.number(),
      maxIterations: z.number(),
    }),
    outputSchema: z.object({
      isComplete: z.boolean(),
      knowledgeGaps: z.array(KnowledgeGapSchema),
      summary: z.string(),
      shouldContinue: z.boolean(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      // 現在の反復が最大値に達している場合は終了
      if (inputData.iteration >= inputData.maxIterations) {
        return {
          isComplete: true,
          knowledgeGaps: [],
          summary: '最大反復回数に達しました',
          shouldContinue: false,
        };
      }
      
      const evaluationPrompt = `あなたは研究評価者です。以下の検索結果を分析し、元の質問に対する情報の十分性を評価してください。

元の質問: ${inputData.message}

収集した情報:
${inputData.searchResults.map(sr => `
クエリ: ${sr.query}
要約: ${sr.summary}
結果数: ${sr.results.length}
`).join('\n---\n')}

以下を評価してください：
1. 質問に答えるのに十分な情報が集まったか？
2. まだ不足している情報や知識ギャップは何か？
3. 追加で検索すべきクエリは何か？

以下のJSON形式で回答してください：
{
  "isComplete": true/false,
  "summary": "現在の情報の要約",
  "knowledgeGaps": [
    {
      "gap": "不足している情報",
      "suggestedQuery": "追加検索クエリ"
    }
  ]
}`;

      try {
        const response = await generateText({
          model,
          prompt: evaluationPrompt,
        });

        let evaluation;
        try {
          evaluation = JSON.parse(response.text);
        } catch {
          // JSONパースに失敗した場合のフォールバック
          evaluation = {
            isComplete: true,
            summary: response.text,
            knowledgeGaps: [],
          };
        }

        return {
          isComplete: evaluation.isComplete || false,
          knowledgeGaps: evaluation.knowledgeGaps || [],
          summary: evaluation.summary || '情報を評価しました',
          shouldContinue: !evaluation.isComplete && inputData.iteration < inputData.maxIterations,
        };
      } catch (error) {
        console.error('評価エラー:', error);
        return {
          isComplete: true,
          knowledgeGaps: [],
          summary: ' 評価エラーが発生しました',
          shouldContinue: false,
        };
      }
    },
  }))
  // ステップ4: 追加クエリ生成（条件付き）
  .then(createStep({
    id: 'generate-additional-queries',
    description: '知識ギャップに基づいて追加クエリを生成',
    inputSchema: z.object({
      isComplete: z.boolean(),
      knowledgeGaps: z.array(KnowledgeGapSchema),
      summary: z.string(),
      shouldContinue: z.boolean(),
      // 追加で必要なデータ
      queriesPerIteration: z.number().optional().default(3),
      iteration: z.number(),
      message: z.string(),
      searchResults: z.array(SearchResultSchema),
      maxIterations: z.number(),
    }),
    outputSchema: z.object({
      additionalQueries: z.array(SearchQuerySchema).optional(),
      shouldSearch: z.boolean(),
      nextIteration: z.number(),
    }),
    execute: async ({ inputData }) => {
      if (!inputData.shouldContinue || inputData.knowledgeGaps.length === 0) {
        return {
          additionalQueries: undefined,
          shouldSearch: false,
          nextIteration: inputData.iteration,
        };
      }

      // 知識ギャップから追加クエリを生成
      const additionalQueries = inputData.knowledgeGaps
        .slice(0, inputData.queriesPerIteration)
        .map(gap => ({
          query: gap.suggestedQuery,
          reason: `知識ギャップ: ${gap.gap}`,
        }));

      console.log(`[Iteration ${inputData.iteration}] 追加クエリを生成: ${additionalQueries.length}個`);

      return {
        additionalQueries,
        shouldSearch: true,
        nextIteration: inputData.iteration + 1,
      };
    },
  }))
  // ステップ5: 追加検索実行（条件付き）
  .then(createStep({
    id: 'additional-search',
    description: '追加クエリで検索を実行',
    inputSchema: z.object({
      shouldSearch: z.boolean(),
      additionalQueries: z.array(SearchQuerySchema).optional(),
      nextIteration: z.number(),
      previousResults: z.array(SearchResultSchema),
    }),
    outputSchema: z.object({
      allSearchResults: z.array(SearchResultSchema),
      totalIterations: z.number(),
    }),
    execute: async ({ inputData }) => {
      if (!inputData.shouldSearch || !inputData.additionalQueries) {
        return {
          allSearchResults: inputData.previousResults,
          totalIterations: inputData.nextIteration - 1,
        };
      }

      // 追加検索を実行（ステップ2と同じロジック）
      const model = anthropic('claude-opus-4-20250514');
      const additionalResults: Array<typeof SearchResultSchema._type> = [];
      
      for (let i = 0; i < inputData.additionalQueries.length; i++) {
        const { query, reason } = inputData.additionalQueries[i];
        
        if (i > 0) {
          console.log(`[Iteration ${inputData.nextIteration}] Waiting 1.1s before additional search ${i + 1}/${inputData.additionalQueries.length}...`);
          await new Promise(resolve => setTimeout(resolve, 1100));
        }
        
        try {
          console.log(`[Iteration ${inputData.nextIteration}] Additional search: "${query}"`);
          
          const braveResults = await braveSearchTool.execute({
            context: { query, count: 5 }
          } as any);
          
          const citationPrompt = `検索結果を要約してください：\n\nクエリ: ${query}\n結果: ${JSON.stringify(braveResults.results.slice(0, 3))}`;
          
          const citationResponse = await generateText({
            model,
            prompt: citationPrompt,
          });

          additionalResults.push({
            query,
            results: braveResults.results,
            summary: citationResponse.text,
            citations: braveResults.results.slice(0, 3).map((r: any) => ({
              text: r.description || r.title,
              url: r.url,
            })),
          });
        } catch (error) {
          console.error(`追加検索エラー (${query}):`, error);
        }
      }

      return {
        allSearchResults: [...inputData.previousResults, ...additionalResults],
        totalIterations: inputData.nextIteration,
      };
    },
  }))
  // ステップ6: 最終回答生成
  .then(createStep({
    id: 'generate-final-answer',
    description: '収集した全情報から包括的な回答を生成',
    inputSchema: z.object({
      message: z.string(),
      allSearchResults: z.array(SearchResultSchema),
      totalIterations: z.number(),
    }),
    outputSchema: z.object({
      answer: z.string(),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
      })),
      searchQueries: z.array(z.string()),
      iterations: z.number(),
      knowledgeGaps: z.array(z.string()).optional(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514'); // 最高品質のモデルを使用
      
      // すべてのソースを収集
      const allSources = new Map<string, { title: string; url: string }>();
      const allQueries: string[] = [];
      
      inputData.allSearchResults.forEach(sr => {
        allQueries.push(sr.query);
        sr.results.forEach(r => {
          if (!allSources.has(r.url)) {
            allSources.set(r.url, { title: r.title, url: r.url });
          }
        });
      });
      
      // 包括的な回答を生成
      const finalPrompt = `あなたは専門的な研究者です。以下の情報を基に、ユーザーの質問に対する包括的で正確な回答を生成してください。

質問: ${inputData.message}

収集した情報（${inputData.totalIterations}回の反復検索）:
${inputData.allSearchResults.map(sr => `
【検索: ${sr.query}】
要約: ${sr.summary}
引用:
${sr.citations.map(c => `- ${c.text} (出典: ${c.url})`).join('\n')}
`).join('\n\n')}

要件:
1. 包括的で詳細な回答を提供
2. 適切に情報源を引用
3. 構造化された形式で提示
4. 専門的かつ理解しやすい言葉を使用
5. 重要なポイントを強調

回答を生成してください：`;

      try {
        const response = await generateText({
          model,
          prompt: finalPrompt,
        });

        return {
          answer: response.text,
          sources: Array.from(allSources.values()).slice(0, 20), // 最大20個のソース
          searchQueries: allQueries,
          iterations: inputData.totalIterations,
          knowledgeGaps: undefined,
        };
      } catch (error) {
        console.error('最終回答生成エラー:', error);
        return {
          answer: '申し訳ございません。回答の生成中にエラーが発生しました。',
          sources: Array.from(allSources.values()).slice(0, 10),
          searchQueries: allQueries,
          iterations: inputData.totalIterations,
          knowledgeGaps: ['回答生成エラー'],
        };
      }
    },
  }));

// ワークフローをコミット
deepResearchWorkflow.commit(); 