'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { PhotoIcon, EyeIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

interface ImageToolProps {
  images: Array<{
    url: string;
    b64Json: string;
  }>;
  prompt?: string;
  autoOpenPreview?: boolean; // 自動的にプレビューを開くためのフラグ
  forcePanelOpen?: boolean;  // 強制的にパネルを開くフラグ
  onPreviewOpen?: () => void; // プレビューが開かれたときに呼ばれる関数
  onPreviewClose?: () => void; // プレビューが閉じられたときに呼ばれる関数
  onPreviewWidthChange?: (width: number) => void; // パネル幅変更時に呼ばれる関数
}

export const ImageTool: React.FC<ImageToolProps> = ({
  images = [],
  prompt = '生成された画像',
  autoOpenPreview = false,
  forcePanelOpen = false,
  onPreviewOpen,
  onPreviewClose,
  onPreviewWidthChange
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [currentImages, setCurrentImages] = useState(images);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);

  // 新しい画像を設定
  const updateImages = useCallback((newImages: Array<{ url: string; b64Json: string }>) => {
    setCurrentImages(newImages);
  }, []);

  // 新しいプロンプトを設定
  const updatePrompt = useCallback((newPrompt: string) => {
    setCurrentPrompt(newPrompt);
  }, []);

  // プレビューパネルを開く
  const openPreviewPanel = useCallback(() => {
    console.log("[ImageTool] Opening preview panel manually");
    setIsPanelOpen(true);
    onPreviewOpen?.(); // 親コンポーネントに通知
  }, [onPreviewOpen]);

  // プレビューパネルを閉じる
  const closePreviewPanel = useCallback(() => {
    setIsPanelOpen(false);
    onPreviewClose?.(); // 親コンポーネントに通知
  }, [onPreviewClose]);

  // 画像が変更されたときに更新
  useEffect(() => {
    if (images && images.length > 0) {
      console.log("[ImageTool] Updating images:", images.length);
      setCurrentImages(images);
    }
  }, [images]);

  // プロンプトが変更されたときに更新
  useEffect(() => {
    if (prompt) {
      setCurrentPrompt(prompt);
    }
  }, [prompt]);

  // autoOpenPreviewフラグが設定されている場合、自動的にパネルを開く
  useEffect(() => {
    if (autoOpenPreview && currentImages.length > 0) {
      console.log("[ImageTool] Auto-opening panel due to autoOpenPreview flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [autoOpenPreview, currentImages, onPreviewOpen]);

  // forcePanelOpenフラグが設定されている場合、強制的にパネルを開く
  useEffect(() => {
    if (forcePanelOpen && currentImages.length > 0) {
      console.log("[ImageTool] Forcing panel open due to forcePanelOpen flag");
      setIsPanelOpen(true);
      onPreviewOpen?.(); // 親コンポーネントに通知
    }
  }, [forcePanelOpen, currentImages, onPreviewOpen]);

  // パネル幅変更ハンドラ
  const handlePanelWidthChange = useCallback((width: number) => {
    onPreviewWidthChange?.(width);
  }, [onPreviewWidthChange]);

  // 画像がない場合は何も表示しない
  if (currentImages.length === 0) {
    return null;
  }

  return (
    <>
      {/* 画像ツールUIコンポーネント */}
      <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <PhotoIcon className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-medium">Generated Image | {currentPrompt}</h2>
          </div>
          <button
            onClick={openPreviewPanel}
            className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md transition-colors"
            disabled={currentImages.length === 0}
          >
            <EyeIcon className="h-4 w-4" />
            <span>View Image{currentImages.length > 1 ? 's' : ''}</span>
          </button>
        </div>

        <div 
          className="flex items-center border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50 cursor-pointer"
          onClick={openPreviewPanel}
        >
          <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center text-gray-400 bg-gray-100 rounded-lg overflow-hidden relative">
            {currentImages[0] && (
              <Image 
                src={currentImages[0].url} 
                alt="Preview" 
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            )}
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900 truncate">{currentPrompt}</h3>
            <p className="text-sm text-gray-500">
              {currentImages.length} image{currentImages.length > 1 ? 's' : ''} generated. Click to view.
            </p>
          </div>
        </div>
      </div>

      {/* プレビューパネル */}
      <ImagePreviewPanel
        images={currentImages}
        title={currentPrompt}
        isOpen={isPanelOpen}
        onClose={closePreviewPanel}
        onWidthChange={handlePanelWidthChange}
      />
    </>
  );
};

// 公開インターフェース
export interface ImageToolRef {
  updateImages: (newImages: Array<{ url: string; b64Json: string }>) => void;
  updatePrompt: (newPrompt: string) => void;
  openPreviewPanel: () => void;
  closePreviewPanel: () => void;
} 