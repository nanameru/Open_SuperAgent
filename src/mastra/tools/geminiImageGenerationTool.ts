import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import axios from 'axios';
import fs from 'fs'; // Changed from 'fs/promises' for sync operations
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
// OpenAI import and client removed

// // 画像保存用のディレクトリを定義 // Commented out unused consts
// const IMAGE_DIR = path.join(process.cwd(), 'public', 'generated-images');
// // 画像にアクセスするためのベースURL
// const IMAGE_BASE_URL = '/generated-images';

const MAX_RETRIES = 1; // Max retries for the primary API call

const geminiImageGenerationToolInputSchema = z.object({
  prompt: z.string().describe('The prompt for image generation.'),
  numberOfImages: z
    .number()
    .optional()
    .default(1)
    .describe('Number of images to generate (default is 1).'),
  aspectRatio: z
    .string()
    .optional()
    .default('1:1')
    .describe("Aspect ratio (e.g., '1:1', '16:9', '9:16', '4:3', '3:4')."),
  negativePrompt: z
    .string()
    .optional()
    .describe('A negative prompt to guide the generation away from certain things.'),
  seed: z
    .number()
    .optional()
    .describe('A seed for deterministic generation. Must be between 0 and 2147483647.'),
  personGeneration: z
    .string()
    .optional()
    .default('ALLOW_ADULT')
    .describe(
      "Controls person generation. Options: 'DONT_ALLOW', 'ALLOW_ADULT' (default), 'ALLOW_CHILD', 'ALLOW_ALL'.",
    ),
  autoOpenPreview: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to automatically open the preview panel when images are generated.'),
});

const geminiImageGenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe('URL of the generated image.'),
      b64Json: z.string().optional().describe('Base64 encoded image data.'),
    }),
  ),
  prompt: z.string().describe('The prompt used for image generation.'),
  success: z.boolean().describe('Whether the image generation was successful.'),
  message: z.string().describe('A message describing the result of the operation.'),
  autoOpenPreview: z.boolean().optional().describe('Whether to automatically open the preview panel.'),
  error: z.string().optional().describe('Error message if generation failed.'),
  title: z.string().optional().describe('Title for the generated images.'),
  toolName: z.string().optional().describe('Name of the tool for display purposes.'),
  toolDisplayName: z.string().optional().describe('User-friendly name of the tool.'),
  markdownImages: z.string().optional().describe('Markdown formatted string containing all generated images for chat display.'),
});

// 入力と出力の型を定義
type InputType = z.infer<typeof geminiImageGenerationToolInputSchema>;
type OutputType = z.infer<typeof geminiImageGenerationToolOutputSchema>;

// Unused helper functions removed:
// async function ensureImageDir() { ... }
// async function saveImageAndGetUrl(base64Data: string): Promise<string> { ... }

export const geminiImageGenerationTool = createTool({
  id: 'gemini-image-generation',
  description:
    'Generates an image based on a textual prompt using Google Gemini (Imagen 3). Returns a URL to the generated image.',
  inputSchema: geminiImageGenerationToolInputSchema,
  outputSchema: geminiImageGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, numberOfImages, aspectRatio, negativePrompt, seed, personGeneration, autoOpenPreview } = context;

    console.log('[GeminiImageTool] Received input:');
    console.log(`[GeminiImageTool] Prompt: "${prompt?.substring(0, 50)}${prompt?.length > 50 ? '...' : ''}"`);
    console.log(`[GeminiImageTool] Number of images: ${numberOfImages || 1}`);
    console.log(`[GeminiImageTool] Aspect ratio: ${aspectRatio || '1:1'}`);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return { 
          images: [], 
          prompt: prompt || '',
          success: false,
          message: 'API key is not set. Please configure the GEMINI_API_KEY.',
          autoOpenPreview: false,
          error: 'GEMINI_API_KEY is not set.',
          title: 'API Key Error',
          toolName: 'gemini-image-generation',
          toolDisplayName: 'Gemini画像生成'
        };
      }

      const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
      if (!fs.existsSync(imagesDir)) {
        try {
          fs.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error('[GeminiImageTool] Failed to create images directory:', dirError);
          return {
            images: [],
            prompt: prompt || '',
            success: false,
            message: 'Failed to create images directory.',
            autoOpenPreview: false,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            title: 'Directory Error',
            toolName: 'gemini-image-generation',
            toolDisplayName: 'Gemini画像生成'
          };
        }
      }

      // Imagen 3 APIエンドポイント
      const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;

      // Imagen 3 APIリクエストフォーマット
      const requestBody = {
        instances: [{ 
          prompt: prompt,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
        }],
        parameters: { 
          sampleCount: Math.min(numberOfImages || 1, 4), // 最大4枚に制限
          ...(aspectRatio && { aspectRatio }),
          ...(typeof seed === 'number' && { seed }),
          ...(personGeneration && { personGeneration }),
        }
      };

      console.log('[GeminiImageTool] Calling Imagen 3 API...');

      const primaryResponse = await axios.post(imagenApiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000, // 60秒のタイムアウト
      });

      console.log(
        '[GeminiImageTool] Imagen 3 API Response Status:',
        primaryResponse.status,
      );

      const images: { url: string; b64Json?: string }[] = [];

      // レスポンス構造をチェックし、正しい画像データを抽出
      if (primaryResponse.data && primaryResponse.data.predictions && Array.isArray(primaryResponse.data.predictions)) {
        // Google Imagen 3.0のレスポンス形式
        for (const prediction of primaryResponse.data.predictions) {
          if (prediction.bytesBase64Encoded) {
            try {
              const base64Data = prediction.bytesBase64Encoded;
              const imageName = `img_${uuidv4()}.png`;
              const imagePath = path.join(imagesDir, imageName);
              
              // Base64データをバイナリに変換して保存
              fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
              
              const imageUrl = `/generated-images/${imageName}`;
              // b64Jsonは省略（URLだけで十分）
              images.push({ 
                url: imageUrl,
                // b64Jsonは巨大なデータになるため、レスポンスには含めない
                // b64Json: base64Data 
              });
            } catch (imgError) {
              console.error('[GeminiImageTool] Error saving image:', imgError);
            }
          }
        }
      } else {
        console.error(
          '[GeminiImageTool] Unexpected response structure from Imagen 3:',
          JSON.stringify(primaryResponse.data).substring(0, 200) + '...',
        );
        return {
          images: [],
          prompt: prompt || '',
          success: false,
          message: 'Unexpected response structure from Imagen 3 API.',
          autoOpenPreview: false,
          error: 'Unexpected response structure from Imagen 3 API.',
          title: 'API Response Error',
          toolName: 'gemini-image-generation',
          toolDisplayName: 'Gemini画像生成'
        };
      }

      if (images.length > 0) {
        // マークダウン形式の画像リンクを生成
        const markdownImages = images.map((img, index) => 
          `![Generated Image ${index + 1}](${img.url})`
        ).join('\n\n');
        
        const successMessage = `${images.length}枚の画像を生成しました！\n\n${markdownImages}`;
        
        return { 
          images, 
          prompt: prompt || '',
          success: true,
          message: successMessage,
          autoOpenPreview: autoOpenPreview ?? true,
          title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? '...' : ''}`,
          toolName: 'gemini-image-generation',
          toolDisplayName: 'Gemini画像生成',
          markdownImages
        };
      } else {
        return {
          images: [],
          prompt: prompt || '',
          success: false,
          message: 'No images were generated. Please try again with a different prompt.',
          autoOpenPreview: false,
          error: 'No images generated or image data missing in response.',
          title: `画像生成エラー`,
          toolName: 'gemini-image-generation',
          toolDisplayName: 'Gemini画像生成'
        };
      }
    } catch (error: any) {
      // エラーログの出力
      console.error(
        '[GeminiImageTool] Error during Imagen 3 image generation:',
        error.message,
        error.response?.status,
      );
      
      let errorMessage = 'Unknown error occurred during image generation.';
      
      if (error.response) {
        // API からのエラーレスポンス
        errorMessage = `API Error (${error.response.status}): ${
          error.response.data?.error?.message || error.message
        }`;
      } else if (error.request) {
        // リクエストは送信されたがレスポンスがない
        errorMessage = 'Network error: No response received from the API.';
      } else {
        // リクエスト作成中のエラー
        errorMessage = `Request setup error: ${error.message}`;
      }
      
      return {
        images: [],
        prompt: prompt || '',
        success: false,
        message: `Failed to generate images: ${errorMessage}`,
        autoOpenPreview: false,
        error: errorMessage,
        title: 'Image Generation Error',
        toolName: 'gemini-image-generation',
        toolDisplayName: 'Gemini画像生成'
      };
    }
  },
});

// Example of how to use the tool (for testing purposes)
// async function testImageGeneration() {
//   process.env.GEMINI_API_KEY = "YOUR_API_KEY_HERE"; // Set your API key for testing
//   const tool = geminiImageGenerationTool;
//   const result = await tool.run({
//     prompt: "A futuristic cityscape at sunset",
//     numberOfImages: 1,
//     aspectRatio: "16:9",
//   });
//   console.log(result);
// }
// testImageGeneration(); 