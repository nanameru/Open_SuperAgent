import { NextRequest, NextResponse } from 'next/server';
import { createSlideCreatorAgent, createModel } from '@/src/mastra/agents/slideCreatorAgent';
import { streamText } from 'ai';
import { createCompressionMiddleware, withCompressionMiddleware } from '@/src/mastra/config/compressionMiddleware';

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
export const runtime = 'nodejs';

// Geminiモデルのリトライ設定
const GEMINI_RETRY_ATTEMPTS = 3;
const GEMINI_RETRY_DELAY = 2000; // 2秒

// リトライ用のsleep関数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  // リクエスト情報は詳細なログを出力しない
  
  try {
    const requestBody = await req.json();
    const { messages, model: requestModel } = requestBody;
    
    // デバッグ: リクエスト内容をログ出力
    devLog('Full request body:', {
      messages: messages?.length ? `${messages.length} messages` : 'no messages',
      model: requestModel,
      otherKeys: Object.keys(requestBody).filter(k => k !== 'messages' && k !== 'model'),
      firstMessage: messages?.[0],
      lastMessage: messages?.[messages?.length - 1]
    });
    
    // メッセージの検証と処理
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }
    
    // 画像コンテンツの基本検証（experimental_attachments使用時はAI SDKが自動変換する）
    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'image') {
            // AI SDKによってattachmentsから自動変換された画像コンテンツを受け入れる
            devLog('Image content detected in message:', {
              hasImageUrl: !!part.image?.url,
              hasImageData: !!part.image && typeof part.image === 'string'
            });
          }
        }
      }
    }
    
    // デバッグ: 受信したメッセージをログ出力
    devLog('Received messages:', messages.map((m: any) => ({
      role: m.role,
      contentType: Array.isArray(m.content) ? 'multimodal' : 'text',
      hasImage: Array.isArray(m.content) && m.content.some((part: any) => part.type === 'image')
    })));
    
    // メッセージをそのまま使用（Vercel AI SDKの標準フォーマットをサポート）
    const processedMessages = messages;
    
    // 最新のユーザーメッセージを取得
    const lastUserMessage = processedMessages.filter((m: any) => m.role === 'user').pop();
    let userContent = '';
    
    if (lastUserMessage) {
      if (typeof lastUserMessage.content === 'string') {
        userContent = lastUserMessage.content;
      } else if (Array.isArray(lastUserMessage.content)) {
        const textPart = lastUserMessage.content.find((part: any) => part.type === 'text');
        userContent = textPart?.text || '';
      }
    }
    
    // モデル設定を取得（リクエスト > APIから取得 > デフォルト の優先順位）
    let currentModel;
    if (requestModel && requestModel.provider && requestModel.modelName) {
      currentModel = requestModel;
      devLog(`Using model from request: ${currentModel.provider} - ${currentModel.modelName}`);
    } else {
      // GET APIを使用してモデル設定を取得
      try {
        const baseUrl = req.headers.get('host') ? `http${req.headers.get('x-forwarded-proto') === 'https' ? 's' : ''}://${req.headers.get('host')}` : '';
        const response = await fetch(`${baseUrl}/api/set-model`);
        const data = await response.json();
        currentModel = data.model || { provider: 'gemini', modelName: 'gemini-2.5-pro-preview-06-05' };
        devLog(`Using model from API: ${currentModel.provider} - ${currentModel.modelName}`);
      } catch (error) {
        // エラーの場合はデフォルトを使用
        currentModel = { provider: 'gemini', modelName: 'gemini-2.5-pro-preview-06-05' };
        devLog(`Error fetching model, using default: ${currentModel.provider} - ${currentModel.modelName}`);
      }
    }
    
    // OpenAIモデルの場合は、Agentを介さずに直接streamTextを呼び出す
    if (currentModel.provider === 'openai') {
      devLog('Bypassing agent for OpenAI model, using streamText directly.');
      const model = createModel(currentModel.provider, currentModel.modelName);
      const response = await streamText({
        model: model,
        messages: processedMessages,
        // ここで必要に応じてツールを渡すこともできますが、まずはテキスト生成を優先します
      });
      return response.toDataStreamResponse();
    }
    
    // 選択されたモデルでslideCreatorAgentを動的に作成
    const slideCreatorAgent = await createSlideCreatorAgent(currentModel.provider, currentModel.modelName);
    
    // コンテキスト圧縮ミドルウェアを作成
    const compressionMiddleware = createCompressionMiddleware(currentModel.modelName, {
      enableAutoCompression: true,
      compressionMode: 'auto',
      onCompressionEvent: (event) => {
        devLog(`[Context Compression] ${event.type}`, event.compressionInfo);
      }
    });
    
    // 圧縮ラッパーを作成
    const compressionWrapper = withCompressionMiddleware(compressionMiddleware);
    
    // Deep Research feature removed for build stability
    
    // Web検索処理の検出
    if (userContent.startsWith('[Web検索]')) {
      devLog('Web search detected');
      // 現在は通常のエージェントで処理（将来的に専用の検索処理を追加可能）
    }
    
    // 受信したメッセージの内容をログ出力 (最初の100文字程度)
    // 詳細なログは出力しない
    
    // 動的に作成されたslideCreatorAgentを使用してストリーミングレスポンスを取得
    let mastraStreamResult;
    let lastError;
    
    // Geminiモデルの場合はリトライ処理を追加
    for (let attempt = 1; attempt <= GEMINI_RETRY_ATTEMPTS; attempt++) {
      try {
        devLog(`Attempting to stream with ${currentModel.provider} (attempt ${attempt}/${GEMINI_RETRY_ATTEMPTS})`);
        
        // 画像を含むメッセージの場合はログ出力
        const hasImageMessages = processedMessages.some((msg: any) => 
          Array.isArray(msg.content) && msg.content.some((part: any) => part.type === 'image')
        );
        if (hasImageMessages) {
          devLog('Processing multimodal message with images');
        }
        
        // コンテキスト圧縮ミドルウェアを適用してストリーミング実行
        mastraStreamResult = await compressionWrapper(
          { messages: processedMessages },
          async (compressedInput) => await slideCreatorAgent.stream(compressedInput.messages)
        );
        break; // 成功した場合はループを抜ける
      } catch (error: any) {
        lastError = error;
        devLog(`Stream attempt ${attempt} failed:`, {
          message: error.message,
          stack: error.stack?.substring(0, 500),
          hasImages: processedMessages.some((msg: any) => 
            Array.isArray(msg.content) && msg.content.some((part: any) => part.type === 'image')
          )
        });
        
        // 最後の試行でない場合は待機してリトライ
        if (attempt < GEMINI_RETRY_ATTEMPTS) {
          devLog(`Retrying in ${GEMINI_RETRY_DELAY}ms...`);
          await sleep(GEMINI_RETRY_DELAY);
        } else {
          devLog('All retry attempts failed');
          throw lastError;
        }
      }
    }
    
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
    devLog('Chat API error:', message);
    
    // Gemini API特有のエラーチェック
    if (message.includes('Visibility check was unavailable') || message.includes('503')) {
      return NextResponse.json(
        { 
          error: 'Gemini API一時的な問題', 
          details: 'Gemini APIに一時的な問題が発生しています。少し待ってから再試行してください。',
          retryable: true
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: 'Chat API error', details: message },
      { status: 500 }
    );
  }
} 