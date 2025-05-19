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
        // htmlContentに<style>タグやHTML構造が含まれているか確認
        const hasStyleTag = htmlContent.includes('<style>') && htmlContent.includes('</style>');
        const hasHtmlStructure = htmlContent.includes('<section') || htmlContent.includes('<div') || htmlContent.includes('<body');
        
        // 完全なHTMLドキュメントかどうかを確認
        const isCompleteHtml = htmlContent.trim().startsWith('<!DOCTYPE') || htmlContent.trim().startsWith('<html');
        
        if (isCompleteHtml) {
          // 完全なHTMLドキュメントの場合はそのまま表示
          doc.open();
          doc.write(htmlContent);
          doc.close();
        } else if (hasStyleTag && hasHtmlStructure) {
          // スタイルタグとHTML構造が含まれている場合は、最小限のHTMLドキュメントで包む
          const minimalTemplate = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
                  overflow-x: hidden;
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
            </head>
            <body>
              ${htmlContent}
            </body>
            </html>
          `;
          doc.open();
          doc.write(minimalTemplate);
          doc.close();
        } else {
          // スタイルタグやHTML構造が含まれていない場合は、基本テンプレートを使用
          const defaultTemplate = `
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
          doc.write(defaultTemplate);
          doc.close();
        }
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