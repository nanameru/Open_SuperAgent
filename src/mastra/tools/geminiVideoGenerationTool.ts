import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { fal } from '@fal-ai/client';

const POLLING_INTERVAL = 20000; // 20秒間隔でポーリング
const MAX_POLLING_TIME = 600000; // 最大10分間ポーリング

// FAL AI Veo2の入力スキーマ
const veo2VideoGenerationToolInputSchema = z.object({
  prompt: z.string().describe('The text prompt describing the video you want to generate.'),
  aspect_ratio: z.enum(['16:9', '9:16'])
    .optional()
    .default('16:9')
    .describe('The aspect ratio of the generated video. Default is 16:9.'),
  duration: z.enum(['5s', '6s', '7s', '8s'])
    .optional()
    .default('5s')
    .describe('The duration of the generated video in seconds. Default is 5s.'),
  autoOpenPreview: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to automatically open the preview panel when videos are generated.'),
});

const veo2VideoGenerationToolOutputSchema = z.object({
  videos: z.array(
    z.object({
      url: z.string().optional().describe('URL of the generated video.'),
      content_type: z.string().optional().describe('MIME type of the video file.'),
      file_name: z.string().optional().describe('Name of the video file.'),
      file_size: z.number().optional().describe('Size of the video file in bytes.'),
    }),
  ),
  requestId: z.string().nullable().optional().describe('Request ID for checking status of long-running operation.'),
  error: z.string().optional().describe('Error message if generation failed.'),
  success: z.boolean().describe('Whether the video generation was successful.'),
  message: z.string().describe('A message describing the result of the operation.'),
  status: z.string().optional().describe('Current status of the operation (pending, processing, completed, failed).'),
  progress: z.number().optional().describe('Progress percentage (0-100).'),
  markdownVideos: z.string().optional().describe('Markdown formatted string containing all generated videos for chat display.'),
  autoOpenPreview: z.boolean().optional().describe('Whether to automatically open the preview panel.'),
  title: z.string().optional().describe('Title for the generated videos.'),
  toolName: z.string().optional().describe('Name of the tool for display purposes.'),
  toolDisplayName: z.string().optional().describe('User-friendly name of the tool.'),
});

// 入力と出力の型を定義
type InputType = z.infer<typeof veo2VideoGenerationToolInputSchema>;
type OutputType = z.infer<typeof veo2VideoGenerationToolOutputSchema>;

// ポーリング用のスリープ関数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// FAL AI APIを設定
const configureFalApi = () => {
  const apiKey = process.env.FAL_KEY;
  if (apiKey) {
    fal.config({
      credentials: apiKey,
    });
    return true;
  }
  return false;
};

// FAL AI Veo2のステータスをチェックする関数
async function checkVeo2GenerationStatus(requestId: string) {
  try {
    const status = await fal.queue.status("fal-ai/veo2", {
      requestId: requestId,
      logs: true,
    });

    console.log('[Veo2Tool] Status check result:', JSON.stringify(status, null, 2));
    
    const statusValue = status.status as string;
    
    return {
      status: statusValue,
      completed: statusValue === 'COMPLETED',
      failed: statusValue === 'FAILED' || statusValue === 'ERROR',
      logs: (status as any).logs || [],
      error: (statusValue === 'FAILED' || statusValue === 'ERROR') ? 'Video generation failed' : null
    };
  } catch (error: any) {
    console.error('[Veo2Tool] Error checking status:', error.message);
    throw new Error(`Failed to check status: ${error.message}`);
  }
}

// FAL AI Veo2の結果を取得する関数
async function getVeo2GenerationResult(requestId: string) {
  try {
    const result = await fal.queue.result("fal-ai/veo2", {
      requestId: requestId
    });

    console.log('[Veo2Tool] Result retrieved:', JSON.stringify(result, null, 2));
    
    return result;
  } catch (error: any) {
    console.error('[Veo2Tool] Error getting result:', error.message);
    throw new Error(`Failed to get result: ${error.message}`);
  }
}

export const geminiVideoGenerationTool = createTool({
  id: 'veo2-video-generation',
  description: 'Generates videos using Google\'s Veo 2 model via FAL AI. Automatically polls for completion and returns videos with markdown display.',
  inputSchema: veo2VideoGenerationToolInputSchema,
  outputSchema: veo2VideoGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, aspect_ratio = '16:9', duration = '5s', autoOpenPreview = true } = context;

    console.log('[Veo2Tool] Received input:');
    console.log(`[Veo2Tool] Prompt: ${prompt}`);
    console.log(`[Veo2Tool] Aspect ratio: ${aspect_ratio}`);
    console.log(`[Veo2Tool] Duration: ${duration}`);

    if (!prompt) {
      console.error('[Veo2Tool] Prompt is required.');
      return {
        videos: [],
        requestId: null,
        error: 'A text prompt is required for video generation.',
        success: false,
        message: 'A text prompt is required for video generation.',
        status: 'failed',
        toolName: 'veo2-video-generation',
        toolDisplayName: 'Veo2動画生成'
      };
    }

    // API Keyの設定を確認
    const isApiConfigured = configureFalApi();
    if (!isApiConfigured) {
      return {
        videos: [],
        requestId: null,
        error: 'FAL_KEY is not set in environment variables.',
        success: false,
        message: 'API key is not set. Please configure the FAL_KEY.',
        status: 'failed',
        toolName: 'veo2-video-generation',
        toolDisplayName: 'Veo2動画生成'
      };
    }

    // ローカル保存用のディレクトリを準備
    const videosDir = path.join(process.cwd(), 'public', 'generated-videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    try {
      console.log('[Veo2Tool] Submitting request to FAL AI Veo2...');

      // FAL AI Veo2にリクエストを送信
      const { request_id } = await fal.queue.submit("fal-ai/veo2", {
        input: {
          prompt: prompt,
          aspect_ratio: aspect_ratio,
          duration: duration
        }
      });

      console.log(`[Veo2Tool] Video generation started. Request ID: ${request_id}`);
      
      // ポーリング開始
      console.log('[Veo2Tool] Starting polling for operation completion...');
      const startTime = Date.now();
      
      while (Date.now() - startTime < MAX_POLLING_TIME) {
        try {
          const statusResult = await checkVeo2GenerationStatus(request_id);
          
          if (statusResult.completed) {
            // 結果を取得
            const result = await getVeo2GenerationResult(request_id);
            
            if (result.data && result.data.video) {
              const videoData = result.data.video;
              
              // 動画ファイルをダウンロードして保存
              const response = await fetch(videoData.url);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              const videoName = `veo2_${uuidv4()}.mp4`;
              const videoPath = path.join(videosDir, videoName);
              
              // バイナリを保存
              fs.writeFileSync(videoPath, buffer);
              
              const localVideoUrl = `/generated-videos/${videoName}`;
              
              const videos = [{
                url: localVideoUrl,
                content_type: videoData.content_type || 'video/mp4',
                file_name: videoData.file_name || videoName,
                file_size: videoData.file_size || buffer.length,
              }];
              
              // マークダウン形式の動画リンクを生成（画像記法を拡張して動画にも対応）
              const markdownVideos = `![Generated Video](${localVideoUrl})`;
              
              const successMessage = `動画を生成しました！\n\n${markdownVideos}\n\n**Veo2で生成された動画**\n*プロンプト: ${prompt}*\n*時間: ${duration}, アスペクト比: ${aspect_ratio}*`;
              
              return {
                videos,
                requestId: request_id,
                success: true,
                message: successMessage,
                status: 'completed',
                progress: 100,
                markdownVideos,
                autoOpenPreview,
                title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? '...' : ''}`,
                toolName: 'veo2-video-generation',
                toolDisplayName: 'Veo2動画生成'
              };
            } else {
              return {
                videos: [],
                requestId: request_id,
                error: 'No video was generated.',
                success: false,
                message: 'No video was generated. Please try again with a different prompt.',
                status: 'failed',
                toolName: 'veo2-video-generation',
                toolDisplayName: 'Veo2動画生成'
              };
            }
          } else if (statusResult.failed) {
            return {
              videos: [],
              requestId: request_id,
              error: statusResult.error || 'Video generation failed.',
              success: false,
              message: `Video generation failed: ${statusResult.error || 'Unknown error'}`,
              status: 'failed',
              toolName: 'veo2-video-generation',
              toolDisplayName: 'Veo2動画生成'
            };
          } else {
            // まだ処理中
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min((elapsedTime / MAX_POLLING_TIME) * 100, 95);
            console.log(`[Veo2Tool] Operation still in progress... (${Math.round(progress)}%) Status: ${statusResult.status}`);
            
            // ログがあれば表示
            if (statusResult.logs && statusResult.logs.length > 0) {
              statusResult.logs.forEach((log: any) => {
                console.log(`[Veo2Tool] ${log.message || log}`);
              });
            }
            
            // 20秒待機
            await sleep(POLLING_INTERVAL);
          }
        } catch (pollError: any) {
          console.error('[Veo2Tool] Error during polling:', pollError.message);
          // ポーリングエラーの場合は少し待ってから再試行
          await sleep(POLLING_INTERVAL);
        }
      }
      
      // タイムアウト
      return {
        videos: [],
        requestId: request_id,
        error: 'Video generation timed out after 10 minutes.',
        success: false,
        message: 'Video generation is taking longer than expected. Please check back later or try again.',
        status: 'timeout',
        toolName: 'veo2-video-generation',
        toolDisplayName: 'Veo2動画生成'
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      console.error('[Veo2Tool] Error during Veo2 video generation:', errorMessage);
      return {
        videos: [],
        requestId: null,
        error: `Error during Veo2 video generation: ${errorMessage}`,
        success: false,
        message: `Failed to generate video: ${errorMessage}`,
        status: 'failed',
        toolName: 'veo2-video-generation',
        toolDisplayName: 'Veo2動画生成'
      };
    }
  },
});

// 後方互換性のため、既存の関数名をエクスポート
export { checkVeo2GenerationStatus as checkVideoGenerationOperation }; 