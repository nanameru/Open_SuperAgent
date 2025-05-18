'use client';

import React, { useState } from 'react';
import { PresentationViewer } from './PresentationViewer';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface PresentationPreviewPanelProps {
  htmlContent: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationPreviewPanel: React.FC<PresentationPreviewPanelProps> = ({
  htmlContent,
  title,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-2/3 bg-white shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out transform">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="h-5 w-5 text-blue-500" />
          <h2 className="text-lg font-medium text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
            activeTab === 'preview' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('preview')}
        >
          プレビュー
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium text-center ${
            activeTab === 'code' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('code')}
        >
          HTML
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-auto p-4 bg-gray-50">
        {activeTab === 'preview' ? (
          <div className="h-full">
            <PresentationViewer 
              htmlContent={htmlContent} 
              height="100%" 
            />
          </div>
        ) : (
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-auto h-full font-mono">
            {htmlContent}
          </pre>
        )}
      </div>
    </div>
  );
}; 