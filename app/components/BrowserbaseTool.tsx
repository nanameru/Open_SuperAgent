import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Monitor, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface BrowserbaseToolProps {
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

export function BrowserbaseTool({
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
}: BrowserbaseToolProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(50);
  const [viewMode, setViewMode] = useState<'live' | 'replay'>('live');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 自動プレビュー開始
  useEffect(() => {
    if ((autoOpenPreview || forcePanelOpen) && (liveViewUrl || replayUrl)) {
      setIsPreviewOpen(true);
      onPreviewOpen?.();
    }
  }, [autoOpenPreview, forcePanelOpen, liveViewUrl, replayUrl, onPreviewOpen]);

  // プレビュー幅の変更を親に通知
  useEffect(() => {
    if (isPreviewOpen) {
      onPreviewWidthChange?.(previewWidth);
    }
  }, [isPreviewOpen, previewWidth, onPreviewWidthChange]);

  const handlePreviewToggle = useCallback(() => {
    const newState = !isPreviewOpen;
    setIsPreviewOpen(newState);
    
    if (newState) {
      onPreviewOpen?.();
    } else {
      onPreviewClose?.();
    }
  }, [isPreviewOpen, onPreviewOpen, onPreviewClose]);

  const handleWidthChange = useCallback((newWidth: number) => {
    setPreviewWidth(newWidth);
    onPreviewWidthChange?.(newWidth);
  }, [onPreviewWidthChange]);

  const currentUrl = viewMode === 'live' && liveViewUrl ? liveViewUrl : replayUrl;

  return (
    <div className="w-full mb-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg text-blue-800">
                🌐 ブラウザ自動化
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                セッション: {sessionId.slice(-8)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {liveViewUrl && (
                <Button
                  variant={viewMode === 'live' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('live')}
                  className="text-xs"
                >
                  🔴 ライブ
                </Button>
              )}
              <Button
                variant={viewMode === 'replay' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('replay')}
                className="text-xs"
              >
                🎬 リプレイ
              </Button>
              <Button
                variant={isPreviewOpen ? 'default' : 'outline'}
                size="sm"
                onClick={handlePreviewToggle}
                className="text-xs"
              >
                {isPreviewOpen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                {isPreviewOpen ? '閉じる' : '表示'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {pageTitle && (
              <div>
                <span className="font-medium text-gray-600">ページタイトル:</span>
                <p className="text-gray-800 mt-1">{pageTitle}</p>
              </div>
            )}
            {elementText && (
              <div>
                <span className="font-medium text-gray-600">取得テキスト:</span>
                <p className="text-gray-800 mt-1 truncate">{elementText}</p>
              </div>
            )}
          </div>

          {/* プレビューパネル */}
          {isPreviewOpen && currentUrl && (
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${viewMode === 'live' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                  <span className="text-xs font-medium text-gray-600">
                    {viewMode === 'live' ? 'ライブビュー' : 'セッションリプレイ'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(currentUrl, '_blank')}
                    className="h-6 px-2 text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-6 px-2 text-xs"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}`}>
                {isFullscreen && (
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-medium">ブラウザビュー - {viewMode === 'live' ? 'ライブ' : 'リプレイ'}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreen(false)}
                    >
                      <Minimize2 className="h-4 w-4 mr-2" />
                      閉じる
                    </Button>
                  </div>
                )}
                
                <iframe
                  src={currentUrl}
                  className={`w-full border-0 ${isFullscreen ? 'h-[calc(100vh-80px)]' : 'h-96'}`}
                  title={`Browserbase ${viewMode === 'live' ? 'Live View' : 'Session Replay'}`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  allow="clipboard-read; clipboard-write; fullscreen"
                />
              </div>
            </div>
          )}

          {/* スクリーンショット */}
          {screenshot && !isPreviewOpen && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700">📸 スクリーンショット</h4>
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={screenshot.url}
                  alt="ブラウザスクリーンショット"
                  className="w-full h-auto max-h-64 object-contain"
                />
              </div>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(replayUrl, '_blank')}
              className="text-xs"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              リプレイを開く
            </Button>
            {liveViewUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(liveViewUrl, '_blank')}
                className="text-xs"
              >
                <Monitor className="h-3 w-3 mr-1" />
                ライブビューを開く
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 