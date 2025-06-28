'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, Search, BrainCircuit, FileText } from 'lucide-react';
import { ResearchStep } from '@/app/hooks/useEnhancedDeepResearch';

interface ResearchProgressProps {
  title: string;
  progress: ResearchStep[];
}

const getIcon = (type: string) => {
  switch (type) {
    case 'searching':
      return <Search className="h-5 w-5 text-blue-500" />;
    case 'analyzing':
      return <BrainCircuit className="h-5 w-5 text-purple-500" />;
    case 'writing':
      return <FileText className="h-5 w-5 text-green-500" />;
    default:
      return <Search className="h-5 w-5 text-gray-500" />;
  }
};

const StepItem: React.FC<{ step: ResearchStep }> = ({ step }) => {
  if (step.type === 'searching' && step.query) {
    return (
      <div className="flex items-center space-x-2">
        {getIcon(step.type)}
        <span className="text-sm text-gray-700 dark:text-gray-300">Searching: <span className="italic">"{step.query}"</span></span>
      </div>
    );
  }
  if (step.type === 'analyzing' && step.summary) {
    return (
       <div className="flex items-start space-x-2">
        {getIcon(step.type)}
        <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{step.summary}</p>
      </div>
    );
  }
  return null;
};

export const ResearchProgress: React.FC<ResearchProgressProps> = ({ title, progress }) => {
  return (
    <div className="flex space-x-4 h-full">
      <div className="w-1/3 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg flex flex-col">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">リサーチを実行しています</h2>
        <div className="flex-1 overflow-y-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            リサーチを行っている間、ご自由にこのチャットからご退出ください。完了次第、結果をお知らせします。
          </p>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <p className="font-semibold text-blue-800 dark:text-blue-200">{title}</p>
            <p className="text-sm text-blue-600 dark:text-blue-300">
              {progress.length > 0 ? `Step ${progress.length}...` : 'Starting...'}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <button className="w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300">
            リサーチを停止
          </button>
        </div>
      </div>

      <div className="w-2/3">
        <Card className="h-full bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 h-[calc(100%-4rem)] overflow-y-auto p-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">リサーチの方向性</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">AIのビジネス活用に関する詳細なリサーチを進めていきます。提示された主要なガイドラインに沿って、包括的なレポートを作成することを目指しています。</p>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 dark:text-gray-300">Research Process</h3>
              <ul className="space-y-3">
                {progress.map((step, index) => (
                  <li key={index} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-md animate-fade-in">
                    <StepItem step={step} />
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 