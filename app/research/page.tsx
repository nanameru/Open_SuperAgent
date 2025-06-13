'use client';

import React from 'react';
import { EnhancedResearchPanel } from '../components/EnhancedResearchPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Search, Users, FileText, CheckCircle } from 'lucide-react';

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Enhanced Research Tools
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            LangGraph-style deep research with advanced AI tools, source validation, 
            and comprehensive analysis capabilities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <Search className="h-8 w-8 text-blue-600" />
                <Badge variant="secondary">Core</Badge>
              </div>
              <h3 className="font-semibold mb-2">Multi-Source Search</h3>
              <p className="text-sm text-gray-600">
                Brave Search and Grok X.ai integration for comprehensive information gathering
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <Badge variant="secondary">Quality</Badge>
              </div>
              <h3 className="font-semibold mb-2">Source Validation</h3>
              <p className="text-sm text-gray-600">
                Automated credibility assessment and bias detection for all sources
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <BookOpen className="h-8 w-8 text-purple-600" />
                <Badge variant="secondary">Analysis</Badge>
              </div>
              <h3 className="font-semibold mb-2">Content Synthesis</h3>
              <p className="text-sm text-gray-600">
                AI-powered information synthesis with conflict resolution and insights
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <FileText className="h-8 w-8 text-orange-600" />
                <Badge variant="secondary">Output</Badge>
              </div>
              <h3 className="font-semibold mb-2">Academic Citations</h3>
              <p className="text-sm text-gray-600">
                Automatic generation of APA, MLA, and Chicago style citations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Research Tools Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Research Panel */}
          <div className="lg:col-span-2">
            <EnhancedResearchPanel />
          </div>

          {/* Sidebar with Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Research Process
                </CardTitle>
                <CardDescription>
                  How enhanced research works
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium">Query Analysis</h4>
                      <p className="text-sm text-gray-600">
                        AI analyzes your question and creates a strategic research plan
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium">Multi-Source Search</h4>
                      <p className="text-sm text-gray-600">
                        Execute multiple search strategies across different platforms
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium">Source Validation</h4>
                      <p className="text-sm text-gray-600">
                        Assess credibility, bias, and reliability of all sources
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <h4 className="font-medium">Content Synthesis</h4>
                      <p className="text-sm text-gray-600">
                        Combine information, resolve conflicts, and generate insights
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-sm font-medium">
                      5
                    </div>
                    <div>
                      <h4 className="font-medium">Citation Generation</h4>
                      <p className="text-sm text-gray-600">
                        Generate proper academic citations and references
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Research Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm space-y-2">
                  <p>
                    <strong>Complexity Settings:</strong> Use "Auto" for most questions, 
                    "Complex" for multi-faceted research topics.
                  </p>
                  <p>
                    <strong>Source Validation:</strong> Always enable for academic or 
                    professional research requiring high credibility.
                  </p>
                  <p>
                    <strong>Synthesis Types:</strong> "Analytical" for detailed analysis, 
                    "Overview" for broad summaries, "Comparative" for contrasting viewpoints.
                  </p>
                  <p>
                    <strong>Citations:</strong> Enable when you need properly formatted 
                    references for academic or professional use.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sample Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                    "What are the latest developments in quantum computing?"
                  </div>
                  <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                    "Compare different approaches to climate change mitigation"
                  </div>
                  <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                    "Analyze the impact of AI on employment trends"
                  </div>
                  <div className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100">
                    "What are the ethical implications of gene editing?"
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}