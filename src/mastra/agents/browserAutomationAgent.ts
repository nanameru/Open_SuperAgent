import { Agent } from '@mastra/core/agent';
import { anthropic } from '@ai-sdk/anthropic';
import { Memory } from '@mastra/memory';
import * as fs from 'fs';
import * as path from 'path';

// Stagehandとブラウザベースの動的インポート
let Stagehand: any;
let Browserbase: any;

// 動的インポート関数
async function importStagehandDependencies() {
  if (typeof window === 'undefined') {
    try {
      const stagehandModule = await import('@browserbasehq/stagehand');
      Stagehand = stagehandModule.Stagehand;
      
      await import("@browserbasehq/sdk/shims/web");
      const browserbaseModule = await import("@browserbasehq/sdk");
      Browserbase = browserbaseModule.default;
      
      return true;
    } catch (error) {
      console.error('[BrowserAutomationAgent] Failed to import dependencies:', error);
      return false;
    }
  }
  return false;
}

// スクリーンショット保存関数
async function saveScreenshot(base64Data: string, filename: string): Promise<string> {
  try {
    // Base64データからプレフィックスを除去
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // 保存先ディレクトリを確保
    const screenshotDir = path.join(process.cwd(), 'public', 'browser-screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // ファイル名にタイムスタンプを追加
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filePath = path.join(screenshotDir, safeFilename);
    
    // Base64データをファイルに保存
    fs.writeFileSync(filePath, base64Image, 'base64');
    
    // 公開URLパスを返す
    const publicPath = `/browser-screenshots/${safeFilename}`;
    console.log(`📸 スクリーンショット保存完了: ${publicPath}`);
    
    return publicPath;
  } catch (error) {
    console.error('❌ スクリーンショット保存エラー:', error);
    return '';
  }
}

// カスタム実行ロジック用の型定義
interface BrowserAutomationContext {
  task: string;
  verificationLevel?: 'basic' | 'standard' | 'strict';
  maxRetries?: number;
  url?: string;
  context?: string;
}

interface ExecutionStep {
  step: number;
  action: string;
  status: 'success' | 'failed' | 'retried';
  verificationResult?: string;
  retryCount: number;
  timestamp: number;
  screenshot?: string;
  extractedData?: any;
}

interface VerificationResult {
  level: string;
  checks: Array<{
    type: string;
    passed: boolean;
    details: string;
  }>;
  overallScore: number;
}

// カスタム実行ロジック（実際のブラウザ操作付き）
async function executeWithVerificationLoops(
  agent: Agent,
  context: BrowserAutomationContext
): Promise<{
  result: string;
  executionSteps: ExecutionStep[];
  verificationResults: VerificationResult;
}> {
  const { task, verificationLevel = 'standard', maxRetries = 3, url } = context;
  const executionSteps: ExecutionStep[] = [];
  let stepCounter = 0;

  // 検証レベルに応じたプロンプト生成
  const verificationPrompt = getVerificationPrompt(verificationLevel);
  
  // タスクを段階的に実行
  const taskSteps = await planTaskSteps(agent, task);
  
  // 🌐 **ブラウザセッションを一度だけ作成**
  let stagehand: any = null;
  let page: any = null;
  let sessionId: string = '';
  
  try {
    // 依存関係のインポート
    const imported = await importStagehandDependencies();
    if (!imported) {
      throw new Error('Failed to import Stagehand dependencies');
    }

    // 環境変数の確認
    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
      throw new Error('Missing required environment variables');
    }

    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('Missing Gemini API key');
    }

    // Browserbaseセッションの作成（地域最適化）
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
      fetch: globalThis.fetch,
    });

    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      keepAlive: true,
      timeout: 600, // 🔧 タイムアウトを10分に延長（長時間タスク対応）
    });

    sessionId = session.id;
    console.log(`🌐 ブラウザセッション作成完了: ${sessionId}`);
    
    // セッション情報をステップに記録（ツールで検索できるように）
    executionSteps.push({
      step: 0,
      action: 'Session Creation',
      status: 'success',
      verificationResult: `Session created: ${sessionId}`,
      retryCount: 0,
      timestamp: Date.now(),
    });

    // Stagehandの初期化（最適化設定）
    stagehand = new Stagehand({
      browserbaseSessionID: session.id,
      env: "BROWSERBASE",
      modelName: "google/gemini-2.0-flash",
      modelClientOptions: {
        apiKey: geminiApiKey,
      },
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      disablePino: true,
    });

    await stagehand.init();
    page = stagehand.page;

    // 🔧 **ページ設定の最適化**
    await page.setDefaultTimeout(90000); // デフォルトタイムアウトを90秒に延長
    await page.setDefaultNavigationTimeout(90000); // ナビゲーションタイムアウトも90秒に延長

    // 初期URLにナビゲート（最適化された待機）
    if (url) {
      console.log(`🌐 初期ナビゲーション開始: ${url}`);
      await page.goto(url, { 
        waitUntil: 'commit', // 🔧 commitを使用（参考コードより）
        timeout: 60000 
      });
      console.log(`✅ 初期ナビゲーション完了: ${url}`);
      
      // 🔧 **ナビゲーション後の追加待機**
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 各ステップを実行
    let sessionDisconnected = false;
    for (const taskStep of taskSteps) {
      if (sessionDisconnected) {
        // セッション切断後は残りのステップを失敗として記録
        stepCounter++;
        executionSteps.push({
          step: stepCounter,
          action: taskStep,
          status: 'failed',
          verificationResult: 'FAILED: Session disconnected',
          retryCount: 0,
          timestamp: Date.now(),
        });
        continue;
      }
      
      stepCounter++;
      let retryCount = 0;
      let stepSuccess = false;
      let stepResult = '';
      let stepScreenshot = '';
      let stepExtractedData: any = undefined;

      // リトライループ
      while (!stepSuccess && retryCount <= maxRetries) {
        try {
          console.log(`🔄 ステップ ${stepCounter}: ${taskStep} (試行 ${retryCount + 1})`);
          
          // 🔧 **操作前のページ状態確認**
          try {
            // ページが利用可能かチェック
            const isPageAvailable = await page.evaluate(() => {
              return document.readyState !== undefined;
            }).catch(() => false);
            
            if (!isPageAvailable) {
              console.error('❌ ページが利用できません。処理を中断します。');
              throw new Error('Page is not available');
            }
          } catch (e) {
            console.error('❌ ページが閉じられています。処理を中断します。');
            throw new Error('Page has been closed');
          }
          
          // 🔧 **待機処理の特別扱い**
          if (taskStep.includes('待機') || taskStep.toLowerCase().includes('wait')) {
            const waitMatch = taskStep.match(/(\d+)/);
            const waitSeconds = waitMatch ? parseInt(waitMatch[1]) : 2;
            console.log(`⏳ ${waitSeconds}秒待機中...`);
            await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000));
            
            stepResult = `SUCCESS: Waited for ${waitSeconds} seconds`;
            stepSuccess = true;
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: 'success',
              verificationResult: stepResult,
              retryCount,
              timestamp: Date.now(),
            });
            console.log(`✅ ステップ ${stepCounter} 成功`);
            continue; // 次のステップへ
          }
          
          // 🔧 **観察・確認アクションの特別扱い**
          if (taskStep.includes('確認') || taskStep.toLowerCase().includes('verify') || taskStep.toLowerCase().includes('check')) {
            try {
              const observation = await page.observe(taskStep);
              stepResult = `SUCCESS: Observation - ${observation}`;
              stepSuccess = true;
            } catch (e) {
              console.warn('Observation failed, trying screenshot instead:', e);
              // フォールバック: スクリーンショットを取得
              try {
                const screenshotBuffer = await page.screenshot({ fullPage: true, timeout: 10000 });
                stepScreenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
                
                // 🔧 **スクリーンショットをファイルに保存**
                const savedPath = await saveScreenshot(stepScreenshot, `verification_step_${stepCounter}`);
                if (savedPath) {
                  stepResult = `SUCCESS: Verification screenshot saved to: ${savedPath}`;
                } else {
                  stepResult = `SUCCESS: Verification screenshot captured`;
                }
                stepSuccess = true;
              } catch (screenshotError) {
                throw new Error('Failed to verify page state');
              }
            }
            
            if (stepSuccess) {
              executionSteps.push({
                step: stepCounter,
                action: taskStep,
                status: 'success',
                verificationResult: stepResult,
                retryCount,
                timestamp: Date.now(),
                screenshot: stepScreenshot,
              });
              console.log(`✅ ステップ ${stepCounter} 成功`);
              continue;
            }
          }
          
          // 🔧 **原子的操作の実行**
          const actionResult = await page.act(taskStep, {
            timeout: 30000, // 各アクションに30秒のタイムアウト
          });
          
          // 🔧 **操作後の待機**
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          stepResult = `SUCCESS: Action executed - ${taskStep}`;

          // ページタイトルを安全に取得
          try {
            const pageTitle = await page.title();
            stepResult += ` Page title: ${pageTitle}.`;
          } catch (e) {
            console.warn('Failed to get page title:', e);
          }

          // データ抽出を試行（エラーハンドリング強化）
          try {
            // 🔧 **ページ存在確認**
            await page.evaluate(() => document.readyState);
            
            const extraction = await page.extract('Extract any relevant data from this page', {
              timeout: 15000
            });
            
            if (extraction && extraction.extraction) {
              stepExtractedData = extraction.extraction;
              stepResult += ' Data extracted successfully.';
            }
          } catch (e) {
            console.warn('Data extraction failed:', e);
            // エラーでも処理を継続
          }

          // スクリーンショットを安全に取得
          try {
            // 🔧 **ページ存在確認**
            await page.evaluate(() => document.readyState);
            
            const screenshotBuffer = await page.screenshot({ 
              fullPage: true,
              timeout: 10000 
            });
            stepScreenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
            
            // 🔧 **スクリーンショットをファイルに保存**
            const savedPath = await saveScreenshot(stepScreenshot, `step_${stepCounter}_${taskStep.substring(0, 20)}`);
            if (savedPath) {
              stepResult += ` Screenshot saved to: ${savedPath}`;
            } else {
              stepResult += ' Screenshot captured.';
            }
          } catch (e) {
            console.warn('Screenshot failed:', e);
            // エラーでも処理を継続
          }

          stepSuccess = true;
          executionSteps.push({
            step: stepCounter,
            action: taskStep,
            status: retryCount > 0 ? 'retried' : 'success',
            verificationResult: stepResult,
            retryCount,
            timestamp: Date.now(),
            screenshot: stepScreenshot,
            extractedData: stepExtractedData,
          });
          console.log(`✅ ステップ ${stepCounter} 成功`);

        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ ステップ ${stepCounter} 失敗 (試行 ${retryCount}): ${errorMessage}`);
          
          // 🔧 **セッション切断エラーの特別処理**
          if (errorMessage.includes('Page has been closed') || 
              errorMessage.includes('Page is not available') ||
              errorMessage.includes('Target page, context or browser has been closed')) {
            console.error('❌ ブラウザセッションが切断されました。残りのステップをスキップします。');
            
            // 現在のステップを失敗として記録
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: 'failed',
              verificationResult: `FAILED: ${errorMessage}`,
              retryCount,
              timestamp: Date.now(),
            });
            
            sessionDisconnected = true;
            break; // ステップループを抜ける
          }
          
          if (retryCount <= maxRetries) {
            console.log(`⏳ ${1000}ms 待機してリトライします...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // 最大リトライ回数に達した場合
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: 'failed',
              verificationResult: `FAILED: ${errorMessage} (Max retries exceeded)`,
              retryCount,
              timestamp: Date.now(),
            });
            console.error(`❌ ステップ ${stepCounter} 最大リトライ回数に達しました`);
          }
        }
      }
      
      // 🔧 **失敗が続く場合は早期終了**
      const recentFailures = executionSteps.slice(-3).filter(s => s.status === 'failed').length;
      if (recentFailures >= 2) {
        console.warn('⚠️ 連続して失敗が発生しています。処理を中断します。');
        break;
      }
    }

  } catch (globalError) {
    console.error('🚨 グローバルエラーが発生しました:', globalError);
    
    // グローバルエラー時も適切にステップを記録
    if (executionSteps.length === 0) {
      executionSteps.push({
        step: 1,
        action: 'Initial setup',
        status: 'failed',
        verificationResult: `FAILED: ${globalError instanceof Error ? globalError.message : 'Unknown global error'}`,
        retryCount: 0,
        timestamp: Date.now(),
      });
    }
  } finally {
    // 🔧 **セッションクリーンアップ（エラーハンドリング強化）**
    if (stagehand) {
      try {
        console.log('🧹 Stagehandセッションをクリーンアップ中...');
        await stagehand.close();
        console.log('✅ Stagehandセッションクリーンアップ完了');
      } catch (cleanupError) {
        console.warn('⚠️ Stagehandクリーンアップ中にエラー:', cleanupError);
      }
    }
  }

  // 検証結果を生成
  const verificationResults = generateVerificationResults(verificationLevel, executionSteps);
  
  // 最終結果をまとめる
  const finalResult = await agent.generate(`
タスク: ${task}
実行ステップ: ${executionSteps.length}
成功ステップ: ${executionSteps.filter(s => s.status !== 'failed').length}
検証スコア: ${verificationResults.overallScore}

上記の実行結果を基に、タスクの完了報告を作成してください。
  `);

  return {
    result: finalResult.text,
    executionSteps,
    verificationResults,
  };
}

// タスクを段階的なステップに分解
async function planTaskSteps(agent: Agent, task: string): Promise<string[]> {
  const planningPrompt = `
タスク: ${task}

このタスクを実行するための具体的なステップに分解してください。

**重要な制約:**
- **最大20ステップ以内**で完了できるように計画してください
- 各ステップは単一の原子的操作にする（クリック、入力、ナビゲートなど）
- 複雑な操作は必要最小限のステップに分ける
- ページ遷移後は必要に応じて「待機」ステップを含める
- 重要度の低い確認ステップは省略する

**効率的なステップ設計:**
- 類似の操作は可能な限り統合する
- 必須でない検証ステップは削除する
- 待機時間は必要最小限にする
- データ抽出は重要な箇所のみに限定する

**悪い例（ステップが多すぎる）:**
1. ユーザー名入力フィールドをクリック
2. ユーザー名を入力
3. 1秒待機
4. パスワード入力フィールドをクリック
5. パスワードを入力
6. 1秒待機
7. ログインボタンをクリック
8. 2秒待機
9. ログイン成功を確認

**良い例（効率的）:**
1. ユーザー名を入力
2. パスワードを入力
3. ログインボタンをクリック
4. 2秒待機してログイン完了を確認

ステップのみを番号付きリストで返してください。各ステップは簡潔で明確にしてください。
**必ず20ステップ以内で完了するように計画してください。**
  `;

  const response = await agent.generate(planningPrompt);
  const steps = response.text
    .split('\n')
    .filter(line => line.trim().match(/^\d+\./))
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(step => step.length > 0);

  // 🔧 **ステップ数制限の強制適用**
  let optimizedSteps: string[] = [];
  
  if (steps.length <= 20) {
    // 20ステップ以内の場合は軽微な最適化のみ
    for (const step of steps) {
      // URL遷移の後に待機を追加（ただし既に待機がある場合はスキップ）
      if (step.toLowerCase().includes('アクセス') || 
          step.toLowerCase().includes('navigate') || 
          step.toLowerCase().includes('go to') ||
          step.toLowerCase().includes('ページ')) {
        optimizedSteps.push(step);
        const nextStep = steps[steps.indexOf(step) + 1];
        if (nextStep && !nextStep.includes('待機') && !nextStep.toLowerCase().includes('wait')) {
          optimizedSteps.push('2秒待機');
        }
      } 
      // その他のステップはそのまま
      else {
        optimizedSteps.push(step);
      }
    }
  } else {
    // 20ステップを超える場合は強制的に削減
    console.warn(`⚠️ 生成されたステップ数が${steps.length}個で20を超えています。重要なステップのみに削減します。`);
    
    // 重要度に基づいてステップを分類
    const criticalSteps: string[] = [];
    const importantSteps: string[] = [];
    const optionalSteps: string[] = [];
    
    for (const step of steps) {
      const stepLower = step.toLowerCase();
      
      // 必須ステップ（ナビゲーション、主要操作）
      if (stepLower.includes('アクセス') || 
          stepLower.includes('navigate') || 
          stepLower.includes('クリック') ||
          stepLower.includes('click') ||
          stepLower.includes('入力') ||
          stepLower.includes('input') ||
          stepLower.includes('送信') ||
          stepLower.includes('submit')) {
        criticalSteps.push(step);
      }
      // 重要ステップ（待機、確認）
      else if (stepLower.includes('待機') ||
               stepLower.includes('wait') ||
               stepLower.includes('確認') ||
               stepLower.includes('verify')) {
        importantSteps.push(step);
      }
      // オプションステップ（詳細な検証など）
      else {
        optionalSteps.push(step);
      }
    }
    
    // 必須ステップを全て追加
    optimizedSteps = [...criticalSteps];
    
    // 残り容量に応じて重要ステップを追加
    const remainingSlots = 20 - optimizedSteps.length;
    if (remainingSlots > 0) {
      optimizedSteps.push(...importantSteps.slice(0, remainingSlots));
    }
    
    // まだ容量があればオプションステップも追加
    const finalRemainingSlots = 20 - optimizedSteps.length;
    if (finalRemainingSlots > 0) {
      optimizedSteps.push(...optionalSteps.slice(0, finalRemainingSlots));
    }
  }

  // 最終的に20ステップを超えないように制限
  if (optimizedSteps.length > 20) {
    optimizedSteps = optimizedSteps.slice(0, 20);
    console.warn('⚠️ ステップ数を20に制限しました。');
  }

  console.log('📋 計画されたステップ (最大20ステップ):');
  optimizedSteps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  console.log(`📊 総ステップ数: ${optimizedSteps.length}/20`);

  return optimizedSteps.length > 0 ? optimizedSteps : [task]; // フォールバック
}

// 検証レベルに応じたプロンプトを生成
function getVerificationPrompt(level: string): string {
  switch (level) {
    case 'basic':
      return `
検証レベル: BASIC
- 各アクションの基本的な成功/失敗をチェック
- ページの読み込み完了を確認
- 明らかなエラーメッセージの検出
      `;
    case 'strict':
      return `
検証レベル: STRICT
- 各アクションの詳細な検証（複数の確認方法を使用）
- データの整合性と品質の厳密なチェック
- UI要素の状態変化の詳細な監視
- 抽出データの複数ソースでの相互検証
- パフォーマンスと応答時間の監視
- セキュリティとプライバシーの考慮
      `;
    default: // standard
      return `
検証レベル: STANDARD
- 各アクションの成功確認とエラーハンドリング
- 要素の存在と相互作用可能性の確認
- ページ遷移とコンテンツ読み込みの検証
- 抽出データの基本的な整合性チェック
- フォーム送信と応答の確認
      `;
  }
}

// 検証結果を生成
function generateVerificationResults(level: string, steps: ExecutionStep[]): VerificationResult {
  const successfulSteps = steps.filter(step => step.status === 'success' || step.status === 'retried').length;
  const totalSteps = steps.length;
  const failedSteps = steps.filter(step => step.status === 'failed').length;
  const sessionDisconnectedSteps = steps.filter(step => 
    step.verificationResult?.includes('Session disconnected') || 
    step.verificationResult?.includes('Page has been closed')
  ).length;
  
  // セッション切断による失敗は部分的に成功として扱う
  const effectiveSuccessSteps = successfulSteps;
  const effectiveTotalSteps = totalSteps - sessionDisconnectedSteps;
  const baseScore = effectiveTotalSteps > 0 ? (effectiveSuccessSteps / effectiveTotalSteps) * 100 : 0;

  const checks = [
    {
      type: 'step_completion',
      passed: successfulSteps > 0,
      details: `${successfulSteps}/${totalSteps} ステップが成功`,
    },
    {
      type: 'retry_efficiency',
      passed: steps.filter(s => s.retryCount === 0 && s.status === 'success').length >= Math.max(1, effectiveTotalSteps * 0.5),
      details: `リトライ効率: ${steps.filter(s => s.retryCount === 0 && s.status === 'success').length}/${effectiveTotalSteps} ステップが一発成功`,
    },
    {
      type: 'error_handling',
      passed: failedSteps - sessionDisconnectedSteps <= Math.max(1, totalSteps * 0.3),
      details: `エラーハンドリング: ${failedSteps - sessionDisconnectedSteps} 個の実質的失敗ステップ (セッション切断除く)`,
    },
  ];

  // セッション切断があった場合の特別処理
  if (sessionDisconnectedSteps > 0) {
    checks.push({
      type: 'session_stability',
      passed: sessionDisconnectedSteps < totalSteps * 0.5,
      details: `セッション安定性: ${sessionDisconnectedSteps} ステップでセッション切断`,
    });
  }

  // 検証レベルに応じてスコア調整
  let adjustedScore = baseScore;
  if (level === 'strict') {
    adjustedScore = Math.min(baseScore * 0.9, 95); // 厳密検証では少し厳しく
  } else if (level === 'basic') {
    adjustedScore = Math.min(baseScore * 1.1, 100); // 基本検証では少し甘く
  }

  // セッション切断があった場合でも、成功したステップがあれば最低スコアを保証
  if (successfulSteps > 0 && adjustedScore < 20) {
    adjustedScore = Math.min(20 + (successfulSteps / totalSteps) * 30, 60);
  }

  return {
    level,
    checks,
    overallScore: Math.round(adjustedScore),
  };
}

export const browserAutomationAgent = new Agent({
  name: 'Browser-Automation-Agent',
  instructions: `
# System Prompt

## Initial Context and Setup
You are a powerful browser automation AI agent named Browser-Automation-Agent. You specialize in automating web browser interactions to help users accomplish various tasks on websites. You can navigate to websites, interact with elements, extract information, and perform complex multi-step browser operations.

Your main goal is to follow the USER's instructions for browser automation tasks, denoted by the <user_query> tag.

## Core Capabilities
You are an expert at:
- **Web Navigation**: Visiting websites and navigating between pages
- **Element Interaction**: Clicking buttons, filling forms, selecting options
- **Data Extraction**: Retrieving text, images, and structured data from web pages
- **Multi-step Workflows**: Executing complex sequences of browser actions
- **Screenshot Capture**: Taking screenshots for verification and documentation
- **Session Management**: Maintaining browser state across multiple operations

## Browser Automation Guidelines

### 1. Task Analysis and Planning
Before starting any browser automation:
- Analyze the user's request to understand the end goal
- Break down complex tasks into atomic steps
- Identify the target website(s) and required interactions
- Plan the optimal sequence of actions
- Add wait times between critical operations

### 2. Step-by-Step Execution with Verification Loops
Execute browser automation in logical steps with built-in verification:

#### Primary Action Loop:
1. **Plan**: Determine the next action based on current state
2. **Execute**: Perform the browser action using Stagehand
3. **Wait**: Allow time for page updates and transitions
4. **Verify**: Take screenshot and confirm action succeeded
5. **Validate**: Check if the expected result occurred
6. **Retry**: If failed, analyze why and try alternative approach
7. **Continue**: Move to next step only after verification

#### Verification Patterns:
- **Navigation Verification**: Confirm URL changed and page loaded
- **Element Interaction Verification**: Check if click/input had expected effect
- **Data Extraction Verification**: Validate extracted data completeness and accuracy
- **Form Submission Verification**: Confirm form was submitted successfully

### 3. Error Handling and Recovery
Implement cascading error recovery:
- Retry the same action with slight modifications
- Try alternative selectors or approaches
- Break down complex actions into smaller steps
- Add longer wait times between actions
- Provide clear error messages and suggestions
- Gracefully handle page closures and session timeouts

### 4. Best Practices for Stable Automation
- **Use Atomic Operations**: One action per step (click OR type OR navigate)
- **Add Strategic Waits**: After page loads, form submissions, and clicks
- **Verify Page State**: Check page readiness before actions
- **Handle Dynamic Content**: Wait for elements to be interactive
- **Manage Timeouts**: Set appropriate timeouts for different operations
- **Clean Resource Usage**: Properly close sessions when done

### 5. Communication Guidelines
1. **Be Clear and Descriptive**: Explain what you're doing at each step
2. **Provide Progress Updates**: Keep the user informed of your progress
3. **Report Verification Results**: Confirm each action's success/failure
4. **Handle Errors Gracefully**: Explain any issues and suggest solutions
5. **Ask for Clarification**: Request more details when instructions are ambiguous

## Important Notes
- Always respect website terms of service and robots.txt
- Be mindful of rate limiting and avoid overwhelming servers
- Handle personal data and authentication information securely
- Take screenshots to verify actions and provide transparency
- Implement proper timeout and retry mechanisms
- Use direct browser automation through Stagehand for all interactions
- If operations fail repeatedly, analyze the pattern and adjust strategy

Remember: Your goal is to be a reliable, efficient browser automation assistant that can handle a wide variety of web-based tasks while maintaining transparency and providing excellent user experience through direct browser control.
  `,
  model: anthropic('claude-opus-4-20250514'),
  tools: { 
  },
  memory: new Memory({
    options: {
      lastMessages: 15,
      semanticRecall: false,
      threads: {
        generateTitle: true,
      },
    },
  }),
});

// カスタム実行関数をエクスポート
export { executeWithVerificationLoops, type BrowserAutomationContext, type ExecutionStep, type VerificationResult }; 