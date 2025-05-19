'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PresentationViewer } from './PresentationViewer';
import { XMarkIcon, ArrowPathIcon, DocumentArrowDownIcon, CodeBracketIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface PresentationPreviewPanelProps {
  htmlContent: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onWidthChange?: (width: number) => void; // パネルの幅が変更されたときに呼ばれるコールバック
}

export const PresentationPreviewPanel: React.FC<PresentationPreviewPanelProps> = ({
  htmlContent,
  title,
  isOpen,
  onClose,
  onWidthChange
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [editedHtml, setEditedHtml] = useState(htmlContent);
  const [previewHtml, setPreviewHtml] = useState(htmlContent);
  // リサイズ機能のための状態
  const [panelWidth, setPanelWidth] = useState<number>(50); // パネル幅（％）
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
  // htmlContentが変更されたらeditedHtmlも更新
  useEffect(() => {
    setEditedHtml(htmlContent);
    setPreviewHtml(htmlContent);
  }, [htmlContent]);
  
  // パネル幅変更時に親コンポーネントに通知
  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);
  
  // ドラッグ操作の開始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
    
    // カスタムドラッグイベントリスナーを追加
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, []);

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

  // コンポーネントのアンマウント時にイベントリスナーをクリーンアップ
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);
  
  // 編集内容をプレビューに適用
  const applyChanges = () => {
    setPreviewHtml(editedHtml);
    // プレビュータブに切り替え
    setActiveTab('preview');
  };
  
  // HTMLをダウンロード
  const downloadHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([editedHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (!isOpen) return null;

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
            <DocumentTextIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium text-gray-900 truncate max-w-xs">{title}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Close panel"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium text-center transition-colors duration-200 ${
              activeTab === 'preview' 
                ? 'border-b-2 border-gray-700 text-gray-800 bg-white' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('preview')}
          >
            プレビュー
          </button>
          <button
            className={`flex-1 py-2 px-4 text-sm font-medium text-center transition-colors duration-200 ${
              activeTab === 'code' 
                ? 'border-b-2 border-gray-700 text-gray-800 bg-white' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setActiveTab('code')}
          >
            HTML編集
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {activeTab === 'preview' ? (
            <div className="h-full p-2">
              <div className="bg-white shadow-sm rounded-lg h-full overflow-hidden border border-gray-200">
                <PresentationViewer 
                  htmlContent={previewHtml} 
                  height="100%" 
                />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col p-2">
              <div className="mb-2 flex justify-end space-x-2">
                <button
                  onClick={applyChanges}
                  className="px-3 py-1.5 bg-gray-700 text-white rounded flex items-center text-sm hover:bg-gray-600 transition-colors shadow-sm"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  プレビューに反映
                </button>
                <button
                  onClick={downloadHtml}
                  className="px-3 py-1.5 bg-gray-800 text-white rounded flex items-center text-sm hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
                  HTMLをダウンロード
                </button>
              </div>
              <div className="flex-1 border border-gray-300 rounded-md shadow-sm overflow-hidden">
                <textarea
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="font-mono text-sm bg-gray-900 text-gray-100 p-4 w-full h-full resize-none focus:outline-none focus:ring-2 focus:ring-gray-500"
                  spellCheck="false"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}; 