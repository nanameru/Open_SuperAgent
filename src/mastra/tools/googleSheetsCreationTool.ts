import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getSheetsClient, isAuthConfigured } from './googleAuth';
import { shareFileWithUser, isValidEmail, generateEditUrlByType } from './googleDriveUtils';

const googleSheetsCreationToolInputSchema = z.object({
  title: z.string().min(1).describe('作成するスプレッドシートのタイトル'),
  shareWithEmail: z.string().email().optional().describe('ファイルを共有するメールアドレス（任意）'),
});

const googleSheetsCreationToolOutputSchema = z.object({
  success: z.boolean().describe('スプレッドシート作成が成功したかどうか'),
  message: z.string().describe('操作結果を説明するメッセージ'),
  fileId: z.string().optional().describe('作成されたスプレッドシートのファイルID'),
  editUrl: z.string().optional().describe('スプレッドシートの編集用URL'),
  title: z.string().optional().describe('作成されたスプレッドシートのタイトル'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  toolName: z.string().optional().describe('表示目的のツール名'),
  toolDisplayName: z.string().optional().describe('ユーザーフレンドリーなツール名'),
});

type InputType = z.infer<typeof googleSheetsCreationToolInputSchema>;
type OutputType = z.infer<typeof googleSheetsCreationToolOutputSchema>;

export const googleSheetsCreationTool = createTool({
  id: 'google-sheets-creation',
  description: 'Google Sheetsで新しいスプレッドシートを作成します。作成したファイルは指定されたメールアドレスと共有できます。',
  inputSchema: googleSheetsCreationToolInputSchema,
  outputSchema: googleSheetsCreationToolOutputSchema,
  execute: async ({ context }) => {
    const { title, shareWithEmail } = context;

    console.log('[GoogleSheetsTool] Received input:');
    console.log(`[GoogleSheetsTool] Title: "${title}"`);
    console.log(`[GoogleSheetsTool] Share with: ${shareWithEmail || 'None'}`);

    // 認証設定の確認
    if (!isAuthConfigured()) {
      return {
        success: false,
        message: 'Google認証が設定されていません。GOOGLE_APPLICATION_CREDENTIALS_JSON環境変数を設定してください。',
        error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.',
        toolName: 'google-sheets-creation',
        toolDisplayName: 'Google Sheets作成',
      };
    }

    // メールアドレスの検証
    if (shareWithEmail && !isValidEmail(shareWithEmail)) {
      return {
        success: false,
        message: '無効なメールアドレス形式です。',
        error: 'Invalid email address format.',
        toolName: 'google-sheets-creation',
        toolDisplayName: 'Google Sheets作成',
      };
    }

    try {
      console.log('[GoogleSheetsTool] Creating Google Sheets spreadsheet...');
      const sheets = await getSheetsClient();

      // 新しいスプレッドシートを作成
      const createResponse = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title,
          },
        },
      });

      const spreadsheetId = createResponse.data.spreadsheetId;
      if (!spreadsheetId) {
        throw new Error('Failed to get spreadsheet ID from response');
      }

      console.log(`[GoogleSheetsTool] Created spreadsheet with ID: ${spreadsheetId}`);

      // 編集用URLを生成
      const editUrl = generateEditUrlByType(spreadsheetId, 'sheets');

      // ファイル共有（メールアドレスが指定されている場合）
      if (shareWithEmail) {
        console.log(`[GoogleSheetsTool] Sharing with ${shareWithEmail}...`);
        await shareFileWithUser(spreadsheetId, shareWithEmail);
      }

      const successMessage = shareWithEmail
        ? `Google Sheetsスプレッドシート「${title}」を作成し、${shareWithEmail}と共有しました。`
        : `Google Sheetsスプレッドシート「${title}」を作成しました。`;

      return {
        success: true,
        message: successMessage,
        fileId: spreadsheetId,
        editUrl: editUrl,
        title: title,
        toolName: 'google-sheets-creation',
        toolDisplayName: 'Google Sheets作成',
      };
    } catch (error: any) {
      console.error('[GoogleSheetsTool] Error creating spreadsheet:', error);
      
      let errorMessage = 'スプレッドシートの作成中にエラーが発生しました。';
      
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
        toolName: 'google-sheets-creation',
        toolDisplayName: 'Google Sheets作成',
      };
    }
  },
});