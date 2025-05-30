import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fal } from '@fal-ai/client';

// Imagen 4モデル識別子
const IMAGEN4_MODEL_ID = 'fal-ai/imagen4/preview';

// アスペクト比の列挙型
const AspectRatioEnum = z.enum(['1:1', '16:9', '9:16', '3:4', '4:3']);

// 入力スキーマを定義
const imagen4GenerationToolInputSchema = z.object({
  prompt: z.string().describe('画像生成のためのプロンプト'),
  negative_prompt: z.string().optional().default('').describe('生成を避けたい要素を記述する否定的なプロンプト'),
  aspect_ratio: AspectRatioEnum.optional().default('1:1').describe('生成する画像のアスペクト比'),
  num_images: z.number().min(1).max(4).optional().default(1).describe('生成する画像の数（1〜4）'),
  seed: z.number().optional().describe('再現可能な生成のための乱数シード値'),
  autoOpenPreview: z.boolean().optional().default(true).describe('画像生成後に自動的にプレビューパネルを開くかどうか'),
});

// 出力スキーマを定義
const imagen4GenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe('生成された画像のURL'),
      b64Json: z.string().optional().describe('Base64エンコードされた画像データ（省略可能）'),
    }),
  ),
  prompt: z.string().describe('画像生成に使用されたプロンプト'),
  success: z.boolean().describe('画像生成が成功したかどうか'),
  message: z.string().describe('操作結果を説明するメッセージ'),
  autoOpenPreview: z.boolean().optional().describe('自動的にプレビューパネルを開くかどうか'),
  error: z.string().optional().describe('エラーが発生した場合のエラーメッセージ'),
  seed: z.number().optional().describe('使用された乱数シード値'),
  title: z.string().optional().describe('生成された画像のタイトル'),
  toolName: z.string().optional().describe('表示目的のツール名'),
  toolDisplayName: z.string().optional().describe('ユーザーフレンドリーなツール名'),
  markdownImages: z.string().optional().describe('チャット表示用のマークダウン形式の画像文字列'),
});

// 入力と出力の型を定義
type InputType = z.infer<typeof imagen4GenerationToolInputSchema>;
type OutputType = z.infer<typeof imagen4GenerationToolOutputSchema>;

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

export const imagen4GenerationTool = createTool({
  id: 'imagen4-generation',
  description:
    'GoogleのImagen 4モデルを使用してテキストプロンプトに基づいて高品質な画像を生成します。微細なディテールや自然な照明、豊かなテクスチャーを持つ画像を生成できます。',
  inputSchema: imagen4GenerationToolInputSchema,
  outputSchema: imagen4GenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, negative_prompt, aspect_ratio, num_images, seed, autoOpenPreview } = context;

    console.log('[Imagen4Tool] Received input:');
    console.log(`[Imagen4Tool] Prompt: "${prompt?.substring(0, 50)}${prompt?.length > 50 ? '...' : ''}"`);
    console.log(`[Imagen4Tool] Number of images: ${num_images || 1}`);
    console.log(`[Imagen4Tool] Aspect ratio: ${aspect_ratio || '1:1'}`);

    try {
      // API Keyの設定を確認
      const isApiConfigured = configureFalApi();
      if (!isApiConfigured) {
        return {
          images: [],
          prompt: prompt || '',
          success: false,
          message: 'API key is not set. Please configure the FAL_KEY environment variable.',
          autoOpenPreview: false,
          error: 'FAL_KEY is not set.',
          title: 'API Key Error',
          toolName: 'imagen4-generation',
          toolDisplayName: 'Imagen 4画像生成',
        };
      }

      // 画像保存先ディレクトリの確保
      const imagesDir = path.join(process.cwd(), 'public', 'generated-images');
      if (!fs.existsSync(imagesDir)) {
        try {
          fs.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error('[Imagen4Tool] Failed to create images directory:', dirError);
          return {
            images: [],
            prompt: prompt || '',
            success: false,
            message: 'Failed to create images directory.',
            autoOpenPreview: false,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            title: 'Directory Error',
            toolName: 'imagen4-generation',
            toolDisplayName: 'Imagen 4画像生成',
          };
        }
      }

      console.log('[Imagen4Tool] Calling Imagen 4 API...');

      // Imagen 4 APIの呼び出し（@fal-ai/clientを使用）
      const result = await fal.subscribe(IMAGEN4_MODEL_ID, {
        input: {
          prompt,
          negative_prompt: negative_prompt || '',
          aspect_ratio,
          num_images: Math.min(num_images || 1, 4), // 最大4枚に制限
          ...(typeof seed === 'number' && { seed }),
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            update.logs.map((log) => log.message).forEach((msg) => console.log(`[Imagen4Tool] ${msg}`));
          }
        },
      });

      console.log('[Imagen4Tool] Imagen 4 API Response Received');

      const images: { url: string; b64Json?: string }[] = [];

      // レスポンスから画像URLを取得
      if (result.data && result.data.images && Array.isArray(result.data.images)) {
        for (const imageData of result.data.images) {
          if (imageData.url) {
            try {
              // 画像URL取得して保存する
              const response = await fetch(imageData.url);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              
              const imageName = `img_${uuidv4()}.png`;
              const imagePath = path.join(imagesDir, imageName);
              
              // バイナリを保存
              fs.writeFileSync(imagePath, buffer);
              
              const imageUrl = `/generated-images/${imageName}`;
              images.push({ 
                url: imageUrl,
                // b64Jsonは省略（巨大なデータのため）
              });
            } catch (imgError) {
              console.error('[Imagen4Tool] Error saving image:', imgError);
            }
          }
        }
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
          seed: result.data?.seed,
          title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? '...' : ''}`,
          toolName: 'imagen4-generation',
          toolDisplayName: 'Imagen 4画像生成',
          markdownImages,
        };
      } else {
        return {
          images: [],
          prompt: prompt || '',
          success: false,
          message: 'No images were generated. Please try again with a different prompt.',
          autoOpenPreview: false,
          error: 'No images generated or image data missing in response.',
          title: '画像生成エラー',
          toolName: 'imagen4-generation',
          toolDisplayName: 'Imagen 4画像生成',
        };
      }
    } catch (error: any) {
      // エラーログの出力
      console.error('[Imagen4Tool] Error during image generation:', error.message);
      
      let errorMessage = 'Unknown error occurred during image generation.';
      
      if (error.response) {
        // APIからのエラーレスポンス
        errorMessage = `API Error: ${error.response.status || ''} - ${error.response.data?.error || error.message}`;
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
        title: '画像生成エラー',
        toolName: 'imagen4-generation',
        toolDisplayName: 'Imagen 4画像生成',
      };
    }
  },
}); 