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
        } else if (hasHtmlStructure) {
          // HTML構造のみある場合はデフォルトのスタイルを適用
          const defaultTemplate = `
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
                main {
                  width: 100%;
                  height: 100%;
                }
                /* スライド全体のスタイル */
                .slide {
                  width: 100%;
                  min-height: 90vh;
                  padding: 2rem;
                  box-sizing: border-box;
                  display: flex;
                  flex-direction: column;
                  justify-content: flex-start;
                  margin-bottom: 2rem;
                  border-radius: 8px;
                  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                  background-color: #fff;
                  position: relative;
                }
                
                /* ヘッダー関連 */
                .header, .slide > h1 {
                  margin-bottom: 2rem;
                }
                .title, .slide > h1 {
                  font-size: 2.5rem;
                  color: #333;
                  margin-bottom: 0.5rem;
                }
                .subtitle {
                  font-size: 1.5rem;
                  color: #666;
                  margin-top: 0.5rem;
                }
                
                /* コンテンツエリア */
                .content {
                  flex: 1;
                  padding: 1rem 0;
                }
                
                /* フッター */
                .footer, .slide-footer {
                  color: #888;
                  font-size: 0.9rem;
                  margin-top: 2rem;
                  text-align: right;
                }
                
                /* リスト */
                ul, ol {
                  padding-left: 2rem;
                }
                li {
                  margin-bottom: 0.75rem;
                }
                
                /* 強調表示 */
                .highlight {
                  color: #0056B1;
                  font-weight: 500;
                }
                .accent {
                  color: #FF5722;
                  font-weight: 500;
                }
                
                /* 定義ブロック */
                .definition {
                  background-color: #f8f9fa;
                  padding: 1.5rem;
                  border-radius: 8px;
                  margin-bottom: 2rem;
                }
                .definition-title {
                  color: #0056B1;
                  margin-top: 0;
                }
                
                /* 概念リスト */
                .concepts-list {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                  gap: 1.5rem;
                  margin-top: 1.5rem;
                }
                .concept-item {
                  background-color: #f8f9fa;
                  padding: 1.5rem;
                  border-radius: 8px;
                }
                .concept-title {
                  color: #0056B1;
                  margin-top: 0;
                }
                
                /* トレンドリスト */
                .trend-list {
                  list-style: none;
                  padding: 0;
                }
                .trend-item {
                  margin-bottom: 1.5rem;
                  padding: 1rem;
                  border-radius: 8px;
                  background-color: #f8f9fa;
                }
                .trend-title {
                  display: flex;
                  align-items: center;
                  font-size: 1.2rem;
                  font-weight: 600;
                  color: #0067D4;
                  margin-bottom: 0.75rem;
                }
                .trend-title svg {
                  width: 24px;
                  height: 24px;
                  margin-right: 0.75rem;
                }
                .trend-desc {
                  margin: 0;
                  line-height: 1.5;
                }
                
                /* ポイント */
                .point {
                  display: flex;
                  margin-bottom: 1.5rem;
                }
                .point-marker {
                  width: 2rem;
                  height: 2rem;
                  background-color: #0056B1;
                  color: white;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: bold;
                  margin-right: 1rem;
                  flex-shrink: 0;
                }
                .point-title {
                  font-weight: 600;
                  font-size: 1.2rem;
                  margin-bottom: 0.5rem;
                }
                .point-desc {
                  line-height: 1.5;
                }
                
                /* インパクトボックス */
                .impact-box, .summary-box {
                  background-color: #f0f7ff;
                  border-left: 4px solid #0056B1;
                  padding: 1.5rem;
                  margin-top: 2rem;
                  border-radius: 0 8px 8px 0;
                }
                .impact-title {
                  font-weight: 600;
                  font-size: 1.2rem;
                  margin-bottom: 0.75rem;
                  color: #0056B1;
                }
                
                /* カード */
                .card {
                  background-color: #f8f9fa;
                  border-radius: 8px;
                  padding: 1.5rem;
                  margin-bottom: 1.5rem;
                }
                .future-challenges {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                  gap: 1.5rem;
                  margin-top: 2rem;
                }
                .card h2 {
                  display: flex;
                  align-items: center;
                  color: #333;
                  margin-top: 0;
                  margin-bottom: 1rem;
                }
                .card .icon {
                  width: 24px;
                  height: 24px;
                  margin-right: 0.75rem;
                }
                .future-card h2 {
                  color: #0056B1;
                }
                .challenge-card h2 {
                  color: #FFB400;
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
          doc.write(defaultTemplate);
          doc.close();
        } else {
          // その他の場合（テキストのみなど）は基本テンプレートを使用
          const plainTextTemplate = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet">
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
                  line-height: 1.6;
                  color: #333;
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
              <pre>${htmlContent}</pre>
            </body>
            </html>
          `;
          doc.open();
          doc.write(plainTextTemplate);
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