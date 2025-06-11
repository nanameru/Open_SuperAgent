import { cn } from '@/lib/utils';
import React from 'react';
import { Loader2 } from 'lucide-react'; // スピナー用のアイコン

export type ReasoningStep = {
  title: string;
  icon: React.ElementType;
};

function Step({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-start">
      <div
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="ml-4 flex min-w-0 flex-1 flex-col justify-center">
        <p className="truncate font-medium text-sm text-foreground">{title}</p>
      </div>
    </div>
  );
}

export function ReasoningSteps({ steps, title = '思考中...' }: { steps?: ReasoningStep[], title?: string }) {
  // パターン1: 引数(steps)がない場合は、汎用的な「思考中」UIを表示
  if (!steps || steps.length === 0) {
    return (
      <div className="flex items-center space-x-2 p-3">
        <Loader2 className="size-4 animate-spin text-gray-500" />
        <span className="text-sm text-gray-500">{title}</span>
      </div>
    );
  }

  // パターン2: 引数(steps)がある場合は、具体的なステップのリストを表示
  return (
    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 space-y-3">
      {steps.map((step, index) => (
        <Step
          key={index}
          icon={step.icon}
          title={step.title}
        />
      ))}
    </div>
  );
} 