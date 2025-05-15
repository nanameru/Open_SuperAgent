'use client';

import { useChat } from '@ai-sdk/react';
import { Sidebar } from '@/app/components/Sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from './components/ChatMessage';
import { useEffect, useState, useRef } from 'react';

// ツール実行メッセージ用の型
interface ToolMessage {
  id: string;
  role: 'tool';
  content: string;
  toolName: string;
  createdAt: Date;
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
      console.log("SSEリスナーを開始...");
      
      // 既存のリスナーをクリーンアップ
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      
      // 新しいリスナーを開始
      const eventSource = new EventSource('/api/slide-creator/chat/events');
      eventSourceRef.current = eventSource;
      
      eventSource.onmessage = (event) => {
        try {
          // ストリームデータを解析
          const data = event.data;
          console.log("SSEイベント受信:", data);
          
          // pingイベントとconnectイベントは無視
          if (data.includes('"type":"ping"') || data.includes('"type":"connect"')) {
            return;
          }
          
          // JSONを解析
          try {
            const parsed = JSON.parse(data);
            
            // toolNameがあればToolMessageを作成
            if (parsed.toolName || parsed.tool) {
              // ツール検出フラグを設定
              setToolEventDetected(true);
              
              const toolName = parsed.toolName || parsed.tool;
              console.log(`[Page] ツール検出: ${toolName}`);
              
              const toolMessage: ToolMessage = {
                id: parsed.toolCallId || `tool-${Date.now()}`,
                role: 'tool',
                content: `Using Tool: ${toolName}`,
                toolName: toolName,
                createdAt: new Date(),
              };
              
              // 重複していなければ追加
              setToolMessages(prev => {
                if (!prev.some(m => m.toolName === toolMessage.toolName)) {
                  console.log("ツールメッセージを追加:", toolMessage);
                  return [...prev, toolMessage];
                }
                return prev;
              });
            }
          } catch (e) {
            // JSON解析エラーは無視
            console.warn("SSEデータのJSON解析エラー:", e);
          }
        } catch (e) {
          console.error("SSEイベント処理エラー:", e);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error("SSEエラー:", error);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
          
          // 3秒後に再接続を試みる
          setTimeout(() => {
            connectToStream();
          }, 3000);
        }
      };
      
    } catch (e) {
      console.error("SSE接続エラー:", e);
    }
  };

  // 独自のSSEリスナーでtoolNameを検出
  useEffect(() => {
    connectToStream();
    
    // クリーンアップ関数
    return () => {
      if (eventSourceRef.current) {
        console.log("SSEリスナーを終了");
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [lastUserMessageTimestamp, conversationId]); // タイムスタンプが変わったら再接続

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

  return (
    <div className="flex h-screen bg-white antialiased">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden bg-white">
        <MainHeader />
        <main className="flex-1 flex flex-col p-6 overflow-y-auto">
          {toolEventDetected && (
            <div className="fixed top-4 right-4 bg-green-100 text-green-800 px-3 py-1 rounded shadow text-sm animate-fadeIn">
              ツール実行を検出しました
            </div>
          )}
          
          <div className="w-full max-w-4xl mx-auto space-y-4 flex-grow mb-4 flex flex-col justify-end">
            {combinedMessages.length === 0 && !isLoading && !error && (
              <div className="flex-grow flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold text-gray-700">Welcome to Open-SuperAgent</h1>
                <p className="text-gray-500 mt-2">How can I assist you today?</p>
              </div>
            )}
            {combinedMessages.map((m, i) => (
              <ChatMessage key={`${m.id}-${i}`} message={m} />
            ))}
          </div>

          {error && (
            <div className="p-4 text-center text-red-500 bg-red-100 rounded-md w-full max-w-3xl mx-auto">
              <p>Error: {error.message}</p>
              <p>Please check your API key and network connection.</p>
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
