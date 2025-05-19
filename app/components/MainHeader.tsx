'use client';

import React from 'react';
import { Globe, Plus, Upload } from 'lucide-react'; // Using lucide-react for icons

export const MainHeader = () => {
  return (
    // モダンでスタイリッシュな灰色ベースのヘッダー
    <header className="h-16 bg-white flex items-center justify-between px-6 border-b border-gray-200 shadow-sm">
      {/* Title aligned to the left */}
      <div>
        <h1 className="text-lg font-semibold text-gray-800">Mastra AI プレゼンテーション</h1>
      </div>

      {/* Icons on the right */}
      <div className="flex items-center space-x-2">
        <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors">
          <Globe className="h-5 w-5" /> 
        </button>
        <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors">
          <Plus className="h-5 w-5" />
        </button>
        <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors">
          <Upload className="h-5 w-5" /> 
        </button>
      </div>
    </header>
  );
}; 