'use client';

import { useChat } from '@ai-sdk/react';
import { Sidebar } from '@/app/components/Sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from './components/ChatMessage';
import { PresentationTool } from './components/PresentationTool';
import { useEffect, useState, useRef, useCallback } from 'react';

// ツール実行メッセージ用の型
interface ToolMessage {
  id: string;
  role: 'tool';
  content: string;
  toolName: string;
  createdAt: Date;
  result?: any; // ツール実行結果を保存
}

// スライドツール関連の状態
interface SlideToolState {
  isActive: boolean;
  htmlContent: string;
  title: string;
  forcePanelOpen?: boolean; // プレビューパネルを強制的に開くフラグ
}

export default function AppPage() {
  // ツール実行メッセージを格納する状態
  const [toolMessages, setToolMessages] = useState<ToolMessage[]>([]);
  // 現在の会話ID（ストリームの再接続用）
  const [conversationId, setConversationId] = useState<string>(`conv-${Date.now()}`);
  // 直前のユーザーメッセージのタイムスタンプ
  const [lastUserMessageTimestamp, setLastUserMessageTimestamp] = useState<number>(0);
  // EventSourceへの参照を保持
  const eventSourceRef = useRef<EventSource | null>(null);
  // ツールイベントを検出したかどうか（デバッグ用）
  const [toolEventDetected, setToolEventDetected] = useState<boolean>(false);
  // スライドツール関連の状態
  const [slideToolState, setSlideToolState] = useState<SlideToolState>({
    isActive: false,
    htmlContent: '',
    title: '生成AIプレゼンテーション',
    forcePanelOpen: false
  });
  // プレビューパネルの表示状態
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  // プレビューパネルの幅（％）
  const [previewPanelWidth, setPreviewPanelWidth] = useState<number>(50);
  
  // 標準のuseChatフック
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/slide-creator/chat', // Default API endpoint
    onFinish: () => {
      // チャット完了時にはしばらく待ってからSSE接続を再確立（ツール実行の検出のため）
      setTimeout(() => {
        // 古い接続を閉じて新しい接続を確立
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        connectToStream();
      }, 1000);
    }
  });

  // 会話がリセットされたらツールメッセージもクリア
  useEffect(() => {
    if (messages.length === 0) {
      setToolMessages([]);
      setConversationId(`conv-${Date.now()}`);
      // スライドツール状態もリセット
      setSlideToolState({
        isActive: false,
        htmlContent: '',
        title: '生成AIプレゼンテーション',
        forcePanelOpen: false
      });
    }
  }, [messages.length]);

  // ユーザーメッセージ送信時のタイムスタンプを記録
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 0) {
      const lastUserMsg = userMessages[userMessages.length - 1];
      setLastUserMessageTimestamp(new Date(lastUserMsg.createdAt || Date.now()).getTime());
    }
  }, [messages]);

  // ユーザーメッセージの送信を処理するカスタムsubmitハンドラ
  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // ツールメッセージをリセット（新しい会話の開始）
    if (messages.length === 0) {
      setToolMessages([]);
      setConversationId(`conv-${Date.now()}`);
    }
    
    // 標準のhandleSubmitを実行
    handleSubmit(e);
    
    // 現在時刻をタイムスタンプとして記録（SSEリスナー用）
    setLastUserMessageTimestamp(Date.now());
    
    // ツールイベント検出フラグをリセット
    setToolEventDetected(false);
  };

  // SSEストリームに接続する関数
  const connectToStream = () => {
    try {
      console.log("[Page] SSE接続を開始します (ドキュメント準拠リスナー). Conversation ID:", conversationId);
      
      if (eventSourceRef.current) {
        console.log("[Page] 既存のEventSource接続を閉じます。");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      const eventSource = new EventSource('/api/slide-creator/chat/events'); // APIルートは変更なし
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log("[Page] SSE接続が開きました (onopen).");
      };

      eventSource.addEventListener('text', (event: Event) => {
        const messageEvent = event as MessageEvent;
        console.log("[Page] SSE event 'text':", messageEvent.data);
        try {
          if (typeof messageEvent.data === 'string' && messageEvent.data.trim() !== '') {
            const parsed = JSON.parse(messageEvent.data);
            if (parsed.type === 'text' && parsed.text) {
              console.log("[Page] Text chunk received:", parsed.text);
            }
          } else {
            console.warn("[Page] Received 'text' event with undefined, null, or empty data. Skipping parse. Raw data:", messageEvent.data);
          }
        } catch (e) {
          console.error("[Page] Error parsing 'text' event data:", e, "Raw data:", messageEvent.data);
        }
      });

      eventSource.addEventListener('tool_call', (event: Event) => { 
        const messageEvent = event as MessageEvent;
        console.log("[Page] SSE event 'tool_call':", messageEvent.data);
        try {
          if (typeof messageEvent.data === 'string' && messageEvent.data.trim() !== '') {
            const parsed = JSON.parse(messageEvent.data);
            if (parsed.type === 'tool-call' && parsed.toolName && parsed.toolCallId) {
              setToolEventDetected(true);
              const toolMessage: ToolMessage = {
                id: parsed.toolCallId,
                role: 'tool' as const,
                content: `ツール実行中: ${parsed.toolName} (詳細: ${JSON.stringify(parsed.args || {})})`,
                toolName: parsed.toolName,
                createdAt: new Date(),
              };
              
              // htmlSlideToolの呼び出しを検出
              if (parsed.toolName === 'htmlSlideTool') {
                setSlideToolState(prev => ({
                  ...prev,
                  isActive: true,
                  title: parsed.args?.topic || prev.title
                }));
              }
              
              // presentationPreviewToolの呼び出しを検出
              if (parsed.toolName === 'presentationPreviewTool' && parsed.args?.htmlContent) {
                console.log("[Page] presentationPreviewTool call detected with HTML content");
                setSlideToolState(prev => ({
                  ...prev,
                  isActive: true,
                  htmlContent: parsed.args.htmlContent,
                  title: parsed.args.title || prev.title,
                  forcePanelOpen: true // 強制的にパネルを開くフラグをセット
                }));
              }
              
              setToolMessages(prev => {
                if (!prev.some(m => m.id === toolMessage.id)) {
                  console.log("[Page] ツール呼び出しメッセージを追加:", toolMessage);
                  return [...prev, toolMessage];
                }
                return prev;
              });
            }
          } else {
            console.warn("[Page] Received 'tool_call' event with undefined, null, or empty data. Skipping parse. Raw data:", messageEvent.data);
          }
        } catch (e) {
          console.error("[Page] Error parsing 'tool_call' event data:", e, "Raw data:", messageEvent.data);
        }
      });

      eventSource.addEventListener('tool_result', (event: Event) => { 
        const messageEvent = event as MessageEvent;
        console.log("[Page] SSE event 'tool_result':", messageEvent.data);
        try {
          if (typeof messageEvent.data === 'string' && messageEvent.data.trim() !== '') {
            const parsed = JSON.parse(messageEvent.data);
            if (parsed.type === 'tool-result' && parsed.toolCallId) {
              console.log("[Page] ツール結果受信:", parsed);
              
              // HTMLスライドツールの結果を検出した場合
              if (parsed.toolName === 'htmlSlideTool' && parsed.result?.htmlContent) {
                setSlideToolState(prev => ({
                  ...prev,
                  htmlContent: parsed.result.htmlContent
                }));
              }
              
              // プレゼンテーションプレビューツールの結果を検出した場合
              if (parsed.toolName === 'presentationPreviewTool' && parsed.result?.htmlContent) {
                console.log("[Page] presentationPreviewTool result received with HTML content:", parsed.result.htmlContent.substring(0, 50) + "...");
                setSlideToolState(prev => ({
                  ...prev,
                  isActive: true,
                  htmlContent: parsed.result.htmlContent,
                  title: parsed.result.title || prev.title,
                  forcePanelOpen: true // 強制的にパネルを開くフラグをセット
                }));
              }
              
              setToolMessages(prev => prev.map(m => 
                m.id === parsed.toolCallId 
                  ? { ...m, content: `ツール結果 (${m.toolName}): ${JSON.stringify(parsed.result)}`, result: parsed.result } 
                  : m
              ));
            }
          } else {
            console.warn("[Page] Received 'tool_result' event with undefined, null, or empty data. Skipping parse. Raw data:", messageEvent.data);
          }
        } catch (e) {
          console.error("[Page] Error parsing 'tool_result' event data:", e, "Raw data:", messageEvent.data);
        }
      });

      eventSource.addEventListener('error', (event: Event) => {
        const messageEvent = event as MessageEvent;
        console.warn("[Page] SSE 'error' event (from server logic):", messageEvent.data);
        try {
          if (typeof messageEvent.data === 'string' && messageEvent.data.trim() !== '') {
            const parsed = JSON.parse(messageEvent.data);
            if (parsed.type === 'error' && parsed.message) {
              console.error("[Page] Server-sent error message:", parsed.message);
            }
          } else {
            console.warn("[Page] Received server-sent 'error' event with undefined, null, or empty data. Skipping parse. Raw data:", messageEvent.data);
          }
        } catch (e) {
          console.error("[Page] Error parsing server-sent 'error' event data:", e, "Raw data:", messageEvent.data);
        }
      });
      
      eventSource.onerror = (errorEvent: Event) => { // 接続全体のエラー (ネットワーク等)
        console.error("[Page] SSE接続エラー (onerror):", errorEvent);
        if (eventSourceRef.current) {
          if (eventSourceRef.current.readyState === EventSource.CLOSED) {
            console.log("[Page] SSE接続は正常に閉じられました (onerror, readyState: CLOSED).");
          } else {
            console.warn("[Page] SSE接続で問題が発生しました。readyState:", eventSourceRef.current.readyState);
          }
        }
      };
      
    } catch (e) {
      console.error("[Page] EventSourceのセットアップ中にエラーが発生しました:", e);
    }
  };

  // useEffectフックでconnectToStreamを呼び出す部分は変更なしで良いが、
  // 依存配列 (lastUserMessageTimestamp, conversationId) が適切か確認。
  useEffect(() => {
    connectToStream();
    return () => {
      if (eventSourceRef.current) {
        console.log("[Page] SSEリスナーをクリーンアップします。");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // 依存配列を conversationId のみに変更 (lastUserMessageTimestamp は乱発の可能性)

  // メッセージからツール情報を抽出
  useEffect(() => {
    // assistantメッセージからツール情報を抽出
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    for (const msg of assistantMessages) {
      // まだ解析していないアシスタントメッセージを処理
      if (typeof msg.content === 'string') {
        try {
          // JSONとして解析を試みる
          if (msg.content.includes('toolName') || msg.content.includes('toolCallId')) {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.toolName || parsed.tool) {
                const toolName = parsed.toolName || parsed.tool;
                
                // 既に同じツール名のメッセージがなければ追加
                setToolMessages(prev => {
                  if (!prev.some(m => m.toolName === toolName)) {
                    const toolMessage: ToolMessage = {
                      id: parsed.toolCallId || `tool-msg-${Date.now()}`,
                      role: 'tool',
                      content: `Using Tool: ${toolName}`,
                      toolName: toolName,
                      createdAt: new Date(),
                    };
                    console.log("メッセージからツール情報を抽出:", toolMessage);
                    return [...prev, toolMessage];
                  }
                  return prev;
                });
              }
            } catch (e) {
              // JSON解析に失敗した場合、正規表現でツール名を抽出
              const toolNameMatch = msg.content.match(/"toolName"\s*:\s*"([^"]+)"/);
              if (toolNameMatch && toolNameMatch[1]) {
                const toolName = toolNameMatch[1];
                
                // 既に同じツール名のメッセージがなければ追加
                setToolMessages(prev => {
                  if (!prev.some(m => m.toolName === toolName)) {
                    const toolMessage: ToolMessage = {
                      id: `tool-regex-${Date.now()}`,
                      role: 'tool',
                      content: `Using Tool: ${toolName}`,
                      toolName: toolName,
                      createdAt: new Date(),
                    };
                    console.log("正規表現でツール情報を抽出:", toolMessage);
                    return [...prev, toolMessage];
                  }
                  return prev;
                });
              }
            }
          }
        } catch (e) {
          // 解析エラーは無視
        }
      }
    }
  }, [messages]);

  // デバッグ情報（開発モードのみ）
  useEffect(() => {
    console.log("現在のツールメッセージ:", toolMessages);
  }, [toolMessages]);

  // useChatのメッセージとツールメッセージを結合して時系列順に表示
  const combinedMessages = [...messages];
  
  // ツールメッセージを正しい位置に挿入
  if (toolMessages.length > 0) {
    // 各ツールメッセージについて最適な挿入位置を見つける
    toolMessages.forEach(toolMsg => {
      // 重複チェック（既に同じツール名のメッセージが挿入済みかどうか）
      const isDuplicate = combinedMessages.some(
        m => (m as any).role === 'tool' && (m as any).toolName === toolMsg.toolName
      );
      
      if (!isDuplicate) {
        // 挿入位置: ユーザーメッセージの直後
        const userMsgIndex = combinedMessages.findIndex(m => m.role === 'user');
        
        if (userMsgIndex !== -1) {
          // ユーザーメッセージの直後に挿入
          combinedMessages.splice(userMsgIndex + 1, 0, toolMsg as any);
        } else {
          // ユーザーメッセージが見つからない場合は先頭に挿入
          combinedMessages.unshift(toolMsg as any);
        }
      }
    });
  }

  // プレビューパネルの幅変更を処理する関数
  const handlePreviewPanelWidthChange = useCallback((width: number) => {
    setPreviewPanelWidth(width);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 antialiased">
      <Sidebar />
      <div 
        className={`flex flex-col flex-1 overflow-hidden bg-white transition-all duration-300`}
        style={{ 
          marginRight: isPreviewOpen ? `${previewPanelWidth}%` : '0' 
        }}
      >
        <MainHeader />
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          {toolEventDetected && (
            <div className="fixed top-4 right-4 bg-gray-100 text-gray-800 px-3 py-1 rounded shadow text-sm animate-fadeIn">
              ツール実行を検出しました
            </div>
          )}
          
          <div className="w-full max-w-4xl mx-auto space-y-4 flex-grow mb-4 flex flex-col justify-end">
            {/* スライドツールがアクティブな場合に表示 */}
            {slideToolState.isActive && (
              <PresentationTool 
                htmlContent={slideToolState.htmlContent}
                title={slideToolState.title}
                autoOpenPreview={slideToolState.htmlContent !== ''} // HTMLコンテンツがある場合に自動的に開く
                forcePanelOpen={slideToolState.forcePanelOpen} // 強制的にパネルを開くフラグ
                onPreviewOpen={() => setIsPreviewOpen(true)}
                onPreviewClose={() => setIsPreviewOpen(false)}
                onCreatePresentation={() => {
                  // スライド編集機能を開く
                  console.log("Edit in AI Slides clicked");
                }}
              />
            )}
            
            {combinedMessages.length === 0 && !isLoading && !error && (
              <div className="flex-grow flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold text-gray-700">プレゼンテーションAIアシスタント</h1>
                <p className="text-gray-500 mt-2">「生成AIについてのプレゼンテーションを作成して」などと指示してください</p>
              </div>
            )}
            {combinedMessages.map((m, i) => (
              <ChatMessage 
                key={`${m.id}-${i}`} 
                message={m} 
                onPreviewOpen={() => setIsPreviewOpen(true)}
                onPreviewClose={() => setIsPreviewOpen(false)}
                onPreviewWidthChange={handlePreviewPanelWidthChange}
              />
            ))}
          </div>

          {error && (
            <div className="p-4 text-center text-red-500 bg-red-100 rounded-md w-full max-w-3xl mx-auto">
              <p>Error: {error.message}</p>
              <p>Please check your API key and network connection.</p>
              <button 
                onClick={() => {
                  // スライド状態をリセット
                  setSlideToolState({
                    isActive: false,
                    htmlContent: '',
                    title: '生成AIプレゼンテーション',
                    forcePanelOpen: false
                  });
                  console.log("スライド状態をリセットしました");
                }}
                className="mt-2 bg-white text-red-600 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50"
              >
                スライド状態をリセット
              </button>
            </div>
          )}
        </main>
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleCustomSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
