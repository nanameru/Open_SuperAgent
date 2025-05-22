import { tool } from 'ai';
import { z } from 'zod';

export const presentationPreviewTool = tool({
  description: 'プレゼンテーションスライドのプレビューを表示するツール。1枚または複数のスライドのHTMLコンテンツを受け取り、プレビュー表示します。複数スライドの場合は自動的にスライドショーとして表示されます。',
  parameters: z.object({
    htmlContent: z.string().describe('単一スライドのHTMLコンテンツ。複数スライドを表示する場合はslidesArrayを使用してください。'),
    slidesArray: z.array(z.string()).optional().describe('複数スライドのHTMLコンテンツの配列。複数スライドを表示する場合に使用します。'),
    title: z.string().optional().describe('プレゼンテーションのタイトル。'),
    autoOpen: z.boolean().optional().default(true).describe('プレビューパネルを自動的に開くかどうか。'),
    showSlideControls: z.boolean().optional().default(true).describe('スライドコントロール（前へ、次へボタンなど）を表示するかどうか。'),
    startSlide: z.number().optional().default(1).describe('表示を開始するスライド番号（1から始まる）。'),
    theme: z.enum(['light', 'dark', 'auto']).optional().default('light').describe('プレビューのテーマ（light, dark, auto）。'),
  }),
  execute: async ({ htmlContent, slidesArray, title, autoOpen, showSlideControls, startSlide, theme }) => {
    // スライドコンテンツの準備
    const slides = slidesArray || (htmlContent ? [htmlContent] : []);
    const slideCount = slides.length;
    
    if (slideCount === 0) {
      return {
        success: false,
        message: 'スライドコンテンツが提供されていません。htmlContentまたはslidesArrayを指定してください。',
      };
    }

    // スタート位置の調整（範囲外の場合は1に設定）
    const validStartSlide = startSlide && startSlide > 0 && startSlide <= slideCount 
      ? startSlide 
      : 1;
    
    return {
      success: true,
      message: `プレゼンテーション「${title || '無題のプレゼンテーション'}」のプレビューを表示します。${slideCount > 1 ? `（全${slideCount}枚）` : ''}`,
      htmlContent: slides.length === 1 ? slides[0] : null,
      slidesArray: slides.length > 1 ? slides : null,
      slideCount,
      title: title || '無題のプレゼンテーション',
      autoOpen: autoOpen ?? true,
      showSlideControls: showSlideControls ?? true,
      startSlide: validStartSlide,
      theme: theme || 'light'
    };
  },
}); 