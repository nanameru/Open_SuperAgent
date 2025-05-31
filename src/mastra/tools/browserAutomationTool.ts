import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Stagehandとブラウザベースの動的インポート（サーバーサイドでのみ使用）
let Stagehand: any;
let Browserbase: any;

// 動的インポート関数
async function importStagehandDependencies() {
  if (typeof window === 'undefined') {
    // サーバーサイドでのみインポート
    try {
      const stagehandModule = await import('@browserbasehq/stagehand');
      Stagehand = stagehandModule.Stagehand;
      
      await import("@browserbasehq/sdk/shims/web");
      const browserbaseModule = await import("@browserbasehq/sdk");
      Browserbase = browserbaseModule.default;
      
      return true;
    } catch (error) {
      console.error('[BrowserAutomationTool] Failed to import dependencies:', error);
      return false;
    }
  }
  return false;
}

// 入力スキーマを定義
const browserAutomationToolInputSchema = z.object({
  task: z.string().describe('ブラウザ自動化で実行したいタスクの詳細な説明'),
  url: z.string().optional().describe('開始URL（指定されない場合はタスクから推測）'),
  context: z.string().optional().describe('タスク実行に必要な追加のコンテキスト情報'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('タスクの優先度'),
  timeout: z.number().optional().default(120000).describe('タスク実行のタイムアウト（ミリ秒）'),
  takeScreenshots: z.boolean().optional().default(true).describe('スクリーンショットを取得するかどうか'),
});

// 出力スキーマを定義
const browserAutomationToolOutputSchema = z.object({
  success: z.boolean().describe('タスクが成功したかどうか'),
  result: z.string().describe('タスク実行の結果'),
  screenshots: z.array(z.string()).optional().describe('取得されたスクリーンショットのURL一覧'),
  extractedData: z.any().optional().describe('Webページから抽出されたデータ'),
  sessionInfo: z.object({
    sessionId: z.string().optional(),
    replayUrl: z.string().optional(),
    liveViewUrl: z.string().optional(),
  }).optional().describe('ブラウザセッション情報'),
  executionTime: z.number().describe('実行時間（ミリ秒）'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  markdownContent: z.string().optional().describe('チャット表示用のマークダウン形式のコンテンツ'),
  // Browserbase互換の情報
  sessionId: z.string().optional().describe('ブラウザセッションID'),
  replayUrl: z.string().optional().describe('セッションリプレイURL'),
  liveViewUrl: z.string().optional().describe('ライブビューURL'),
  pageTitle: z.string().optional().describe('現在のページタイトル'),
  autoOpenPreview: z.boolean().optional().describe('プレビューを自動で開くかどうか'),
});

// 型定義
type InputType = z.infer<typeof browserAutomationToolInputSchema>;
type OutputType = z.infer<typeof browserAutomationToolOutputSchema>;

// Browserbase SDKの設定
const configureBrowserbaseApi = async () => {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  
  if (!apiKey || !projectId) {
    return { configured: false, apiKey: !!apiKey, projectId: !!projectId };
  }

  try {
    // Stagehandとブラウザベースの依存関係を動的にインポート
    const imported = await importStagehandDependencies();
    return { configured: imported, apiKey: true, projectId: true };
  } catch (error) {
    console.error('[BrowserAutomationTool] Failed to import Stagehand dependencies:', error);
    return { configured: false, apiKey: true, projectId: true, importError: true };
  }
};

// マークダウンコンテンツ生成関数
function generateMarkdownContent(params: {
  task: string;
  success: boolean;
  result: string;
  screenshots?: string[];
  extractedData?: any;
  sessionInfo?: any;
  executionTime: number;
  error?: string;
  pageTitle?: string;
}): string {
  const { task, success, result, screenshots, extractedData, sessionInfo, executionTime, error, pageTitle } = params;
  
  let markdown = `# 🤖 ブラウザ自動化実行結果\n\n`;
  
  // タスク情報
  markdown += `## 📋 実行タスク\n`;
  markdown += `${task}\n\n`;
  
  // 実行結果
  markdown += `## ${success ? '✅' : '❌'} 実行結果\n`;
  markdown += `**ステータス**: ${success ? '成功' : '失敗'}\n`;
  markdown += `**実行時間**: ${(executionTime / 1000).toFixed(2)}秒\n`;
  if (pageTitle) markdown += `**ページタイトル**: ${pageTitle}\n`;
  markdown += `\n`;
  
  if (success) {
    markdown += `### 📊 結果詳細\n`;
    markdown += `${result}\n\n`;
    
    // スクリーンショット
    if (screenshots && screenshots.length > 0) {
      markdown += `### 📸 取得スクリーンショット\n`;
      screenshots.forEach((screenshot, index) => {
        markdown += `![スクリーンショット ${index + 1}](${screenshot})\n\n`;
      });
    }
    
    // 抽出データ
    if (extractedData) {
      markdown += `### 📄 抽出データ\n`;
      markdown += `\`\`\`json\n${JSON.stringify(extractedData, null, 2)}\n\`\`\`\n\n`;
    }
    
    // セッション情報
    if (sessionInfo) {
      markdown += `### 🔗 セッション情報\n`;
      if (sessionInfo.replayUrl) {
        markdown += `- [セッションリプレイを表示](${sessionInfo.replayUrl})\n`;
      }
      if (sessionInfo.liveViewUrl) {
        markdown += `- [ライブビューを表示](${sessionInfo.liveViewUrl})\n`;
      }
      markdown += `\n`;
    }
  } else {
    markdown += `### ❌ エラー詳細\n`;
    markdown += `${error || 'Unknown error occurred'}\n\n`;
  }
  
  return markdown;
}

// ツールを作成
export const browserAutomationTool = createTool({
  id: 'browser-automation-tool',
  description: 'Stagehand + Browserbaseを使用してクラウド上でブラウザを自動化します。AI駆動のブラウザ操作により、自然言語での指示でWebページの操作、データ抽出、スクリーンショット取得などが可能です。',
  inputSchema: browserAutomationToolInputSchema,
  outputSchema: browserAutomationToolOutputSchema,
  execute: async ({ context }: { context: InputType }): Promise<OutputType> => {
    const startTime: number = Date.now();
    
    try {
      const { task, url, context: additionalContext, priority, timeout, takeScreenshots } = context;
      
      console.log('[BrowserAutomationTool] Starting browser automation task:', task);
      
      // API設定の確認
      const apiConfig = await configureBrowserbaseApi();
      if (!apiConfig.configured) {
        let errorMessage = 'Browser automation configuration error: ';
        if (apiConfig.importError) {
          errorMessage += 'Failed to import @browserbasehq/stagehand or @browserbasehq/sdk. Please install them with: npm install @browserbasehq/stagehand @browserbasehq/sdk';
        } else if (!apiConfig.apiKey) {
          errorMessage += 'BROWSERBASE_API_KEY is not set.';
        } else if (!apiConfig.projectId) {
          errorMessage += 'BROWSERBASE_PROJECT_ID is not set.';
        }

        return {
          success: false,
          result: 'Failed to configure browser automation',
          executionTime: Date.now() - startTime,
          error: errorMessage,
          markdownContent: generateMarkdownContent({
            task,
            success: false,
            result: 'Failed to configure browser automation',
            executionTime: Date.now() - startTime,
            error: errorMessage,
          }),
        };
      }

      // スクリーンショット保存先ディレクトリの確保
      const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
      if (!fs.existsSync(imagesDir)) {
        try {
          fs.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error('[BrowserAutomationTool] Failed to create images directory:', dirError);
          return {
            success: false,
            result: 'Failed to create images directory',
            executionTime: Date.now() - startTime,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            markdownContent: generateMarkdownContent({
              task,
              success: false,
              result: 'Failed to create images directory',
              executionTime: Date.now() - startTime,
              error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            }),
          };
        }
      }

      // 必要な環境変数の確認
      if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
        throw new Error('BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID environment variables are required');
      }

      // Gemini APIキーの確認
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!geminiApiKey) {
        throw new Error('GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is required for Stagehand');
      }

      // Browserbase クライアントの初期化
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
        fetch: globalThis.fetch,
      });

      // セッション設定
      const sessionConfig: any = {
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        keepAlive: true,
        timeout: Math.floor(timeout / 1000), // 秒に変換
      };

      // セッションの作成
      const session = await bb.sessions.create(sessionConfig);
      console.log(`[BrowserAutomationTool] Session created: ${session.id}`);

      // Stagehandの初期化
      const stagehand = new Stagehand({
        browserbaseSessionID: session.id,
        env: "BROWSERBASE",
        modelName: "google/gemini-2.0-flash",
        modelClientOptions: {
          apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
        },
        apiKey: process.env.BROWSERBASE_API_KEY,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        disablePino: true,
      });

      await stagehand.init();
      const page = stagehand.page;

      let pageTitle: string | undefined;
      let screenshots: string[] = [];
      let extractedData: any = undefined;
      let liveViewUrl: string | undefined;

      try {
        // Live View URLを取得
        try {
          const liveViewLinks = await bb.sessions.debug(session.id);
          liveViewUrl = liveViewLinks.debuggerFullscreenUrl;
          console.log(`[BrowserAutomationTool] Live View URL: ${liveViewUrl}`);
        } catch (liveViewError) {
          console.warn('[BrowserAutomationTool] Failed to get live view URL:', liveViewError);
        }

        // URLが指定されている場合はナビゲート
        if (url) {
          console.log(`[BrowserAutomationTool] Navigating to: ${url}`);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          pageTitle = await page.title();
        }

        // タスクを構築
        let fullTask: string = task;
        if (additionalContext) {
          fullTask += `\n\n追加コンテキスト: ${additionalContext}`;
        }

        // Stagehandを使用してタスクを実行
        console.log(`[BrowserAutomationTool] Executing task with Stagehand: ${fullTask}`);
        const taskResult = await page.act(fullTask);
        
        // ページタイトルを取得（まだ取得していない場合）
        if (!pageTitle) {
          try {
            pageTitle = await page.title();
          } catch (e) {
            console.warn('[BrowserAutomationTool] Failed to get page title:', e);
          }
        }

        // スクリーンショットを取得
        if (takeScreenshots) {
          const screenshotName = `browser_automation_${uuidv4()}.png`;
          const screenshotPath = path.join(imagesDir, screenshotName);
          await page.screenshot({ path: screenshotPath, fullPage: true });
          screenshots.push(`/generated-images/${screenshotName}`);
        }

        // データ抽出を試行
        try {
          const extractionResult = await page.extract('Extract any relevant data from this page');
          if (extractionResult && extractionResult.extraction) {
            extractedData = extractionResult.extraction;
          }
        } catch (extractError) {
          console.warn('[BrowserAutomationTool] Data extraction failed:', extractError);
        }

      } finally {
        // Stagehandセッションを終了
        await stagehand.close();
        console.log(`[BrowserAutomationTool] Session ${session.id} completed`);
      }

      const executionTime: number = Date.now() - startTime;
      const replayUrl = `https://browserbase.com/sessions/${session.id}`;

      const resultData: OutputType = {
        success: true,
        result: `ブラウザ自動化タスクが正常に完了しました。${pageTitle ? `ページ: ${pageTitle}` : ''}`,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
        extractedData,
        sessionInfo: {
          sessionId: session.id,
          replayUrl,
          liveViewUrl,
        },
        executionTime,
        // Browserbase互換の情報
        sessionId: session.id,
        replayUrl,
        liveViewUrl,
        pageTitle,
        autoOpenPreview: true,
        markdownContent: generateMarkdownContent({
          task,
          success: true,
          result: `ブラウザ自動化タスクが正常に完了しました。${pageTitle ? `ページ: ${pageTitle}` : ''}`,
          screenshots: screenshots.length > 0 ? screenshots : undefined,
          extractedData,
          sessionInfo: {
            sessionId: session.id,
            replayUrl,
            liveViewUrl,
          },
          executionTime,
          pageTitle,
        }),
      };
      
      return resultData;
      
    } catch (error) {
      const executionTime: number = Date.now() - startTime;
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error occurred';
      
      console.error('[BrowserAutomationTool] Error during browser automation:', errorMessage);
      
      const resultData: OutputType = {
        success: false,
        result: 'タスクの実行中にエラーが発生しました',
        executionTime,
        error: errorMessage,
        markdownContent: generateMarkdownContent({
          task: context.task,
          success: false,
          result: 'タスクの実行中にエラーが発生しました',
          executionTime,
          error: errorMessage,
        }),
      };
      
      return resultData;
    }
  },
}); 