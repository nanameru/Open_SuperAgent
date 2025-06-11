import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  
  // 🔧 **手動URL入力機能**
  const [manualUrl, setManualUrl] = useState<string>('');
  const [useManualUrl, setUseManualUrl] = useState<boolean>(false);

  // 🔧 デバッグログを追加
  useEffect(() => {
    // console.log('[BrowserOperationSidebar] Component rendered with props:', {
    //   sessionId,
    //   replayUrl,
    //   liveViewUrl,
    //   screenshot,
    //   pageTitle,
    //   elementText,
    //   autoOpenPreview,
    //   forcePanelOpen,
    //   onPreviewOpen,
    //   onPreviewClose,
    //   onPreviewWidthChange
    // });
    
    // 🔧 **URL形式の詳細ログ**
    if (liveViewUrl) {
      // console.log('[BrowserOperationSidebar] 🔗 Live View URL details:', {
      //   url: liveViewUrl,
      //   isValidUrl: liveViewUrl.startsWith('https://'),
      //   containsDevtools: liveViewUrl.includes('devtools'),
      //   containsHash: liveViewUrl.includes('#'),
      //   containsStarting: liveViewUrl.includes('starting')
      // });
    }
  }, [sessionId, replayUrl, liveViewUrl, screenshot, pageTitle, elementText, autoOpenPreview, forcePanelOpen, onPreviewOpen, onPreviewClose, onPreviewWidthChange]);

  // 自動プレビュー開始
  useEffect(() => {
    setIsPreviewOpen(true);
    onPreviewOpen?.();
  }, [onPreviewOpen]);

  // 🔧 **参考実装と同じ即座表示ロジック**
  useEffect(() => {
    // 🌐 **有効なURLがあれば即座に表示（参考実装と同じ）**
    if (liveViewUrl && liveViewUrl.startsWith('https://') && !liveViewUrl.includes('#')) {
      // console.log('[BrowserOperationSidebar] ✅ Valid live view URL detected:', liveViewUrl);
      setConnectionStatus('connected');
      setViewMode('live');
      
      // 🚀 **ライブビューURL発行の瞬間をログ出力**
      // console.log('[BrowserOperationSidebar] 🌐 ライブビューURL即座表示:', {
      //   url: liveViewUrl,
      //   sessionId,
      //   timestamp: new Date().toISOString()
      // });
    } else if (replayUrl && replayUrl.startsWith('https://') && !replayUrl.includes('#')) {
      // console.log('[BrowserOperationSidebar] ✅ Valid replay URL detected:', replayUrl);
      setConnectionStatus('connected'); // replayも接続済みとして扱う
      setViewMode('replay');
    } else {
      // console.log('[BrowserOperationSidebar] ⏳ Waiting for valid URL...', { liveViewUrl, replayUrl });
      setConnectionStatus('loading');
    }
  }, [liveViewUrl, replayUrl, sessionId]);

  const handlePreviewToggle = useCallback(() => {
    const newState = !isPreviewOpen;
    setIsPreviewOpen(newState);
    
    if (newState) {
      onPreviewOpen?.();
    } else {
      onPreviewClose?.();
    }
  }, [isPreviewOpen, onPreviewOpen, onPreviewClose]);

  // 🔧 **手動URLが設定されている場合はそれを優先**
  const currentUrl = useManualUrl && manualUrl 
    ? manualUrl 
    : (viewMode === 'live' && liveViewUrl ? liveViewUrl : replayUrl);
  
  const isLoading = !useManualUrl && (sessionId.includes('loading') || sessionId.includes('starting') || replayUrl.includes('#') || connectionStatus === 'loading');
  const isStarting = !useManualUrl && (sessionId.includes('starting') || currentUrl?.includes('#starting'));
  
  // 🔧 **実行完了の判定を追加**
  const isCompleted = !isLoading && !isStarting && currentUrl && !currentUrl.includes('#');

  // 🔧 **デバッグログを追加**
  useEffect(() => {
    // console.log('[BrowserOperationSidebar] State:', {
    //   currentUrl,
    //   isLoading,
    //   isStarting,
    //   isCompleted,
    //   connectionStatus,
    //   viewMode
    // });
  }, [currentUrl, isLoading, isStarting, isCompleted, connectionStatus, viewMode]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ヘッダー - URL入力機能付き */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-3 py-2 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">ブラウザ自動化</span>
            <div className={`w-2 h-2 rounded-full ${
              useManualUrl ? 'bg-green-500' :
              isLoading ? 'bg-yellow-500 animate-pulse' : 
              connectionStatus === 'disconnected' ? 'bg-gray-500' :
              viewMode === 'live' ? 'bg-red-500' : 'bg-blue-500'
            }`} />
          </div>
          
          <div className="flex items-center gap-1">
            {/* 小さなコントロールボタン */}
            {!useManualUrl && liveViewUrl && connectionStatus !== 'disconnected' && (
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
            {!useManualUrl && (
              <Button
                variant={viewMode === 'replay' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('replay')}
                className="h-6 px-2 text-xs"
              >
                <Square className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(currentUrl, '_blank')}
              className="h-6 px-2 text-xs"
              disabled={!currentUrl}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {/* 🔧 **手動URL入力エリア** */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useManualUrl"
              checked={useManualUrl}
              onChange={(e) => setUseManualUrl(e.target.checked)}
              className="h-3 w-3"
            />
            <label htmlFor="useManualUrl" className="text-xs text-gray-600">
              手動URL入力
            </label>
          </div>
          
          {useManualUrl && (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://www.browserbase.com/devtools-internal-compiled/index.html?sessionId=..."
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (manualUrl) {
                    setConnectionStatus('connected');
                    console.log('[BrowserOperationSidebar] Manual URL set:', manualUrl);
                  }
                }}
                className="h-6 px-2 text-xs"
                disabled={!manualUrl}
              >
                適用
              </Button>
            </div>
          )}
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
        ) : currentUrl && (currentUrl.startsWith('https://') || useManualUrl) && !currentUrl.includes('#') ? (
          <div className="w-full h-full relative">
            {/* 🔧 **シンプルなiframe表示（手動URL対応）** */}
            <iframe
              src={currentUrl}
              className="w-full h-full"
              sandbox="allow-same-origin allow-scripts allow-forms"
              loading="lazy"
              referrerPolicy="no-referrer"
              title="Browser Session"
              onLoad={() => {
                console.log('[BrowserOperationSidebar] ✅ iframe loaded successfully:', currentUrl);
                setConnectionStatus('connected');
              }}
              onError={(e) => {
                console.error('[BrowserOperationSidebar] ❌ iframe error:', {
                  url: currentUrl,
                  error: e,
                  timestamp: new Date().toISOString()
                });
                setConnectionStatus('disconnected');
              }}
            />
            
          </div>
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
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700">
                    🔧 <strong>手動URL入力</strong>: 上部の「手動URL入力」チェックボックスをオンにして、BrowserbaseのライブビューURLを直接入力できます
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    例: https://www.browserbase.com/devtools-internal-compiled/index.html?sessionId=...
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