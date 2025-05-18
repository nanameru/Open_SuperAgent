import { tool } from 'ai';
import { z } from 'zod';

export const presentationPreviewTool = tool({
  description: 'プレゼンテーションスライドのプレビューを表示するツール。スライドのHTMLコンテンツを受け取り、プレビュー表示します。',
  parameters: z.object({
    htmlContent: z.string().describe('スライドのHTMLコンテンツ。'),
    title: z.string().optional().describe('プレゼンテーションのタイトル。'),
    autoOpen: z.boolean().optional().default(true).describe('プレビューパネルを自動的に開くかどうか。')
  }),
  execute: async ({ htmlContent, title, autoOpen }) => {
    // クライアント側でプレビューを表示するための状態を更新
    // 実際の表示はフロントエンド側で処理されます
    
    return {
      success: true,
      message: `プレゼンテーション「${title || '無題のプレゼンテーション'}」のプレビューを表示します。`,
      htmlContent,
      title: title || '無題のプレゼンテーション',
      autoOpen: autoOpen ?? true
    };
  },
}); 