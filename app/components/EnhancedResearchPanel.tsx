'use client';

import React, { useState } from 'react';
import { useEnhancedDeepResearch } from '../hooks/useEnhancedDeepResearch';
import { ActivityTimeline } from './ActivityTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, Users, FileText, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EnhancedResearchPanelProps {
  className?: string;
}

export const EnhancedResearchPanel: React.FC<EnhancedResearchPanelProps> = ({ className }) => {
  const {
    status,
    progress,
    finalReport,
    error,
    startResearch,
    executeResearch,
    resetResearch
  } = useEnhancedDeepResearch();
  
  const isLoading = status === 'planning' || status === 'researching';
  const processedEvents = progress.map((step, index) => ({
    id: `step-${index}`,
    title: step.query || step.summary || `${step.type} step`,
    type: step.type,
    timestamp: new Date().toISOString(),
    data: {
      query: step.query,
      summary: step.summary
    },
    status: step.status
  }));
  const result = finalReport;

  const [query, setQuery] = useState('');
  const [options, setOptions] = useState({
    complexity: 'auto' as const,
    includeValidation: true,
    generateCitations: true,
    synthesisType: 'analytical' as const,
  });
  
  const [expandedSections, setExpandedSections] = useState({
    findings: true,
    conflicts: false,
    citations: false,
    metadata: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    await startResearch(query);
    await executeResearch();
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity.toLowerCase()) {
      case 'simple': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'complex': return 'bg-red-100 text-red-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const formatDuration = (duration: string) => {
    return duration.replace(' seconds', 's').replace(' minutes', 'm');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Research Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Enhanced Deep Research
          </CardTitle>
          <CardDescription>
            LangGraph-style research with advanced tools and multi-source analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="research-query" className="block text-sm font-medium mb-2">
                Research Question
              </label>
              <textarea
                id="research-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your research question or topic..."
                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                disabled={isLoading}
              />
            </div>
            
            {/* Research Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Complexity</label>
                <select
                  value={options.complexity}
                  onChange={(e) => setOptions(prev => ({ ...prev, complexity: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="auto">Auto-detect</option>
                  <option value="simple">Simple</option>
                  <option value="moderate">Moderate</option>
                  <option value="complex">Complex</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Synthesis Type</label>
                <select
                  value={options.synthesisType}
                  onChange={(e) => setOptions(prev => ({ ...prev, synthesisType: e.target.value as any }))}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  <option value="analytical">Analytical</option>
                  <option value="overview">Overview</option>
                  <option value="comparative">Comparative</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.includeValidation}
                  onChange={(e) => setOptions(prev => ({ ...prev, includeValidation: e.target.checked }))}
                  className="mr-2"
                  disabled={isLoading}
                />
                Source Validation
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={options.generateCitations}
                  onChange={(e) => setOptions(prev => ({ ...prev, generateCitations: e.target.checked }))}
                  className="mr-2"
                  disabled={isLoading}
                />
                Generate Citations
              </label>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading || !query.trim()} className="flex-1">
                {isLoading ? 'Researching...' : 'Start Enhanced Research'}
              </Button>
              {(result || error) && (
                <Button type="button" variant="outline" onClick={resetResearch}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Progress and Activity Timeline */}
      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 animate-spin" />
              Research Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(processedEvents.length / 6) * 100} className="mb-4" />
            <ActivityTimeline processedEvents={processedEvents} isLoading={isLoading} />
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-semibold">Research Failed</span>
            </div>
            <p className="mt-2 text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Research Results */}
      {result && (
        <div className="space-y-6">
          {/* Research Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Research Complete
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Complete
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                Research completed successfully
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h4>Research Results</h4>
                <p>{result.content?.text || result.title || 'Research completed but no content available.'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Process Steps */}
          {processedEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Research Process</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline processedEvents={processedEvents} isLoading={false} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};