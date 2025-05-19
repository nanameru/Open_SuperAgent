'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PresentationPreviewPanel } from './PresentationPreviewPanel';
import { DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';

interface PresentationToolProps {
  htmlContent?: string;
  title?: string;
  onCreatePresentation?: () => void;
  autoOpenPreview?: boolean; // 自動的にプレビューを開くためのフラグ
  forcePanelOpen?: boolean;  // 強制的にパネルを開くフラグ
  onPreviewOpen?: () => void; // プレビューが開かれたときに呼ばれる関数
  onPreviewClose?: () => void; // プレビューが閉じられたときに呼ばれる関数
}

export const PresentationTool: React.FC<PresentationToolProps> = ({
  htmlContent = '',
  title = '生成AIプレゼンテーション',
  onCreatePresentation,
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
    console.log("[PresentationTool] Opening preview panel manually");
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
      console.log("[PresentationTool] Updating HTML content:", htmlContent.substring(0, 50) + "...");
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
      console.log("[PresentationTool] Auto-opening panel due to autoOpenPreview flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [autoOpenPreview, currentContent, onPreviewOpen]);

  // forcePanelOpenフラグが設定されている場合、強制的にパネルを開く
  useEffect(() => {
    if (forcePanelOpen) {
      console.log("[PresentationTool] Forcing panel open due to forcePanelOpen flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [forcePanelOpen, onPreviewOpen]);

  return (
    <>
      {/* プレゼンテーションツールUIコンポーネント */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium">Using Tool | {currentTitle}</h2>
          </div>
          <button
            onClick={openPreviewPanel}
            className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            disabled={!currentContent}
          >
            <PlayIcon className="h-4 w-4" />
            <span>View</span>
          </button>
        </div>

        <div className="flex items-center border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg">
            <DocumentTextIcon className="h-8 w-8" />
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 truncate">{currentTitle}</h3>
            <p className="text-sm text-gray-500">Click to open</p>
          </div>
        </div>

        <button
          onClick={onCreatePresentation}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
        >
          Edit in AI Slides →
        </button>
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
export interface PresentationToolRef {
  updateContent: (newContent: string) => void;
  updateTitle: (newTitle: string) => void;
  openPreviewPanel: () => void;
  closePreviewPanel: () => void;
} 