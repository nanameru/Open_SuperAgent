'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Zap, Search, BrainCircuit, FileText } from 'lucide-react';
import { ResearchPlan as ResearchPlanType } from '@/app/hooks/useEnhancedDeepResearch';

interface ResearchPlanProps {
  plan: ResearchPlanType | null;
  onStart: () => void;
  onEdit: () => void;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'search':
      return <Search className="h-5 w-5 text-blue-500" />;
    case 'analyze':
      return <BrainCircuit className="h-5 w-5 text-purple-500" />;
    case 'report':
      return <FileText className="h-5 w-5 text-green-500" />;
    default:
      return <Zap className="h-5 w-5 text-gray-500" />;
  }
};

export const ResearchPlan: React.FC<ResearchPlanProps> = ({ plan, onStart, onEdit }) => {
  if (!plan) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900/30 p-4 sm:p-6 rounded-lg">
      <Card className="max-w-2xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-100">リサーチ計画をまとめました。</CardTitle>
          </div>
          <CardDescription className="pt-2 text-gray-600 dark:text-gray-400">
            変更が必要な箇所があればお知らせください。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 border bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <h3 className="font-semibold text-lg mb-3 text-gray-800 dark:text-gray-200">{plan.title}</h3>
            <ul className="space-y-3">
              {plan.steps.map((step, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(step.type)}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">
                    {step.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>数分で完了予定</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onEdit}>計画を編集</Button>
          <Button onClick={onStart}>リサーチを開始</Button>
        </CardFooter>
      </Card>
    </div>
  );
}; 