'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, ArrowsPointingOutIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface ImagePreviewPanelProps {
  images: Array<{
    url: string;
    b64Json?: string;
  }>;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onWidthChange?: (width: number) => void;
}

export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
  images,
  title,
  isOpen,
  onClose,
  onWidthChange
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  // リサイズ機能のための状態
  const [panelWidth, setPanelWidth] = useState<number>(50); // パネル幅（％）
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // パネル幅変更時に親コンポーネントに通知
  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);
  
  // ドラッグ中の処理
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // ウィンドウの幅に対する相対位置を計算（％）
    const viewportWidth = window.innerWidth;
    // 画面右端からマウス位置までの距離を計算し、パーセンテージに変換
    const widthPercentage = Math.min(Math.max(((viewportWidth - e.clientX) / viewportWidth) * 100, 20), 80);
    
    setPanelWidth(widthPercentage);
  }, [isDragging]);

  // ドラッグ終了の処理
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    
    // イベントリスナーを削除
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  // ドラッグ操作の開始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
    
    // カスタムドラッグイベントリスナーを追加
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, [handleDragMove, handleDragEnd]);

  // コンポーネントのアンマウント時にイベントリスナーをクリーンアップ
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);
  
  // 画像のダウンロード
  const downloadCurrentImage = () => {
    if (images.length === 0 || currentImageIndex >= images.length) return;
    
    const currentImage = images[currentImageIndex];
    const element = document.createElement('a');
    element.href = currentImage.url;
    element.download = `generated-image-${currentImageIndex + 1}.png`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  // 次の画像へ
  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };
  
  // 前の画像へ
  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    }
  };

  // 新しいタブで開く
  const openInNewTab = () => {
    if (images.length === 0 || currentImageIndex >= images.length) return;
    window.open(images[currentImageIndex].url, '_blank');
  };

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentImageIndex];

  return (
    <>
      {/* オーバーレイ（背景をやや暗くする） */}
      <div 
        className="fixed inset-0 bg-black/20 z-40" 
        onClick={onClose}
      />
    
      {/* リサイズハンドル */}
      <div 
        ref={resizeHandleRef}
        className={`fixed inset-y-0 z-50 w-1 cursor-ew-resize bg-transparent hover:bg-gray-400/50 transition-colors
                    ${isDragging ? 'bg-gray-400/50' : ''}`}
        style={{ 
          left: `calc(100% - ${panelWidth}% - 3px)`,
          touchAction: 'none',
          width: '6px'
        }}
        onMouseDown={handleDragStart}
      >
        <div className="h-full flex items-center justify-center">
          <div className="h-16 w-1 bg-gray-400 rounded-full opacity-50"></div>
        </div>
      </div>
    
      {/* サイドパネル */}
      <div 
        className={`fixed inset-y-0 right-0 bg-white shadow-xl z-50 flex flex-col transition-all duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${panelWidth}%` }}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-gray-100 to-white">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium text-gray-900 truncate max-w-xs">{title}</h2>
            {images.length > 1 && (
              <span className="text-sm text-gray-500">
                {currentImageIndex + 1} / {images.length}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {/* パネル幅入力フィールド */}
            <div className="flex items-center mr-2">
              <label htmlFor="panel-width" className="text-xs text-gray-500 mr-1">幅:</label>
              <input
                id="panel-width"
                type="number"
                min="20"
                max="80"
                value={Math.round(panelWidth)}
                onChange={(e) => {
                  const newWidth = Math.min(Math.max(parseInt(e.target.value, 10), 20), 80);
                  if (!isNaN(newWidth)) {
                    setPanelWidth(newWidth);
                  }
                }}
                className="w-14 text-xs p-1 border border-gray-300 rounded"
                aria-label="パネルの幅"
              />
              <span className="text-xs text-gray-500 ml-1">%</span>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close panel"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 画像表示エリア */}
        <div className="flex-1 overflow-auto bg-gray-100 flex flex-col">
          {/* 画像表示 */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="max-w-full max-h-full bg-white shadow-md rounded-lg overflow-hidden relative" style={{ width: '100%', height: '100%' }}>
              <Image 
                src={currentImage.url} 
                alt={`Generated image ${currentImageIndex + 1}`}
                fill
                style={{ objectFit: 'contain' }}
                unoptimized
              />
            </div>
          </div>
          
          {/* 画像切り替えコントロール */}
          {images.length > 1 && (
            <div className="p-4 bg-white border-t border-gray-200 flex justify-center">
              <div className="flex space-x-2">
                <button 
                  onClick={prevImage}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  disabled={images.length <= 1}
                >
                  前へ
                </button>
                <button 
                  onClick={nextImage}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                  disabled={images.length <= 1}
                >
                  次へ
                </button>
              </div>
            </div>
          )}
          
          {/* アクションボタン */}
          <div className="p-4 bg-white border-t border-gray-200 flex justify-between">
            <button
              onClick={openInNewTab}
              className="px-4 py-2 bg-gray-700 text-white rounded-md flex items-center hover:bg-gray-600 transition-colors"
            >
              <ArrowsPointingOutIcon className="h-4 w-4 mr-2" />
              新しいタブで開く
            </button>
            <button
              onClick={downloadCurrentImage}
              className="px-4 py-2 bg-gray-800 text-white rounded-md flex items-center hover:bg-gray-700 transition-colors"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              ダウンロード
            </button>
          </div>
        </div>
      </div>
    </>
  );
}; 