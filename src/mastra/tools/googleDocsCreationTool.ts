import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDocsClient, isAuthConfigured } from './googleAuth';
import { shareFileWithUser, isValidEmail, generateEditUrlByType } from './googleDriveUtils';

const googleDocsCreationToolInputSchema = z.object({
  title: z.string().min(1).describe('作成するドキュメントのタイトル'),
  initialContent: z.string().optional().describe('ドキュメントの初期コンテンツ（任意）'),
  shareWithEmail: z.string().email().optional().describe('ファイルを共有するメールアドレス（任意）'),
});

const googleDocsCreationToolOutputSchema = z.object({
  success: z.boolean().describe('ドキュメント作成が成功したかどうか'),
  message: z.string().describe('操作結果を説明するメッセージ'),
  fileId: z.string().optional().describe('作成されたドキュメントのファイルID'),
  editUrl: z.string().optional().describe('ドキュメントの編集用URL'),
  title: z.string().optional().describe('作成されたドキュメントのタイトル'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  toolName: z.string().optional().describe('表示目的のツール名'),
  toolDisplayName: z.string().optional().describe('ユーザーフレンドリーなツール名'),
});

type InputType = z.infer<typeof googleDocsCreationToolInputSchema>;
type OutputType = z.infer<typeof googleDocsCreationToolOutputSchema>;

export const googleDocsCreationTool = createTool({
  id: 'google-docs-creation',
  description: 'Google Docsで新しいドキュメントを作成します。初期コンテンツを指定でき、作成したファイルは指定されたメールアドレスと共有できます。',
  inputSchema: googleDocsCreationToolInputSchema,
  outputSchema: googleDocsCreationToolOutputSchema,
  execute: async ({ context }) => {
    const { title, initialContent, shareWithEmail } = context;

    console.log('[GoogleDocsTool] Received input:');
    console.log(`[GoogleDocsTool] Title: "${title}"`);
    console.log(`[GoogleDocsTool] Initial content: ${initialContent ? 'Yes' : 'No'}`);
    console.log(`[GoogleDocsTool] Share with: ${shareWithEmail || 'None'}`);

    // 認証設定の確認
    if (!isAuthConfigured()) {
      return {
        success: false,
        message: 'Google認証が設定されていません。GOOGLE_APPLICATION_CREDENTIALS_JSON環境変数を設定してください。',
        error: 'GOOGLE_APPLICATION_CREDENTIALS_JSON is not set.',
        toolName: 'google-docs-creation',
        toolDisplayName: 'Google Docs作成',
      };
    }

    // メールアドレスの検証
    if (shareWithEmail && !isValidEmail(shareWithEmail)) {
      return {
        success: false,
        message: '無効なメールアドレス形式です。',
        error: 'Invalid email address format.',
        toolName: 'google-docs-creation',
        toolDisplayName: 'Google Docs作成',
      };
    }

    try {
      console.log('[GoogleDocsTool] Creating Google Docs document...');
      const docs = await getDocsClient();

      // 新しいドキュメントを作成
      const createResponse = await docs.documents.create({
        requestBody: {
          title: title,
        },
      });

      const documentId = createResponse.data.documentId;
      if (!documentId) {
        throw new Error('Failed to get document ID from response');
      }

      console.log(`[GoogleDocsTool] Created document with ID: ${documentId}`);

      // 初期コンテンツの挿入（指定されている場合）
      if (initialContent) {
        console.log('[GoogleDocsTool] Inserting initial content...');
        await docs.documents.batchUpdate({
          documentId: documentId,
          requestBody: {
            requests: [
              {
                insertText: {
                  location: {
                    index: 1, // ドキュメントの最初の位置
                  },
                  text: initialContent,
                },
              },
            ],
          },
        });
      }

      // 編集用URLを生成
      const editUrl = generateEditUrlByType(documentId, 'docs');

      // ファイル共有（メールアドレスが指定されている場合）
      if (shareWithEmail) {
        console.log(`[GoogleDocsTool] Sharing with ${shareWithEmail}...`);
        await shareFileWithUser(documentId, shareWithEmail);
      }

      const successMessage = shareWithEmail
        ? `Google Docsドキュメント「${title}」を作成し、${shareWithEmail}と共有しました。`
        : `Google Docsドキュメント「${title}」を作成しました。`;

      return {
        success: true,
        message: successMessage,
        fileId: documentId,
        editUrl: editUrl,
        title: title,
        toolName: 'google-docs-creation',
        toolDisplayName: 'Google Docs作成',
      };
    } catch (error: any) {
      console.error('[GoogleDocsTool] Error creating document:', error);
      
      let errorMessage = 'ドキュメントの作成中にエラーが発生しました。';
      
      if (error.response) {
        const status = error.response.status;
        const apiError = error.response.data?.error?.message || error.message;
        
        if (status === 401) {
          errorMessage = `Googleドキュメントの作成に失敗しました。Google APIへのログインが必要なため、直接ドキュメントを作成することができません。

【解決方法】
1. Google Cloud Console でAPI を有効化してください：
   - Google Docs API
   - Google Sheets API  
   - Google Slides API
   - Google Drive API

2. サービスアカウントを作成し、JSONキーをダウンロードしてください

3. 環境変数 GOOGLE_APPLICATION_CREDENTIALS_JSON を設定してください

詳細な設定手順は GOOGLE_WORKSPACE_SETUP.md ファイルをご確認ください。

技術詳細: ${apiError}`;
        } else if (status === 403) {
          errorMessage = `権限エラー: サービスアカウントに必要な権限が付与されていません。Google Cloud Console でAPI権限を確認してください。`;
        } else {
          errorMessage = `Google API Error (${status}): ${apiError}`;
        }
      } else if (error.request) {
        errorMessage = 'ネットワークエラー: APIからのレスポンスがありません。インターネット接続を確認してください。';
      } else {
        errorMessage = `設定エラー: ${error.message}`;
      }

      return {
        success: false,
        message: errorMessage,
        error: error.message,
        toolName: 'google-docs-creation',
        toolDisplayName: 'Google Docs作成',
      };
    }
  },
});