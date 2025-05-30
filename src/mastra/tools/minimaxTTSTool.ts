import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import fs from 'fs';
import path from 'path';

// 音声ファイル保存用のディレクトリを定義
const AUDIO_DIR = path.join(process.cwd(), 'public', 'generated-music');

// 入力スキーマ（同期T2A APIに基づく）
const minimaxTTSToolInputSchema = z.object({
  text: z.string().min(1).max(5000).describe('音声合成するテキスト（最大5,000文字）'),
  voice_id: z.string().default('Wise_Woman').describe('音声ID（例: Wise_Woman, Grinch等）'),
  model: z.enum(['speech-02-hd', 'speech-02-turbo', 'speech-01-hd', 'speech-01-turbo']).default('speech-02-hd').describe('使用モデル'),
  speed: z.number().min(0.5).max(2.0).default(1.0).describe('音声速度（0.5-2.0）'),
  volume: z.number().min(0.1).max(2.0).default(1.0).describe('音量（0.1-2.0）'),
  pitch: z.number().min(-1.0).max(1.0).default(0.0).describe('ピッチ（-1.0-1.0）'),
  emotion: z.enum(['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']).default('neutral').describe('感情'),
  format: z.enum(['mp3', 'wav', 'flac']).default('mp3').describe('音声フォーマット'),
  stream: z.boolean().default(false).describe('ストリーミング出力（デフォルト: false）'),
  language_boost: z.string().optional().describe('言語認識強化（例: Japanese, English, auto）')
});

// 出力スキーマ
const minimaxTTSToolOutputSchema = z.object({
  success: z.boolean().describe('処理成功フラグ'),
  message: z.string().describe('処理結果メッセージ'),
  audio_url: z.string().optional().describe('生成された音声ファイルのURL'),
  filename: z.string().optional().describe('ファイル名'),
  duration: z.number().optional().describe('音声の長さ（秒）'),
  audio_size: z.number().optional().describe('音声ファイルサイズ（バイト）'),
  word_count: z.number().optional().describe('単語数'),
  trace_id: z.string().optional().describe('トレースID'),
  markdownAudio: z.string().optional().describe('マークダウン形式の音声リンク'),
  autoOpenPreview: z.boolean().optional().describe('自動プレビュー表示フラグ'),
  title: z.string().optional().describe('音声のタイトル'),
  toolName: z.string().optional().describe('ツール名'),
  toolDisplayName: z.string().optional().describe('ツール表示名'),
  error: z.string().optional().describe('エラーメッセージ')
});

type InputType = z.infer<typeof minimaxTTSToolInputSchema>;
type OutputType = z.infer<typeof minimaxTTSToolOutputSchema>;

// 音声ファイルをローカルに保存する関数（hex形式から変換）
async function saveAudioFromHex(hexAudio: string, format: string): Promise<string> {
  // 絶対パスでディレクトリを確認
  const absoluteAudioDir = path.resolve(AUDIO_DIR);
  console.log('[MinimaxTTSTool] Working directory:', process.cwd());
  console.log('[MinimaxTTSTool] Target directory:', absoluteAudioDir);
  
  // ディレクトリが存在しない場合は作成
  if (!fs.existsSync(absoluteAudioDir)) {
    console.log('[MinimaxTTSTool] Creating directory:', absoluteAudioDir);
    fs.mkdirSync(absoluteAudioDir, { recursive: true });
  }

  // hex文字列をバイナリデータに変換
  const audioBuffer = Buffer.from(hexAudio, 'hex');
  
  // ファイル名にタイムスタンプを追加してユニークにする
  const timestamp = Date.now();
  const extension = format === 'mp3' ? 'mp3' : format === 'wav' ? 'wav' : 'flac';
  const uniqueFilename = `minimax_tts_${timestamp}.${extension}`;
  const filePath = path.join(absoluteAudioDir, uniqueFilename);
  
  console.log('[MinimaxTTSTool] Saving file to:', filePath);
  
  try {
    fs.writeFileSync(filePath, audioBuffer);
    console.log('[MinimaxTTSTool] File written successfully');
    
    // ファイルが実際に存在するか確認
    if (fs.existsSync(filePath)) {
      console.log('[MinimaxTTSTool] File exists after write');
      const stats = fs.statSync(filePath);
      console.log('[MinimaxTTSTool] File size on disk:', stats.size, 'bytes');
    } else {
      console.error('[MinimaxTTSTool] File does not exist after write!');
    }
  } catch (writeError) {
    console.error('[MinimaxTTSTool] Error writing file:', writeError);
    throw writeError;
  }
  
  // 公開URLを生成
  const publicUrl = `/generated-music/${uniqueFilename}`;
  
  console.log('[MinimaxTTSTool] Audio file saved:', publicUrl);
  console.log('[MinimaxTTSTool] File size:', audioBuffer.length, 'bytes');
  
  return publicUrl;
}

// 同期的な音声生成を実行する関数
async function generateSpeechSync(config: InputType): Promise<OutputType> {
  try {
    const API_KEY = process.env.MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID;
    
    if (!API_KEY || !GROUP_ID) {
      throw new Error('MINIMAX_API_KEY and MINIMAX_GROUP_ID environment variables are required');
    }

    console.log('[MinimaxTTSTool] Starting synchronous speech generation...');
    console.log('[MinimaxTTSTool] Config:', {
      textLength: config.text.length,
      voice_id: config.voice_id,
      model: config.model,
      speed: config.speed,
      volume: config.volume,
      pitch: config.pitch,
      emotion: config.emotion,
      format: config.format,
      stream: config.stream
    });

    const url = `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${GROUP_ID}`;
    
    const payload = {
      model: config.model,
      text: config.text,
      stream: config.stream,
      voice_setting: {
        voice_id: config.voice_id,
        speed: config.speed,
        vol: config.volume,
        pitch: config.pitch,
        emotion: config.emotion
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: config.format,
        channel: 1
      },
      language_boost: config.language_boost || 'auto',
      output_format: 'hex' // hex形式で音声データを取得
    };

    console.log('[MinimaxTTSTool] Sending request to T2A v2 API...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[MinimaxTTSTool] API request failed:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[MinimaxTTSTool] API response received');
    
    if (result.base_resp?.status_code !== 0) {
      throw new Error(`API Error: ${result.base_resp?.status_msg || 'Unknown error'}`);
    }

    if (!result.data?.audio) {
      throw new Error('No audio data received from API');
    }

    // hex形式の音声データをファイルに保存
    const audioUrl = await saveAudioFromHex(result.data.audio, config.format);
    
    // ファイル名を生成
    const timestamp = Date.now();
    const filename = `minimax_tts_${timestamp}.${config.format}`;

    // 音声の長さを計算（extra_infoから取得、または推定）
    const duration = result.extra_info?.audio_length 
      ? Math.round(result.extra_info.audio_length / 1000) // ミリ秒から秒に変換
      : Math.ceil(config.text.length / (config.speed * 10)); // 推定

    // マークダウン形式の音声リンクを生成
    const markdownAudio = `![${config.text.substring(0, 30)}${config.text.length > 30 ? '...' : ''}の音声](${audioUrl})`;
    
    // 成功メッセージにマークダウンリンクを含める
    const successMessage = `音声生成が完了しました。ファイルサイズ: ${result.extra_info?.audio_size ? Math.round(result.extra_info.audio_size / 1024) + 'KB' : '不明'}\n\n${markdownAudio}\n\n**MiniMax TTSで生成された音声**\n*テキスト: ${config.text}*\n*音声ID: ${config.voice_id}, モデル: ${config.model}*`;

    return {
      success: true,
      message: successMessage,
      audio_url: audioUrl,
      filename: filename,
      duration: duration,
      audio_size: result.extra_info?.audio_size,
      word_count: result.extra_info?.word_count,
      trace_id: result.trace_id,
      markdownAudio: markdownAudio,
      autoOpenPreview: true,
      title: `${config.text.substring(0, 30)}${config.text.length > 30 ? '...' : ''}`,
      toolName: 'minimax-tts',
      toolDisplayName: 'MiniMax TTS'
    };

  } catch (error) {
    console.error('[MinimaxTTSTool] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // エラーの種類に応じてより詳細なメッセージを提供
    let detailedMessage = errorMessage;
    if (errorMessage.includes('insufficient balance')) {
      detailedMessage = 'API残高が不足しています。MiniMaxアカウントに残高をチャージしてください。';
    } else if (errorMessage.includes('text too long')) {
      detailedMessage = 'テキストが長すぎます。5,000文字以下に短縮してください。';
    } else if (errorMessage.includes('rate limit')) {
      detailedMessage = 'レート制限に達しました。しばらく待ってから再試行してください。';
    }
    
    return {
      success: false,
      message: `音声生成に失敗しました: ${detailedMessage}`,
      error: errorMessage
    };
  }
}

// ツールの作成
export const minimaxTTSTool = createTool({
  id: 'minimax-tts',
  description: 'MiniMax T2A APIを使用してテキストから高品質な音声を同期的に生成します。最大5,000文字のテキストに対応し、100以上の音声、感情制御、音声パラメータの調整が可能です。即座に結果を返すため、処理時間が大幅に短縮されます。',
  inputSchema: minimaxTTSToolInputSchema,
  outputSchema: minimaxTTSToolOutputSchema,
  execute: async ({ context }) => {
    return await generateSpeechSync(context);
  },
}); 