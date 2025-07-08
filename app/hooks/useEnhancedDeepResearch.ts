import { useState, useCallback, useTransition } from 'react';
import { ProcessedEvent } from '@/app/components/ActivityTimeline';

// Enhanced research result interface
interface EnhancedResearchResult {
  researchPlan: {
    queries: string[];
    complexity: string;
    steps: number;
  };
  findings: {
    executiveSummary: string;
    mainFindings: Array<{
      finding: string;
      evidence: string;
      confidence: number;
      sources: string[];
    }>;
    conflicts: Array<{
      topic: string;
      conflictingViews: string[];
      resolution?: string;
    }>;
    citations: string[];
    qualityAssessment: {
      overallReliability: string;
      sourceQuality: string;
      evidenceStrength: string;
    };
  };
  process: {
    totalQueries: number;
    sourcesAnalyzed: number;
    iterationsCompleted: number;
    validationResults?: any;
  };
  metadata: {
    startTime: string;
    endTime: string;
    duration: string;
    tools: string[];
  };
}

// リサーチの各ステップの状態を定義
export type ResearchStep = {
  type: 'planning' | 'searching' | 'analyzing' | 'writing';
  query?: string;
  summary?: string;
  status: 'running' | 'completed' | 'failed';
};

// ディープリサーチの状態
export type ResearchStatus = 'idle' | 'planning' | 'researching' | 'complete' | 'error';

// リサーチ計画の型
export interface ResearchPlan {
  title: string;
  steps: {
    type: 'search' | 'analyze' | 'report';
    description: string;
  }[];
}

// カスタムフックの戻り値の型
export interface EnhancedDeepResearchOutput {
  status: ResearchStatus;
  plan: ResearchPlan | null;
  progress: ResearchStep[];
  finalReport: any | null; // APIの最終的なレポート形式に合わせる
  error: string | null;
  startResearch: (query: string) => Promise<void>;
  executeResearch: () => Promise<void>;
  resetResearch: () => void;
}

export function useEnhancedDeepResearch(): EnhancedDeepResearchOutput {
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [progress, setProgress] = useState<ResearchStep[]>([]);
  const [finalReport, setFinalReport] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  /**
   * リサーチ計画の生成を開始する
   * @param query ユーザーの入力クエリ
   */
  const startResearch = useCallback(async (query: string) => {
    startTransition(() => {
    setStatus('planning');
    setError(null);
    setPlan(null);
    setProgress([]);
    setFinalReport(null);
    });

    try {
      const response = await fetch('/api/research-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('リサーチ計画の生成に失敗しました。');
      }

      const data: ResearchPlan = await response.json();
      startTransition(() => {
      setPlan(data);
      setStatus('idle'); // 計画ができたのでidleに戻す
      });

    } catch (e) {
      startTransition(() => {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました。');
      setStatus('error');
      });
    }
  }, []);

  /**
   * 本格的なリサーチを実行する
   */
  const executeResearch = useCallback(async () => {
    if (!plan) return;

    startTransition(() => {
    setStatus('researching');
    setError(null);
    setProgress([]);
    });

    try {
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: plan.title.replace(/」に関するリサーチ計画$/, '').replace(/^「/, '') }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deep Research API error response:", errorText);
        throw new Error(`Deep Research APIの呼び出しに失敗しました: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.output) {
        throw new Error('APIから予期しない形式の応答がありました。');
      }

      const intermediateSteps = result.output.filter((item: any) => item.type !== 'final_answer');
      
      const newSteps: ResearchStep[] = [];
      for (const step of intermediateSteps) {
        let newStep: ResearchStep | null = null;
        if (step.type === 'web_search_call') {
          newStep = {
            type: 'searching',
            query: step.action.query,
            status: 'completed',
          };
        } else if (step.type === 'reasoning' && step.summary) {
           newStep = {
            type: 'analyzing',
            summary: step.summary[0]?.text || 'Analyzing findings...',
            status: 'completed',
          };
        }
        
        if (newStep) {
          newSteps.push(newStep);
        }
      }

      startTransition(() => {
        setProgress(prev => [...prev, ...newSteps]);
      });

      const finalAnswer = result.output.find((item: any) => item.type === 'final_answer');
      
      startTransition(() => {
      setFinalReport(finalAnswer || { title: plan.title, content: { text: "最終レポートが見つかりませんでした。" } });
      setStatus('complete');
      });

    } catch (e) {
      startTransition(() => {
      setError(e instanceof Error ? e.message : '不明なエラーが発生しました。');
      setStatus('error');
      });
    }
  }, [plan]);

  /**
   * リサーチ状態をリセットする
   */
  const resetResearch = useCallback(() => {
    startTransition(() => {
    setStatus('idle');
    setPlan(null);
    setProgress([]);
    setFinalReport(null);
    setError(null);
    });
  }, []);

  return {
    status,
    plan,
    progress,
    finalReport,
    error,
    startResearch,
    executeResearch,
    resetResearch,
  };
}