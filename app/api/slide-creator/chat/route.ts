import { NextRequest, NextResponse } from 'next/server';
import { createSlideCreatorAgent, createModel } from '@/src/mastra/agents/slideCreatorAgent';
import { mastra } from '@/src/mastra';
import { Message } from 'ai';
import { streamText } from 'ai';
import { getCurrentModel } from '../../set-model/route';

// 開発環境のみログを出力する関数
function devLog(message: string, data?: any) {
  if (process.env.NODE_ENV !== 'production') {
    if (data) {
      console.log(`${message}`, data);
    } else {
      console.log(`${message}`);
    }
  }
}

// Vercel Serverless Function でストリームを許可するための設定
export const maxDuration = 300;
export const dynamic = 'force-dynamic'; // 動的なレンダリングを強制

// Geminiモデルのリトライ設定
const GEMINI_RETRY_ATTEMPTS = 3;
const GEMINI_RETRY_DELAY = 2000; // 2秒

// リトライ用のsleep関数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  // リクエスト情報は詳細なログを出力しない
  
  try {
    const { messages, model: requestModel } = await req.json();
    
    // メッセージの検証と処理
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }
    
    // 最新のユーザーメッセージを取得
    const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content || '';
    
    // モデル設定を取得（リクエスト > getCurrentModel > デフォルト の優先順位）
    let currentModel;
    if (requestModel && requestModel.provider && requestModel.modelName) {
      currentModel = requestModel;
      devLog(`Using model from request: ${currentModel.provider} - ${currentModel.modelName}`);
    } else {
      currentModel = getCurrentModel();
      devLog(`Using model from storage: ${currentModel.provider} - ${currentModel.modelName}`);
    }
    
    // OpenAIモデルの場合は、Agentを介さずに直接streamTextを呼び出す
    if (currentModel.provider === 'openai') {
      devLog('Bypassing agent for OpenAI model, using streamText directly.');
      const model = createModel(currentModel.provider, currentModel.modelName);
      const response = await streamText({
        model: model,
        messages: messages,
        // ここで必要に応じてツールを渡すこともできますが、まずはテキスト生成を優先します
      });
      return response.toDataStreamResponse();
    }
    
    // 選択されたモデルでslideCreatorAgentを動的に作成
    const slideCreatorAgent = createSlideCreatorAgent(currentModel.provider, currentModel.modelName);
    
    // Deep Research処理の検出
    if (userContent.startsWith('[Deep Research]')) {
      devLog('Deep Research detected');
      
      // [Deep Research]プレフィックスを削除
      const query = userContent.replace('[Deep Research]', '').trim();
      
      try {
        // Deep Researchワークフローを実行
        const workflow = mastra.getWorkflow('deep-research');
        const run = workflow.createRun();
        
        devLog('Starting Deep Research workflow for query:', query);
        
        const result = await run.start({
          inputData: {
            message: query,
            maxIterations: 2,
            queriesPerIteration: 5,
          },
        });
        
        devLog('Deep Research workflow completed');
        
        // ワークフロー結果の型チェック
        if (result.status !== 'success') {
          throw new Error('Deep Research workflow failed');
        }
        
        // Deep Research用にモデルを動的に作成
        const model = createModel(currentModel.provider, currentModel.modelName);
        
        // 結果をストリーミング形式で返す
        const response = streamText({
          model,
          messages: [
            ...messages.slice(0, -1), // 最後のメッセージ以外
            { role: 'user', content: query }, // プレフィックスなしのクエリ
            { 
              role: 'assistant', 
              content: `## Deep Research 結果\n\n${result.result?.answer || ''}\n\n### 参照元\n${result.result?.sources?.map((s: any) => `- [${s.label}](${s.url})`).join('\n') || '参照元なし'}`
            }
          ],
        });
        
        return response.toDataStreamResponse();
      } catch (error) {
        devLog('Deep Research error:', error);
        // エラーが発生した場合は通常のエージェントにフォールバック
      }
    }
    
    // Web検索処理の検出
    if (userContent.startsWith('[Web検索]')) {
      devLog('Web search detected');
      // 現在は通常のエージェントで処理（将来的に専用の検索処理を追加可能）
    }
    
    // 受信したメッセージの内容をログ出力 (最初の100文字程度)
    // 詳細なログは出力しない
    
    // 動的に作成されたslideCreatorAgentを使用してストリーミングレスポンスを取得
    let mastraStreamResult;
    let lastError;
    
    // Geminiモデルの場合はリトライ処理を追加
    for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
      try {
        devLog(`Attempting to stream with ${currentModel.provider} (attempt ${attempt}/${GEMINI_RETRY_ATTEMPTS})`);
        mastraStreamResult = await slideCreatorAgent.stream(messages);
        break; // 成功した場合はループを抜ける
      } catch (error: any) {
        lastError = error;
        devLog(`Stream attempt ${attempt} failed:`, error.message);
        
        // 最後の試行でない場合は待機してリトライ
        if (attempt < GEMINI_RETRY_ATTEMPTS) {
          devLog(`Retrying in ${GEMINI_RETRY_DELAY}ms...`);
          await sleep(GEMINI_RETRY_DELAY);
        } else {
          devLog('All retry attempts failed');
          throw lastError;
        }
      }
    }
    
    // Stream オブジェクトの詳細をログ出力
    devLog('Mastra Stream Result Type', typeof mastraStreamResult);
    if (mastraStreamResult && typeof mastraStreamResult === 'object') {
      devLog('Mastra Stream Result Keys', Object.keys(mastraStreamResult));
      
      // toDataStreamResponse メソッドの有無を確認
      if (typeof (mastraStreamResult as any).toDataStreamResponse === 'function') {
        devLog('Mastra Stream Result has toDataStreamResponse method');
      }
    }
    
    // mastraStreamResult を適切なレスポンスに変換
    if (typeof (mastraStreamResult as any).toDataStreamResponse === 'function') {
      return (mastraStreamResult as any).toDataStreamResponse();
    } else {
      // toDataStreamResponse が利用できない場合のエラー報告
      return NextResponse.json(
        { error: 'Internal server error: Stream processing failed.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    // エラー詳細も簡素化
    const message = error instanceof Error ? error.message : 'Internal server error';
    devLog('Chat API error:', message);
    
    // Gemini API特有のエラーチェック
    if (message.includes('Visibility check was unavailable') || message.includes('503')) {
      return NextResponse.json(
        { 
          error: 'Gemini API一時的な問題', 
          details: 'Gemini APIに一時的な問題が発生しています。少し待ってから再試行してください。',
          retryable: true
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Chat API error', details: message },
      { status: 500 }
    );
  }
} 