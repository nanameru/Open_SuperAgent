import { useState, useCallback } from 'react';
import { ProcessedEvent } from '@/app/components/ActivityTimeline';

interface DeepResearchResult {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  searchQueries: string[];
  iterations: number;
  knowledgeGaps?: string[];
}

interface UseDeepResearchReturn {
  isLoading: boolean;
  processedEvents: ProcessedEvent[];
  result: DeepResearchResult | null;
  error: string | null;
  executeDeepResearch: (message: string, maxIterations?: number, queriesPerIteration?: number) => Promise<void>;
  reset: () => void;
}

export function useDeepResearch(): UseDeepResearchReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [processedEvents, setProcessedEvents] = useState<ProcessedEvent[]>([]);
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeDeepResearch = useCallback(async (
    message: string,
    maxIterations: number = 2,
    queriesPerIteration: number = 3
  ) => {
    setIsLoading(true);
    setProcessedEvents([]);
    setResult(null);
    setError(null);

    try {
      // 初期イベントを追加
      setProcessedEvents([{
        title: "初期クエリ生成",
        data: "検索クエリを生成しています..."
      }]);

      // ワークフロー実行をシミュレート（実際のAPIコールに置き換え可能）
      const response = await fetch('/api/deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          maxIterations,
          queriesPerIteration
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'ワークフローの実行に失敗しました');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'ワークフローが失敗しました');
      }

      // 成功時のイベントを追加
      setProcessedEvents(prev => [
        ...prev,
        {
          title: "Web検索実行",
          data: `${data.result.searchQueries?.length || 0}個のクエリで検索を実行`
        },
        {
          title: "振り返りと評価",
          data: `${data.result.iterations}回の反復で情報を収集`
        },
        {
          title: "最終回答生成",
          data: `${data.result.sources?.length || 0}個のソースから回答を生成`
        }
      ]);

      setResult(data.result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // エラーイベントを追加
      setProcessedEvents(prev => [
        ...prev,
        {
          title: "エラー発生",
          data: errorMessage
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setProcessedEvents([]);
    setResult(null);
    setError(null);
  }, []);

  return {
    isLoading,
    processedEvents,
    result,
    error,
    executeDeepResearch,
    reset
  };
} 