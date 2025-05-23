'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PresentationPreviewPanel } from './PresentationPreviewPanel';
import { DocumentTextIcon, PlayIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface GraphicRecordingToolProps {
  htmlContent?: string;
  title?: string;
  theme?: string;
  steps?: number;
  variant?: number;
  autoOpenPreview?: boolean; // 自動的にプレビューを開くためのフラグ
  forcePanelOpen?: boolean;  // 強制的にパネルを開くフラグ
  onPreviewOpen?: () => void; // プレビューが開かれたときに呼ばれる関数
  onPreviewClose?: () => void; // プレビューが閉じられたときに呼ばれる関数
}

export const GraphicRecordingTool: React.FC<GraphicRecordingToolProps> = ({
  htmlContent = '',
  title = 'グラフィックレコーディング',
  theme = 'green',
  steps = 4,
  variant = 1,
  autoOpenPreview = false,
  forcePanelOpen = false,
  onPreviewOpen,
  onPreviewClose
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState(htmlContent);
  const [currentTitle, setCurrentTitle] = useState(title);

  // 新しいhtmlContentを設定
  const updateContent = useCallback((newContent: string) => {
    setCurrentContent(newContent);
  }, []);

  // 新しいタイトルを設定
  const updateTitle = useCallback((newTitle: string) => {
    setCurrentTitle(newTitle);
  }, []);

  // プレビューパネルを開く
  const openPreviewPanel = useCallback(() => {
    console.log("[GraphicRecordingTool] Opening preview panel manually");
    setIsPanelOpen(true);
    onPreviewOpen?.(); // 親コンポーネントに通知
  }, [onPreviewOpen]);

  // プレビューパネルを閉じる
  const closePreviewPanel = useCallback(() => {
    setIsPanelOpen(false);
    onPreviewClose?.(); // 親コンポーネントに通知
  }, [onPreviewClose]);

  // htmlContentが変更されたときに更新
  useEffect(() => {
    if (htmlContent) {
      console.log("[GraphicRecordingTool] Updating HTML content:", htmlContent.substring(0, 50) + "...");
      setCurrentContent(htmlContent);
    }
  }, [htmlContent]);

  // titleが変更されたときに更新
  useEffect(() => {
    if (title) {
      setCurrentTitle(title);
    }
  }, [title]);

  // autoOpenPreviewフラグが設定されている場合、自動的にパネルを開く
  useEffect(() => {
    if (autoOpenPreview && currentContent) {
      console.log("[GraphicRecordingTool] Auto-opening panel due to autoOpenPreview flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [autoOpenPreview, currentContent, onPreviewOpen]);

  // forcePanelOpenフラグが設定されている場合、強制的にパネルを開く
  useEffect(() => {
    if (forcePanelOpen) {
      console.log("[GraphicRecordingTool] Forcing panel open due to forcePanelOpen flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [forcePanelOpen, onPreviewOpen]);

  // テーマカラーに対応するスタイルを取得
  const getThemeColor = () => {
    switch (theme) {
      case 'blue': return 'bg-blue-50 border-blue-200';
      case 'orange': return 'bg-orange-50 border-orange-200';
      case 'purple': return 'bg-purple-50 border-purple-200';
      case 'pink': return 'bg-pink-50 border-pink-200';
      default: return 'bg-green-50 border-green-200'; // green
    }
  };

  // テーマカラーに対応するアイコンカラーを取得
  const getIconColor = () => {
    switch (theme) {
      case 'blue': return 'text-blue-600';
      case 'orange': return 'text-orange-600';
      case 'purple': return 'text-purple-600';
      case 'pink': return 'text-pink-600';
      default: return 'text-green-600'; // green
    }
  };

  return (
    <>
      {/* グラフィックレコーディングツールUIコンポーネント */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PencilSquareIcon className={`h-5 w-5 ${getIconColor()}`} />
            <h2 className="text-lg font-medium">グラフィックレコーディング | {currentTitle}</h2>
          </div>
          <button
            onClick={openPreviewPanel}
            className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            disabled={!currentContent}
          >
            <PlayIcon className="h-4 w-4" />
            <span>表示</span>
          </button>
        </div>

        <div className={`flex items-center border rounded-lg p-4 mb-4 ${getThemeColor()}`}>
          <div className={`flex-shrink-0 w-16 h-16 flex items-center justify-center ${getIconColor()} bg-white rounded-lg shadow-sm`}>
            <PencilSquareIcon className="h-8 w-8" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 truncate">{currentTitle}</h3>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-sm text-gray-600">テーマ: {theme}</span>
              <span className="text-sm text-gray-600">ステップ: {steps}</span>
              {variant > 1 && <span className="text-sm text-gray-600">バリアント: {variant}</span>}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-4">
          クリックして詳細を表示します。グラフィックレコーディングはタイムライン付きの視覚的な情報整理を提供します。
        </div>
      </div>

      {/* プレビューパネル */}
      <PresentationPreviewPanel
        htmlContent={currentContent}
        title={currentTitle}
        isOpen={isPanelOpen}
        onClose={closePreviewPanel}
      />
    </>
  );
};

// 公開インターフェース
export interface GraphicRecordingToolRef {
  updateContent: (newContent: string) => void;
  updateTitle: (newTitle: string) => void;
  openPreviewPanel: () => void;
  closePreviewPanel: () => void;
} 