import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const videosDir = path.join(process.cwd(), 'public', 'generated-videos');
    
    // ディレクトリが存在しない場合は空配列を返す
    if (!fs.existsSync(videosDir)) {
      return NextResponse.json([]);
    }

    const files = fs.readdirSync(videosDir);
    const videoFiles = files
      .filter(file => file.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i))
      .map(file => {
        try {
          const filePath = path.join(videosDir, file);
          const stats = fs.statSync(filePath);
          
          return {
            id: file.replace(/\.[^/.]+$/, ""), // 拡張子を除いたファイル名をIDとして使用
            name: file,
            type: 'video' as const,
            url: `/generated-videos/${file}`,
            size: formatFileSize(stats.size),
            createdAt: stats.birthtime.toISOString(),
          };
        } catch (error) {
          console.error(`ファイル ${file} の処理中にエラーが発生しました:`, error);
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(videoFiles);
  } catch (error) {
    console.error('動画ファイルの取得エラー:', error);
    return NextResponse.json({ error: '動画ファイルの取得に失敗しました' }, { status: 500 });
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 