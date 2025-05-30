import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { chromium } from 'playwright-core';

// Browserbase SDKの動的インポート
let Browserbase: any;

// アクションタイプの列挙型（拡張版）
const ActionTypeEnum = z.enum([
  'navigate', 
  'screenshot', 
  'click', 
  'type', 
  'scroll', 
  'wait', 
  'get_title', 
  'get_text',
  'solve_captcha',
  'custom_script',
  'multi_action'
]);

// カスタムスクリプトの型定義
const CustomScriptSchema = z.object({
  script: z.string().describe('実行するJavaScriptコード'),
  waitForResult: z.boolean().optional().default(false).describe('スクリプトの結果を待機するかどうか'),
  timeout: z.number().optional().default(30000).describe('スクリプト実行のタイムアウト（ミリ秒）'),
});

// 複数アクションの型定義
const MultiActionSchema = z.object({
  actions: z.array(z.object({
    action: ActionTypeEnum,
    selector: z.string().optional(),
    text: z.string().optional(),
    waitTime: z.number().optional(),
    scrollDistance: z.number().optional(),
  })).describe('順次実行するアクションのリスト'),
});

// 入力スキーマを定義（拡張版）
const browserbaseToolInputSchema = z.object({
  url: z.string().describe('訪問するURL'),
  action: ActionTypeEnum.optional().default('navigate').describe('実行するアクション'),
  selector: z.string().optional().describe('操作対象の要素セレクタ（click, type, get_textアクションで使用）'),
  text: z.string().optional().describe('入力するテキスト（typeアクションで使用）'),
  waitTime: z.number().min(1000).max(120000).optional().default(3000).describe('待機時間（ミリ秒、waitアクションで使用）'),
  scrollDistance: z.number().optional().default(500).describe('スクロール距離（scrollアクションで使用）'),
  projectId: z.string().optional().describe('BrowserbaseプロジェクトID（環境変数から取得される場合は省略可能）'),
  autoOpenPreview: z.boolean().optional().default(true).describe('操作完了後に自動的にプレビューパネルを開くかどうか'),
  
  // CAPTCHA解決用オプション
  captchaTimeout: z.number().optional().default(60000).describe('CAPTCHA解決のタイムアウト（ミリ秒）'),
  enableCaptchaSolver: z.boolean().optional().default(false).describe('CAPTCHAソルバーを有効にするかどうか'),
  
  // カスタムスクリプト用オプション
  customScript: CustomScriptSchema.optional().describe('カスタムJavaScriptスクリプトの設定'),
  
  // 複数アクション用オプション
  multiActions: MultiActionSchema.optional().describe('複数アクションの設定'),
  
  // 高度な設定
  enableProxies: z.boolean().optional().default(false).describe('プロキシを有効にするかどうか'),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional().default('domcontentloaded').describe('ページ読み込み完了の判定基準'),
});

// 出力スキーマを定義（拡張版）
const browserbaseToolOutputSchema = z.object({
  sessionId: z.string().describe('Browserbaseセッション ID'),
  replayUrl: z.string().describe('セッションリプレイを表示するURL'),
  liveViewUrl: z.string().optional().describe('リアルタイムセッション表示URL（セッション実行中のみ利用可能）'),
  screenshot: z.object({
    url: z.string().describe('スクリーンショット画像のURL'),
    path: z.string().describe('スクリーンショット画像のファイルパス'),
  }).optional().describe('スクリーンショット情報（screenshotアクションまたは自動取得時）'),
  pageTitle: z.string().optional().describe('ページタイトル（get_titleアクションまたは自動取得時）'),
  elementText: z.string().optional().describe('要素のテキスト（get_textアクションで取得）'),
  success: z.boolean().describe('操作が成功したかどうか'),
  message: z.string().describe('操作結果を説明するメッセージ'),
  autoOpenPreview: z.boolean().optional().describe('自動的にプレビューパネルを開くかどうか'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  toolName: z.string().optional().describe('表示目的のツール名'),
  toolDisplayName: z.string().optional().describe('ユーザーフレンドリーなツール名'),
  markdownContent: z.string().optional().describe('チャット表示用のマークダウン形式のコンテンツ'),
  
  // 拡張結果
  captchaSolved: z.boolean().optional().describe('CAPTCHAが解決されたかどうか'),
  scriptResult: z.any().optional().describe('カスタムスクリプトの実行結果'),
  executedActions: z.array(z.string()).optional().describe('実行されたアクションのリスト'),
  consoleMessages: z.array(z.string()).optional().describe('キャプチャされたコンソールメッセージ'),
});

// 入力と出力の型を定義
type InputType = z.infer<typeof browserbaseToolInputSchema>;
type OutputType = z.infer<typeof browserbaseToolOutputSchema>;

// Browserbase SDKの設定
const configureBrowserbaseApi = async () => {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  const projectId = process.env.BROWSERBASE_PROJECT_ID;
  
  if (!apiKey || !projectId) {
    return { configured: false, apiKey: !!apiKey, projectId: !!projectId };
  }

  try {
    // 動的インポート
    const { default: BrowserbaseSDK } = await import('@browserbasehq/sdk');
    Browserbase = BrowserbaseSDK;
    return { configured: true, apiKey: true, projectId: true };
  } catch (error) {
    console.error('[BrowserbaseTool] Failed to import Browserbase SDK:', error);
    return { configured: false, apiKey: true, projectId: true, importError: true };
  }
};

// アクション実行関数
async function executeAction(page: any, action: string, options: {
  selector?: string;
  text?: string;
  waitTime?: number;
  scrollDistance?: number;
  captchaTimeout?: number;
  customScript?: any;
  multiActions?: any;
  imagesDir: string;
  executedActions: string[];
}) {
  const { selector, text, waitTime, scrollDistance, captchaTimeout, customScript, multiActions, imagesDir, executedActions } = options;
  let screenshotInfo: { url: string; path: string } | undefined;
  let elementText: string | undefined;
  let scriptResult: any = undefined;

  switch (action) {
    case 'navigate':
      break;

    case 'screenshot':
      const screenshotName = `browserbase_${uuidv4()}.png`;
      const screenshotPath = path.join(imagesDir, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      screenshotInfo = {
        url: `/generated-images/${screenshotName}`,
        path: screenshotPath,
      };
      executedActions.push('screenshot');
      break;

    case 'click':
      if (!selector) throw new Error('Selector is required for click action');
      await page.click(selector);
      executedActions.push('click');
      break;

    case 'type':
      if (!selector || !text) throw new Error('Selector and text are required for type action');
      await page.fill(selector, text);
      executedActions.push('type');
      break;

    case 'scroll':
      await page.evaluate((distance: number) => window.scrollBy(0, distance), scrollDistance);
      executedActions.push('scroll');
      break;

    case 'wait':
      await page.waitForTimeout(waitTime);
      executedActions.push('wait');
      break;

    case 'get_title':
      executedActions.push('get_title');
      break;

    case 'get_text':
      if (!selector) throw new Error('Selector is required for get_text action');
      elementText = await page.textContent(selector) || undefined;
      executedActions.push('get_text');
      break;

    case 'solve_captcha':
      await page.evaluate(() => {
        // @ts-ignore
        window.captchaSolvingFinished = false;
      });
      try {
        await page.waitForFunction(() => {
          // @ts-ignore
          return window.captchaSolvingFinished === true;
        }, { timeout: captchaTimeout || 60000 });
      } catch (timeoutError) {
        console.warn('[BrowserbaseTool] CAPTCHA solving timeout');
      }
      executedActions.push('solve_captcha');
      break;

    case 'custom_script':
      if (customScript && customScript.script) {
        try {
          if (customScript.waitForResult) {
            scriptResult = await page.evaluate(customScript.script);
          } else {
            await page.evaluate(customScript.script);
          }
        } catch (scriptError) {
          throw new Error(`Custom script execution failed: ${scriptError}`);
        }
      }
      executedActions.push('custom_script');
      break;

    case 'multi_action':
      if (multiActions && multiActions.actions) {
        for (const subAction of multiActions.actions) {
          await executeAction(page, subAction.action, {
            selector: subAction.selector,
            text: subAction.text,
            waitTime: subAction.waitTime,
            scrollDistance: subAction.scrollDistance,
            captchaTimeout,
            customScript,
            multiActions: undefined,
            imagesDir,
            executedActions,
          });
        }
      }
      break;
  }

  // 自動スクリーンショット
  if (!['screenshot', 'get_title', 'get_text', 'wait'].includes(action)) {
    const autoScreenshotName = `browserbase_auto_${uuidv4()}.png`;
    const autoScreenshotPath = path.join(imagesDir, autoScreenshotName);
    await page.screenshot({ path: autoScreenshotPath, fullPage: true });
    screenshotInfo = {
      url: `/generated-images/${autoScreenshotName}`,
      path: autoScreenshotPath,
    };
  }

  return { screenshotInfo, elementText, scriptResult };
}

// マークダウンコンテンツ生成関数
function generateMarkdownContent(params: {
  url: string;
  action: string;
  pageTitle?: string;
  elementText?: string;
  captchaSolved: boolean;
  executedActions: string[];
  session: any;
  liveViewUrl?: string;
  replayUrl: string;
  screenshotInfo?: { url: string; path: string };
}): string {
  const { url, action, pageTitle, elementText, captchaSolved, executedActions, session, liveViewUrl, replayUrl, screenshotInfo } = params;

  let markdownContent = `## 🌐 ブラウザ自動化完了\n\n`;
  markdownContent += `**📋 実行結果:**\n`;
  markdownContent += `- **URL:** ${url}\n`;
  markdownContent += `- **メインアクション:** \`${action}\`\n`;
  if (pageTitle) markdownContent += `- **ページタイトル:** ${pageTitle}\n`;
  if (elementText) markdownContent += `- **取得テキスト:** ${elementText}\n`;
  if (executedActions.length > 0) markdownContent += `- **実行されたアクション:** ${executedActions.join(', ')}\n`;
  if (captchaSolved) markdownContent += `- **CAPTCHA解決:** ✅ 成功\n`;
  markdownContent += `- **セッションID:** \`${session.id}\`\n\n`;

  if (liveViewUrl) {
    markdownContent += `🔴 **ライブビュー:** [リアルタイム表示](${liveViewUrl})\n`;
  }
  markdownContent += `🎬 **セッションリプレイ:** [操作記録を表示](${replayUrl})\n\n`;

  if (screenshotInfo) {
    markdownContent += `📸 **スクリーンショット:** 操作後の画面をキャプチャしました\n\n`;
  }

  if (action === 'solve_captcha' || captchaSolved) {
    markdownContent += `🔐 **CAPTCHA解決機能:**\n`;
    markdownContent += `- 自動CAPTCHA解決が${captchaSolved ? '成功' : '実行'}されました\n\n`;
  }

  markdownContent += `✅ ブラウザ操作が正常に完了しました。\n`;
  markdownContent += `*セッション: ${session.id} | 実行時刻: ${new Date().toLocaleString('ja-JP')}*`;

  return markdownContent;
}

export const browserbaseTool = createTool({
  id: 'browserbase-automation',
  description:
    'Browserbaseを使用してクラウド上でブラウザを自動化します。Webページの訪問、スクリーンショット取得、要素操作、テキスト入力、CAPTCHA解決、カスタムスクリプト実行などが可能です。セッションリプレイ機能により操作内容を後から確認できます。',
  inputSchema: browserbaseToolInputSchema,
  outputSchema: browserbaseToolOutputSchema,
  execute: async ({ context }) => {
    const { 
      url, action, selector, text, waitTime, scrollDistance, projectId, autoOpenPreview,
      captchaTimeout, enableCaptchaSolver, customScript, multiActions, enableProxies, waitUntil
    } = context;

    console.log('[BrowserbaseTool] Received input:');
    console.log(`[BrowserbaseTool] URL: "${url}"`);
    console.log(`[BrowserbaseTool] Action: ${action}`);
    console.log(`[BrowserbaseTool] Selector: ${selector || 'N/A'}`);
    console.log(`[BrowserbaseTool] CAPTCHA Solver: ${enableCaptchaSolver}`);

    // 結果を格納する変数
    let pageTitle: string | undefined;
    let elementText: string | undefined;
    let screenshotInfo: { url: string; path: string } | undefined;
    let liveViewUrl: string | undefined;
    let captchaSolved: boolean = false;
    let scriptResult: any = undefined;
    let executedActions: string[] = [];
    let consoleMessages: string[] = [];

    try {
      // API設定の確認
      const apiConfig = await configureBrowserbaseApi();
      if (!apiConfig.configured) {
        let errorMessage = 'Browserbase configuration error: ';
        if (apiConfig.importError) {
          errorMessage += 'Failed to import @browserbasehq/sdk. Please install it with: npm install @browserbasehq/sdk playwright-core';
        } else if (!apiConfig.apiKey) {
          errorMessage += 'BROWSERBASE_API_KEY is not set.';
        } else if (!apiConfig.projectId) {
          errorMessage += 'BROWSERBASE_PROJECT_ID is not set.';
        }

        return {
          sessionId: '',
          replayUrl: '',
          success: false,
          message: errorMessage,
          autoOpenPreview: false,
          error: errorMessage,
          toolName: 'browserbase-automation',
          toolDisplayName: 'Browserbase ブラウザ自動化',
        };
      }

      // スクリーンショット保存先ディレクトリの確保
      const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
      if (!fs.existsSync(imagesDir)) {
        try {
          fs.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error('[BrowserbaseTool] Failed to create images directory:', dirError);
          return {
            sessionId: '',
            replayUrl: '',
            success: false,
            message: 'Failed to create images directory.',
            autoOpenPreview: false,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            toolName: 'browserbase-automation',
            toolDisplayName: 'Browserbase ブラウザ自動化',
          };
        }
      }

      console.log('[BrowserbaseTool] Creating Browserbase session...');

      // Browserbase クライアントの初期化
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      });

      // セッション設定
      const sessionConfig: any = {
        projectId: projectId || process.env.BROWSERBASE_PROJECT_ID!,
      };

      // CAPTCHA解決またはプロキシが有効な場合の設定
      if (enableCaptchaSolver || enableProxies || action === 'solve_captcha') {
        sessionConfig.browserSettings = {
          solveCaptchas: enableCaptchaSolver || action === 'solve_captcha',
        };
        if (enableProxies) {
          sessionConfig.proxies = true;
        }
      }

      // セッションの作成
      const session = await bb.sessions.create(sessionConfig);
      console.log(`[BrowserbaseTool] Session created: ${session.id}`);

      // ブラウザに接続
      const browser = await chromium.connectOverCDP(session.connectUrl);
      const context = browser.contexts()[0];
      const page = context.pages()[0];

      try {
        // コンソールメッセージの監視
        page.on('console', (msg) => {
          const message = msg.text();
          consoleMessages.push(message);
          console.log(`[BrowserbaseTool] Console: ${message}`);
          
          // CAPTCHA解決の監視
          if (message === 'browserbase-solving-started') {
            console.log('[BrowserbaseTool] CAPTCHA solving started...');
          } else if (message === 'browserbase-solving-finished') {
            captchaSolved = true;
            console.log('[BrowserbaseTool] CAPTCHA solving finished!');
          }
        });

        // 基本的なページ移動
        console.log(`[BrowserbaseTool] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: waitUntil as any, timeout: 30000 });
        executedActions.push('navigate');

        // ページタイトルを取得
        pageTitle = await page.title();
        console.log(`[BrowserbaseTool] Page title: ${pageTitle}`);

        // Live View URLを取得（セッション実行中）
        try {
          const liveViewLinks = await bb.sessions.debug(session.id);
          liveViewUrl = liveViewLinks.debuggerFullscreenUrl;
          console.log(`[BrowserbaseTool] Live View URL: ${liveViewUrl}`);
        } catch (liveViewError) {
          console.warn('[BrowserbaseTool] Failed to get live view URL:', liveViewError);
        }

        // アクションに応じた処理
        const actionResult = await executeAction(page, action, {
          selector, text, waitTime, scrollDistance, captchaTimeout, 
          customScript, multiActions, imagesDir, executedActions
        });

        // アクション結果を反映
        if (actionResult.screenshotInfo) {
          screenshotInfo = actionResult.screenshotInfo;
        }
        if (actionResult.elementText) {
          elementText = actionResult.elementText;
        }
        if (actionResult.scriptResult) {
          scriptResult = actionResult.scriptResult;
        }

      } finally {
        // ブラウザセッションを終了
        await page.close();
        await browser.close();

        // セッションを終了
        try {
          await bb.sessions.update(session.id, {
            status: "REQUEST_RELEASE",
            projectId: projectId || process.env.BROWSERBASE_PROJECT_ID!,
          });
        } catch (updateError) {
          console.warn('[BrowserbaseTool] Failed to update session status:', updateError);
        }
      }

      // リプレイURLの生成
      const replayUrl = `https://browserbase.com/sessions/${session.id}`;

      // マークダウンコンテンツの生成
      let markdownContent = generateMarkdownContent({
        url, action, pageTitle, elementText, captchaSolved, 
        executedActions, session, liveViewUrl, replayUrl, screenshotInfo
      });

      return {
        sessionId: session.id,
        replayUrl,
        liveViewUrl,
        screenshot: screenshotInfo,
        pageTitle,
        elementText,
        success: true,
        message: markdownContent,
        autoOpenPreview: autoOpenPreview ?? true,
        toolName: 'browserbase-automation',
        toolDisplayName: 'Browserbase ブラウザ自動化',
        markdownContent,
        captchaSolved,
        scriptResult,
        executedActions,
        consoleMessages,
      };

    } catch (error: any) {
      console.error('[BrowserbaseTool] Error during browser automation:', error.message);
      
      let errorMessage = 'Unknown error occurred during browser automation.';
      
      if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
        errorMessage = `Network error: Could not resolve hostname for URL: ${url}`;
      } else if (error.message.includes('Timeout')) {
        errorMessage = `Timeout error: Page took too long to load: ${url}`;
      } else if (error.message.includes('Selector')) {
        errorMessage = `Selector error: Could not find element with selector: ${selector}`;
      } else if (error.response) {
        errorMessage = `API Error: ${error.response.status || ''} - ${error.response.data?.error || error.message}`;
      } else if (error.request) {
        errorMessage = 'Network error: No response received from Browserbase API.';
      } else {
        errorMessage = `Browser automation error: ${error.message}`;
      }
      
      return {
        sessionId: '',
        replayUrl: '',
        success: false,
        message: `Failed to execute browser automation: ${errorMessage}`,
        autoOpenPreview: false,
        error: errorMessage,
        toolName: 'browserbase-automation',
        toolDisplayName: 'Browserbase ブラウザ自動化',
        executedActions,
        consoleMessages,
      };
    }
  },
}); 