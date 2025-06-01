          'use client';

import { useChat } from '@ai-sdk/react';
import { AppSidebar } from '@/components/app-sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from './components/ChatMessage';
import { PresentationTool } from './components/PresentationTool';
import { ImageTool } from './components/ImageTool';
import { BrowserOperationSidebar } from './components/BrowserOperationSidebar';
import { useEffect, useState, useRef, useCallback, useOptimistic } from 'react';
import { Message } from 'ai';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

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

// 画像ツール関連の状態
interface ImageToolState {
  isActive: boolean;
  images: Array<{
    url: string;
    b64Json: string;
  }>;
  prompt: string;
  forcePanelOpen?: boolean; // プレビューパネルを強制的に開くフラグ
}

// Browserbaseツール関連の状態
interface BrowserbaseToolState {
  isActive: boolean;
  sessionId: string;
  replayUrl: string;
  liveViewUrl?: string;
  screenshot?: {
    url: string;
    path: string;
  };
  pageTitle?: string;
  elementText?: string;
  forcePanelOpen?: boolean; // プレビューパネルを強制的に開くフラグ
}

// メッセージの型（Message型とToolMessage型の両方を含む）
type UIMessage = Message | ToolMessage;

export default function AppPage() {
  // ツール実行メッセージを格納する状態
  const [toolMessages, setToolMessages] = useState<ToolMessage[]>([]);
  // 現在の会話ID（ストリームの再接続用）
  const [conversationId, setConversationId] = useState<string>(`conv-${Date.now()}`);
  // ブラウザ自動化パネルの表示状態
  const [showBrowserPanel, setShowBrowserPanel] = useState<boolean>(true);
  // スライドツール関連の状態
  const [slideToolState, setSlideToolState] = useState<SlideToolState>({
    isActive: false,
    htmlContent: '',
    title: '生成AIプレゼンテーション',
    forcePanelOpen: false
  });
  // 画像ツール関連の状態
  const [imageToolState, setImageToolState] = useState<ImageToolState>({
    isActive: false,
    images: [],
    prompt: '生成された画像',
    forcePanelOpen: false
  });
  // Browserbaseツール関連の状態
  const [browserbaseToolState, setBrowserbaseToolState] = useState<BrowserbaseToolState>({
    isActive: false,
    sessionId: '',
    replayUrl: '',
    liveViewUrl: undefined,
    screenshot: undefined,
    pageTitle: undefined,
    elementText: undefined,
    forcePanelOpen: false
  });
  // プレビューパネルの表示状態
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  // プレビューパネルの幅（％）
  const [previewPanelWidth, setPreviewPanelWidth] = useState<number>(50);
  
  // チャットの状態を保持するための参照
  const chatStateRef = useRef<{
    messages: Message[];
    input: string;
  }>({
    messages: [],
    input: '',
  });

  // 標準のuseChatフック
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit: originalHandleSubmit, 
    isLoading, 
    error, 
    data,
    setMessages: originalSetMessages,
    append: originalAppend,
    reload
  } = useChat({
    api: '/api/slide-creator/chat', // Mastra slideCreatorAgent を使用するエンドポイント
    id: conversationId,
    onFinish: (message) => {
      console.log('[Page] チャット完了:', message);
    },
    onResponse: (response) => {
      console.log('[Page] レスポンスステータス:', response.status);
    },
    onError: (error) => {
      console.error('[Page] チャットエラー:', error);
    }
  });

  // チャットの状態が変わったときに参照を更新する関数
  const updateChatStateRef = useCallback((messages: Message[], input: string) => {
    chatStateRef.current = {
      messages,
      input,
    };
  }, []);

  // チャットの状態が変わったときに参照を更新
  useEffect(() => {
    updateChatStateRef(messages, input);
  }, [messages, input, updateChatStateRef]);

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
      // 画像ツール状態もリセット
      setImageToolState({
        isActive: false,
        images: [],
        prompt: '生成された画像',
        forcePanelOpen: false
      });
      // Browserbaseツール状態もリセット
      setBrowserbaseToolState({
        isActive: false,
        sessionId: '',
        replayUrl: '',
        liveViewUrl: undefined,
        screenshot: undefined,
        pageTitle: undefined,
        elementText: undefined,
        forcePanelOpen: false
      });
    }
  }, [messages.length]);

  // ★ useOptimistic フックで一時的なメッセージリストを作成
  const [optimisticMessages, addOptimisticMessage] = useOptimistic<UIMessage[], UIMessage>(
    messages as UIMessage[], // useChat の messages をベースにする
    (currentState, optimisticValue) => {
      // currentState に既に同じIDのメッセージが存在するかチェック
      if (currentState.some(msg => msg.id === optimisticValue.id)) {
        // 存在する場合は、現在の状態をそのまま返す
        return currentState;
      } else {
        // 存在しない場合は、メッセージを追加
        return [
          ...currentState,
          optimisticValue 
        ];
      }
    }
  );

  // ユーザーメッセージの送信を処理するカスタムsubmitハンドラ
  const handleCustomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // ツールメッセージをリセット（新しい会話の開始）
    if (messages.length === 0) {
      setToolMessages([]);
      setConversationId(`conv-${Date.now()}`);
    }
    
    // 標準のhandleSubmitを実行
    originalHandleSubmit(e);
  };

  // メッセージからツール情報を抽出して処理
  useEffect(() => {
    // 全メッセージからツール呼び出し情報を抽出（アシスタントメッセージ以外も含む）
    const allMessages = messages;
    
    // デバッグ: 全メッセージの詳細をログ出力
    console.log("[Page] 全メッセージ詳細:", messages.map(m => ({
      id: m.id,
      role: m.role,
      content: typeof m.content === 'string' ? m.content.substring(0, 200) + '...' : m.content,
      annotations: m.annotations,
      toolInvocations: (m as any).toolInvocations
    })));
    
    // 🎯 browserAutomationTool実行検出は ChatMessage コンポーネントで処理されるため、
    // ここでは他のツールの処理のみを行う
    
    for (const msg of allMessages) {
      console.log("[Page] メッセージ詳細:", {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        annotations: msg.annotations,
        toolInvocations: (msg as any).toolInvocations
      });
      
      // ツール呼び出しを含むメッセージを処理
      if (msg.content && typeof msg.content === 'string') {
        try {
          // Brave検索ツールの結果を検出した場合
          if (msg.content.includes('brave-search') || msg.content.includes('braveSearchTool')) {
            console.log("[Page] Brave search tool result detected");
          }
          
          // その他のツール処理...
          
        } catch (error) {
          console.error("[Page] メッセージ処理エラー:", error);
        }
      }
    }
  }, [messages]);

  // デバッグ情報（開発モードのみ）
  useEffect(() => {
    console.log("[Page] 現在のツールメッセージ:", toolMessages);
  }, [toolMessages]);

  // Browserbaseツール状態のデバッグ
  useEffect(() => {
    console.log("[Page] Browserbaseツール状態:", browserbaseToolState);
  }, [browserbaseToolState]);

  // forcePanelOpenフラグが設定された時に自動的にプレビューパネルを開く
  useEffect(() => {
    if (browserbaseToolState.forcePanelOpen && browserbaseToolState.isActive) {
      console.log("[Page] Auto-opening preview panel due to forcePanelOpen flag");
      setIsPreviewOpen(true);
      // フラグをリセット（一度だけ実行）
      setBrowserbaseToolState(prev => ({
        ...prev,
        forcePanelOpen: false
      }));
    }
  }, [browserbaseToolState.forcePanelOpen, browserbaseToolState.isActive]);

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

  // Browserbaseプレビューを開く関数
  const handleBrowserbasePreview = useCallback((data: {
    sessionId: string;
    replayUrl: string;
    liveViewUrl?: string;
    pageTitle?: string;
  }) => {
    setBrowserbaseToolState({
      isActive: true,
      sessionId: data.sessionId,
      replayUrl: data.replayUrl,
      liveViewUrl: data.liveViewUrl,
      pageTitle: data.pageTitle,
      forcePanelOpen: true
    });
    setIsPreviewOpen(true);
  }, []);

  // Browser Automation Tool実行検知時の処理
  const handleBrowserAutomationDetected = useCallback((data: {
    sessionId: string;
    replayUrl: string;
    liveViewUrl?: string;
    pageTitle?: string;
    elementText?: string;
  }) => {
    console.log('[Page] Browser Automation Tool detected:', data);
    console.log('[Page] Setting browserbaseToolState to active...');
    
    setBrowserbaseToolState({
      isActive: true,
      sessionId: data.sessionId,
      replayUrl: data.replayUrl,
      liveViewUrl: data.liveViewUrl,
      pageTitle: data.pageTitle,
      elementText: data.elementText,
      forcePanelOpen: true
    });
    setIsPreviewOpen(true);
    
    console.log('[Page] BrowserOperationSidebar should now be visible in sidebar');
  }, []);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MainHeader />
        <div className="flex-1 flex overflow-hidden">
          {/* チャットエリア - 動的幅 */}
          <main className={`${showBrowserPanel ? 'w-1/2 border-r' : 'w-full'} flex flex-col overflow-y-auto bg-white pb-24 border-gray-200 transition-all duration-300`}>
            <div className="w-full flex-1 flex flex-col px-6 py-6">
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
              
              {/* 画像ツールがアクティブな場合に表示 */}
              {imageToolState.isActive && imageToolState.images.length > 0 && (
                <ImageTool 
                  images={imageToolState.images}
                  prompt={imageToolState.prompt}
                  autoOpenPreview={true} // 画像があれば自動的に開く
                  forcePanelOpen={imageToolState.forcePanelOpen} // 強制的にパネルを開くフラグ
                  onPreviewOpen={() => setIsPreviewOpen(true)}
                  onPreviewClose={() => setIsPreviewOpen(false)}
                  onPreviewWidthChange={handlePreviewPanelWidthChange}
                />
              )}
              
              {/* メッセージコンテナ - 常に同じ構造 */}
              <div className={`flex-1 flex flex-col ${combinedMessages.length === 0 ? 'justify-center items-center' : 'justify-end'}`}>
                <div className="space-y-0">
                  {combinedMessages.length === 0 && !isLoading && !error && (
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-center space-y-4">
                        <h1 className="text-3xl font-normal text-gray-800">Open-SuperAgent</h1>
                      </div>
                    </div>
                  )}
                  
                  {combinedMessages.map((m, i) => (
                    <ChatMessage 
                      key={`${m.id}-${i}`} 
                      message={m} 
                      onPreviewOpen={() => setIsPreviewOpen(true)}
                      onPreviewClose={() => setIsPreviewOpen(false)}
                      onPreviewWidthChange={handlePreviewPanelWidthChange}
                      onBrowserbasePreview={handleBrowserbasePreview}
                      onBrowserAutomationDetected={handleBrowserAutomationDetected}
                    />
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* ブラウザ操作サイドバー - 50% */}
          {showBrowserPanel && (
            <div className="w-1/2 bg-gray-50 border-l border-gray-200 relative">
              {/* 非表示ボタン */}
              <button
                onClick={() => setShowBrowserPanel(false)}
                className="absolute top-2 right-2 z-10 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
                title="ブラウザ自動化パネルを非表示"
              >
                <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              
              <BrowserOperationSidebar 
                sessionId={browserbaseToolState.sessionId || "default-session"}
                replayUrl={browserbaseToolState.replayUrl || ""}
                liveViewUrl={browserbaseToolState.liveViewUrl || ""}
                pageTitle={browserbaseToolState.pageTitle || "ブラウザ自動化パネル"}
                elementText={browserbaseToolState.elementText || "待機中"}
                autoOpenPreview={true}
                forcePanelOpen={true}
                onPreviewOpen={() => setIsPreviewOpen(true)}
                onPreviewClose={() => setIsPreviewOpen(false)}
                onPreviewWidthChange={handlePreviewPanelWidthChange}
              />
            </div>
          )}

          {/* パネルが非表示の時の再表示ボタン */}
          {!showBrowserPanel && (
            <button
              onClick={() => setShowBrowserPanel(true)}
              className="fixed right-4 top-20 z-10 p-3 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
              title="ブラウザ自動化パネルを表示"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m0 4v10m0 4v2m3-2v-2m0-4V7m0-4v2m3 2v2m0 4v10m0 4v2M4 7h16" />
              </svg>
            </button>
          )}

          {error && (
              <div className="p-4 text-center text-red-500 bg-red-100 rounded-md w-full max-w-3xl mx-auto">
                <p>Error: {error.message}</p>
                <p>Please check your API key and network connection.</p>
                <button 
                  onClick={() => {
                    // ツール状態をリセット
                    setSlideToolState({
                      isActive: false,
                      htmlContent: '',
                      title: '生成AIプレゼンテーション',
                      forcePanelOpen: false
                    });
                    setImageToolState({
                      isActive: false,
                      images: [],
                      prompt: '生成された画像',
                      forcePanelOpen: false
                    });
                    setBrowserbaseToolState({
                      isActive: false,
                      sessionId: '',
                      replayUrl: '',
                      liveViewUrl: undefined,
                      screenshot: undefined,
                      pageTitle: undefined,
                      elementText: undefined,
                      forcePanelOpen: false
                    });
                    console.log("ツール状態をリセットしました");
                  }}
                  className="mt-2 bg-white text-red-600 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50"
                >
                  状態をリセット
                </button>
              </div>
            )}
        </div>
        <ChatInputArea
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleCustomSubmit}
          isLoading={isLoading}
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
