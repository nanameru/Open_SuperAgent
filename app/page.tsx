'use client';

import { useChat } from '@ai-sdk/react';
import { AppSidebar } from '@/components/app-sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from './components/ChatMessage';
import { PresentationTool } from './components/PresentationTool';
import { ImageTool } from './components/ImageTool';
import { BrowserbaseTool } from './components/BrowserbaseTool';
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
    // アシスタントメッセージからツール呼び出し情報を抽出
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    for (const msg of assistantMessages) {
      // ツール呼び出しを含むメッセージを処理
      if (msg.content && typeof msg.content === 'string') {
        try {
          // Browserbaseツールの結果を直接検出（マークダウンコンテンツから）
          if (msg.content.includes('ブラウザ自動化完了') || msg.content.includes('browserbase-automation')) {
            console.log("[Page] Browserbase tool result detected in message content");
            
            // セッションIDを抽出
            const sessionIdMatch = msg.content.match(/セッション:\s*([a-f0-9-]+)/i);
            const replayUrlMatch = msg.content.match(/\[操作記録を表示\]\((https:\/\/browserbase\.com\/sessions\/[^)]+)\)/);
            const liveViewUrlMatch = msg.content.match(/\[リアルタイム表示\]\((https:\/\/[^)]+)\)/);
            
            if (sessionIdMatch && replayUrlMatch) {
              const sessionId = sessionIdMatch[1];
              const replayUrl = replayUrlMatch[1];
              const liveViewUrl = liveViewUrlMatch ? liveViewUrlMatch[1] : undefined;
              
              console.log("[Page] Extracted Browserbase session info:", { sessionId, replayUrl, liveViewUrl });
              
              setBrowserbaseToolState(prev => ({
                ...prev,
                isActive: true,
                sessionId: sessionId,
                replayUrl: replayUrl,
                liveViewUrl: liveViewUrl,
                forcePanelOpen: true
              }));
            }
          }
          
          // ツール呼び出しの検出（JSONパース）
          if (msg.content.includes('toolName') || msg.content.includes('toolCallId')) {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.toolName || parsed.tool) {
                const toolName = parsed.toolName || parsed.tool;
                
                // Browserbaseツールの呼び出しを検出
                if (toolName === 'browserbase-automation') {
                  console.log("[Page] Browserbase tool call detected");
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true
                  }));
                }
                
                // htmlSlideToolの呼び出しを検出
                if (toolName === 'htmlSlideTool') {
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    title: parsed.args?.topic || prev.title
                  }));
                }
                
                // presentationPreviewToolの呼び出しを検出
                if (toolName === 'presentationPreviewTool' && parsed.args?.htmlContent) {
                  console.log("[Page] presentationPreviewTool call detected with HTML content");
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    htmlContent: parsed.args.htmlContent,
                    title: parsed.args.title || prev.title,
                    forcePanelOpen: true // 強制的にパネルを開くフラグをセット
                  }));
                }
                
                // 画像生成ツールの呼び出しを検出
                if (toolName === 'gemini-image-generation' || toolName === 'geminiImageGenerationTool' || toolName === 'imagen4-generation') {
                  console.log("[Page] Image generation tool call detected");
                  setImageToolState(prev => ({
                    ...prev,
                    isActive: true,
                    prompt: parsed.args?.prompt || '生成された画像'
                  }));
                }
                
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
                    console.log("[Page] メッセージからツール情報を抽出:", toolMessage);
                    return [...prev, toolMessage];
                  }
                  return prev;
                });
              }
              
              // ツール結果の処理
              if (parsed.type === 'tool-result' && parsed.toolName) {
                // HTMLスライドツールの結果を検出した場合
                if (parsed.toolName === 'htmlSlideTool' && parsed.result?.htmlContent) {
                  setSlideToolState(prev => ({
                    ...prev,
                    htmlContent: parsed.result.htmlContent
                  }));
                }
                
                // プレゼンテーションプレビューツールの結果を検出した場合
                if (parsed.toolName === 'presentationPreviewTool' && parsed.result?.htmlContent) {
                  console.log("[Page] presentationPreviewTool result received with HTML content");
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    htmlContent: parsed.result.htmlContent,
                    title: parsed.result.title || prev.title,
                    forcePanelOpen: true // 強制的にパネルを開くフラグをセット
                  }));
                }
                
                // 画像生成ツールの結果を検出した場合
                if ((parsed.toolName === 'gemini-image-generation' || parsed.toolName === 'geminiImageGenerationTool' || parsed.toolName === 'imagen4-generation') && parsed.result?.images) {
                  console.log("[Page] Image generation tool result received");
                  const images = parsed.result.images || [];
                  const success = parsed.result.success || false;
                  const prompt = parsed.result.prompt || '生成された画像';
                  const title = parsed.result.title || prompt;
                  const autoOpenPreview = parsed.result.autoOpenPreview ?? true;
                  
                  if (success && images.length > 0) {
                    setImageToolState(prev => ({
                      ...prev,
                      isActive: true,
                      images: images,
                      prompt: title,
                      forcePanelOpen: autoOpenPreview // 自動オープンフラグに基づいてパネルを開く
                    }));
                  }
                }
                
                // ツール結果をツールメッセージに反映
                setToolMessages(prev => prev.map(m => 
                  m.toolName === parsed.toolName 
                    ? { ...m, content: `ツール結果 (${m.toolName}): ${JSON.stringify(parsed.result)}`, result: parsed.result } 
                    : m
                ));
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
                    console.log("[Page] 正規表現でツール情報を抽出:", toolMessage);
                    return [...prev, toolMessage];
                  }
                  return prev;
                });
              }
            }
          }
          
          // アノテーションからツール情報を抽出
          if (msg.annotations && Array.isArray(msg.annotations)) {
            msg.annotations.forEach((annotation: any) => {
              if (annotation.type === 'tool-call' && annotation.toolName) {
                const toolName = annotation.toolName;
                
                // htmlSlideToolの呼び出しを検出
                if (toolName === 'htmlSlideTool') {
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    title: annotation.args?.topic || prev.title
                  }));
                }
                
                // presentationPreviewToolの呼び出しを検出
                if (toolName === 'presentationPreviewTool' && annotation.args?.htmlContent) {
                  console.log("[Page] presentationPreviewTool annotation detected with HTML content");
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    htmlContent: annotation.args.htmlContent,
                    title: annotation.args.title || prev.title,
                    forcePanelOpen: true
                  }));
                }
                
                // 画像生成ツールの呼び出しを検出
                if (toolName === 'gemini-image-generation' || toolName === 'geminiImageGenerationTool' || toolName === 'imagen4-generation') {
                  console.log("[Page] Image generation tool annotation detected");
                  setImageToolState(prev => ({
                    ...prev,
                    isActive: true,
                    prompt: annotation.args?.prompt || '生成された画像'
                  }));
                }
                
                // Browserbaseツールの呼び出しを検出
                if (toolName === 'browserbase-automation') {
                  console.log("[Page] Browserbase tool annotation call detected");
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true
                  }));
                }
                
                // ツールメッセージを追加
                setToolMessages(prev => {
                  if (!prev.some(m => m.toolName === toolName)) {
                    const toolMessage: ToolMessage = {
                      id: annotation.toolCallId || `tool-anno-${Date.now()}`,
                      role: 'tool',
                      content: `Using Tool: ${toolName}`,
                      toolName: toolName,
                      createdAt: new Date(),
                    };
                    console.log("[Page] アノテーションからツール情報を抽出:", toolMessage);
                    return [...prev, toolMessage];
                  }
                  return prev;
                });
              }
              
              // ツール結果のアノテーション処理
              if (annotation.type === 'tool-result' && annotation.toolName) {
                // HTMLスライドツールの結果を検出した場合
                if (annotation.toolName === 'htmlSlideTool' && annotation.result?.htmlContent) {
                  setSlideToolState(prev => ({
                    ...prev,
                    htmlContent: annotation.result.htmlContent
                  }));
                }
                
                // プレゼンテーションプレビューツールの結果を検出した場合
                if (annotation.toolName === 'presentationPreviewTool' && annotation.result?.htmlContent) {
                  setSlideToolState(prev => ({
                    ...prev,
                    isActive: true,
                    htmlContent: annotation.result.htmlContent,
                    title: annotation.result.title || prev.title,
                    forcePanelOpen: true
                  }));
                }
                
                // 画像生成ツールの結果を検出した場合
                if ((annotation.toolName === 'gemini-image-generation' || annotation.toolName === 'geminiImageGenerationTool' || annotation.toolName === 'imagen4-generation') && annotation.result?.images) {
                  console.log("[Page] Image generation tool annotation result received");
                  const images = annotation.result.images || [];
                  const success = annotation.result.success || false;
                  const prompt = annotation.result.prompt || '生成された画像';
                  const title = annotation.result.title || prompt;
                  const autoOpenPreview = annotation.result.autoOpenPreview ?? true;
                  
                  if (success && images.length > 0) {
                    setImageToolState(prev => ({
                      ...prev,
                      isActive: true,
                      images: images,
                      prompt: title,
                      forcePanelOpen: autoOpenPreview // 自動オープンフラグに基づいてパネルを開く
                    }));
                  }
                }
                
                // Browserbaseツールの結果を検出した場合
                if (annotation.toolName === 'browserbase-automation' && annotation.result) {
                  console.log("[Page] Browserbase tool annotation result received");
                  const result = annotation.result;
                  const success = result.success || false;
                  const autoOpenPreview = result.autoOpenPreview ?? true;
                  
                  if (success && result.sessionId) {
                    setBrowserbaseToolState(prev => ({
                      ...prev,
                      isActive: true,
                      sessionId: result.sessionId,
                      replayUrl: result.replayUrl,
                      liveViewUrl: result.liveViewUrl,
                      screenshot: result.screenshot,
                      pageTitle: result.pageTitle,
                      elementText: result.elementText,
                      forcePanelOpen: autoOpenPreview
                    }));
                  }
                }
                
                // ツール結果をツールメッセージに反映
                setToolMessages(prev => prev.map(m => 
                  m.toolName === annotation.toolName 
                    ? { ...m, content: `ツール結果 (${m.toolName}): ${JSON.stringify(annotation.result)}`, result: annotation.result } 
                    : m
                ));
              }
            });
          }
        } catch (e) {
          // 解析エラーは無視
          console.error("[Page] ツール情報抽出エラー:", e);
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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MainHeader />
        <div className="flex-1 flex overflow-hidden">
          {/* メインチャットエリア */}
          <main className={`flex-1 flex flex-col overflow-y-auto bg-white pb-24 transition-all duration-300 ${
            browserbaseToolState.isActive && browserbaseToolState.sessionId ? 'mr-96' : ''
          }`}>
            <div className="w-full flex-1 flex flex-col px-6 py-6 max-w-4xl mx-auto">
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
                    />
                  ))}
                </div>
              </div>
            </div>

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
          </main>

          {/* Browserbaseツールサイドパネル - ツール実行時のみ表示 */}
          {browserbaseToolState.isActive && browserbaseToolState.sessionId && (
            <div className="w-96 bg-gray-50 border-l border-gray-200 overflow-y-auto">
              <div className="p-4">
                <BrowserbaseTool 
                  sessionId={browserbaseToolState.sessionId}
                  replayUrl={browserbaseToolState.replayUrl}
                  liveViewUrl={browserbaseToolState.liveViewUrl}
                  screenshot={browserbaseToolState.screenshot}
                  pageTitle={browserbaseToolState.pageTitle}
                  elementText={browserbaseToolState.elementText}
                  autoOpenPreview={true}
                  forcePanelOpen={browserbaseToolState.forcePanelOpen}
                  onPreviewOpen={() => setIsPreviewOpen(true)}
                  onPreviewClose={() => setIsPreviewOpen(false)}
                  onPreviewWidthChange={handlePreviewPanelWidthChange}
                />
              </div>
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
