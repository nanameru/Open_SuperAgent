'use client';

import React, { useRef, useEffect } from 'react';

interface PresentationViewerProps {
  htmlContent: string;
  width?: string;
  height?: string;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({ 
  htmlContent, 
  width = '100%',
  height = '600px' 
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // スライドHTMLをiframeに展開する
  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        // 基本スタイルとHTML構造を設定
        const htmlTemplate = `
          <!DOCTYPE html>
          <html lang="ja">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                margin: 0;
                padding: 0;
                font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
                overflow-x: hidden;
              }
              main {
                width: 100%;
                height: 100%;
              }
              section.slide {
                width: 100%;
                min-height: 90vh;
                padding: 2rem;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                margin-bottom: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              /* スクロールバーのカスタマイズ */
              ::-webkit-scrollbar {
                width: 8px;
              }
              ::-webkit-scrollbar-track {
                background: #f1f1f1;
              }
              ::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: #555;
              }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
          </head>
          <body>
            <main>
              ${htmlContent}
            </main>
          </body>
          </html>
        `;
        
        doc.open();
        doc.write(htmlTemplate);
        doc.close();
      }
    }
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      title="Presentation Viewer"
      style={{ 
        width, 
        height,
        border: 'none',
        borderRadius: '8px',
        backgroundColor: '#fff'
      }}
      sandbox="allow-same-origin allow-scripts"
    />
  );
}; 