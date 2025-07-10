'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { 
  Search, 
  Calculator, 
  Image, 
  Video, 
  Code, 
  FileText,
  Presentation, 
  Bot,
  ExternalLink,
  Sparkles,
  Settings,
  Monitor,
  Brain,
  Layers,
  Grid3X3,
  X,
  Github,
  MousePointer,
  Hand,
  Eye,
  Chrome,
  Terminal,
  FileCode,
  Music,
  Maximize,
  LogOut,
  Shrink
} from 'lucide-react';

// ツールアイコンのマッピング
const toolIconMap: Record<string, any> = {
  htmlSlideTool: Presentation,
  presentationPreviewTool: Monitor,
  webSearchTool: Search,
  grokXSearchTool: Brain,
  geminiImageGenerationTool: Image,
  geminiVideoGenerationTool: Video,
  imagen4GenerationTool: Sparkles,
  graphicRecordingTool: Layers,
  githubListIssuesTool: Github,
  claudeCodeSDKTool: FileCode,
  minimaxTTSTool: Music,
  browserSessionTool: Chrome,
  browserGotoTool: ExternalLink,
  browserObserveTool: Eye,
  browserActTool: Hand,
  browserExtractTool: Shrink,
  browserScreenshotTool: Maximize,
  browserWaitTool: Terminal,
  browserCloseTool: LogOut,
  browserCaptchaDetectTool: Eye,
  weatherTool: Brain,
  claudeIssueTool: Github,
  claudeAnalysisTool: Brain,
  claudeFileTool: FileText,
  claudeAutoEditTool: FileCode,
  fileAppendTool: FileText,
  websiteAnalysisTool: Search,
  sourceValidationTool: Search,
  citationExtractionTool: FileText,
  contentSynthesisTool: Brain,
};


// 利用可能なすべてのツール名のリスト
const agentToolNames = [
  'htmlSlideTool',
  'presentationPreviewTool',
  'webSearchTool',
  'grokXSearchTool',
  'geminiImageGenerationTool',
  'geminiVideoGenerationTool',
  'imagen4GenerationTool',
  'graphicRecordingTool',
  'githubListIssuesTool',
  'claudeCodeSDKTool',
  'browserCaptchaDetectTool',
  'weatherTool',
  'claudeIssueTool',
  'claudeAnalysisTool',
  'claudeFileTool',
  'claudeAutoEditTool',
  'fileAppendTool',
  'websiteAnalysisTool',
  'sourceValidationTool',
  'citationExtractionTool',
  'contentSynthesisTool',
  'minimaxTTSTool',
  'browserSessionTool',
  'browserGotoTool',
  'browserObserveTool',
  'browserActTool',
  'browserExtractTool',
  'browserScreenshotTool',
  'browserWaitTool',
  'browserCloseTool',
];

// slideCreatorAgentからツール情報を動的に取得
function getToolsFromAgent() {
  // slideCreatorAgentで定義されているツール名を使用
  const toolNames = agentToolNames;
  
  return toolNames.map(toolName => {
    return {
      id: toolName,
      name: getToolDisplayName(toolName),
      icon: toolIconMap[toolName] || Bot
    };
  });
}

// ツール表示名を取得
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    htmlSlideTool: 'HTML スライド生成',
    presentationPreviewTool: 'プレゼンテーション プレビュー',
    webSearchTool: 'Web検索',
    grokXSearchTool: 'Grok X検索',
    geminiImageGenerationTool: 'Gemini 画像生成',
    geminiVideoGenerationTool: 'Gemini 動画生成',
    imagen4GenerationTool: 'Imagen 4 画像生成',
    graphicRecordingTool: 'グラフィック レコーディング',
    githubListIssuesTool: 'GitHub Issue一覧',
    claudeCodeSDKTool: 'Claude コード生成',
    minimaxTTSTool: 'Minimax 音声合成',
    browserSessionTool: 'ブラウザセッション開始',
    browserGotoTool: 'ブラウザ URL移動',
    browserObserveTool: 'ブラウザ 画面観察',
    browserActTool: 'ブラウザ 操作実行',
    browserExtractTool: 'ブラウザ 情報抽出',
    browserScreenshotTool: 'ブラウザ スクリーンショット',
    browserWaitTool: 'ブラウザ 待機',
    browserCloseTool: 'ブラウザセッション終了',
    browserCaptchaDetectTool: 'CAPTCHA検出・解決',
    weatherTool: '天気情報取得',
    claudeIssueTool: 'Claude Issue分析',
    claudeAnalysisTool: 'Claude コード分析',
    claudeFileTool: 'Claude ファイル操作',
    claudeAutoEditTool: 'Claude 自動編集',
    fileAppendTool: 'ファイル追記',
    websiteAnalysisTool: 'ウェブサイト分析',
    sourceValidationTool: '情報源検証',
    citationExtractionTool: '引用抽出',
    contentSynthesisTool: 'コンテンツ統合',
  };
  
  return displayNames[toolName] || toolName;
}

// 検索機能
function searchTools(tools: any[], searchQuery: string) {
  if (!searchQuery.trim()) {
    return tools;
  }
  
  const query = searchQuery.toLowerCase();
  
  return tools.filter(tool => {
    // ツール名で検索
    const nameMatch = tool.name.toLowerCase().includes(query);
    
    return nameMatch;
  });
}

interface ToolCardProps {
  tool: {
    id: string;
    name: string;
    icon: any;
  };
}

function ToolCard({ tool }: ToolCardProps) {
  const ToolIcon = tool.icon;

  return (
    <Card className="flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <div className="p-2 bg-muted rounded-lg border">
          <ToolIcon className="h-5 w-5 text-foreground" />
        </div>
        <CardTitle className="text-base font-semibold leading-tight">{tool.name}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export default function ToolsPage() {
  // 動的にツールデータを取得
  const toolsData = React.useMemo(() => getToolsFromAgent(), []);
  
  // 検索クエリの状態管理
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // 検索フィルターを適用
  const filteredTools = React.useMemo(() => {
    let filtered = toolsData;
    
    // 検索フィルターを適用
    if (searchQuery.trim()) {
      filtered = searchTools(filtered, searchQuery);
    }
    
    return filtered;
  }, [toolsData, searchQuery]);

  // 検索クリア機能
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* 検索セクション */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  ツール検索
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Input 
                    type="search" 
                    placeholder="ツール名で検索..." 
                    className="w-full pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={clearSearch}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ツール一覧 */}
            <div>
              {filteredTools.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {filteredTools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">一致するツールが見つかりませんでした。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 