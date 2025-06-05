import { NextRequest, NextResponse } from 'next/server';
import { slideCreatorAgent } from '@/src/mastra/agents/slideCreatorAgent';
import { mastra } from '@/src/mastra';
import { Message } from 'ai';
import { streamText } from 'ai';

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
export const maxDuration = 30;
export const dynamic = 'force-dynamic'; // 動的なレンダリングを強制

export async function POST(req: NextRequest) {
  // リクエスト情報は詳細なログを出力しない
  
  try {
    const { messages } = await req.json();
    
    // メッセージの検証と処理
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }
    
    // 最新のユーザーメッセージを取得
    const lastUserMessage = messages.filter((m: Message) => m.role === 'user').pop();
    const userContent = lastUserMessage?.content || '';
    
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
          },
        });
        
        devLog('Deep Research workflow completed');
        
        // ワークフロー結果の型チェック
        if (result.status !== 'success') {
          throw new Error('Deep Research workflow failed');
        }
        
        // 結果をストリーミング形式で返す
        // slideCreatorAgentのmodelを直接使用する代わりに、anthropicモデルを使用
        const { anthropic } = await import('@ai-sdk/anthropic');
        const model = anthropic('claude-3-5-sonnet-20241022');
        
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
    
    // Mastraエージェントを使用してストリーミングレスポンスを取得
    const mastraStreamResult = await slideCreatorAgent.stream(messages);
    
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
    return NextResponse.json(
      { error: 'Chat API error', details: message },
      { status: 500 }
    );
  }
} 