import { stagehandInstances } from './browserSharedInstances';

export interface CaptchaResult {
  detected: boolean;
  solved: boolean;
  message: string;
  duration: number;
}

/**
 * CAPTCHA検出と解決待機の共通ロジック
 */
export async function detectAndSolveCaptcha(
  sessionId: string,
  timeout: number = 30000
): Promise<CaptchaResult> {
  try {
    const stagehand = stagehandInstances.get(sessionId);
    if (!stagehand) {
      return {
        detected: false,
        solved: false,
        message: 'セッションが見つかりません',
        duration: 0,
      };
    }
    
    const page = stagehand.page;
    const startTime = Date.now();
    
    // CAPTCHAの一般的なセレクターをチェック
    const captchaSelectors = [
      '.g-recaptcha',
      '#recaptcha',
      '[data-sitekey]',
      'iframe[src*="recaptcha"]',
      '.h-captcha',
      'iframe[src*="hcaptcha"]',
      '.cf-challenge',
      '#challenge-form',
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
        detected: false,
        solved: true,
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
        detected: true,
        solved: true,
        message: `✅ CAPTCHA解決完了 (${duration}ms)`,
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
            detected: true,
            solved: true,
            message: `✅ CAPTCHAが解決されました (${duration}ms)`,
            duration,
          };
        }
      } catch (e) {
        return {
          detected: true,
          solved: true,
          message: `✅ CAPTCHAが解決されました (${duration}ms)`,
          duration,
        };
      }

      return {
        detected: true,
        solved: false,
        message: `⏰ CAPTCHA解決継続中 (${timeout}ms)`,
        duration,
      };
    }
  } catch (error) {
    console.error('CAPTCHA検出エラー:', error);
    return {
      detected: false,
      solved: false,
      message: `CAPTCHA検出エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0,
    };
  }
}