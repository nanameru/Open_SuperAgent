'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// ツールアイコンのマッピング
const toolIconMap: Record<string, any> = {
  htmlSlideTool: Presentation,
  presentationPreviewTool: Monitor,
  braveSearchTool: Search,
  grokXSearchTool: Brain,
  geminiImageGenerationTool: Image,
  geminiVideoGenerationTool: Video,
  imagen4GenerationTool: Sparkles,
  v0CodeGenerationTool: Code,
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

// ツールカテゴリのマッピング
const toolCategoryMap: Record<string, string> = {
  htmlSlideTool: 'プレゼンテーション',
  presentationPreviewTool: 'プレゼンテーション',
  braveSearchTool: '情報検索',
  grokXSearchTool: '情報検索',
  geminiImageGenerationTool: '画像生成',
  geminiVideoGenerationTool: '動画生成',
  imagen4GenerationTool: '画像生成',
  v0CodeGenerationTool: 'コード生成',
  graphicRecordingTool: 'デザイン・視覚化',
  githubListIssuesTool: 'GitHub連携',
  claudeCodeSDKTool: 'Claude Code',
  minimaxTTSTool: '音声生成',
  browserSessionTool: 'ブラウザ操作',
  browserGotoTool: 'ブラウザ操作',
  browserObserveTool: 'ブラウザ操作',
  browserActTool: 'ブラウザ操作',
  browserExtractTool: 'ブラウザ操作',
  browserScreenshotTool: 'ブラウザ操作',
  browserWaitTool: 'ブラウザ操作',
  browserCloseTool: 'ブラウザ操作',
  browserCaptchaDetectTool: 'ブラウザ操作',
  weatherTool: '情報取得',
  claudeIssueTool: 'Claude Code',
  claudeAnalysisTool: 'Claude Code',
  claudeFileTool: 'Claude Code',
  claudeAutoEditTool: 'Claude Code',
  fileAppendTool: 'ファイル操作',
  websiteAnalysisTool: '情報検索',
  sourceValidationTool: '情報検索',
  citationExtractionTool: '情報検索',
  contentSynthesisTool: '情報分析',
};

// ツール説明のマッピング
const toolDescriptionMap: Record<string, string> = {
  htmlSlideTool: 'プロフェッショナルなHTMLプレゼンテーションスライドを生成します。企業レベルの品質で、16:9アスペクト比、多様なレイアウトに対応。',
  presentationPreviewTool: 'HTMLコンテンツのプレビューを表示し、リアルタイムでプレゼンテーションの見た目を確認できます。',
  braveSearchTool: 'Brave Search APIを使用してウェブ検索を実行し、最新の情報を取得します。最大20件の検索結果を返します。',
  grokXSearchTool: 'Grok\'s X.ai APIを使用してライブデータを含む高度な検索を実行します。最新のトレンドや情報にアクセス。',
  geminiImageGenerationTool: 'Google Gemini (Imagen 3)を使用してテキストプロンプトから高品質な画像を生成します。複数アスペクト比対応。',
  geminiVideoGenerationTool: 'テキストプロンプトや画像から動画を生成します。プロフェッショナルな動画コンテンツの作成が可能。',
  imagen4GenerationTool: 'Google最新のImagen 4モデルを使用して、より詳細で高品質な画像を生成します。',
  v0CodeGenerationTool: 'Vercelのv0 AIモデルを使用してWebアプリケーションのコードを生成します。React、Next.js対応。',
  graphicRecordingTool: 'タイムラインベースのグラフィックレコーディング（グラレコ）を視覚的要素と共に作成します。',
  githubListIssuesTool: '指定されたGitHubリポジトリのIssueを一覧表示します。',
  claudeCodeSDKTool: 'Claudeモデルを使用して、プロンプトに基づいたコードを生成します。',
  minimaxTTSTool: 'Minimax TTS APIを使用して、テキストから高品質な音声を生成します。',
  browserSessionTool: '新しいブラウザセッションを開始し、操作を準備します。',
  browserGotoTool: '指定されたURLにブラウザでアクセスします。',
  browserObserveTool: '現在のブラウザのビューポートを観察し、コンテンツを返します。',
  browserActTool: 'ブラウザ上でクリックや入力などのアクションを実行します。',
  browserExtractTool: 'ブラウザのページから特定の情報を抽出します。',
  browserScreenshotTool: '現在のブラウザのスクリーンショットを撮影します。',
  browserWaitTool: '特定の条件が満たされるまでブラウザの操作を待機します。',
  browserCloseTool: '現在アクティブなブラウザセッションを終了します。',
  browserCaptchaDetectTool: 'ブラウザ上のCAPTCHAを検出し、自動的に解決します。',
  weatherTool: '指定された場所の天気情報を取得します。',
  claudeIssueTool: 'Claudeを使用してGitHub Issueを分析・作成します。',
  claudeAnalysisTool: 'Claudeを使用してコードやプロジェクトを詳細に分析します。',
  claudeFileTool: 'Claudeを使用してファイルを読み取り、分析や編集を行います。',
  claudeAutoEditTool: 'Claudeを使用してコードを自動的に編集、最適化します。',
  fileAppendTool: 'ファイルにテキストを追加します。',
  websiteAnalysisTool: 'ウェブサイトを詳細に分析し、情報を抽出します。',
  sourceValidationTool: '情報源を検証し、信頼性を確認します。',
  citationExtractionTool: 'テキストから引用情報を抽出します。',
  contentSynthesisTool: '複数の情報源から内容を統合し、要約します。',
};

// ツール機能のマッピング
const toolFeaturesMap: Record<string, string[]> = {
  htmlSlideTool: ['多様なレイアウト', '図解自動生成', 'レスポンシブデザイン', 'プロ品質'],
  presentationPreviewTool: ['リアルタイムプレビュー', 'HTMLレンダリング', 'インタラクティブ表示'],
  braveSearchTool: ['リアルタイム検索', '最大20件の結果', 'プライバシー重視'],
  grokXSearchTool: ['ライブデータ', 'AI強化検索', 'トレンド分析', 'リアルタイム情報'],
  geminiImageGenerationTool: ['Imagen 3エンジン', '多様なアスペクト比', '高品質出力', 'カスタムシード'],
  geminiVideoGenerationTool: ['テキスト→動画', '画像→動画', 'HD品質', 'カスタム設定'],
  imagen4GenerationTool: ['最新Imagen 4', '超高品質', '詳細な画像', '最先端AI'],
  v0CodeGenerationTool: ['React/Next.js', 'AI強化コード', 'Web最適化', 'モダンUI'],
  graphicRecordingTool: ['タイムライン作成', '視覚的要素', 'グラレコ生成', 'プロフェッショナル'],
  githubListIssuesTool: ['リポジトリ指定', 'Issue一覧', '状態フィルタ'],
  claudeCodeSDKTool: ['高度なコード生成', '多言語対応', 'コンテキスト理解'],
  minimaxTTSTool: ['高品質音声', '多言語対応', '音声合成'],
  browserSessionTool: ['セッション管理', 'ヘッドレスブラウザ', '分離環境'],
  browserGotoTool: ['URL指定', 'ページ遷移', 'ナビゲーション'],
  browserObserveTool: ['コンテンツ取得', 'DOMスナップショット', '視覚情報'],
  browserActTool: ['クリック操作', 'フォーム入力', 'UI操作自動化'],
  browserExtractTool: ['データ抽出', 'セレクタ指定', '情報取得'],
  browserScreenshotTool: ['フルページ', '要素指定', '画像保存'],
  browserWaitTool: ['要素待機', '時間待機', '条件指定'],
  browserCloseTool: ['セッション終了', 'リソース解放', 'クリーンアップ'],
  browserCaptchaDetectTool: ['CAPTCHA検出', '自動解決', 'AI認識'],
  weatherTool: ['天気情報', 'リアルタイム', '予報提供'],
  claudeIssueTool: ['Issue分析', 'AIサポート', '自動作成'],
  claudeAnalysisTool: ['コード分析', 'プロジェクト理解', 'AI分析'],
  claudeFileTool: ['ファイル読取', 'AI分析', '編集支援'],
  claudeAutoEditTool: ['自動編集', 'コード最適化', 'AI改善'],
  fileAppendTool: ['テキスト追加', 'ファイル更新', '簡単操作'],
  websiteAnalysisTool: ['ウェブ分析', '情報抽出', '構造解析'],
  sourceValidationTool: ['ソース検証', '信頼性確認', 'ファクトチェック'],
  citationExtractionTool: ['引用抽出', '参考文献', '出典管理'],
  contentSynthesisTool: ['情報統合', '要約作成', 'AI分析'],
};

// 利用可能なすべてのツール名のリスト
const agentToolNames = [
  'htmlSlideTool',
  'presentationPreviewTool',
  'braveSearchTool',
  'grokXSearchTool',
  'geminiImageGenerationTool',
  'geminiVideoGenerationTool',
  'imagen4GenerationTool',
  'v0CodeGenerationTool',
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
    const displayName = toolName.replace(/Tool$/, '').replace(/([A-Z])/g, ' $1').trim();
    const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    
    return {
      id: toolName,
      name: getToolDisplayName(toolName),
      description: toolDescriptionMap[toolName] || `${formattedName}の機能を提供します。`,
      icon: toolIconMap[toolName] || Bot,
      category: toolCategoryMap[toolName] || 'その他',
      features: toolFeaturesMap[toolName] || ['高性能', 'AI強化', '自動化']
    };
  });
}

// ツール表示名を取得
function getToolDisplayName(toolName: string): string {
  const displayNames: Record<string, string> = {
    htmlSlideTool: 'HTML スライド生成',
    presentationPreviewTool: 'プレゼンテーション プレビュー',
    braveSearchTool: 'Brave Web検索',
    grokXSearchTool: 'Grok X検索',
    geminiImageGenerationTool: 'Gemini 画像生成',
    geminiVideoGenerationTool: 'Gemini 動画生成',
    imagen4GenerationTool: 'Imagen 4 画像生成',
    v0CodeGenerationTool: 'v0 コード生成',
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
    
    // 説明で検索
    const descriptionMatch = tool.description.toLowerCase().includes(query);
    
    // カテゴリで検索
    const categoryMatch = tool.category.toLowerCase().includes(query);
    
    // 機能で検索
    const featuresMatch = tool.features.some((feature: string) => 
      feature.toLowerCase().includes(query)
    );
    
    return nameMatch || descriptionMatch || categoryMatch || featuresMatch;
  });
}

interface ToolCardProps {
  tool: {
    id: string;
    name: string;
    description: string;
    icon: any;
    category: string;
    features: string[];
  };
}

function ToolCard({ tool }: ToolCardProps) {
  const ToolIcon = tool.icon;

  return (
    <Dialog>
      <Card className="flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-md">
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <div className="p-2 bg-muted rounded-lg border">
            <ToolIcon className="h-5 w-5 text-foreground" />
          </div>
          <CardTitle className="text-base font-semibold leading-tight">{tool.name}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 flex-grow">
          <Badge variant="outline">{tool.category}</Badge>
        </CardContent>
        <CardFooter>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" className="w-full">
              詳細を確認
            </Button>
          </DialogTrigger>
        </CardFooter>
      </Card>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg border">
              <ToolIcon className="h-5 w-5 text-foreground" />
            </div>
            {tool.name}
          </DialogTitle>
          <DialogDescription>
            {tool.description}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <h4 className="text-sm font-semibold uppercase text-muted-foreground mb-3">主な機能</h4>
            <div className="flex flex-wrap gap-2">
              {tool.features.map(feature => (
                <Badge key={feature} variant="secondary">{feature}</Badge>
              ))}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ToolsPage() {
  // 動的にツールデータを取得
  const toolsData = React.useMemo(() => getToolsFromAgent(), []);
  
  // 検索クエリの状態管理
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('すべて');
  
  // 検索とカテゴリフィルターを適用
  const filteredTools = React.useMemo(() => {
    let filtered = toolsData;
    
    // 検索フィルターを適用
    if (searchQuery.trim()) {
      filtered = searchTools(filtered, searchQuery);
    }
    
    // カテゴリフィルターを適用
    if (selectedCategory !== 'すべて') {
      filtered = filtered.filter(tool => tool.category === selectedCategory);
    }
    
    return filtered;
  }, [toolsData, searchQuery, selectedCategory]);
  
  const categories = React.useMemo(() => {
    const categoryCount: Record<string, number> = {};
    toolsData.forEach(tool => {
      categoryCount[tool.category] = (categoryCount[tool.category] || 0) + 1;
    });
    
    return [
      { name: 'すべて', count: toolsData.length },
      ...Object.entries(categoryCount).map(([name, count]) => ({ name, count }))
    ];
  }, [toolsData]);

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
                    placeholder="ツール名、機能、カテゴリなどで検索..." 
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

            {/* カテゴリフィルターとツール一覧 */}
            <div className="grid grid-cols-12 gap-8">
              {/* カテゴリサイドバー */}
              <div className="col-span-12 md:col-span-3 lg:col-span-2">
                <h3 className="text-base font-semibold mb-4">カテゴリ</h3>
                <div className="space-y-1">
                  {categories.map(category => (
                    <Button 
                      key={category.name}
                      variant={selectedCategory === category.name ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <span className="flex-grow text-left">{category.name}</span>
                      <Badge variant={selectedCategory === category.name ? 'default' : 'outline'} className="rounded-full">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </div>

              {/* ツール一覧 */}
              <div className="col-span-12 md:col-span-9 lg:col-span-10">
                {filteredTools.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 