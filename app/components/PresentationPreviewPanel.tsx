'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PresentationViewer } from './PresentationViewer';
import { X, RotateCcw, Download, FileText, Code, GripVertical, Presentation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import html2canvas from 'html2canvas';

interface PresentationPreviewPanelProps {
  htmlContent: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onWidthChange?: (width: number) => void;
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
  const [panelWidth, setPanelWidth] = useState<number>(80);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState<boolean>(false);
  const [isExportingAdvancedPPTX, setIsExportingAdvancedPPTX] = useState<boolean>(false);
  const [isExportingHybridPPTX, setIsExportingHybridPPTX] = useState<boolean>(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const presentationContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setEditedHtml(htmlContent);
    setPreviewHtml(htmlContent);
  }, [htmlContent]);
  
  useEffect(() => {
    onWidthChange?.(panelWidth);
  }, [panelWidth, onWidthChange]);
  
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    document.body.style.cursor = 'ew-resize';
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
  }, []);

  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const viewportWidth = window.innerWidth;
    const widthPercentage = Math.min(Math.max(((viewportWidth - e.clientX) / viewportWidth) * 100, 20), 80);
    
    setPanelWidth(widthPercentage);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = '';
    
    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);
  
  const applyChanges = () => {
    setPreviewHtml(editedHtml);
    setActiveTab('preview');
  };
  
  const downloadHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([editedHtml], {type: 'text/html'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // HTMLコンテンツを個別のスライドに分割（スタイル情報も保持）
  const splitIntoSlides = (html: string): { slides: string[], styles: string } => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // スタイル情報を取得
    const styleElements = doc.querySelectorAll('style');
    const styles = Array.from(styleElements).map(style => style.textContent || '').join('\n');
    
    // スライドを取得
    const slides = doc.querySelectorAll('.slide');
    
    if (slides.length === 0) {
      // スライドクラスがない場合は、セクションで分割を試みる
      const sections = doc.querySelectorAll('section');
      if (sections.length > 0) {
        return {
          slides: Array.from(sections).map(section => section.outerHTML),
          styles
        };
      }
      // それもない場合は、main要素の内容を1つのスライドとして扱う
      const mainContent = doc.querySelector('main');
      if (mainContent) {
        return {
          slides: [mainContent.innerHTML],
          styles
        };
      }
      // mainもない場合は、body全体を1つのスライドとして扱う
      return {
        slides: [doc.body.innerHTML],
        styles
      };
    }
    
    return {
      slides: Array.from(slides).map(slide => slide.outerHTML),
      styles
    };
  };

  const captureSlideAsImage = async (slideHtml: string, globalStyles: string): Promise<string> => {
    // 一時的なコンテナを作成
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '-9999px';
    tempContainer.style.left = '-9999px';
    tempContainer.style.width = '1920px';
    tempContainer.style.height = '1080px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.overflow = 'hidden';
    
    // グローバルスタイルを適用
    const globalStyleElement = document.createElement('style');
    globalStyleElement.textContent = globalStyles;
    tempContainer.appendChild(globalStyleElement);
    
    // 基本スタイルを適用
    const baseStyleElement = document.createElement('style');
    baseStyleElement.textContent = `
      body, div {
        margin: 0;
        padding: 0;
      }
      .slide {
        width: 1920px;
        height: 1080px;
        padding: 80px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif;
      }
      section {
        width: 1920px;
        height: 1080px;
        padding: 80px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      h1 {
        font-size: 72px;
        font-weight: 700;
        margin: 40px 0;
      }
      h2 {
        font-size: 56px;
        font-weight: 600;
        margin: 30px 0;
      }
      h3 {
        font-size: 42px;
        font-weight: 500;
        margin: 20px 0;
      }
      p {
        font-size: 28px;
        margin: 20px 0;
        line-height: 1.8;
      }
      ul, ol {
        font-size: 28px;
        margin: 20px 0;
        padding-left: 40px;
      }
      li {
        margin: 15px 0;
        line-height: 1.6;
      }
      .text-center {
        text-align: center;
      }
      .justify-center {
        justify-content: center;
      }
      .items-center {
        align-items: center;
      }
    `;
    tempContainer.appendChild(baseStyleElement);
    
    // スライドのHTMLを挿入
    const slideWrapper = document.createElement('div');
    slideWrapper.innerHTML = slideHtml;
    tempContainer.appendChild(slideWrapper);
    
    document.body.appendChild(tempContainer);
    
    try {
      // html2canvasでキャプチャ
      const canvas = await html2canvas(tempContainer, {
        scale: 2, // 高解像度
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: 1920,
        height: 1080,
      });
      
      return canvas.toDataURL('image/png');
    } finally {
      // 一時的なコンテナを削除
      document.body.removeChild(tempContainer);
    }
  };

  const exportToPPTX = async () => {
    setIsExportingPPTX(true);
    
    try {
      // HTMLを個別のスライドに分割
      const { slides: slideHtmlArray, styles } = splitIntoSlides(previewHtml);
      
      if (slideHtmlArray.length === 0) {
        throw new Error('スライドが見つかりません');
      }
      
      console.log(`${slideHtmlArray.length}枚のスライドをエクスポート中...`);
      
      // 各スライドを画像として取得
      const slideImages = [];
      for (let i = 0; i < slideHtmlArray.length; i++) {
        console.log(`スライド ${i + 1}/${slideHtmlArray.length} を処理中...`);
        const imageData = await captureSlideAsImage(slideHtmlArray[i], styles);
        slideImages.push({
          imageData,
          width: 1920,
          height: 1080
        });
      }
      
      // APIにリクエスト
      const response = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slideImages,
          title: title
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'PPTXエクスポートに失敗しました');
      }
      
      // レスポンスをBlobとして取得
      const blob = await response.blob();
      
      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('PPTXエクスポートが完了しました');
      
    } catch (error) {
      console.error('PPTX export error:', error);
      alert('PPTXファイルのエクスポートに失敗しました。' + (error instanceof Error ? '\n' + error.message : ''));
    } finally {
      setIsExportingPPTX(false);
    }
  };

  // 高度なPPTXエクスポート（編集可能な要素として）
  const exportToAdvancedPPTX = async () => {
    setIsExportingAdvancedPPTX(true);
    
    try {
      // HTMLを個別のスライドに分割
      const { slides: slideHtmlArray, styles } = splitIntoSlides(previewHtml);
      
      if (slideHtmlArray.length === 0) {
        throw new Error('スライドが見つかりません');
      }
      
      console.log(`${slideHtmlArray.length}枚のスライドを編集可能な要素としてエクスポート中...`);
      
      // 各スライドのHTMLを準備
      const slidesData = slideHtmlArray.map((slideHtml, index) => ({
        html: `<style>${styles}</style>${slideHtml}`,
        index
      }));
      
      // APIにリクエスト
      const response = await fetch('/api/export-pptx-advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slidesData,
          title: title,
          useAdvancedCapture: true  // Puppeteerを使用した高精度変換を有効化
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '高度なPPTXエクスポートに失敗しました');
      }
      
      // レスポンスをBlobとして取得
      const blob = await response.blob();
      
      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}_editable.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('高度なPPTXエクスポートが完了しました');
      
    } catch (error) {
      console.error('Advanced PPTX export error:', error);
      alert('高度なPPTXファイルのエクスポートに失敗しました。' + (error instanceof Error ? '\n' + error.message : ''));
    } finally {
      setIsExportingAdvancedPPTX(false);
    }
  };

  // ハイブリッドPPTXエクスポート（背景画像＋編集可能テキスト）
  const exportToHybridPPTX = async () => {
    setIsExportingHybridPPTX(true);
    
    try {
      // HTMLを個別のスライドに分割
      const { slides: slideHtmlArray, styles } = splitIntoSlides(previewHtml);
      
      if (slideHtmlArray.length === 0) {
        throw new Error('スライドが見つかりません');
      }
      
      console.log(`${slideHtmlArray.length}枚のスライドをハイブリッド方式でエクスポート中...`);
      
      // 各スライドのHTMLを準備
      const slidesData = slideHtmlArray.map((slideHtml, index) => ({
        html: `<style>${styles}</style>${slideHtml}`,
        index
      }));
      
      // APIにリクエスト
      const response = await fetch('/api/export-pptx-advanced-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slides: slidesData,
          title: title
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ハイブリッドPPTXエクスポートに失敗しました');
      }
      
      // レスポンスをBlobとして取得
      const blob = await response.blob();
      
      // ダウンロードリンクを作成
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '_')}_hybrid.pptx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('ハイブリッドPPTXエクスポートが完了しました');
      
    } catch (error) {
      console.error('Hybrid PPTX export error:', error);
      alert('ハイブリッドPPTXファイルのエクスポートに失敗しました。' + (error instanceof Error ? '\n' + error.message : ''));
    } finally {
      setIsExportingHybridPPTX(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" 
        onClick={onClose}
      />
    
      {/* リサイズハンドル */}
      <div 
        ref={resizeHandleRef}
        className={`fixed inset-y-0 z-50 w-2 cursor-ew-resize bg-transparent hover:bg-primary/20 transition-colors group
                    ${isDragging ? 'bg-primary/20' : ''}`}
        style={{ 
          left: `calc(100% - ${panelWidth}% - 4px)`,
          touchAction: 'none'
        }}
        onMouseDown={handleDragStart}
      >
        <div className="h-full flex items-center justify-center">
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    
      {/* メインパネル */}
      <Card 
        className={`fixed inset-y-0 right-0 z-50 flex flex-col transition-all duration-300 ease-in-out border-l shadow-2xl
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: `${panelWidth}%` }}
      >
        {/* ヘッダー */}
        <CardHeader className="pb-3 bg-gradient-to-r from-background to-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex flex-col">
                <CardTitle className="text-lg truncate max-w-xs">{title}</CardTitle>
                <Badge variant="secondary" className="w-fit text-xs">
                  プレゼンテーション
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Label htmlFor="panel-width" className="text-xs text-muted-foreground">
                  幅:
                </Label>
                <Input
                  id="panel-width"
                  type="number"
                  min="20"
                  max="80"
                  value={Math.round(panelWidth)}
                  onChange={(e) => {
                    const newWidth = Math.min(Math.max(parseInt(e.target.value, 10), 20), 80);
                    if (!isNaN(newWidth)) {
                      setPanelWidth(newWidth);
                    }
                  }}
                  className="w-16 h-8 text-xs"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator />

        {/* タブコンテンツ */}
        <CardContent className="flex-1 p-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'preview' | 'code')} className="h-full flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  プレビュー
                </TabsTrigger>
                <TabsTrigger value="code" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  HTML編集
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="flex-1 p-6 pt-4 m-0">
              <div className="mb-4 flex justify-end space-x-2">
                <Button
                  onClick={exportToHybridPPTX}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isExportingHybridPPTX}
                >
                  <Presentation className="h-4 w-4" />
                  {isExportingHybridPPTX ? 'エクスポート中...' : 'ハイブリッドPPTX（推奨）'}
                </Button>
                <Button
                  onClick={exportToAdvancedPPTX}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isExportingAdvancedPPTX}
                >
                  <Presentation className="h-4 w-4" />
                  {isExportingAdvancedPPTX ? 'エクスポート中...' : 'PPTXとして出力（編集可能）'}
                </Button>
                <Button
                  onClick={exportToPPTX}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={isExportingPPTX}
                >
                  <Presentation className="h-4 w-4" />
                  {isExportingPPTX ? 'エクスポート中...' : 'PPTXとして出力（画像）'}
                </Button>
                <Button
                  onClick={downloadHtml}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  HTMLをダウンロード
                </Button>
              </div>
              <Card className="h-full border-2 border-dashed border-muted-foreground/20 bg-muted/5">
                <CardContent className="p-2 h-full">
                  <div className="bg-background shadow-sm rounded-lg h-full overflow-hidden border" ref={presentationContainerRef}>
                    <PresentationViewer 
                      htmlContent={previewHtml} 
                      height="100%" 
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-6 pt-4 m-0 flex flex-col">
              <div className="mb-4 flex justify-end space-x-2">
                <Button
                  onClick={applyChanges}
                  variant="default"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  プレビューに反映
                </Button>
                <Button
                  onClick={downloadHtml}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  HTMLをダウンロード
                </Button>
              </div>
              <Card className="flex-1 overflow-hidden flex flex-col">
                <CardContent className="p-0 flex-1 overflow-hidden">
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    className="font-mono text-sm bg-muted/30 border-0 rounded-none w-full h-full resize-none overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 p-4"
                    placeholder="HTMLコードを編集..."
                    style={{ minHeight: '100%' }}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}; 