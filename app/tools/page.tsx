'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  X
} from 'lucide-react';

// ツールアイコンのマッピング
const toolIconMap: Record<string, any> = {
  htmlSlideTool: Presentation,
  presentationPreviewTool: Monitor,
  braveSearchTool: Search,
  grokXSearchTool: Brain,
  advancedCalculatorTool: Calculator,
  geminiImageGenerationTool: Image,
  geminiVideoGenerationTool: Video,
  imagen4GenerationTool: Sparkles,
  v0CodeGenerationTool: Code,
  graphicRecordingTool: Layers,
};

// ツールカテゴリのマッピング
const toolCategoryMap: Record<string, string> = {
  htmlSlideTool: 'プレゼンテーション',
  presentationPreviewTool: 'プレゼンテーション',
  braveSearchTool: '情報検索',
  grokXSearchTool: '情報検索',
  advancedCalculatorTool: '計算・分析',
  geminiImageGenerationTool: '画像生成',
  geminiVideoGenerationTool: '動画生成',
  imagen4GenerationTool: '画像生成',
  v0CodeGenerationTool: 'コード生成',
  graphicRecordingTool: 'デザイン・視覚化',
};

// ツール説明のマッピング
const toolDescriptionMap: Record<string, string> = {
  htmlSlideTool: 'プロフェッショナルなHTMLプレゼンテーションスライドを生成します。企業レベルの品質で、16:9アスペクト比、多様なレイアウトに対応。',
  presentationPreviewTool: 'HTMLコンテンツのプレビューを表示し、リアルタイムでプレゼンテーションの見た目を確認できます。',
  braveSearchTool: 'Brave Search APIを使用してウェブ検索を実行し、最新の情報を取得します。最大20件の検索結果を返します。',
  grokXSearchTool: 'Grok\'s X.ai APIを使用してライブデータを含む高度な検索を実行します。最新のトレンドや情報にアクセス。',
  advancedCalculatorTool: '複雑な数学的計算を実行します。科学計算、統計、数式処理に対応した多機能計算ツール。',
  geminiImageGenerationTool: 'Google Gemini (Imagen 3)を使用してテキストプロンプトから高品質な画像を生成します。複数アスペクト比対応。',
  geminiVideoGenerationTool: 'テキストプロンプトや画像から動画を生成します。プロフェッショナルな動画コンテンツの作成が可能。',
  imagen4GenerationTool: 'Google最新のImagen 4モデルを使用して、より詳細で高品質な画像を生成します。',
  v0CodeGenerationTool: 'Vercelのv0 AIモデルを使用してWebアプリケーションのコードを生成します。React、Next.js対応。',
  graphicRecordingTool: 'タイムラインベースのグラフィックレコーディング（グラレコ）を視覚的要素と共に作成します。',
};

// ツール機能のマッピング
const toolFeaturesMap: Record<string, string[]> = {
  htmlSlideTool: ['多様なレイアウト', '図解自動生成', 'レスポンシブデザイン', 'プロ品質'],
  presentationPreviewTool: ['リアルタイムプレビュー', 'HTMLレンダリング', 'インタラクティブ表示'],
  braveSearchTool: ['リアルタイム検索', '最大20件の結果', 'プライバシー重視'],
  grokXSearchTool: ['ライブデータ', 'AI強化検索', 'トレンド分析', 'リアルタイム情報'],
  advancedCalculatorTool: ['科学計算', '統計処理', '数式解析', '高精度計算'],
  geminiImageGenerationTool: ['Imagen 3エンジン', '多様なアスペクト比', '高品質出力', 'カスタムシード'],
  geminiVideoGenerationTool: ['テキスト→動画', '画像→動画', 'HD品質', 'カスタム設定'],
  imagen4GenerationTool: ['最新Imagen 4', '超高品質', '詳細な画像', '最先端AI'],
  v0CodeGenerationTool: ['React/Next.js', 'AI強化コード', 'Web最適化', 'モダンUI'],
  graphicRecordingTool: ['タイムライン作成', '視覚的要素', 'グラレコ生成', 'プロフェッショナル'],
};

// slideCreatorAgentで定義されているツール名のリスト（動的に取得する代わりに静的に定義）
const agentToolNames = [
  'htmlSlideTool',
  'presentationPreviewTool',
  'braveSearchTool',
  'grokXSearchTool',
  'advancedCalculatorTool',
  'geminiImageGenerationTool',
  'geminiVideoGenerationTool',
  'imagen4GenerationTool',
  'v0CodeGenerationTool',
  'graphicRecordingTool'
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
    advancedCalculatorTool: '高度計算ツール',
    geminiImageGenerationTool: 'Gemini 画像生成',
    geminiVideoGenerationTool: 'Gemini 動画生成',
    imagen4GenerationTool: 'Imagen 4 画像生成',
    v0CodeGenerationTool: 'v0 コード生成',
    graphicRecordingTool: 'グラフィック レコーディング',
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
            {/* ヘッダーセクション */}
            <div className="text-center mb-12 space-y-4">
              <div className="flex items-center justify-center mb-6">
                <div className="p-4 bg-muted rounded-full border">
                  <Bot className="h-8 w-8 text-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  AIツール一覧
                </h1>
                <p className="text-xl text-muted-foreground">
                  Open-SuperAgent
                </p>
                </div>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                slideCreatorAgentで利用可能な高性能AIツールの完全なコレクション。
                プレゼンテーション作成から画像・動画生成まで、あらゆるクリエイティブなタスクをサポートします。
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <Badge variant="secondary">
                  {toolsData.length} ツール利用可能
                </Badge>
                <Badge variant="outline">
                  AI強化エージェント
                </Badge>
                <Badge variant="outline">
                  動的更新対応
                </Badge>
              </div>
            </div>

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
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ツール名、説明、機能で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSearch}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {searchQuery && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>検索結果: {filteredTools.length} 件</span>
                    {filteredTools.length !== toolsData.length && (
                      <Badge variant="outline" className="text-xs">
                        {toolsData.length - filteredTools.length} 件が非表示
                      </Badge>
                    )}
              </div>
                )}
            </CardContent>
          </Card>

            {/* カテゴリフィルター */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5" />
                  カテゴリ別フィルター
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.name}
                      variant={selectedCategory === category.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category.name)}
                      className="transition-all duration-200"
                    >
                      {category.name}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {category.count}
                      </Badge>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 検索結果が0件の場合の表示 */}
            {filteredTools.length === 0 && (
              <Card className="mb-8">
                <CardContent className="p-8 text-center">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-full w-fit mx-auto">
                      <Search className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        検索結果が見つかりません
                      </h3>
                      <p className="text-muted-foreground">
                        「{searchQuery}」に一致するツールが見つかりませんでした。
                      </p>
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" onClick={clearSearch}>
                        検索をクリア
                      </Button>
                      <Button variant="outline" onClick={() => setSelectedCategory('すべて')}>
                        すべてのカテゴリを表示
                      </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            )}

            {/* ツールグリッド */}
            {filteredTools.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                const IconComponent = tool.icon;
                return (
                    <Card 
                      key={tool.id} 
                      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                          <div className="p-3 bg-muted rounded-lg border">
                            <IconComponent className="h-6 w-6 text-foreground" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {tool.category}
                            </Badge>
                        </div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors duration-200">
                          {tool.name}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                        {tool.description}
                      </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                      <div className="space-y-3">
                        <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                              <Settings className="h-4 w-4" />
                              主な機能
                            </h4>
                          <div className="flex flex-wrap gap-1">
                            {tool.features.map((feature, index) => (
                              <Badge 
                                key={index} 
                                variant="outline" 
                                  className="text-xs px-2 py-1"
                              >
                                {feature}
                              </Badge>
                            ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-6 pt-4 border-t">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full group-hover:bg-muted transition-colors duration-200"
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            詳細を確認
                            <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
            )}
      
            {/* フッター統計 */}
            <Card className="mt-12">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      Open-SuperAgent の特徴
                    </h3>
                    <p className="text-muted-foreground">
                      多様なAIツールを統合し、クリエイティブなワークフローを効率化
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-foreground">{toolsData.length}</div>
                      <div className="text-sm text-muted-foreground">利用可能ツール</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-foreground">{categories.length - 1}</div>
                      <div className="text-sm text-muted-foreground">カテゴリ</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-foreground">AI</div>
                      <div className="text-sm text-muted-foreground">強化エージェント</div>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-2xl font-bold text-foreground">24/7</div>
                      <div className="text-sm text-muted-foreground">利用可能</div>
                    </div>
          </div>
          </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 