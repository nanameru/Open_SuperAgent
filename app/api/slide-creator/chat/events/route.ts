import { NextRequest, NextResponse } from 'next/server';
import { getSlideCreatorAgent } from '@/src/mastra/agents/slideCreatorAgent';
import { Message } from 'ai';
import { randomUUID } from 'crypto';

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

export async function GET(req: NextRequest) {
  // リクエスト情報は詳細なログを出力しない
  
  try {
    const messages: Message[] = [{
      id: randomUUID(),
      role: 'user',
      content: 'Please provide the event stream for the current slide creation context.',
      createdAt: new Date()
    }];
    
    // 詳細なメッセージ内容も省略
    
    // Mastra エージェントの stream API を呼び出し
    const slideCreatorAgent = await getSlideCreatorAgent();
    
    if (!slideCreatorAgent) {
      return NextResponse.json(
        { error: 'Agent not available' },
        { status: 503 }
      );
    }
    
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
      { error: 'Stream processing failed', details: message },
      { status: 500 }
    );
  }
} 