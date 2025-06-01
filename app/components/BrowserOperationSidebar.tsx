import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Monitor, Play, Square, Eye, EyeOff } from 'lucide-react';

interface BrowserOperationSidebarProps {
  sessionId: string;
  replayUrl: string;
  liveViewUrl?: string;
  screenshot?: {
    url: string;
    path: string;
  };
  pageTitle?: string;
  elementText?: string;
  autoOpenPreview?: boolean;
  forcePanelOpen?: boolean;
  onPreviewOpen?: () => void;
  onPreviewClose?: () => void;
  onPreviewWidthChange?: (width: number) => void;
}

export function BrowserOperationSidebar({
  sessionId,
  replayUrl,
  liveViewUrl,
  screenshot,
  pageTitle,
  elementText,
  autoOpenPreview = true,
  forcePanelOpen = false,
  onPreviewOpen,
  onPreviewClose,
  onPreviewWidthChange
}: BrowserOperationSidebarProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(true); // デフォルトで開く
  const [viewMode, setViewMode] = useState<'live' | 'replay'>('live');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'loading'>('loading');

  // 自動プレビュー開始
  useEffect(() => {
    setIsPreviewOpen(true);
    onPreviewOpen?.();
  }, [onPreviewOpen]);

  // 接続状態の設定
  useEffect(() => {
    if (liveViewUrl && !liveViewUrl.includes('#')) {
      setConnectionStatus('connected');
    } else if (replayUrl && !replayUrl.includes('#')) {
      setConnectionStatus('disconnected');
      setViewMode('replay');
    }
  }, [liveViewUrl, replayUrl]);

  const handlePreviewToggle = useCallback(() => {
    const newState = !isPreviewOpen;
    setIsPreviewOpen(newState);
    
    if (newState) {
      onPreviewOpen?.();
    } else {
      onPreviewClose?.();
    }
  }, [isPreviewOpen, onPreviewOpen, onPreviewClose]);

  const currentUrl = viewMode === 'live' && liveViewUrl ? liveViewUrl : replayUrl;
  const isLoading = sessionId.includes('loading') || sessionId.includes('starting') || replayUrl.includes('#') || connectionStatus === 'loading';
  const isStarting = sessionId.includes('starting') || currentUrl?.includes('#starting');

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 最小限のヘッダー */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">ブラウザ自動化</span>
            <div className={`w-2 h-2 rounded-full ${
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              connectionStatus === 'disconnected' ? 'bg-gray-500' :
              viewMode === 'live' ? 'bg-red-500' : 'bg-blue-500'
            }`} />
          </div>
          
          <div className="flex items-center gap-1">
            {/* 小さなコントロールボタン */}
            {liveViewUrl && connectionStatus !== 'disconnected' && (
              <Button
                variant={viewMode === 'live' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('live')}
                className="h-6 px-2 text-xs"
                disabled={connectionStatus === 'loading'}
              >
                <Play className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant={viewMode === 'replay' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('replay')}
              className="h-6 px-2 text-xs"
            >
              <Square className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
              className="h-6 px-2 text-xs"
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* メインプレビューエリア - 画面いっぱい */}
      <div className="flex-1 min-h-0 bg-white">
        {isStarting ? (
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                <div className="absolute inset-0 rounded-full h-12 w-12 border-2 border-blue-200 mx-auto" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-800">セッション作成中...</p>
                <p className="text-sm text-gray-600">ブラウザ環境を準備しています</p>
              </div>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="text-sm text-gray-600">ブラウザ自動化を実行中...</p>
            </div>
          </div>
        ) : connectionStatus === 'disconnected' ? (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-3">
              <Square className="h-8 w-8 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">セッションが終了しました</p>
            </div>
          </div>
        ) : currentUrl ? (
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            title={`Browserbase ${viewMode === 'live' ? 'Live View' : 'Session Replay'}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="clipboard-read; clipboard-write; fullscreen"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-4 p-6">
              <Monitor className="h-12 w-12 text-gray-400 mx-auto" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-800">ライブビューを開始</h3>
                <p className="text-sm text-gray-600 max-w-md">
                  ブラウザ自動化ツールを実行すると、リアルタイムでブラウザ操作の様子をここに表示します。
                </p>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    💡 チャットで「Webサイトを開いて」や「情報を検索して」などのタスクを入力してください
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* スクリーンショット（プレビューが閉じている場合のみ） */}
      {screenshot && !isPreviewOpen && (
        <div className="flex-1 min-h-0 bg-white p-2">
          <img
            src={screenshot.url}
            alt="ブラウザスクリーンショット"
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
} 