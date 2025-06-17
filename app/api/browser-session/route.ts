import { NextRequest, NextResponse } from 'next/server';
import { Browserbase } from '@browserbasehq/sdk';

// 🌐 **参考実装と同じセッション作成専用API**
export async function POST(req: NextRequest) {
  try {
    const { task } = await req.json();
    
    if (!task) {
      return NextResponse.json({ error: 'Task is required' }, { status: 400 });
    }
    
    // Browserbaseセッション作成
    const bb = new Browserbase({
      apiKey: process.env.BROWSERBASE_API_KEY!,
    });
    
    const session = await bb.sessions.create({
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      keepAlive: true,
      timeout: 21600, // 6時間
    });
    
    const sessionId = session.id;
    console.log(`✅ セッション作成完了: ${sessionId}`);
    
    // デバッグURLを即座に取得
    const debugInfo = await bb.sessions.debug(sessionId);
    let liveViewUrl = '';
    
    if (debugInfo.debuggerFullscreenUrl) {
      // URL変換処理（参考実装と同じ）
      liveViewUrl = debugInfo.debuggerFullscreenUrl.replace(
        "https://www.browserbase.com/devtools-fullscreen/inspector.html",
        "https://www.browserbase.com/devtools-internal-compiled/index.html"
      );
    } else {
      liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
    }
    
    const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
    
    // 🚀 **即座にライブビューURLを返却（参考実装と同じ）**
    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      sessionUrl: liveViewUrl, // 参考実装と同じキー名
      liveViewUrl: liveViewUrl,
      replayUrl: replayUrl,
      task: task,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Session creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
} 