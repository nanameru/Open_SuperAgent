import { useState, useCallback } from 'react';
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

interface UseEnhancedDeepResearchReturn {
  isLoading: boolean;
  processedEvents: ProcessedEvent[];
  result: EnhancedResearchResult | null;
  error: string | null;
  executeEnhancedResearch: (
    message: string,
    options?: {
      complexity?: 'auto' | 'simple' | 'moderate' | 'complex';
      maxIterations?: number;
      includeValidation?: boolean;
      generateCitations?: boolean;
      synthesisType?: 'overview' | 'analytical' | 'comparative';
    }
  ) => Promise<void>;
  reset: () => void;
}

export function useEnhancedDeepResearch(): UseEnhancedDeepResearchReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [processedEvents, setProcessedEvents] = useState<ProcessedEvent[]>([]);
  const [result, setResult] = useState<EnhancedResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeEnhancedResearch = useCallback(async (
    message: string,
    options: {
      complexity?: 'auto' | 'simple' | 'moderate' | 'complex';
      maxIterations?: number;
      includeValidation?: boolean;
      generateCitations?: boolean;
      synthesisType?: 'overview' | 'analytical' | 'comparative';
    } = {}
  ) => {
    setIsLoading(true);
    setProcessedEvents([]);
    setResult(null);
    setError(null);

    const {
      complexity = 'auto',
      maxIterations = 3,
      includeValidation = true,
      generateCitations = true,
      synthesisType = 'analytical'
    } = options;

    try {
      // Enhanced progress tracking
      const events: ProcessedEvent[] = [];
      
      // Step 1: Research Planning
      events.push({
        title: "Research Planning",
        data: `Analyzing research question complexity: ${complexity}`
      });
      setProcessedEvents([...events]);

      // Simulate planning delay
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Multi-source gathering
      events.push({
        title: "Multi-Source Information Gathering",
        data: `Executing strategic search queries (max: ${maxIterations} iterations)`
      });
      setProcessedEvents([...events]);

      // Execute enhanced research workflow
      const response = await fetch('/api/enhanced-deep-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          complexity,
          maxIterations,
          includeValidation,
          generateCitations,
          synthesisType
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Enhanced research workflow failed');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Enhanced research failed');
      }

      // Step 3: Source validation (if enabled)
      if (includeValidation) {
        events.push({
          title: "Source Validation & Quality Assessment",
          data: `Validating ${data.result.process?.sourcesAnalyzed || 0} sources for credibility`
        });
        setProcessedEvents([...events]);
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // Step 4: Content synthesis
      events.push({
        title: "Content Synthesis & Analysis",
        data: `Synthesizing information using ${synthesisType} approach`
      });
      setProcessedEvents([...events]);
      await new Promise(resolve => setTimeout(resolve, 600));

      // Step 5: Citation generation (if enabled)
      if (generateCitations) {
        events.push({
          title: "Citation Generation",
          data: `Generating ${data.result.findings?.citations?.length || 0} formal citations`
        });
        setProcessedEvents([...events]);
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // Step 6: Final assembly
      events.push({
        title: "Research Completion",
        data: `Analysis complete: ${data.result.findings?.mainFindings?.length || 0} key findings identified`
      });
      setProcessedEvents([...events]);

      setResult(data.result);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      // Add error event
      setProcessedEvents(prev => [
        ...prev,
        {
          title: "Error Occurred",
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
    executeEnhancedResearch,
    reset
  };
}