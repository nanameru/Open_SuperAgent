import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { promises as fs } from 'fs';
import path from 'path';
import { stagehandInstances } from './browserSharedInstances';

const browserScreenshotToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  fullPage: z.boolean().optional().default(false).describe('Whether to capture the full page'),
  filename: z.string().optional().describe('Optional filename for the screenshot file'),
  format: z.enum(['png', 'jpeg', 'webp']).optional().default('png').describe('Image format'),
  quality: z.number().min(1).max(100).optional().default(90).describe('Image quality (1-100, only for JPEG/WebP)'),
  useCDP: z.boolean().optional().default(false).describe('Use Chrome DevTools Protocol for better performance'),
  optimizeForSpeed: z.boolean().optional().default(false).describe('Optimize for speed over quality'),
});

const browserScreenshotToolOutputSchema = z.object({
  success: z.boolean().describe('Whether the screenshot was successful'),
  screenshotUrl: z.string().describe('URL of the captured screenshot'),
  format: z.string().describe('Image format used'),
  quality: z.number().optional().describe('Quality setting applied'),
  fileSize: z.number().optional().describe('File size in bytes'),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }).optional().describe('Image dimensions'),
  method: z.string().describe('Capture method used (Playwright or CDP)'),
  message: z.string().describe('Result message'),
});

export const browserScreenshotTool = createTool({
  id: 'browser-screenshot',
  description: 'Take a high-quality screenshot with format and quality options using Playwright or CDP',
  inputSchema: browserScreenshotToolInputSchema,
  outputSchema: browserScreenshotToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { 
        sessionId, 
        fullPage, 
        filename: userFilename, 
        format, 
        quality, 
        useCDP, 
        optimizeForSpeed 
      } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      
      const page = stagehand.page;
      
      console.log(`📸 Taking screenshot (format: ${format}, quality: ${quality}, fullPage: ${fullPage}, method: ${useCDP ? 'CDP' : 'Playwright'})`);
      
      let screenshotBuffer: Buffer;
      let method = 'Playwright';
      
      // 品質最適化設定
      const actualQuality = optimizeForSpeed ? Math.min(quality!, 50) : quality;
      
      if (useCDP && (format === 'jpeg' || format === 'webp')) {
        // Chrome DevTools Protocol使用（高性能）
        method = 'CDP';
        console.log('🚀 Using CDP for better performance');
        
        try {
          const cdp = await page.context().newCDPSession(page);
          
          // ページの寸法を取得
          const { layoutMetrics } = await cdp.send('Page.getLayoutMetrics');
          
          const screenshotParams: any = {
            format,
            quality: actualQuality,
          };
          
          if (fullPage) {
            screenshotParams.clip = {
              x: 0,
              y: 0,
              width: layoutMetrics.contentSize.width,
              height: layoutMetrics.contentSize.height,
              scale: 1,
            };
          }
          
          const { data } = await cdp.send('Page.captureScreenshot', screenshotParams);
          screenshotBuffer = Buffer.from(data, 'base64');
          
          await cdp.detach();
        } catch (cdpError) {
          console.warn('CDP screenshot failed, falling back to Playwright:', cdpError);
          method = 'Playwright (CDP fallback)';
          screenshotBuffer = await takePlaywrightScreenshot(page, fullPage, format!, actualQuality);
        }
      } else {
        // Playwright標準API使用
        screenshotBuffer = await takePlaywrightScreenshot(page, fullPage, format!, actualQuality);
      }
      
      // ファイル名とパスを設定
      const fileExtension = format === 'jpeg' ? 'jpg' : format;
      const filename = userFilename 
        ? (userFilename.includes('.') ? userFilename : `${userFilename}.${fileExtension}`)
        : `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
        
      const screenshotDir = path.join(process.cwd(), 'public', 'browser-screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });
      const filePath = path.join(screenshotDir, filename);
      
      // ファイルに保存
      await fs.writeFile(filePath, screenshotBuffer);
      const screenshotUrl = `/browser-screenshots/${filename}`;
      
      // ファイルサイズと寸法を取得
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // 画像寸法を取得（シンプルな方法）
      let dimensions: { width: number; height: number } | undefined;
      try {
        // 基本的な寸法取得（より詳細な情報が必要な場合は画像ライブラリを使用）
        const viewport = await page.viewportSize();
        if (viewport) {
          dimensions = { width: viewport.width, height: viewport.height };
        }
      } catch (e) {
        // 寸法取得失敗は無視
      }
      
      console.log(`✅ Screenshot captured: ${filename} (${fileSize} bytes, ${method})`);
      
      return {
        success: true,
        screenshotUrl,
        format: format!,
        quality: format !== 'png' ? actualQuality : undefined,
        fileSize,
        dimensions,
        method,
        message: `📸 スクリーンショット撮影完了

ファイル: ${filename}
形式: ${format?.toUpperCase()}${format !== 'png' ? ` (品質: ${actualQuality})` : ''}
サイズ: ${(fileSize / 1024).toFixed(1)}KB
方式: ${method}

アクセス可能URL: ${screenshotUrl}`,
      };
    } catch (error) {
      console.error('Screenshot error:', error);
      return {
        success: false,
        screenshotUrl: '',
        format: context.format!,
        method: 'Failed',
        message: `Screenshot failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Playwright標準API使用のヘルパー関数
async function takePlaywrightScreenshot(page: any, fullPage: boolean, format: string, quality: number): Promise<Buffer> {
  const options: any = {
    fullPage,
    timeout: 10000,
    type: format === 'jpeg' ? 'jpeg' : format,
  };
  
  if (format === 'jpeg' || format === 'webp') {
    options.quality = quality;
  }
  
  return await page.screenshot(options);
} 