'use client';

import { useState, useEffect } from 'react';
import { MainHeader } from '@/app/components/MainHeader';
import Image from 'next/image';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';

interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  size: string;
  createdAt: string;
}

export default function MediaPage() {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // コンポーネントがマウントされたことを確認
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchMediaFiles = async () => {
      try {
        // 画像ファイルを取得
        const imageResponse = await fetch('/api/media/images');
        const images = imageResponse.ok ? await imageResponse.json() : [];
        
        // 動画ファイルを取得
        const videoResponse = await fetch('/api/media/videos');
        const videos = videoResponse.ok ? await videoResponse.json() : [];
        
        // 音楽ファイルを取得
        const musicResponse = await fetch('/api/media/music');
        const music = musicResponse.ok ? await musicResponse.json() : [];
        
        // 全てのメディアファイルを結合し、作成日時でソート
        const allMedia = [...images, ...videos, ...music].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        setMediaFiles(allMedia);
      } catch (error) {
        console.error('メディアファイルの取得に失敗しました:', error);
        setMediaFiles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMediaFiles();
  }, [mounted]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return '不明';
      }
      return new Intl.DateTimeFormat('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(dateObj);
    } catch (error) {
      console.error('日付のフォーマットエラー:', error);
      return '不明';
    }
  };

  // サーバーサイドレンダリング中は何も表示しない
  if (!mounted) {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <MainHeader />
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Card>
            <CardHeader>
              <CardTitle>メディア一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-muted-foreground">読み込み中...</div>
                </div>
              ) : (
                <Table>
                  <TableCaption>
                    生成されたメディアファイルの一覧（新しい順）
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">プレビュー</TableHead>
                      <TableHead>ファイル名</TableHead>
                      <TableHead className="hidden sm:table-cell">タイプ</TableHead>
                      <TableHead className="hidden md:table-cell">サイズ</TableHead>
                      <TableHead className="hidden lg:table-cell">作成日時</TableHead>
                      <TableHead className="text-right">アクション</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mediaFiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          メディアファイルがありません
                        </TableCell>
                      </TableRow>
                    ) : (
                      mediaFiles.map((file) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            {file.type === 'image' ? (
                              <div className="w-16 h-16 relative rounded-md overflow-hidden">
                                <Image
                                  src={file.url}
                                  alt={file.name}
                                  fill
                                  style={{ objectFit: 'cover' }}
                                  unoptimized
                                />
                              </div>
                            ) : file.type === 'video' ? (
                              <video
                                src={file.url}
                                className="w-16 h-16 object-cover rounded-md"
                                muted
                                preload="metadata"
                              />
                            ) : (
                              <audio
                                src={file.url}
                                className="w-16 h-16 object-cover rounded-md"
                                controls
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{file.name}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant={file.type === 'image' ? 'default' : file.type === 'video' ? 'secondary' : 'destructive'}>
                              {file.type === 'image' ? '画像' : file.type === 'video' ? '動画' : '音楽'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{file.size}</TableCell>
                          <TableCell className="hidden lg:table-cell">{formatDate(file.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 underline"
                            >
                              開く
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 