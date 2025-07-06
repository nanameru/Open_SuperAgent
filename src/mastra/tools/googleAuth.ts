import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// 認証状態を管理するフラグ
let authInitialized = false;
let authClient: JWT | null = null;

/**
 * Google APIの認証を初期化します
 * 環境変数 GOOGLE_APPLICATION_CREDENTIALS_JSON からサービスアカウントキーを読み込みます
 */
async function initializeAuth(): Promise<JWT> {
  if (authInitialized && authClient) {
    return authClient;
  }

  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set');
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch (error) {
    throw new Error('Invalid JSON in GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable');
  }

  // Google API のスコープを定義
  const scopes = [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/drive.file',
  ];

  authClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes,
  });

  authInitialized = true;
  return authClient;
}

/**
 * Google Docs クライアントを取得します
 */
export async function getDocsClient() {
  const auth = await initializeAuth();
  return google.docs({ version: 'v1', auth });
}

/**
 * Google Sheets クライアントを取得します
 */
export async function getSheetsClient() {
  const auth = await initializeAuth();
  return google.sheets({ version: 'v4', auth });
}

/**
 * Google Slides クライアントを取得します
 */
export async function getSlidesClient() {
  const auth = await initializeAuth();
  return google.slides({ version: 'v1', auth });
}

/**
 * Google Drive クライアントを取得します
 */
export async function getDriveClient() {
  const auth = await initializeAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * 認証が利用可能かチェックします
 */
export function isAuthConfigured(): boolean {
  return !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
}