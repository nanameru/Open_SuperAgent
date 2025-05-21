import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MAX_RETRIES = 1; // 最大リトライ回数

const geminiVideoGenerationToolInputSchema = z.object({
  prompt: z.string().describe('A detailed textual description of the desired video.'),
  image: z.string().optional().describe('Optional base64 encoded image to use as input for video generation.'),
  mimeType: z.enum(['image/jpeg', 'image/png']).optional().describe('MIME type of the input image (required if image is provided).'),
  numberOfVideos: z.number()
    .optional()
    .default(1)
    .describe('Number of videos to generate (1-2). Default is 1.'),
  durationSeconds: z.number()
    .optional()
    .default(5)
    .describe('Duration of videos in seconds (5-8). Default is 5.'),
  aspectRatio: z.string()
    .optional()
    .default('16:9')
    .describe("Aspect ratio of the videos ('16:9' or '9:16'). Default is '16:9'."),
  negativePrompt: z.string()
    .optional()
    .describe('Text that describes what you want to discourage the model from generating.'),
  personGeneration: z.enum(['dont_allow', 'allow_adult'])
    .optional()
    .default('allow_adult')
    .describe('Controls whether people or face generation is allowed.'),
  enhancePrompt: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to use Gemini to enhance prompts. Default is true.'),
  seed: z.number()
    .optional()
    .describe('A seed for deterministic generation (0-4294967295).'),
});

const geminiVideoGenerationToolOutputSchema = z.object({
  videos: z.array(
    z.object({
      url: z.string().optional().describe('URL of the generated video.'),
      b64Json: z.string().optional().describe('Base64 encoded video data.'),
      revised_prompt: z.string().optional().describe('Revised prompt used for generation.'),
    }),
  ),
  operationId: z.string().nullable().optional().describe('Operation ID for checking status of long-running operation.'),
  error: z.string().optional().describe('Error message if generation failed.'),
});

// 入力と出力の型を定義
type InputType = z.infer<typeof geminiVideoGenerationToolInputSchema>;
type OutputType = z.infer<typeof geminiVideoGenerationToolOutputSchema>;

export const geminiVideoGenerationTool = createTool({
  id: 'gemini-video-generation',
  description: 'Generates videos using Google\'s Veo API based on a textual prompt or image. Returns videos as base64 encoded data.',
  inputSchema: geminiVideoGenerationToolInputSchema,
  outputSchema: geminiVideoGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, image, mimeType, numberOfVideos = 1, durationSeconds = 5, aspectRatio = '16:9', 
            negativePrompt, personGeneration = 'allow_adult', enhancePrompt = true, seed } = context;

    console.log('[GeminiVideoTool] Received input:');
    console.log(`[GeminiVideoTool] Prompt: ${prompt}`);
    console.log(`[GeminiVideoTool] Has Image: ${!!image}`);

    if (!prompt && !image) {
      console.error('[GeminiVideoTool] Either prompt or image is required.');
      return {
        videos: [],
        operationId: null,
        error: 'Either a text prompt or an image input is required for video generation.',
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[GeminiVideoTool] GEMINI_API_KEY is not set.');
      return {
        videos: [],
        operationId: null,
        error: 'GEMINI_API_KEY is not set in environment variables.',
      };
    }

    // ローカル保存用のディレクトリを準備
    const videosDir = path.join(process.cwd(), 'public', 'generated-videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    // Gemini API エンドポイント (Veo)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`;

    try {
      // リクエストボディの構築
      const requestBody: any = {
        instances: [
          {
            prompt: prompt
          }
        ],
        parameters: {
          sampleCount: Math.min(Math.max(numberOfVideos, 1), 2), // 1から2の間に制限
          durationSeconds: Math.min(Math.max(durationSeconds, 5), 8), // 5から8の間に制限
          enhancePrompt: enhancePrompt,
          aspectRatio: aspectRatio,
          personGeneration: personGeneration
        }
      };

      // 画像が提供された場合、リクエストに追加
      if (image && mimeType) {
        requestBody.instances[0].image = {
          bytesBase64Encoded: image,
          mimeType: mimeType
        };
      }

      // ネガティブプロンプトが提供された場合、追加
      if (negativePrompt) {
        requestBody.parameters.negativePrompt = negativePrompt;
      }

      // シードが提供された場合、追加
      if (typeof seed === 'number') {
        requestBody.parameters.seed = seed;
      }

      console.log('[GeminiVideoTool] Calling Veo API...');
      console.log('[GeminiVideoTool] Endpoint:', apiUrl);
      console.log('[GeminiVideoTool] Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json'
        },
      });

      console.log('[GeminiVideoTool] Veo API Response Status:', response.status);
      
      // 長時間実行オペレーションが返された場合
      if (response.data && response.data.name) {
        const operationId = response.data.name;
        console.log(`[GeminiVideoTool] Video generation started. Operation ID: ${operationId}`);
        
        return {
          videos: [],
          operationId: operationId,
        };
      } else {
        console.warn('[GeminiVideoTool] Unexpected API response format:', response.data);
        return {
          videos: [],
          operationId: null,
          error: 'Unexpected response format from Veo API.'
        };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
      console.error('[GeminiVideoTool] Error during Veo video generation:', errorMessage);
      return {
        videos: [],
        operationId: null,
        error: `Error during Veo video generation: ${errorMessage}`
      };
    }
  },
});

// 長時間実行オペレーションのステータスをチェックする関数
export async function checkVideoGenerationOperation(operationId: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[GeminiVideoTool] GEMINI_API_KEY is not set.');
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/${operationId}?key=${apiKey}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // レスポンスを解析して、動画ファイルへのリンクやステータス情報を抽出
    const operationData = response.data;
    console.log('[GeminiVideoTool] Operation status check result:', JSON.stringify(operationData, null, 2));
    
    let videos: { url?: string; b64Json?: string; revised_prompt?: string }[] = [];
    
    // 操作が完了している場合に、動画情報を抽出
    if (operationData.done && operationData.response) {
      // Base64エンコードされた動画データがレスポンスに含まれている場合
      if (operationData.response.generatedSamples && Array.isArray(operationData.response.generatedSamples)) {
        videos = operationData.response.generatedSamples.map((sample: any) => {
          if (sample.video && sample.video.bytesBase64Encoded) {
            const videoName = `video_${uuidv4()}.mp4`;
            const videoPath = path.join(process.cwd(), 'public', 'generated-videos', videoName);
            fs.writeFileSync(videoPath, Buffer.from(sample.video.bytesBase64Encoded, 'base64'));
            return { 
              url: `/generated-videos/${videoName}`,
              b64Json: sample.video.bytesBase64Encoded,
              revised_prompt: sample.prompt || null
            };
          } else {
            return { revised_prompt: sample.prompt || null };
          }
        });
      }
      
      return {
        videos,
        operationId,
        done: operationData.done,
        error: operationData.error?.message
      };
    }
    
    // 操作がまだ完了していない場合
    return {
      videos: [],
      operationId,
      done: operationData.done,
      error: null
    };
  } catch (error: any) {
    console.error('[GeminiVideoTool] Error checking operation status:', error.message);
    throw new Error(`Failed to check operation status: ${error.message}`);
  }
} 