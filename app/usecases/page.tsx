'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { 
  PresentationChartBarIcon, 
  PhotoIcon, 
  GlobeAltIcon,
  ArrowRightIcon,
  SparklesIcon,
  CogIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const usecases = [
  {
    id: 1,
    title: 'プレゼンテーション作成支援',
    description: 'AIを活用してプロフェッショナルなプレゼンテーションを自動生成。テーマに応じたスライドデザインとコンテンツを提供します。',
    icon: PresentationChartBarIcon,
    features: [
      'HTMLスライド自動生成',
      'グラフィックレコーディング',
      'テーマ別デザイン対応',
      'リアルタイムプレビュー'
    ],
    tools: ['htmlSlideTool', 'graphicRecordingTool'],
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-800'
  },
  {
    id: 2,
    title: '画像・動画生成',
    description: '最新のAI技術を使用して高品質な画像や動画を生成。クリエイティブなコンテンツ制作をサポートします。',
    icon: PhotoIcon,
    features: [
      'Gemini画像生成',
      'Imagen 4高品質画像',
      'Veo2動画生成',
      '音声合成（TTS）'
    ],
    tools: ['gemini-image-generation', 'imagen4-generation', 'veo2-video-generation', 'minimax-tts'],
    color: 'bg-purple-50 border-purple-200',
    iconColor: 'text-purple-600',
    badgeColor: 'bg-purple-100 text-purple-800'
  },
  {
    id: 3,
    title: 'ブラウザ自動化・データ収集',
    description: 'Webブラウザの自動操作とデータ収集を実現。効率的な情報収集と作業自動化をサポートします。',
    icon: GlobeAltIcon,
    features: [
      'Webページ自動操作',
      'スクリーンショット取得',
      'データ抽出・収集',
      'リアルタイム監視'
    ],
    tools: ['browserbase-automation', 'braveSearchTool'],
    color: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-800'
  }
];

export default function UseCasesPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
              {/* ヘッダーセクション */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <SparklesIcon className="h-6 w-6 text-primary" />
                  <h1 className="text-3xl font-bold tracking-tight">ユースケース一覧</h1>
                </div>
                <p className="text-muted-foreground text-lg max-w-3xl">
                  AI Agentプラットフォームの主要な活用シーンをご紹介します。
                  様々なツールを組み合わせて、効率的な作業を実現できます。
                </p>
              </div>

              {/* ユースケースカード */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {usecases.map((usecase) => {
                  const IconComponent = usecase.icon;
                  return (
                    <Card key={usecase.id} className={`${usecase.color} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center mb-3">
                          <div className={`p-3 rounded-lg bg-white shadow-sm mr-4`}>
                            <IconComponent className={`h-6 w-6 ${usecase.iconColor}`} />
                          </div>
                          <Badge variant="secondary" className={usecase.badgeColor}>
                            ユースケース {usecase.id}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-semibold text-gray-900 mb-2">
                          {usecase.title}
                        </CardTitle>
                        <CardDescription className="text-gray-600 leading-relaxed">
                          {usecase.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {/* 主要機能 */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <CogIcon className="h-4 w-4 mr-2" />
                            主要機能
                          </h4>
                          <ul className="space-y-2">
                            {usecase.features.map((feature, index) => (
                              <li key={index} className="flex items-center text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 flex-shrink-0"></div>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* 利用ツール */}
                        <div className="mb-6">
                          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <DocumentTextIcon className="h-4 w-4 mr-2" />
                            利用ツール
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {usecase.tools.map((tool, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tool}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <Button 
                          className="w-full group"
                          variant="default"
                          onClick={() => window.location.href = '/'}
                        >
                          <span>試してみる</span>
                          <ArrowRightIcon className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* 追加情報セクション */}
              <Card className="border-border">
                <CardContent className="p-8">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">
                      さらに詳しく知りたい方へ
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
                      これらのユースケースは組み合わせて使用することも可能です。
                      チャットインターフェースから自然言語で指示するだけで、複数のツールを連携させた複雑なタスクも実行できます。
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        variant="default" 
                        size="lg"
                        onClick={() => window.location.href = '/'}
                        className="flex items-center"
                      >
                        <SparklesIcon className="h-5 w-5 mr-2" />
                        今すぐ始める
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => window.location.href = '/'}
                        className="flex items-center"
                      >
                        <DocumentTextIcon className="h-5 w-5 mr-2" />
                        ドキュメントを見る
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
} 