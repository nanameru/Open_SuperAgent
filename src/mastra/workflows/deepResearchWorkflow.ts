import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { braveSearchTool } from '../tools/braveSearchTool';
import { grokXSearchTool } from '../tools/grokXSearchTool';

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
      message: z.string(),
      maxIterations: z.number(),
      queriesPerIteration: z.number(),
    }),
    execute: async ({ inputData, mastra }) => {
      const queryAgent = mastra?.getAgent('queryPlanningAgent');
      
      if (!queryAgent) {
        // Fallback without agent
        return {
          queries: [
            {
              query: inputData.message,
              reason: 'Direct query about the research topic',
            },
            {
              query: `${inputData.message} recent research`,
              reason: 'Find recent developments',
            },
            {
              query: `${inputData.message} expert analysis`,
              reason: 'Find expert opinions',
            },
          ].slice(0, inputData.queriesPerIteration),
          iteration: 1,
          message: inputData.message,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      }

      const prompt = `Generate ${inputData.queriesPerIteration} strategic search queries for this research question:

Question: ${inputData.message}
Date: ${new Date().toLocaleDateString('ja-JP')}`;

      try {
        const response = await queryAgent.stream([
          {
            role: 'user',
            content: prompt,
          },
        ]);

        let responseText = '';
        for await (const chunk of response.textStream) {
          responseText += chunk;
        }

        let planData;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            planData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch (parseError) {
          console.error('JSONパースエラー:', parseError);
          planData = {
            queries: [
              {
                query: inputData.message,
                reasoning: 'フォールバック: 元の質問を使用'
              }
            ]
          };
        }

        const queries = (planData.queries || []).map((q: any) => ({
          query: q.query,
          reason: q.reasoning || q.reason || 'Generated query'
        }));

        return {
          queries: queries.slice(0, inputData.queriesPerIteration),
          iteration: 1,
          message: inputData.message,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      } catch (error) {
        console.error('クエリ生成エラー:', error);
        return {
          queries: [{
            query: inputData.message,
            reason: 'フォールバック: 元の質問を使用',
          }],
          iteration: 1,
          message: inputData.message,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      }
    },
  }))
  
  // ステップ2: 並列Web検索実行
  .parallel([
    // Brave検索ステップ
    createStep({
      id: 'brave-search',
      description: 'Brave検索エンジンで情報収集',
      inputSchema: z.object({
        queries: z.array(SearchQuerySchema),
        iteration: z.number(),
        message: z.string(),
        maxIterations: z.number(),
        queriesPerIteration: z.number(),
      }),
      outputSchema: z.object({
        searchResults: z.array(SearchResultSchema),
        searchEngine: z.string(),
      }),
      execute: async ({ inputData, mastra }) => {
        const analysisAgent = mastra?.getAgent('researchAnalysisAgent');
        const searchResults: Array<typeof SearchResultSchema._type> = [];
        
        for (let i = 0; i < inputData.queries.length; i++) {
          const { query, reason } = inputData.queries[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1200));
          }
          
          try {
            console.log(`[Brave Search] "${query}"`);
            
            const braveResults = await braveSearchTool.execute({
              context: { query, count: 5 }
            } as any);
            
            if (braveResults?.results && Array.isArray(braveResults.results)) {
              let summary = 'Search completed successfully';
              
              if (analysisAgent) {
                try {
                  const analysisResponse = await analysisAgent.stream([{
                    role: 'user',
                    content: `Analyze these search results for query: "${query}"\n\nResults: ${JSON.stringify(braveResults.results.slice(0, 3))}`
                  }]);
                  
                  summary = '';
                  for await (const chunk of analysisResponse.textStream) {
                    summary += chunk;
                  }
                } catch (analysisError) {
                  console.error('Analysis error:', analysisError);
                }
              }
              
              searchResults.push({
                query,
                results: braveResults.results,
                summary,
                citations: braveResults.results.slice(0, 3).map((r: any) => ({
                  text: r.description || r.title,
                  url: r.url,
                })),
              });
            }
          } catch (error) {
            console.error(`Brave search error (${query}):`, error);
            searchResults.push({
              query,
              results: [],
              summary: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              citations: [],
            });
          }
        }
        
        return {
          searchResults,
          searchEngine: 'brave',
        };
      },
    }),
    
    // Grok検索ステップ（バックアップ）
    createStep({
      id: 'grok-search',
      description: 'GrokX検索エンジンで補完的な情報収集',
      inputSchema: z.object({
        queries: z.array(SearchQuerySchema),
        iteration: z.number(),
        message: z.string(),
        maxIterations: z.number(),
        queriesPerIteration: z.number(),
      }),
      outputSchema: z.object({
        searchResults: z.array(SearchResultSchema),
        searchEngine: z.string(),
      }),
      execute: async ({ inputData }) => {
        const searchResults: Array<typeof SearchResultSchema._type> = [];
        
        const primaryQuery = inputData.queries[0];
        if (primaryQuery) {
          try {
            console.log(`[Grok Search] "${primaryQuery.query}"`);
            
            const grokResults = await grokXSearchTool.execute({
              context: { 
                query: primaryQuery.query,
                mode: 'on',
                maxResults: 5,
                returnCitations: true,
              }
            } as any);
            
            if (grokResults?.content) {
              searchResults.push({
                query: primaryQuery.query,
                results: [],
                summary: grokResults.content,
                citations: (grokResults.citations || []).map((c: any) => 
                  typeof c === 'string' ? { text: c, url: '' } : c
                ),
              });
            }
          } catch (error) {
            console.error(`Grok search error:`, error);
          }
        }
        
        return {
          searchResults,
          searchEngine: 'grok',
        };
      },
    })
  ])
  
  // ステップ3: 検索結果統合
  .then(createStep({
    id: 'merge-search-results',
    description: '複数の検索エンジンからの結果を統合',
    inputSchema: z.object({}).passthrough(),
    outputSchema: z.object({
      searchResults: z.array(SearchResultSchema),
      iteration: z.number(),
      message: z.string(),
      maxIterations: z.number(),
      queriesPerIteration: z.number(),
    }),
    execute: async ({ inputData, runId, mastra }) => {
      const allResults: Array<typeof SearchResultSchema._type> = [];
      
      // Handle parallel step results - inputData contains results from both parallel steps
      Object.values(inputData).forEach((engineResults: any) => {
        if (engineResults?.searchResults) {
          allResults.push(...engineResults.searchResults);
        }
      });
      
      // Get context from workflow memory if available
      const originalContext = { iteration: 1, message: '', maxIterations: 2, queriesPerIteration: 3 };
      
      return {
        searchResults: allResults,
        iteration: originalContext?.iteration || 1,
        message: originalContext?.message || '',
        maxIterations: originalContext?.maxIterations || 2,
        queriesPerIteration: originalContext?.queriesPerIteration || 3,
      };
    },
  }))
  
  // ステップ4: 振り返りと評価
  .then(createStep({
    id: 'reflection-and-evaluation',
    description: '収集した情報を評価し、知識ギャップを特定',
    inputSchema: z.object({
      message: z.string(),
      searchResults: z.array(SearchResultSchema),
      iteration: z.number(),
      maxIterations: z.number(),
      queriesPerIteration: z.number(),
    }),
    outputSchema: z.object({
      isComplete: z.boolean(),
      knowledgeGaps: z.array(KnowledgeGapSchema),
      summary: z.string(),
      shouldContinue: z.boolean(),
      iteration: z.number(),
      message: z.string(),
      searchResults: z.array(SearchResultSchema),
      maxIterations: z.number(),
      queriesPerIteration: z.number(),
    }),
    execute: async ({ inputData, mastra }) => {
      const knowledgeGapAgent = mastra?.getAgent('knowledgeGapAgent');
      
      if (inputData.iteration >= inputData.maxIterations) {
        return {
          isComplete: true,
          knowledgeGaps: [],
          summary: '最大反復回数に達しました',
          shouldContinue: false,
          iteration: inputData.iteration,
          message: inputData.message,
          searchResults: inputData.searchResults,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      }

      try {
        let evaluation;
        
        if (knowledgeGapAgent) {
          const evaluationPrompt = `Research question: ${inputData.message}

Collected information:
${inputData.searchResults.map(sr => `
Query: ${sr.query}
Summary: ${sr.summary}
Results count: ${sr.results.length}
`).join('\n---\n')}

Analyze the completeness of this research and identify any knowledge gaps.`;

          const response = await knowledgeGapAgent.stream([
            {
              role: 'user',
              content: evaluationPrompt,
            },
          ]);

          let responseText = '';
          for await (const chunk of response.textStream) {
            responseText += chunk;
          }

          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              evaluation = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found');
            }
          } catch (parseError) {
            console.error('評価JSONパースエラー:', parseError);
            evaluation = {
              isComplete: true,
              summary: responseText,
              gaps: [],
            };
          }
        } else {
          evaluation = {
            isComplete: inputData.iteration >= inputData.maxIterations,
            summary: '情報収集が完了しました',
            gaps: [],
          };
        }

        return {
          isComplete: evaluation.isComplete || false,
          knowledgeGaps: evaluation.gaps || [],
          summary: evaluation.summary || '情報を評価しました',
          shouldContinue: !evaluation.isComplete && inputData.iteration < inputData.maxIterations,
          iteration: inputData.iteration,
          message: inputData.message,
          searchResults: inputData.searchResults,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      } catch (error) {
        console.error('評価エラー:', error);
        return {
          isComplete: true,
          knowledgeGaps: [],
          summary: '評価エラーが発生しました',
          shouldContinue: false,
          iteration: inputData.iteration,
          message: inputData.message,
          searchResults: inputData.searchResults,
          maxIterations: inputData.maxIterations,
          queriesPerIteration: inputData.queriesPerIteration,
        };
      }
    },
  }))
  
  // ステップ5: 条件分岐 - 追加研究が必要かどうか
  .branch([
    // 分岐1: 追加研究が必要な場合
    [
      async ({ inputData }) => {
        return inputData.shouldContinue && !inputData.isComplete;
      },
      createStep({
        id: 'continue-research-path',
        description: '追加研究を実行して情報を補完',
        inputSchema: z.object({
          isComplete: z.boolean(),
          knowledgeGaps: z.array(KnowledgeGapSchema),
          summary: z.string(),
          shouldContinue: z.boolean(),
          iteration: z.number(),
          message: z.string(),
          searchResults: z.array(SearchResultSchema),
          maxIterations: z.number(),
          queriesPerIteration: z.number(),
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
        execute: async ({ inputData, mastra }) => {
          const synthesisAgent = mastra?.getAgent('researchSynthesisAgent');
          
          const allSources = new Map<string, { title: string; url: string }>();
          const allQueries: string[] = [];
          
          inputData.searchResults.forEach(sr => {
            allQueries.push(sr.query);
            sr.results.forEach(r => {
              if (!allSources.has(r.url)) {
                allSources.set(r.url, { title: r.title, url: r.url });
              }
            });
          });

          let finalAnswer = 'Research completed with additional analysis needed.';
          
          if (synthesisAgent) {
            try {
              const synthesisPrompt = `Synthesize the following research findings into a comprehensive answer:

Question: ${inputData.message}

Research Results:
${inputData.searchResults.map(sr => `
Query: ${sr.query}
Summary: ${sr.summary}
`).join('\n\n')}

Provide a comprehensive, well-structured answer.`;

              const response = await synthesisAgent.stream([
                {
                  role: 'user',
                  content: synthesisPrompt,
                },
              ]);

              finalAnswer = '';
              for await (const chunk of response.textStream) {
                finalAnswer += chunk;
              }
            } catch (error) {
              console.error('Synthesis error:', error);
            }
          }
          
          return {
            answer: finalAnswer,
            sources: Array.from(allSources.values()).slice(0, 20),
            searchQueries: allQueries,
            iterations: inputData.iteration + 1,
            knowledgeGaps: inputData.knowledgeGaps.map(kg => kg.gap),
          };
        }
      })
    ],
    // 分岐2: 研究完了の場合
    [
      async ({ inputData }) => {
        return inputData.isComplete || !inputData.shouldContinue;
      },
      createStep({
        id: 'finalize-research',
        description: '収集した情報から最終回答を生成',
        inputSchema: z.object({
          isComplete: z.boolean(),
          knowledgeGaps: z.array(KnowledgeGapSchema),
          summary: z.string(),
          shouldContinue: z.boolean(),
          iteration: z.number(),
          message: z.string(),
          searchResults: z.array(SearchResultSchema),
          maxIterations: z.number(),
          queriesPerIteration: z.number(),
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
        execute: async ({ inputData, mastra }) => {
          const synthesisAgent = mastra?.getAgent('researchSynthesisAgent');
          
          const allSources = new Map<string, { title: string; url: string }>();
          const allQueries: string[] = [];
          
          inputData.searchResults.forEach(sr => {
            allQueries.push(sr.query);
            sr.results.forEach(r => {
              if (!allSources.has(r.url)) {
                allSources.set(r.url, { title: r.title, url: r.url });
              }
            });
          });

          let finalAnswer = inputData.summary;
          
          if (synthesisAgent) {
            try {
              const synthesisPrompt = `Create a comprehensive final answer based on the research conducted:

Question: ${inputData.message}

Research Summary: ${inputData.summary}

Detailed Findings:
${inputData.searchResults.map(sr => `
Query: ${sr.query}
Summary: ${sr.summary}
Citations: ${sr.citations.map(c => `- ${c.text} (${c.url})`).join('\n')}
`).join('\n\n')}

Generate a well-structured, comprehensive answer that addresses the original question.`;

              const response = await synthesisAgent.stream([
                {
                  role: 'user',
                  content: synthesisPrompt,
                },
              ]);

              finalAnswer = '';
              for await (const chunk of response.textStream) {
                finalAnswer += chunk;
              }
            } catch (error) {
              console.error('Final synthesis error:', error);
            }
          }
          
          return {
            answer: finalAnswer,
            sources: Array.from(allSources.values()).slice(0, 20),
            searchQueries: allQueries,
            iterations: inputData.iteration,
            knowledgeGaps: inputData.knowledgeGaps.map(kg => kg.gap),
          };
        },
      })
    ]
  ]);

// ワークフローをコミット
deepResearchWorkflow.commit();