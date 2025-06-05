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
  }),
  outputSchema: z.object({
    answer: z.string(),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string(),
    })),
  }),
})
  // 単一のステップで全処理を実行
  .then(createStep({
    id: 'deep-research',
    description: 'Deep Research処理',
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      answer: z.string(),
      sources: z.array(z.object({
        title: z.string(),
        url: z.string(),
      })),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      
      // ステップ1: クエリ生成
      const queryPrompt = `ユーザーの質問: ${inputData.message}

この質問に答えるために、3個の効果的なWeb検索クエリを生成してください。
各クエリは異なる側面をカバーし、最新の情報を取得できるようにしてください。
現在の日付: ${new Date().toLocaleDateString('ja-JP')}

クエリのみを改行区切りで出力してください。`;

      const queryResponse = await generateText({
        model,
        prompt: queryPrompt,
      });

      const queries = queryResponse.text
        .split('\n')
        .filter(q => q.trim())
        .slice(0, 3);

      // ステップ2: 各クエリに対してBrave検索と要約
      const searchResults = await Promise.all(queries.map(async (query) => {
        // Brave Search APIを使用して実際の検索を実行
        let searchApiResults;
        try {
          const braveResults = await braveSearchTool.execute({
            context: { query, count: 5 }
          });
          searchApiResults = braveResults.results;
        } catch (error) {
          console.warn(`Brave Search failed for query "${query}": ${error.message}`);
          // フォールバック: モック結果を使用
          searchApiResults = [
            {
              title: `${query} - 検索結果`,
              url: `https://example.com/search?q=${encodeURIComponent(query)}`,
              description: `${query}に関する情報が見つかりませんでした。`,
            },
          ];
        }

        const searchPrompt = `以下の検索結果を要約してください：

検索クエリ: ${query}

${searchApiResults.map(r => `タイトル: ${r.title}\nURL: ${r.url}\n内容: ${r.description || 'No description available'}`).join('\n\n')}

重要な情報を抽出し、簡潔に要約してください。`;

        const searchResponse = await generateText({
          model,
          prompt: searchPrompt,
        });

        return {
          content: searchResponse.text,
          sources: searchApiResults.map(r => ({ title: r.title, url: r.url })),
        };
      }));

      // ステップ3: 最終回答生成
      const allSources = searchResults.flatMap(r => r.sources);
      const summaries = searchResults.map(r => r.content).join('\n\n---\n\n');
      
      const answerPrompt = `ユーザーの質問: ${inputData.message}

以下の情報を基に、包括的で正確な回答を生成してください：

${summaries}

回答には適切に情報源を引用してください。`;

      const answerResponse = await generateText({
        model,
        prompt: answerPrompt,
      });

      return {
        answer: answerResponse.text,
        sources: allSources,
      };
    },
  }));

// ワークフローをコミット
deepResearchWorkflow.commit(); 