"use client";

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Circle, RefreshCw, AlertCircle } from 'lucide-react';

interface ConnectionStatus {
  connected: boolean;
  lastChecked: Date;
  retryCount: number;
}

export default function StagewiseToolbar() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastChecked: new Date(),
    retryCount: 0
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Check IDE/editor connection status
  useEffect(() => {
    const checkConnection = (incrementRetry = false) => {
      // Check for various IDE/editor indicators
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isOnline = navigator.onLine;
      const hasParentFrame = window.parent !== window;
      
      // Simulate IDE connection check - in reality this would check for:
      // - VSCode extension connection
      // - IDE plugin status  
      // - Local development server status
      // - Parent frame communication (if embedded in IDE)
      const isConnected = isOnline && (isLocalhost || hasParentFrame);
      
      setConnectionStatus(prev => ({
        connected: isConnected,
        lastChecked: new Date(),
        retryCount: incrementRetry ? prev.retryCount + 1 : prev.retryCount
      }));

      // Auto-show instructions if not connected after a few retries
      if (!isConnected && connectionStatus.retryCount >= 2) {
        setShowInstructions(true);
      }
    };

    // Initial check
    checkConnection();

    // Check every 3 seconds
    const interval = setInterval(checkConnection, 3000);

    // Listen for online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => checkConnection();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for focus events (user returning to tab)
    window.addEventListener('focus', checkConnection);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', checkConnection);
    };
  }, [connectionStatus.retryCount]);

  // Manual retry function
  const handleRetry = async () => {
    setIsRetrying(true);
    // Wait a bit to show the loading state
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Check connection with retry increment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isOnline = navigator.onLine;
    const hasParentFrame = window.parent !== window;
    const isConnected = isOnline && (isLocalhost || hasParentFrame);
    
    setConnectionStatus(prev => ({
      connected: isConnected,
      lastChecked: new Date(),
      retryCount: prev.retryCount + 1
    }));

    if (!isConnected && connectionStatus.retryCount >= 1) {
      setShowInstructions(true);
    }
    
    setIsRetrying(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Main status indicator */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            {connectionStatus.connected ? (
              <>
                <div className="relative">
                  <Circle className="h-2 w-2 text-green-500 fill-current" />
                  <Circle className="h-2 w-2 text-green-500 fill-current absolute top-0 left-0 animate-ping opacity-75" />
                </div>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">IDEに接続済み</span>
              </>
            ) : (
              <>
                <Circle className="h-2 w-2 text-red-500 fill-current" />
                <WifiOff className="h-4 w-4 text-red-600" />
                <div className="flex flex-col">
                  <span className="text-sm text-red-700 font-medium">IDEと接続されていません</span>
                  <span className="text-xs text-gray-500">IDE connection not established</span>
                </div>
              </>
            )}
          </div>
          
          {/* Retry button - only show when not connected */}
          {!connectionStatus.connected && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? '再接続中...' : '再接続'}
            </button>
          )}
        </div>

        {/* Instructions panel */}
        {!connectionStatus.connected && showInstructions && (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-gray-600">
                <p className="font-medium text-gray-700 mb-1">接続するには:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• VS Code拡張機能をインストール</li>
                  <li>• IDEで拡張機能を有効化</li>
                  <li>• localhost環境で実行</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              非表示
            </button>
          </div>
        )}

        {/* Show instructions button when hidden */}
        {!connectionStatus.connected && !showInstructions && connectionStatus.retryCount > 0 && (
          <div className="border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => setShowInstructions(true)}
              className="text-xs text-blue-500 hover:text-blue-600 underline"
            >
              接続手順を表示
            </button>
          </div>
        )}

        {/* Status details tooltip */}
        <div className="px-4 py-2 border-t border-gray-50 bg-gray-25">
          <div className="text-xs text-gray-500">
            最終確認: {connectionStatus.lastChecked.toLocaleTimeString()}
            {connectionStatus.retryCount > 0 && (
              <span className="ml-2">• 再試行: {connectionStatus.retryCount}回</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}