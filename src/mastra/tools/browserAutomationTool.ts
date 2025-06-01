import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { 
  browserAutomationAgent, 
  executeWithVerificationLoops, 
  type BrowserAutomationContext,
  type ExecutionStep,
  type VerificationResult 
} from '../agents/browserAutomationAgent';

// 🔧 **グローバルフラグ：shimsが既にインポートされたかどうか**
let shimsImported = false;

// 入力スキーマを定義
const browserAutomationToolInputSchema = z.object({
  task: z.string().describe('ブラウザ自動化で実行したいタスクの詳細な説明'),
  url: z.string().optional().describe('開始URL（指定されない場合はタスクから推測）'),
  context: z.string().optional().describe('タスク実行に必要な追加のコンテキスト情報'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('タスクの優先度'),
  timeout: z.number().optional().default(120000).describe('タスク実行のタイムアウト（ミリ秒）'),
  takeScreenshots: z.boolean().optional().default(true).describe('スクリーンショットを取得するかどうか'),
  verificationLevel: z.enum(['basic', 'standard', 'strict']).optional().default('standard').describe('検証レベル（basic: 基本検証、standard: 標準検証、strict: 厳密検証）'),
  maxRetries: z.number().optional().default(3).describe('失敗時の最大リトライ回数'),
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
  pageTitle: z.string().optional().describe('最終的なページタイトル'),
  autoOpenPreview: z.boolean().optional().describe('プレビューを自動で開くかどうか'),
  executionSteps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    status: z.enum(['success', 'failed', 'retried']),
    verificationResult: z.string().optional(),
    retryCount: z.number().optional(),
  })).optional().describe('実行ステップの詳細ログ'),
  verificationResults: z.object({
    level: z.string(),
    checks: z.array(z.object({
      type: z.string(),
      passed: z.boolean(),
      details: z.string(),
    })),
    overallScore: z.number().min(0).max(100),
  }).optional().describe('検証結果の詳細'),
});

// 型定義
type InputType = z.infer<typeof browserAutomationToolInputSchema>;
type OutputType = z.infer<typeof browserAutomationToolOutputSchema>;

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
  executionSteps?: ExecutionStep[];
  verificationResults?: VerificationResult;
}): string {
  const { task, success, result, screenshots, extractedData, sessionInfo, executionTime, error, pageTitle, executionSteps, verificationResults } = params;
  
  let markdown = `# 🤖 ブラウザ自動化実行結果\n\n`;
  
  // タスク情報
  markdown += `## 📋 実行タスク\n`;
  markdown += `${task}\n\n`;
  
  // 実行結果
  markdown += `## ${success ? '✅' : '❌'} 実行結果\n`;
  markdown += `**ステータス**: ${success ? '成功' : '失敗'}\n`;
  markdown += `**実行時間**: ${(executionTime / 1000).toFixed(2)}秒\n`;
  if (pageTitle) markdown += `**ページタイトル**: ${pageTitle}\n`;
  if (verificationResults) markdown += `**検証スコア**: ${verificationResults.overallScore}/100 (${verificationResults.level})\n`;
  markdown += `\n`;
  
  if (success) {
    markdown += `### 📊 結果詳細\n`;
    markdown += `${result}\n\n`;
    
    // 実行ステップの詳細
    if (executionSteps && executionSteps.length > 0) {
      markdown += `### 🔄 実行ステップ詳細\n`;
      executionSteps.forEach((step, index) => {
        const statusIcon = step.status === 'success' ? '✅' : step.status === 'retried' ? '🔄' : '❌';
        markdown += `${index + 1}. ${statusIcon} **${step.action}**\n`;
        markdown += `   - ステータス: ${step.status}\n`;
        if (step.retryCount > 0) markdown += `   - リトライ回数: ${step.retryCount}\n`;
        if (step.verificationResult) markdown += `   - 検証結果: ${step.verificationResult}\n`;
        markdown += `\n`;
      });
    }
    
    // 検証結果の詳細
    if (verificationResults) {
      markdown += `### 🔍 検証結果詳細\n`;
      verificationResults.checks.forEach(check => {
        const checkIcon = check.passed ? '✅' : '❌';
        markdown += `- ${checkIcon} **${check.type}**: ${check.details}\n`;
      });
      markdown += `\n`;
    }
    
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
    
    // 失敗時の実行ステップ
    if (executionSteps && executionSteps.length > 0) {
      markdown += `### 🔄 実行ステップ（失敗時）\n`;
      executionSteps.forEach((step, index) => {
        const statusIcon = step.status === 'success' ? '✅' : step.status === 'retried' ? '🔄' : '❌';
        markdown += `${index + 1}. ${statusIcon} **${step.action}**\n`;
        if (step.verificationResult) markdown += `   - ${step.verificationResult}\n`;
        markdown += `\n`;
      });
    }
  }
  
  return markdown;
}

// ツールを作成
export const browserAutomationTool = createTool({
  id: 'browser-automation-tool',
  description: `
高精度なブラウザ自動化ツール（検証ループ機能付き）

このツールは、複雑なWebブラウザ操作を自動化し、各ステップで検証ループを実行して高い精度を実現します。

主な機能:
- 🔄 **検証ループ**: 各アクションの成功を確認し、失敗時は自動リトライ
- 🎯 **多段階検証**: basic/standard/strict の3つの検証レベル
- 📊 **詳細ログ**: 実行ステップと検証結果の完全な記録
- 🔁 **インテリジェントリトライ**: 失敗原因を分析して最適なリトライ戦略を実行
- 📸 **リアルタイム監視**: スクリーンショットとライブビューでの進行状況確認

検証レベル:
- **basic**: 基本的な成功/失敗チェック
- **standard**: 要素の存在確認、ページ遷移検証、データ整合性チェック
- **strict**: 厳密な検証、複数の確認方法、データ品質保証

使用例:
- Webサイトからの情報収集（価格、在庫、ニュースなど）
- フォーム入力と送信の自動化
- 複数ページにわたるナビゲーション
- データの抽出と検証
- E2Eテストシナリオの実行

注意: このツールはBrowserbaseセッションを作成し、リアルタイムでブラウザ操作を表示します。
  `,
  inputSchema: browserAutomationToolInputSchema,
  outputSchema: browserAutomationToolOutputSchema,
  execute: async ({ context }: { context: InputType }): Promise<OutputType> => {
    const startTime: number = Date.now();
    
    try {
      const { task, url, context: additionalContext, verificationLevel, maxRetries } = context;
      
      console.log('[BrowserAutomationTool] Starting browser automation task:', task);
      console.log('🔍 検証レベル:', verificationLevel);
      console.log('🔄 最大リトライ回数:', maxRetries);
      
      // 🌐 **最初にBrowserbaseセッションを作成（参考実装と同じ）**
      console.log('🌐 Browserbaseセッションを作成中...');
      
      // 🔧 **shimsを最初にインポート（一度だけ）**
      if (!shimsImported && typeof window === 'undefined') {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      });
      
      const session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID!,
        keepAlive: true,
        timeout: 600, // 10分
      });
      
      const sessionId = session.id;
      console.log(`✅ セッション作成完了: ${sessionId}`);
      
      // 🔗 **ライブビューURLを即座に取得**
      let liveViewUrl: string;
      try {
        const debugInfo = await bb.sessions.debug(sessionId);
        liveViewUrl = debugInfo.debuggerFullscreenUrl;
        console.log(`🔗 ライブビューURL取得: ${liveViewUrl}`);
      } catch (error) {
        console.warn('⚠️ ライブビューURL取得失敗:', error);
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}/live`;
      }
      
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      
      // 🤖 **エージェントのカスタム実行ロジックを使用（セッションIDを渡す）**
      console.log('🤖 browserAutomationAgentのループ処理を開始...');
      
      const agentContext: BrowserAutomationContext = {
        task,
        verificationLevel,
        maxRetries,
        url,
        context: additionalContext,
        sessionId, // 🔧 作成済みのセッションIDを渡す
      };

      const agentResult = await executeWithVerificationLoops(browserAutomationAgent, agentContext);
      
      const executionTime: number = Date.now() - startTime;

      // エージェントの結果から追加情報を抽出
      const screenshots = agentResult.executionSteps
        .map(step => step.screenshot)
        .filter(screenshot => screenshot) as string[];
      
      const extractedData = agentResult.executionSteps
        .map(step => step.extractedData)
        .filter(data => data)
        .reduce((acc, data) => ({ ...acc, ...data }), {});

      // 最後に成功したステップからページタイトルを取得
      const lastSuccessfulStep = agentResult.executionSteps
        .filter(step => step.status === 'success' && step.verificationResult)
        .pop();
      
      const pageTitle = lastSuccessfulStep?.verificationResult?.match(/Page title: ([^.]+)/)?.[1] || 
                       'ブラウザ自動化実行結果';

      // 🎯 **セッション情報を早期に含める（参考実装と同じ）**
      const resultData: OutputType = {
        success: agentResult.verificationResults.overallScore > 0,
        result: agentResult.result,
        screenshots: screenshots.length > 0 ? screenshots : undefined,
        extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
        sessionInfo: {
          sessionId: sessionId,  // 最初に作成したセッションIDを使用
          replayUrl: replayUrl,
          liveViewUrl: liveViewUrl,
        },
        executionTime,
        sessionId: sessionId,    // 最初に作成したセッションIDを使用
        replayUrl: replayUrl,
        liveViewUrl: liveViewUrl, // 🔧 即座に表示するためのライブビューURL
        pageTitle: pageTitle,
        autoOpenPreview: true, // 🔧 自動的にプレビューを開く
        executionSteps: agentResult.executionSteps,
        verificationResults: agentResult.verificationResults,
        markdownContent: generateMarkdownContent({
          task,
          success: agentResult.verificationResults.overallScore > 0,
          result: agentResult.result,
          screenshots: screenshots.length > 0 ? screenshots : undefined,
          extractedData: Object.keys(extractedData).length > 0 ? extractedData : undefined,
          sessionInfo: {
            sessionId: sessionId,  // 最初に作成したセッションIDを使用
            replayUrl: replayUrl,
            liveViewUrl: liveViewUrl,
          },
          executionTime,
          pageTitle: pageTitle,
          executionSteps: agentResult.executionSteps,
          verificationResults: agentResult.verificationResults,
        }),
      };

      console.log('✅ Browser Automation Tool - 実行完了');
      console.log('📊 検証スコア:', agentResult.verificationResults.overallScore);

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
        executionSteps: [{
          step: 1,
          action: 'エラー発生',
          status: 'failed',
          verificationResult: `エラー: ${errorMessage}`,
          retryCount: 0,
        }],
        verificationResults: {
          level: context.verificationLevel || 'standard',
          checks: [{
            type: 'error_handling',
            passed: false,
            details: `実行中にエラーが発生: ${errorMessage}`,
          }],
          overallScore: 0,
        },
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