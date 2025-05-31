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
    
    // 🎯 browserAutomationTool実行検出
    if (messages.length > 0 && !browserbaseToolState.isActive) {
      const lastMessage = messages[messages.length - 1];
      console.log("[Page] 🔍 Checking last message for browser automation:", lastMessage);
      
      // メッセージ内容からbrowserAutomationTool実行を検出
      if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content) {
        const messageContent = typeof lastMessage.content === 'string' ? lastMessage.content : JSON.stringify(lastMessage.content);
        
        // ブラウザ自動化関連のキーワードを検出
        const browserAutomationKeywords = [
          'browser-automation-tool',
          'browserAutomationTool',
          'BrowserAutomationTool',
          'ブラウザ自動化',
          'browser automation',
          'Stagehand',
          'Browserbase',
          'セッション作成',
          'Session created',
          'Live View URL'
        ];
        
        const containsBrowserAutomation = browserAutomationKeywords.some(keyword => 
          messageContent.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (containsBrowserAutomation) {
          console.log("[Page] 🎯 Browser Automation Tool detected in message - ACTIVATING PANEL");
          
          // セッションIDを抽出（可能であれば）
          const sessionIdMatch = messageContent.match(/(?:セッション|session|Session)[:\s]*([a-f0-9-]{8,})/i);
          const replayUrlMatch = messageContent.match(/(https:\/\/browserbase\.com\/sessions\/[a-f0-9-]+)/i);
          const liveViewUrlMatch = messageContent.match(/(https:\/\/[^\\s]+devtools-fullscreen[^\\s]*)/i);
          
          setBrowserbaseToolState(prev => ({
            ...prev,
            isActive: true,
            sessionId: sessionIdMatch ? sessionIdMatch[1] : `detected-${Date.now()}`,
            replayUrl: replayUrlMatch ? replayUrlMatch[1] : 'https://browserbase.com/sessions/detected',
            liveViewUrl: liveViewUrlMatch ? liveViewUrlMatch[1] : undefined,
            pageTitle: 'ブラウザ自動化実行中',
            elementText: 'ブラウザ自動化ツールが実行されました',
            forcePanelOpen: true
          }));
          setIsPreviewOpen(true);
        }
      }
    }

    // デバッグ: browser-automation-toolを含むメッセージを特別にログ出力
    const browserToolMessages = messages.filter(m => 
      (m.content && typeof m.content === 'string' && m.content.includes('browser-automation-tool')) ||
      ((m as any).toolInvocations && Array.isArray((m as any).toolInvocations) && 
       (m as any).toolInvocations.some((inv: any) => inv.toolName === 'browser-automation-tool'))
    );
    if (browserToolMessages.length > 0) {
      console.log("[Page] Browser Automation Tool関連メッセージ:", browserToolMessages);
      
      // 強制表示: browser-automation-toolが検出されたら即座に表示
      if (!browserbaseToolState.isActive) {
        console.log("[Page] 強制表示: Browser Automation Tool detected, activating panel");
        setBrowserbaseToolState(prev => ({
          ...prev,
          isActive: true,
          sessionId: `forced-${Date.now()}`,
          replayUrl: '#forced-activation',
          pageTitle: 'ブラウザ自動化ツール実行中...',
          elementText: 'ツールが実行されました',
          forcePanelOpen: true
        }));
        setIsPreviewOpen(true);
      }
    }
    
    for (const msg of allMessages) {
      console.log("[Page] メッセージ詳細:", {
        id: msg.id,
        role: msg.role,
        content: msg.content,
        annotations: msg.annotations,
        toolInvocations: (msg as any).toolInvocations
      });
      
      // ツール開始の即座検出（toolInvocationsから）
      if ((msg as any).toolInvocations && Array.isArray((msg as any).toolInvocations)) {
        for (const invocation of (msg as any).toolInvocations) {
          if (invocation.toolName === 'browser-automation-tool') {
            console.log("[Page] ✅ Browser Automation Tool invocation detected - ACTIVATING PANEL:", invocation);
            
            // ツール開始時に即座に表示（必ず表示）
            setBrowserbaseToolState(prev => ({
              ...prev,
              isActive: true,
              sessionId: `starting-${Date.now()}`,
              replayUrl: '#starting',
              pageTitle: 'ブラウザ自動化開始中...',
              elementText: invocation.args?.task?.substring(0, 100) + '...' || 'ブラウザ自動化タスクを実行中...',
              forcePanelOpen: true
            }));
            setIsPreviewOpen(true);
            
            console.log("[Page] ✅ Panel activated for browser automation tool");
            
            // 結果がある場合は詳細情報を更新
            if (invocation.result) {
              const result = invocation.result;
              console.log("[Page] Browser Automation Tool result:", result);
              setBrowserbaseToolState(prev => ({
                ...prev,
                sessionId: result.sessionId || prev.sessionId,
                replayUrl: result.replayUrl || prev.replayUrl,
                liveViewUrl: result.liveViewUrl || prev.liveViewUrl,
                screenshot: result.screenshot || prev.screenshot,
                pageTitle: result.pageTitle || prev.pageTitle,
                elementText: result.elementText || prev.elementText,
              }));
            }
          }
        }
      }
      
      // Stagehandエージェントの実行を検出
      if (msg.content && typeof msg.content === 'string') {
        // ブラウザ操作に関連するキーワードを検出
        const browserKeywords = [
          'ブラウザ', 'browser', 'ウェブサイト', 'website', 'ページ', 'page',
          '検索', 'search', 'クリック', 'click', '入力', 'type', 'input',
          'スクリーンショット', 'screenshot', '自動化', 'automation',
          'ナビゲート', 'navigate', '操作', 'operate', 'アクセス', 'access'
        ];
        
        const containsBrowserKeywords = browserKeywords.some(keyword => 
          msg.content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        if (containsBrowserKeywords && !browserbaseToolState.isActive) {
          console.log("[Page] Browser operation detected");
          // 注意: executeStagehandAgent関数は削除されました
          // 現在はMastraのbrowser-automation-toolを使用しています
        }
      }
      

      
      // ツール呼び出しを含むメッセージを処理
      if (msg.content && typeof msg.content === 'string') {
        try {
          // Browser Automation Toolの結果を直接検出（マークダウンコンテンツから）
          if (msg.content.includes('ブラウザ自動化実行結果') || 
              msg.content.includes('browser-automation-tool')) {
            console.log("[Page] Browser Automation Tool result detected in message content");
            
            // セッションIDを抽出（より柔軟なパターン）
            const sessionIdMatch = msg.content.match(/(?:セッション|session|Session)[:\s]*([a-f0-9-]{8,})/i);
            const replayUrlMatch = msg.content.match(/(?:\[セッションリプレイを表示\]|replayUrl|replay)\(?(https:\/\/[^)\s]+)/i);
            const liveViewUrlMatch = msg.content.match(/(?:\[ライブビューを表示\]|liveViewUrl|live)\(?(https:\/\/[^)\s]+)/i);
            
            // セッション情報があってもなくても表示
            const sessionId = sessionIdMatch ? sessionIdMatch[1] : `extracted-${Date.now()}`;
            const replayUrl = replayUrlMatch ? replayUrlMatch[1] : `#replay-${Date.now()}`;
            const liveViewUrl = liveViewUrlMatch ? liveViewUrlMatch[1] : undefined;
            
            console.log("[Page] Extracted Browser Automation session info:", { sessionId, replayUrl, liveViewUrl });
            
            setBrowserbaseToolState(prev => ({
              ...prev,
              isActive: true,
              sessionId: sessionId,
              replayUrl: replayUrl,
              liveViewUrl: liveViewUrl,
              pageTitle: 'ブラウザ自動化結果',
              elementText: 'マークダウンコンテンツから検出',
              forcePanelOpen: true
            }));
            
            setIsPreviewOpen(true);
          }
          
          // Browser Automation Toolの実行開始を直接検出（メッセージ内容から）
          if (msg.content.includes('browser-automation-tool')) {
            console.log("[Page] Browser Automation Tool execution started - detected in message content");
            setBrowserbaseToolState(prev => ({
              ...prev,
              isActive: true,
              sessionId: `content-starting-${Date.now()}`,
              replayUrl: '#content-starting',
              pageTitle: 'ブラウザ自動化開始中...',
              elementText: 'ツール実行を開始しました...',
              forcePanelOpen: true
            }));
            
            // プレビューパネルも自動的に開く
            setIsPreviewOpen(true);
          }
          
          // さらに強力な検出: Browser Automation関連のキーワードを検出
          const browserAutomationKeywords = [
            'BrowserAutomationTool',
            'browser automation',
            'ブラウザ自動化',
            'Stagehand',
            'Browserbase'
          ];
          
          const containsBrowserAutomation = browserAutomationKeywords.some(keyword => 
            msg.content.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (containsBrowserAutomation && !browserbaseToolState.isActive) {
            console.log("[Page] Browser Automation keywords detected, activating panel");
            setBrowserbaseToolState(prev => ({
              ...prev,
              isActive: true,
              sessionId: `keyword-${Date.now()}`,
              replayUrl: '#keyword-activation',
              pageTitle: 'ブラウザ自動化実行中...',
              elementText: 'ブラウザ自動化が検出されました',
              forcePanelOpen: true
            }));
            setIsPreviewOpen(true);
          }
          
          // ツール呼び出しの検出（JSONパース）- ツール実行開始時点で表示
          if (msg.content.includes('toolName') || msg.content.includes('toolCallId')) {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed.toolName || parsed.tool) {
                const toolName = parsed.toolName || parsed.tool;
                
                // Browser Automation Toolの呼び出し開始を検出
                if (toolName === 'browser-automation-tool') {
                  console.log("[Page] Browser Automation Tool call started:", toolName, parsed);
                  
                  // タスク内容を抽出
                  const taskArg = parsed.args?.task || parsed.arguments?.task || 'ブラウザ自動化タスク';
                  
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: `starting-${Date.now()}`,
                    replayUrl: '#starting',
                    pageTitle: 'ブラウザ自動化開始中...',
                    elementText: `実行中: ${taskArg}`,
                    forcePanelOpen: true
                  }));
                  
                  // プレビューパネルも自動的に開く
                  setIsPreviewOpen(true);
                }
                
                // Brave検索ツールの呼び出しを検出
                if (toolName === 'brave-web-search') {
                  console.log("[Page] Brave search tool call detected - preparing Browserbase tool");
                  // Brave検索が実行されたら、Browserbaseツールを準備状態にする
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: false, // まだアクティブにはしない
                    sessionId: '',
                    replayUrl: '',
                    liveViewUrl: undefined,
                    forcePanelOpen: false
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
                
                // Brave検索ツールの結果を検出した場合
                if (parsed.toolName === 'brave-web-search' && parsed.result?.results) {
                  console.log("[Page] Brave search tool result received - activating Browserbase tool");
                  const results = parsed.result.results || [];
                  
                  if (results.length > 0) {
                    // 検索結果の最初のURLを使用してBrowserbaseツールを自動起動
                    const firstResult = results[0];
                    const targetUrl = firstResult.url;
                    
                    console.log("[Page] Auto-triggering Browserbase tool for URL:", targetUrl);
                    
                    // Browserbaseツールを自動的にアクティブにし、検索結果のURLに移動
                    // 実際のBrowserbase APIを呼び出すのではなく、プレースホルダーとして表示
                    setBrowserbaseToolState(prev => ({
                      ...prev,
                      isActive: true,
                      sessionId: `brave-search-${Date.now()}`,
                      replayUrl: `#brave-search-replay-${Date.now()}`,
                      liveViewUrl: `#brave-search-live-${Date.now()}`,
                      pageTitle: `検索結果: ${firstResult.title}`,
                      elementText: `検索クエリの結果として ${targetUrl} を表示中`,
                      forcePanelOpen: true
                    }));
                  }
                }
                
                // Browser Automation Toolの結果を検出した場合（JSON処理）
                if (parsed.toolName === 'browser-automation-tool' && parsed.result) {
                  console.log("[Page] Browser Automation Tool result received", parsed.result);
                  const result = parsed.result;
                  const success = result.success || false;
                  const autoOpenPreview = result.autoOpenPreview ?? true;
                  
                  // 成功・失敗に関わらず必ず表示
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: result.sessionId || `result-${Date.now()}`,
                    replayUrl: result.replayUrl || '#result',
                    liveViewUrl: result.liveViewUrl,
                    screenshot: result.screenshot,
                    pageTitle: result.pageTitle || 'ブラウザ自動化完了',
                    elementText: result.elementText || (success ? '実行完了' : '実行エラー'),
                    forcePanelOpen: true
                  }));
                  
                  // プレビューパネルも自動的に開く
                  setIsPreviewOpen(true);
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
                
                // Browser Automation Toolの呼び出し開始を検出（正規表現）
                if (toolName === 'browser-automation-tool') {
                  console.log("[Page] Browser Automation Tool call started (regex):", toolName);
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: `regex-starting-${Date.now()}`,
                    replayUrl: '#regex-starting',
                    pageTitle: 'ブラウザ自動化開始中...',
                    elementText: `${toolName} を実行しています...`,
                    forcePanelOpen: true
                  }));
                  
                  // プレビューパネルも自動的に開く
                  setIsPreviewOpen(true);
                }
                
                // より広範囲なツール名検出
                const browserToolNames = [
                  'browser-automation-tool',
                  'browserAutomationTool',
                  'BrowserAutomationTool',
                  'browser_automation_tool'
                ];
                
                if (browserToolNames.includes(toolName) && !browserbaseToolState.isActive) {
                  console.log("[Page] Browser tool variant detected:", toolName);
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: `variant-${Date.now()}`,
                    replayUrl: '#variant-activation',
                    pageTitle: 'ブラウザ自動化開始中...',
                    elementText: `${toolName} を実行しています...`,
                    forcePanelOpen: true
                  }));
                  setIsPreviewOpen(true);
                }
                
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
                
                // Browser Automation Toolの呼び出し開始を検出
                if (toolName === 'browser-automation-tool') {
                  console.log("[Page] Browser Automation Tool annotation call started:", toolName);
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: `annotation-starting-${Date.now()}`,
                    replayUrl: '#annotation-starting',
                    pageTitle: 'ブラウザ自動化開始中...',
                    elementText: `${toolName} を実行しています...`,
                    forcePanelOpen: true
                  }));
                  
                  // プレビューパネルも自動的に開く
                  setIsPreviewOpen(true);
                }
                
                // Brave検索ツールの呼び出しを検出
                if (toolName === 'brave-web-search') {
                  console.log("[Page] Brave search tool annotation call detected - preparing Browserbase tool");
                  // Brave検索が実行されたら、Browserbaseツールを準備状態にする
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: false, // まだアクティブにはしない
                    sessionId: '',
                    replayUrl: '',
                    liveViewUrl: undefined,
                    forcePanelOpen: false
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
                
                // Browser Automation Toolの結果を検出した場合
                if (annotation.toolName === 'browser-automation-tool' && annotation.result) {
                  console.log("[Page] Browser Automation Tool annotation result received", annotation.result);
                  const result = annotation.result;
                  const success = result.success || false;
                  
                  // 成功・失敗に関わらず必ず表示
                  setBrowserbaseToolState(prev => ({
                    ...prev,
                    isActive: true,
                    sessionId: result.sessionId || `annotation-${Date.now()}`,
                    replayUrl: result.replayUrl || '#annotation',
                    liveViewUrl: result.liveViewUrl,
                    screenshot: result.screenshot,
                    pageTitle: result.pageTitle || 'ブラウザ自動化完了',
                    elementText: result.elementText || (success ? '実行完了' : '実行エラー'),
                    forcePanelOpen: true
                  }));
                  
                  setIsPreviewOpen(true);
                }
                

                
                // Brave検索ツールの結果を検出した場合
                if (annotation.toolName === 'brave-web-search' && annotation.result?.results) {
                  console.log("[Page] Brave search tool annotation result received - activating Browserbase tool");
                  const results = annotation.result.results || [];
                  
                  if (results.length > 0) {
                    // 検索結果の最初のURLを使用してBrowserbaseツールを自動起動
                    const firstResult = results[0];
                    const targetUrl = firstResult.url;
                    
                    console.log("[Page] Auto-triggering Browserbase tool for URL:", targetUrl);
                    
                    // Browserbaseツールを自動的にアクティブにし、検索結果のURLに移動
                    setBrowserbaseToolState(prev => ({
                      ...prev,
                      isActive: true,
                      sessionId: `brave-search-${Date.now()}`,
                      replayUrl: `#brave-search-replay-${Date.now()}`,
                      liveViewUrl: `#brave-search-live-${Date.now()}`,
                      pageTitle: `検索結果: ${firstResult.title}`,
                      elementText: `検索クエリの結果として ${targetUrl} を表示中`,
                      forcePanelOpen: true
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
  }, [messages, browserbaseToolState.isActive]);

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
