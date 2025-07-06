import { getDriveClient } from './googleAuth';

/**
 * 指定されたファイルIDを持つファイルを、指定されたメールアドレスと共有します。
 * @param fileId 共有するファイルのID
 * @param emailAddress 共有先のメールアドレス
 */
export async function shareFileWithUser(fileId: string, emailAddress: string) {
    if (!fileId || !emailAddress) {
        console.warn("File ID or email address is missing, skipping file sharing.");
        return;
    }

    const drive = await getDriveClient();

    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'writer', // 編集者権限を付与
                type: 'user',
                emailAddress: emailAddress,
            },
            // これを追加することで、共有相手に通知メールが飛ぶのを防ぐ場合
            // sendNotificationEmail: false, 
        });
        console.log(`Successfully shared file ${fileId} with ${emailAddress}`);
    } catch (error) {
        console.error(`Failed to share file ${fileId} with ${emailAddress}:`, error);
        // エラーを投げずに警告に留めることで、ファイル作成自体は成功として継続させる
    }
}

/**
 * メールアドレスが有効な形式かチェックします
 * @param email チェックするメールアドレス
 * @returns メールアドレスが有効な場合はtrue
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * ファイルのパブリックURLを生成します
 * @param fileId ファイルのID
 * @returns 編集用のURL
 */
export function generateEditUrl(fileId: string): string {
    // Google Workspace ファイルの編集URLを生成
    return `https://docs.google.com/document/d/${fileId}/edit`;
}

/**
 * ファイルタイプに応じた適切な編集URLを生成します
 * @param fileId ファイルのID
 * @param fileType ファイルの種類 ('docs', 'sheets', 'slides')
 * @returns 編集用のURL
 */
export function generateEditUrlByType(fileId: string, fileType: 'docs' | 'sheets' | 'slides'): string {
    const baseUrls = {
        docs: 'https://docs.google.com/document/d/',
        sheets: 'https://docs.google.com/spreadsheets/d/',
        slides: 'https://docs.google.com/presentation/d/',
    };
    
    return `${baseUrls[fileType]}${fileId}/edit`;
}