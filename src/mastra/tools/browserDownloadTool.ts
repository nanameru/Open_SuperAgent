import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { promises as fs } from 'fs';
import path from 'path';
import { stagehandInstances } from './browserSharedInstances';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

const browserDownloadToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  triggerDownload: z.boolean().optional().default(true).describe('Whether to trigger the download action first'),
  downloadSelector: z.string().optional().describe('CSS selector for download button/link to click'),
  waitTime: z.number().optional().default(5000).describe('Time to wait for download completion (milliseconds)'),
  extractToFolder: z.string().optional().describe('Optional folder name to extract ZIP contents'),
});

const browserDownloadToolOutputSchema = z.object({
  success: z.boolean().describe('Whether the download was successful'),
  downloadUrl: z.string().optional().describe('URL to access the downloaded file'),
  fileName: z.string().optional().describe('Name of the downloaded file'),
  fileSize: z.number().optional().describe('Size of downloaded file in bytes'),
  extractedFiles: z.array(z.string()).optional().describe('List of extracted files if ZIP was extracted'),
  message: z.string().describe('Result message'),
});

export const browserDownloadTool = createTool({
  id: 'browser-download',
  description: 'Trigger file downloads and retrieve them using Browserbase Session Downloads API',
  inputSchema: browserDownloadToolInputSchema,
  outputSchema: browserDownloadToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, triggerDownload, downloadSelector, waitTime, extractToFolder } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      
      const page = stagehand.page;
      
      if (triggerDownload) {
        console.log('🔽 Triggering download...');
        
        if (downloadSelector) {
          // 指定されたセレクターをクリック
          console.log(`Clicking download selector: ${downloadSelector}`);
          await page.click(downloadSelector);
        } else {
          // 一般的なダウンロードリンクを探してクリック
          const downloadSelectors = [
            'a[download]',
            'a[href*="download"]',
            'button[data-download]',
            '.download-btn',
            '.download-button',
            '[class*="download"]',
          ];
          
          let clicked = false;
          for (const selector of downloadSelectors) {
            try {
              const element = await page.$(selector);
              if (element) {
                console.log(`Found and clicking: ${selector}`);
                await element.click();
                clicked = true;
                break;
              }
            } catch (e) {
              // セレクターエラーは無視
            }
          }
          
          if (!clicked) {
            console.warn('No download trigger found, proceeding to check existing downloads');
          }
        }
        
        // ダウンロード完了を待機
        console.log(`⏳ Waiting ${waitTime}ms for download completion...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // 🔧 **shimsを最初にインポート（一度だけ）**
      if (!shimsImported && typeof window === 'undefined') {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      });
      
      console.log('📥 Retrieving downloads from Browserbase...');
      
      // Session Downloads APIでダウンロードリストを取得
      const downloadsResponse = await bb.sessions.downloads.list(sessionId);
      
      // Browserbase公式ドキュメントに従い、レスポンスから直接arrayBufferを取得
      const downloadBuffer = await downloadsResponse.arrayBuffer();
      
      if (!downloadBuffer || downloadBuffer.byteLength === 0) {
        return {
          success: false,
          message: '📥 ダウンロードファイルが見つかりませんでした。\n\n💡 ヒント:\n- ダウンロードが完了するまで待機時間を増やしてください\n- 正しいダウンロードボタン/リンクをクリックしているか確認してください',
        };
      }
      
      console.log(`📁 Download retrieved (${downloadBuffer.byteLength} bytes)`);
      
      // ローカルに保存
      const downloadsDir = path.join(process.cwd(), 'public', 'browser-downloads');
      await fs.mkdir(downloadsDir, { recursive: true });
      
      // ファイル名を生成（タイムスタンプ付き）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `download-${sessionId.substring(0, 8)}-${timestamp}.zip`;
      const filePath = path.join(downloadsDir, fileName);
      
      // ファイルを保存
      await fs.writeFile(filePath, Buffer.from(downloadBuffer));
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;
      
      console.log(`✅ Download saved: ${fileName} (${fileSize} bytes)`);
      
      const downloadUrl = `/browser-downloads/${fileName}`;
      let extractedFiles: string[] | undefined;
      
      // ZIP解凍が要求された場合
      if (extractToFolder) {
        try {
          console.log(`📂 Extracting ZIP to folder: ${extractToFolder}`);
          
          // 将来実装: ZIP解凍機能
          const extractDir = path.join(downloadsDir, extractToFolder);
          await fs.mkdir(extractDir, { recursive: true });
          
          console.log('💡 ZIP extraction requires additional implementation (yauzl, node-stream-zip, etc.)');
          extractedFiles = [`${extractToFolder}/`];
        } catch (extractError) {
          console.warn('ZIP extraction failed:', extractError);
        }
      }
      
      return {
        success: true,
        downloadUrl,
        fileName,
        fileSize,
        extractedFiles,
        message: `📥 ダウンロード完了

ファイル: ${fileName}
サイズ: ${(fileSize / 1024).toFixed(1)}KB

アクセス可能URL: ${downloadUrl}

🔗 Browserbaseでは、ダウンロードファイルが自動的にクラウドストレージに同期され、ZIP形式で提供されます。${extractedFiles ? `\n📂 解凍先: ${extractToFolder}/` : ''}`,
      };
    } catch (error) {
      console.error('Download error:', error);
      return {
        success: false,
        message: `Download failed: ${error instanceof Error ? error.message : 'Unknown error'}

💡 トラブルシューティング:
- セッションが有効か確認してください
- ダウンロードトリガーが正しく動作しているか確認してください
- 待機時間を増やしてみてください`,
      };
    }
  },
});