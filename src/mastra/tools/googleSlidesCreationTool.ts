import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getSlidesClient, isAuthConfigured } from './googleAuth';
import { shareFileWithUser, isValidEmail, generateEditUrlByType } from './googleDriveUtils';

const googleSlidesCreationToolInputSchema = z.object({
  title: z.string().min(1).describe('作成するプレゼンテーションのタイトル'),
  shareWithEmail: z.string().email().optional().describe('ファイルを共有するメールアドレス（任意）'),
});

const googleSlidesCreationToolOutputSchema = z.object({
  success: z.boolean().describe('プレゼンテーション作成が成功したかどうか'),
  message: z.string().describe('操作結果を説明するメッセージ'),
  fileId: z.string().optional().describe('作成されたプレゼンテーションのファイルID'),
  editUrl: z.string().optional().describe('プレゼンテーションの編集用URL'),
  title: z.string().optional().describe('作成されたプレゼンテーションのタイトル'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  toolName: z.string().optional().describe('表示目的のツール名'),
  toolDisplayName: z.string().optional().describe('ユーザーフレンドリーなツール名'),
});

type InputType = z.infer<typeof googleSlidesCreationToolInputSchema>;
type OutputType = z.infer<typeof googleSlidesCreationToolOutputSchema>;

export const googleSlidesCreationTool = createTool({
  id: 'google-slides-creation',
  description: 'Google Slidesで新しいプレゼンテーションを作成します。作成したファイルは指定されたメールアドレスと共有できます。',
  inputSchema: googleSlidesCreationToolInputSchema,
  outputSchema: googleSlidesCreationToolOutputSchema,
  execute: async ({ context }) => {
    const { title, shareWithEmail } = context;

    console.log('[GoogleSlidesTool] Received input:');
    console.log(`[GoogleSlidesTool] Title: "${title}"`);
    console.log(`[GoogleSlidesTool] Share with: ${shareWithEmail || 'None'}`);

    // 認証設定の確認
    if (!isAuthConfigured()) {
      return {
        success: false,
        message: 'Google認証が設定されていません。GOOGLE_APPLICATION_CREDENTIALS_JSON環境変数を設定してください。',
        error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.',
        toolName: 'google-slides-creation',
        toolDisplayName: 'Google Slides作成',
      };
    }

    // メールアドレスの検証
    if (shareWithEmail && !isValidEmail(shareWithEmail)) {
      return {
        success: false,
        message: '無効なメールアドレス形式です。',
        error: 'Invalid email address format.',
        toolName: 'google-slides-creation',
        toolDisplayName: 'Google Slides作成',
      };
    }

    try {
      console.log('[GoogleSlidesTool] Creating Google Slides presentation...');
      const slides = await getSlidesClient();

      // 新しいプレゼンテーションを作成
      const createResponse = await slides.presentations.create({
        requestBody: {
          title: title,
        },
      });

      const presentationId = createResponse.data.presentationId;
      if (!presentationId) {
        throw new Error('Failed to get presentation ID from response');
      }

      console.log(`[GoogleSlidesTool] Created presentation with ID: ${presentationId}`);

      // 編集用URLを生成
      const editUrl = generateEditUrlByType(presentationId, 'slides');

      // ファイル共有（メールアドレスが指定されている場合）
      if (shareWithEmail) {
        console.log(`[GoogleSlidesTool] Sharing with ${shareWithEmail}...`);
        await shareFileWithUser(presentationId, shareWithEmail);
      }

      const successMessage = shareWithEmail
        ? `Google Slidesプレゼンテーション「${title}」を作成し、${shareWithEmail}と共有しました。`
        : `Google Slidesプレゼンテーション「${title}」を作成しました。`;

      return {
        success: true,
        message: successMessage,
        fileId: presentationId,
        editUrl: editUrl,
        title: title,
        toolName: 'google-slides-creation',
        toolDisplayName: 'Google Slides作成',
      };
    } catch (error: any) {
      console.error('[GoogleSlidesTool] Error creating presentation:', error);
      
      let errorMessage = 'プレゼンテーションの作成中にエラーが発生しました。';
      
      if (error.response) {
        errorMessage = `Google API Error (${error.response.status}): ${
          error.response.data?.error?.message || error.message
        }`;
      } else if (error.request) {
        errorMessage = 'ネットワークエラー: APIからのレスポンスがありません。';
      } else {
        errorMessage = `リクエストエラー: ${error.message}`;
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        toolName: 'google-slides-creation',
        toolDisplayName: 'Google Slides作成',
      };
    }
  },
});