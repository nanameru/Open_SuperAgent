'use client';

import { useChat } from '@ai-sdk/react';
import { Sidebar } from '@/app/components/Sidebar';
import { MainHeader } from '@/app/components/MainHeader';
import { ChatInputArea } from '@/app/components/ChatInputArea';
import { ChatMessage } from './components/ChatMessage';
import { PresentationTool } from './components/PresentationTool';
import { useEffect, useState, useRef, useCallback, useOptimistic } from 'react';
import { Message } from 'ai';
import { ImagePreviewPanel } from './components/ImagePreviewPanel';

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

// 画像プレビュー関連の状態
interface ImagePreviewState {
  isActive: boolean;
  images: Array<{
    url: string;
    b64Json: string;
  }>;
  title: string;
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
  // 画像プレビュー関連の状態
  const [imagePreviewState, setImagePreviewState] = useState<ImagePreviewState>({
    isActive: false,
    images: [],
    title: '生成された画像'
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
      // 画像プレビュー状態もリセット
      setImagePreviewState({
        isActive: false,
        images: [],
        title: '生成された画像'
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
          // ツール呼び出しの検出（JSONパース）
          if (msg.content.includes('toolName') || msg.content.includes('toolCallId')) {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.toolName || parsed.tool) {
                const toolName = parsed.toolName || parsed.tool;
                
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
                if (parsed.toolName === 'gemini-image-generation' && parsed.result?.images && parsed.result.images.length > 0) {
                  console.log("[Page] gemini-image-generation result received with images");
                  setImagePreviewState(prev => ({
                    ...prev,
                    isActive: true,
                    images: parsed.result.images,
                    title: `生成された画像 (${parsed.result.images.length}枚)`
                  }));
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
                if (annotation.toolName === 'gemini-image-generation' && annotation.result?.images && annotation.result.images.length > 0) {
                  console.log("[Page] gemini-image-generation annotation result received with images");
                  setImagePreviewState(prev => ({
                    ...prev,
                    isActive: true,
                    images: annotation.result.images,
                    title: `生成された画像 (${annotation.result.images.length}枚)`
                  }));
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
  
  // 画像プレビューパネルを開く
  const handleOpenImagePreview = useCallback(() => {
    if (imagePreviewState.images.length > 0) {
      setIsPreviewOpen(true);
    }
  }, [imagePreviewState.images]);
  
  // 画像プレビューパネルを閉じる
  const handleCloseImagePreview = useCallback(() => {
    setIsPreviewOpen(false);
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
            
            {/* 画像生成ツールの結果がある場合に表示するボタン */}
            {imagePreviewState.isActive && imagePreviewState.images.length > 0 && (
              <div className="flex justify-center my-4">
                <button 
                  onClick={handleOpenImagePreview}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-md shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  {imagePreviewState.images.length === 1 ? '生成された画像を表示' : `生成された画像を表示 (${imagePreviewState.images.length}枚)`}
                </button>
              </div>
            )}
            
            {combinedMessages.length === 0 && !isLoading && !error && (
              <div className="flex-grow flex flex-col items-center justify-center">
                <h1 className="text-2xl font-semibold text-gray-700">Open-SuperAgent</h1>
                <p className="text-gray-500 mt-2">OpenなSuperAgentです！なんでもできるので何か指示してください！たとえば、生成AIについて調べてプレゼンテーションを作成して。など。</p>
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
                  // 画像プレビュー状態もリセット
                  setImagePreviewState({
                    isActive: false,
                    images: [],
                    title: '生成された画像'
                  });
                  console.log("状態をリセットしました");
                }}
                className="mt-2 bg-white text-red-600 border border-red-300 px-4 py-2 rounded-md hover:bg-red-50"
              >
                状態をリセット
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
      
      {/* 画像プレビューパネル */}
      {imagePreviewState.isActive && (
        <ImagePreviewPanel
          images={imagePreviewState.images}
          title={imagePreviewState.title}
          isOpen={isPreviewOpen}
          onClose={handleCloseImagePreview}
          onWidthChange={handlePreviewPanelWidthChange}
        />
      )}
    </div>
  );
}
