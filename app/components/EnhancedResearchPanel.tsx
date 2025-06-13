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
    isLoading,
    processedEvents,
    result,
    error,
    executeEnhancedResearch,
    reset
  } = useEnhancedDeepResearch();

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
    
    await executeEnhancedResearch(query, options);
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
                <Button type="button" variant="outline" onClick={reset}>
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
            <ActivityTimeline events={processedEvents} />
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
                  <Badge className={getComplexityColor(result.researchPlan.complexity)}>
                    {result.researchPlan.complexity}
                  </Badge>
                  <Badge variant="outline">
                    {formatDuration(result.metadata.duration)}
                  </Badge>
                </div>
              </CardTitle>
              <CardDescription>
                {result.process.totalQueries} queries • {result.process.sourcesAnalyzed} sources analyzed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <h4>Executive Summary</h4>
                <p>{result.findings.executiveSummary}</p>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results Tabs */}
          <Tabs defaultValue="findings" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="findings">Key Findings</TabsTrigger>
              <TabsTrigger value="analysis">Quality Analysis</TabsTrigger>
              <TabsTrigger value="sources">Sources & Citations</TabsTrigger>
              <TabsTrigger value="metadata">Process Details</TabsTrigger>
            </TabsList>

            <TabsContent value="findings" className="space-y-4">
              {/* Main Findings */}
              <Collapsible open={expandedSections.findings}>
                <CollapsibleTrigger 
                  onClick={() => toggleSection('findings')}
                  className="flex items-center justify-between w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                >
                  <h3 className="font-semibold">Main Findings ({result.findings.mainFindings.length})</h3>
                  {expandedSections.findings ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 mt-3">
                  {result.findings.mainFindings.map((finding, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{finding.finding}</h4>
                          <Badge className={getConfidenceColor(finding.confidence)}>
                            {Math.round(finding.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{finding.evidence}</p>
                        <div className="text-xs text-gray-500">
                          Sources: {finding.sources.join(', ')}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>

              {/* Conflicts */}
              {result.findings.conflicts.length > 0 && (
                <Collapsible open={expandedSections.conflicts}>
                  <CollapsibleTrigger 
                    onClick={() => toggleSection('conflicts')}
                    className="flex items-center justify-between w-full p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100"
                  >
                    <h3 className="font-semibold">Conflicting Information ({result.findings.conflicts.length})</h3>
                    {expandedSections.conflicts ? <ChevronUp /> : <ChevronDown />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    {result.findings.conflicts.map((conflict, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <h4 className="font-medium mb-2">{conflict.topic}</h4>
                          <div className="space-y-2">
                            {conflict.conflictingViews.map((view, viewIndex) => (
                              <div key={viewIndex} className="text-sm bg-gray-50 p-2 rounded">
                                {view}
                              </div>
                            ))}
                          </div>
                          {conflict.resolution && (
                            <div className="mt-2 text-sm text-green-600">
                              <strong>Resolution:</strong> {conflict.resolution}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Quality Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.findings.qualityAssessment.overallReliability}
                      </div>
                      <div className="text-sm text-gray-500">Overall Reliability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {result.findings.qualityAssessment.sourceQuality}
                      </div>
                      <div className="text-sm text-gray-500">Source Quality</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {result.findings.qualityAssessment.evidenceStrength}
                      </div>
                      <div className="text-sm text-gray-500">Evidence Strength</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sources" className="space-y-4">
              {result.findings.citations.length > 0 && (
                <Collapsible open={expandedSections.citations}>
                  <CollapsibleTrigger 
                    onClick={() => toggleSection('citations')}
                    className="flex items-center justify-between w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    <h3 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Citations ({result.findings.citations.length})
                    </h3>
                    {expandedSections.citations ? <ChevronUp /> : <ChevronDown />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="space-y-2">
                          {result.findings.citations.map((citation, index) => (
                            <div key={index} className="text-sm bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                              {citation}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Process Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Research Queries:</strong> {result.researchPlan.queries.join(', ')}
                    </div>
                    <div>
                      <strong>Tools Used:</strong> {result.metadata.tools.join(', ')}
                    </div>
                    <div>
                      <strong>Start Time:</strong> {new Date(result.metadata.startTime).toLocaleString()}
                    </div>
                    <div>
                      <strong>End Time:</strong> {new Date(result.metadata.endTime).toLocaleString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};