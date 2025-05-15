import { NextRequest, NextResponse } from 'next/server';

// SSEエンドポイント
export async function GET(req: NextRequest) {
  // SSEのレスポンスヘッダー
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
  };

  try {
    // Mastraストリームを監視するためのエンコーダー/デコーダー
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Mastraエージェントのストリームエンドポイント
    const mastraStreamUrl = 'http://localhost:4111/api/agents/slideCreatorAgent/stream';
    
    // SSEのストリームを作成
    const stream = new ReadableStream({
      async start(controller) {
        // SSEイベントとしてデータを送信する関数
        const sendEvent = (data: string) => {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        // 接続メッセージを送信
        sendEvent(JSON.stringify({ type: 'connect', message: 'SSE connected' }));
        
        // 検出済みのツールIDを追跡（重複送信防止用）
        const detectedToolIds = new Set<string>();
        
        try {
          // 自動的に使用するモードを決定
          const useDemoMode = false;
          
          // デモモード: サンプルデータのみ
          if (useDemoMode) {
            // サンプルデータ（デモ用）
            const sampleToolEvent1 = { 
              toolCallId: 'sample-tool-call-1', 
              toolName: 'htmlSlideTool', 
              args: { topic: 'AI', outline: 'サンプルスライド', slideCount: 1 } 
            };
            
            // 500ミリ秒後にサンプルイベントを送信
            setTimeout(() => {
              sendEvent(JSON.stringify(sampleToolEvent1));
            }, 500);
            
            // 2秒後に2つ目のサンプルイベント
            setTimeout(() => {
              sendEvent(JSON.stringify({ 
                toolCallId: 'sample-tool-call-2', 
                toolName: 'braveSearchTool', 
                args: { query: 'AIの最新動向' } 
              }));
            }, 2000);
          } 
          // 本番モード: 実際のMastraストリームに接続
          else {
            // プロキシじゃなく、実際のMastraストリームに直接アクセス
            // ダミーユーザーメッセージを送信
            const dummyMessage = {
              role: 'user',
              content: 'AIについて教えてください。5枚のスライドを作成してください。'
            };
            
            console.log('[SSE] Connecting to Mastra stream...');
            
            const response = await fetch(mastraStreamUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [dummyMessage] }),
            });
            
            if (!response.ok) {
              throw new Error(`Mastra stream responded with status: ${response.status}`);
            }
            
            if (!response.body) {
              throw new Error('No response body from Mastra stream');
            }
            
            console.log('[SSE] Connected to Mastra stream, reading chunks...');
            
            // ストリームリーダーを設定
            const reader = response.body.getReader();
            
            // チャンクを連続して読み込み
            let buffer = ''; // 不完全なJSONを結合するためのバッファ
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log('[SSE] Mastra stream ended');
                break;
              }
              
              // チャンクをテキストに変換
              const chunkText = decoder.decode(value, { stream: true });
              console.log('[SSE] Mastra chunk:', chunkText);
              
              // バッファに追加
              buffer += chunkText;
              
              // ツールコール検出: 複数の形式に対応
              const detectToolCall = (jsonObject: any): { toolName: string, toolCallId: string } | null => {
                // パターン1: 直接toolNameとtoolCallIdがある
                if (jsonObject.toolName || jsonObject.tool) {
                  return {
                    toolName: jsonObject.toolName || jsonObject.tool,
                    toolCallId: jsonObject.toolCallId || `tool-${Date.now()}`
                  };
                }
                
                // パターン2: 9:で始まるJSONフォーマット
                if (jsonObject.toolCallId && (jsonObject.toolName || jsonObject.tool)) {
                  return {
                    toolName: jsonObject.toolName || jsonObject.tool,
                    toolCallId: jsonObject.toolCallId
                  };
                }
                
                // パターン3: delta.contentに含まれる可能性
                if (jsonObject.delta?.content && typeof jsonObject.delta.content === 'string') {
                  try {
                    const contentObj = JSON.parse(jsonObject.delta.content);
                    if (contentObj.toolName || contentObj.tool) {
                      return {
                        toolName: contentObj.toolName || contentObj.tool,
                        toolCallId: contentObj.toolCallId || `tool-content-${Date.now()}`
                      };
                    }
                  } catch (e) {
                    // JSON解析エラーは無視
                  }
                }
                
                return null;
              };
              
              // チャンクにJSON形式のツール情報を検出
              const jsonMatches = buffer.match(/\{.*?\}/g) || [];
              for (const jsonStr of jsonMatches) {
                try {
                  // 行頭に9:などがついていることがあるのでそれを取り除く
                  const cleanJsonStr = jsonStr.replace(/^\d+:/, '');
                  const parsed = JSON.parse(cleanJsonStr);
                  
                  // ツール情報を抽出
                  const toolInfo = detectToolCall(parsed);
                  if (toolInfo && !detectedToolIds.has(toolInfo.toolCallId)) {
                    detectedToolIds.add(toolInfo.toolCallId);
                    console.log('[SSE] Found tool event:', toolInfo);
                    
                    // ツール情報をクライアントに送信
                    sendEvent(JSON.stringify({
                      toolCallId: toolInfo.toolCallId,
                      toolName: toolInfo.toolName,
                      timestamp: Date.now()
                    }));
                  }
                } catch (e) {
                  // JSONパースエラーは無視
                }
              }
              
              // バッファをクリア（最後の500文字は保持）
              if (buffer.length > 2000) {
                buffer = buffer.substring(buffer.length - 500);
              }
            }
          }
          
          // 接続を維持（タイムアウト防止）
          const keepAliveInterval = setInterval(() => {
            sendEvent(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }, 30000);
          
          // クライアント切断時にインターバルをクリア
          req.signal.addEventListener('abort', () => {
            clearInterval(keepAliveInterval);
          });
          
        } catch (error) {
          console.error('[SSE] Error:', error);
          sendEvent(JSON.stringify({ type: 'error', message: `Stream error: ${error instanceof Error ? error.message : String(error)}` }));
          controller.close();
        }
      }
    });
    
    return new Response(stream, { headers });
    
  } catch (error) {
    console.error('[SSE] Server error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 