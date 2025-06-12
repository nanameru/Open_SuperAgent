"use client";

import { useEffect } from 'react';

const StagewiseToolbar = () => {
  useEffect(() => {
    // 開発モードでのみ一度だけ初期化する
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_STAGEWISE_ENABLED === 'true') {
      // 重複して初期化されるのを防ぐためのフラグ
      if (!(window as any).__STGWS_INITIALIZED__) {
        try {
          // Dynamic import to handle missing @stagewise/toolbar gracefully
          import('@stagewise/toolbar').then(({ initToolbar }) => {
            initToolbar({
              plugins: [],
            });
            (window as any).__STGWS_INITIALIZED__ = true;
          }).catch((error) => {
            console.warn('Stagewise toolbar not available:', error.message);
          });
        } catch (error) {
          console.warn('Failed to load Stagewise toolbar:', error);
        }
      }
    }
  }, []);

  return null; // このコンポーネントはUIを描画しない
};

export default StagewiseToolbar; 