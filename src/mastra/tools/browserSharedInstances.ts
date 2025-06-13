// Stagehandのグローバルインスタンスを管理
export const stagehandInstances = new Map<string, any>();

// セッション設定を保存
export interface SessionSettings {
  solveCaptchas?: boolean;
  captchaImageSelector?: string;
  captchaInputSelector?: string;
  proxies?: boolean;
}

export const sessionSettings = new Map<string, SessionSettings>(); 