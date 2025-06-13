import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import { stagehandInstances } from './browserSharedInstances';

const browserCaptchaDetectToolInputSchema = z.object({
  sessionId: z.string().describe('Browserbase session ID'),
  timeout: z.number().optional().default(30000).describe('Maximum wait time for CAPTCHA solving (milliseconds)'),
});

const browserCaptchaDetectToolOutputSchema = z.object({
  captchaDetected: z.boolean().describe('Whether CAPTCHA was detected on the page'),
  captchaSolved: z.boolean().describe('Whether CAPTCHA was solved (if detected)'),
  message: z.string().describe('Result message'),
  duration: z.number().describe('Time taken for detection and solving (milliseconds)'),
});

export const browserCaptchaDetectTool = createTool({
  id: 'browser-captcha-detect',
  description: 'Check if CAPTCHA exists on the current page and wait for solving if detected',
  inputSchema: browserCaptchaDetectToolInputSchema,
  outputSchema: browserCaptchaDetectToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, timeout } = context;
      
      // Stagehandインスタンスを取得
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`Session ${sessionId} not found. Please navigate to a page first.`);
      }
      
      const page = stagehand.page;
      const startTime = Date.now();
      
      console.log('🔍 CAPTCHA検出を開始...');
      
      // CAPTCHAの一般的なセレクターをチェック
      const captchaSelectors = [
        // reCAPTCHA
        '.g-recaptcha',
        '#recaptcha',
        '[data-sitekey]',
        'iframe[src*="recaptcha"]',
        // hCaptcha
        '.h-captcha',
        'iframe[src*="hcaptcha"]',
        // Cloudflare
        '.cf-challenge',
        '#challenge-form',
        // 一般的なCAPTCHA
        '[class*="captcha"]',
        '[id*="captcha"]',
        'img[src*="captcha"]'
      ];

      let captchaDetected = false;
      let detectedSelector = '';
      
      // CAPTCHAエレメントの存在チェック
      for (const selector of captchaSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            captchaDetected = true;
            detectedSelector = selector;
            console.log(`🔓 CAPTCHA検出: ${selector}`);
            break;
          }
        } catch (e) {
          // セレクターエラーは無視
        }
      }

      if (!captchaDetected) {
        return {
          captchaDetected: false,
          captchaSolved: true,
          message: 'CAPTCHAは検出されませんでした',
          duration: Date.now() - startTime,
        };
      }

      console.log('⏳ CAPTCHA解決を待機中...');
      
      // CAPTCHA解決イベントを監視
      let solvingCompleted = false;

      const captchaPromise = new Promise<boolean>((resolve) => {
        let timeoutId: NodeJS.Timeout;
        
        const onConsole = (msg: any) => {
          const text = msg.text();
          
          if (text === 'browserbase-solving-started') {
            console.log('🔓 Browserbase CAPTCHA解決開始');
          } else if (text === 'browserbase-solving-finished') {
            solvingCompleted = true;
            console.log('✅ Browserbase CAPTCHA解決完了');
            page.off('console', onConsole);
            clearTimeout(timeoutId);
            resolve(true);
          }
        };
        
        page.on('console', onConsole);
        
        // タイムアウト設定
        timeoutId = setTimeout(() => {
          page.off('console', onConsole);
          resolve(false);
        }, timeout);
      });

      const solved = await captchaPromise;
      const duration = Date.now() - startTime;

      if (solved) {
        return {
          captchaDetected: true,
          captchaSolved: true,
          message: `✅ CAPTCHA解決完了 (検出: ${detectedSelector}, 所要時間: ${duration}ms)`,
          duration,
        };
      } else {
        // 解決が確認できない場合、CAPTCHAが消えているかチェック
        console.log('🔄 CAPTCHA要素を再確認中...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const element = await page.$(detectedSelector);
          if (!element) {
            return {
              captchaDetected: true,
              captchaSolved: true,
              message: `✅ CAPTCHAが消失しました (解決済み, 所要時間: ${duration}ms)`,
              duration,
            };
          }
        } catch (e) {
          // エラーの場合もCAPTCHAが消えたと判断
          return {
            captchaDetected: true,
            captchaSolved: true,
            message: `✅ CAPTCHAが解決されました (所要時間: ${duration}ms)`,
            duration,
          };
        }

        return {
          captchaDetected: true,
          captchaSolved: false,
          message: `⏰ CAPTCHA解決タイムアウト (${timeout}ms) - 手動解決が必要かもしれません`,
          duration,
        };
      }
    } catch (error) {
      console.error('CAPTCHA検出エラー:', error);
      return {
        captchaDetected: false,
        captchaSolved: false,
        message: `CAPTCHA検出エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 0,
      };
    }
  },
});