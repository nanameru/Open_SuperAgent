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
});

const geminiImageGenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe('URL of the generated image.'),
      b64Json: z.string().describe('Base64 encoded image data.'),
    }),
  ),
  error: z.string().optional().describe('Error message if generation failed.'),
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
    const { prompt, numberOfImages, aspectRatio, negativePrompt, seed, personGeneration } = context;

    console.log('[GeminiImageTool] Received input:');
    console.log(`[GeminiImageTool] Prompt length: ${prompt?.length || 0}`);
    console.log(`[GeminiImageTool] Negative Prompt length: ${negativePrompt?.length || 0}`);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { images: [], error: 'GEMINI_API_KEY is not set.' };
    }

    const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
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
        sampleCount: numberOfImages || 1,
        ...(aspectRatio && { aspectRatio }),
        ...(typeof seed === 'number' && { seed }),
        ...(personGeneration && { personGeneration }),
      }
    };

    console.log('[GeminiImageTool] Calling Imagen 3 API...');
    console.log('[GeminiImageTool] Endpoint:', imagenApiUrl);
    console.log(
      '[GeminiImageTool] Request Body:',
      JSON.stringify(requestBody, null, 2),
    );

    try {
      const primaryResponse = await axios.post(imagenApiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      console.log(
        '[GeminiImageTool] Imagen 3 API Response Status:',
        primaryResponse.status,
      );

      const images: { url: string; b64Json: string }[] = [];

      // レスポンス構造をチェックし、正しい画像データを抽出
      if (primaryResponse.data && primaryResponse.data.predictions && Array.isArray(primaryResponse.data.predictions)) {
        // Google Imagen 3.0のレスポンス形式
        for (const prediction of primaryResponse.data.predictions) {
          if (prediction.bytesBase64Encoded) {
            const base64Data = prediction.bytesBase64Encoded;
            const imageName = `img_${uuidv4()}.png`;
            const imagePath = path.join(imagesDir, imageName);
            fs.writeFileSync(imagePath, Buffer.from(base64Data, 'base64'));
            const imageUrl = `/generated-images/${imageName}`;
            images.push({ url: imageUrl, b64Json: base64Data });
          }
        }
      } else {
        console.error(
          '[GeminiImageTool] Unexpected response structure from Imagen 3:',
          primaryResponse.data,
        );
        return {
          images: [],
          error: 'Unexpected response structure from Imagen 3 API.',
        };
      }

      if (images.length > 0) {
        return { images };
      } else {
        return {
          images: [],
          error: 'No images generated or image data missing in response.',
        };
      }
    } catch (error: any) {
      console.error(
        '[GeminiImageTool] Error during Imagen 3 image generation:',
        error.response?.data || error.message,
      );
      return {
        images: [],
        error: `Error during Imagen 3 generation: ${
          error.response?.data?.error?.message || error.message
        }`,
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