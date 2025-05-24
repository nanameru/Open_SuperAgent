'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PresentationViewer } from './PresentationViewer';
import { X, RotateCcw, Download, FileText, Code, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
  const [panelWidth, setPanelWidth] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  
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
              <Card className="h-full border-2 border-dashed border-muted-foreground/20 bg-muted/5">
                <CardContent className="p-2 h-full">
                  <div className="bg-background shadow-sm rounded-lg h-full overflow-hidden border">
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
              <Card className="flex-1 overflow-hidden">
                <CardContent className="p-0 h-full">
                  <Textarea
                    value={editedHtml}
                    onChange={(e) => setEditedHtml(e.target.value)}
                    className="font-mono text-sm bg-muted/30 border-0 rounded-none h-full resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="HTMLコードを編集..."
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