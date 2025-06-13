import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { braveSearchTool } from '../tools/braveSearchTool';
import { grokXSearchTool } from '../tools/grokXSearchTool';
import { websiteAnalysisTool } from '../tools/websiteAnalysisTool';
import { sourceValidationTool } from '../tools/sourceValidationTool';
import { citationExtractionTool } from '../tools/citationExtractionTool';
import { contentSynthesisTool } from '../tools/contentSynthesisTool';

// Enhanced schemas for the new workflow
const ResearchPlanSchema = z.object({
  queries: z.array(z.object({
    query: z.string(),
    searchType: z.enum(['broad', 'specific', 'validation']),
    priority: z.enum(['high', 'medium', 'low']),
    reasoning: z.string(),
  })),
  analysisTargets: z.array(z.string().url()).optional(),
  expectedComplexity: z.enum(['simple', 'moderate', 'complex']),
  estimatedSteps: z.number(),
});

const SearchResultWithAnalysisSchema = z.object({
  query: z.string(),
  searchType: z.string(),
  results: z.array(z.object({
    title: z.string(),
    url: z.string(),
    description: z.string().optional(),
    credibilityScore: z.number().optional(),
    relevanceScore: z.number().optional(),
  })),
  summary: z.string(),
  keyFindings: z.array(z.string()),
  sourceAnalysis: z.any().optional(),
});

const SynthesisResultSchema = z.object({
  executiveSummary: z.string(),
  mainFindings: z.array(z.object({
    finding: z.string(),
    evidence: z.string(),
    confidence: z.number(),
    sources: z.array(z.string()),
  })),
  conflicts: z.array(z.object({
    topic: z.string(),
    conflictingViews: z.array(z.string()),
    resolution: z.string().optional(),
  })),
  citations: z.array(z.string()),
  qualityAssessment: z.object({
    overallReliability: z.string(),
    sourceQuality: z.string(),
    evidenceStrength: z.string(),
  }),
});

/**
 * Enhanced Deep Research Workflow
 * Implements LangGraph-style research with advanced tools integration
 */
export const enhancedDeepResearchWorkflow = createWorkflow({
  id: 'enhanced-deep-research-workflow',
  description: 'Advanced LangGraph-style research system with enhanced tools and analysis',
  inputSchema: z.object({
    message: z.string().describe('Research question or topic'),
    complexity: z.enum(['auto', 'simple', 'moderate', 'complex']).default('auto').describe('Research complexity level'),
    maxIterations: z.number().optional().default(3).describe('Maximum research iterations'),
    includeValidation: z.boolean().default(true).describe('Include source validation'),
    generateCitations: z.boolean().default(true).describe('Generate formal citations'),
    synthesisType: z.enum(['overview', 'analytical', 'comparative']).default('analytical').describe('Type of synthesis'),
  }),
  outputSchema: z.object({
    researchPlan: z.object({
      queries: z.array(z.string()),
      complexity: z.string(),
      steps: z.number(),
    }),
    findings: SynthesisResultSchema,
    process: z.object({
      totalQueries: z.number(),
      sourcesAnalyzed: z.number(),
      iterationsCompleted: z.number(),
      validationResults: z.any().optional(),
    }),
    metadata: z.object({
      startTime: z.string(),
      endTime: z.string(),
      duration: z.string(),
      tools: z.array(z.string()),
    }),
  }),
})
  // Step 1: Intelligent Research Planning
  .then(createStep({
    id: 'intelligent-planning',
    description: 'Analyze research question and create comprehensive research plan',
    inputSchema: z.object({
      message: z.string(),
      complexity: z.enum(['auto', 'simple', 'moderate', 'complex']).default('auto'),
      maxIterations: z.number().optional().default(3),
      includeValidation: z.boolean().default(true),
      generateCitations: z.boolean().default(true),
      synthesisType: z.enum(['overview', 'analytical', 'comparative']).default('analytical'),
    }),
    outputSchema: z.object({
      researchPlan: ResearchPlanSchema,
      startTime: z.string(),
      originalInput: z.any(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      const startTime = new Date().toISOString();
      
      const planningPrompt = `
You are an expert research planner. Analyze this research question and create a comprehensive research plan.

Research Question: ${inputData.message}
Requested Complexity: ${inputData.complexity}
Max Iterations: ${inputData.maxIterations}

Create a research plan that includes:
1. 5-8 strategic search queries of different types (broad overview, specific details, validation)
2. Complexity assessment (simple/moderate/complex)
3. Estimated number of research steps needed
4. Priority ranking for queries
5. Potential high-value websites to analyze in depth

Consider these search strategies:
- Broad: General overview queries for topic understanding
- Specific: Targeted queries for detailed information
- Validation: Fact-checking and credibility verification queries

Respond in JSON format:
{
  "queries": [
    {
      "query": "search query text",
      "searchType": "broad/specific/validation",
      "priority": "high/medium/low", 
      "reasoning": "why this query is important"
    }
  ],
  "analysisTargets": ["url1", "url2"],
  "expectedComplexity": "simple/moderate/complex",
  "estimatedSteps": 5
}
`;

      try {
        const response = await generateText({
          model,
          prompt: planningPrompt,
        });

        let researchPlan;
        try {
          const jsonMatch = response.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            researchPlan = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('No JSON found');
          }
        } catch (parseError) {
          // Fallback plan
          researchPlan = {
            queries: [
              {
                query: inputData.message,
                searchType: 'broad',
                priority: 'high',
                reasoning: 'Direct query about the research topic',
              },
              {
                query: `${inputData.message} recent research`,
                searchType: 'specific',
                priority: 'high',
                reasoning: 'Find recent developments and research',
              },
              {
                query: `${inputData.message} expert analysis`,
                searchType: 'validation',
                priority: 'medium',
                reasoning: 'Find expert opinions and analysis',
              },
            ],
            expectedComplexity: inputData.complexity === 'auto' ? 'moderate' : inputData.complexity,
            estimatedSteps: inputData.maxIterations,
          };
        }

        return {
          researchPlan,
          startTime,
          originalInput: inputData,
        };
      } catch (error) {
        console.error('Research planning error:', error);
        throw error;
      }
    },
  }))
  
  // Step 2: Multi-Source Information Gathering
  .then(createStep({
    id: 'multi-source-gathering',
    description: 'Execute research plan with multiple search tools and strategies',
    inputSchema: z.object({
      researchPlan: ResearchPlanSchema,
      startTime: z.string(),
      originalInput: z.any(),
    }),
    outputSchema: z.object({
      searchResults: z.array(SearchResultWithAnalysisSchema),
      researchPlan: ResearchPlanSchema,
      originalInput: z.any(),
      startTime: z.string(),
    }),
    execute: async ({ inputData }) => {
      const model = anthropic('claude-opus-4-20250514');
      const searchResults: any[] = [];
      
      // Execute search queries with rate limiting
      for (let i = 0; i < inputData.researchPlan.queries.length; i++) {
        const queryPlan = inputData.researchPlan.queries[i];
        
        // Add delay between searches to respect rate limits
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1200));
        }
        
        try {
          console.log(`[Enhanced Research] Executing ${queryPlan.searchType} query: "${queryPlan.query}"`);
          
          // Use appropriate search tool based on query type
          let searchResult;
          if (queryPlan.searchType === 'validation' || queryPlan.priority === 'high') {
            // Use Grok for high-priority and validation queries
            try {
              searchResult = await grokXSearchTool.execute({
                context: { 
                  query: queryPlan.query,
                  mode: 'on',
                  maxResults: 10,
                  returnCitations: true,
                }
              } as any);
              
              // Transform Grok result to standard format
              if (searchResult?.content) {
                searchResults.push({
                  query: queryPlan.query,
                  searchType: queryPlan.searchType,
                  results: [], // Grok doesn't return individual results
                  summary: searchResult.content,
                  keyFindings: [searchResult.content.substring(0, 200) + '...'],
                  citations: searchResult.citations || [],
                });
                continue;
              }
            } catch (grokError) {
              console.warn('Grok search failed, falling back to Brave:', grokError);
            }
          }
          
          // Fallback to Brave search
          searchResult = await braveSearchTool.execute({
            context: { 
              query: queryPlan.query, 
              count: queryPlan.priority === 'high' ? 8 : 5 
            }
          } as any);
          
          if (searchResult?.results) {
            // Analyze search results with AI
            const analysisPrompt = `
Analyze these search results for the query: "${queryPlan.query}"

Results:
${searchResult.results.map((r: any) => `
Title: ${r.title}
URL: ${r.url}
Description: ${r.description || 'No description'}
`).join('\n')}

Provide:
1. Summary of key findings
2. Relevance assessment for each result (0-1 score)
3. Credibility indicators
4. Main insights extracted

Format as JSON:
{
  "summary": "key findings summary",
  "keyFindings": ["finding1", "finding2"],
  "resultAnalysis": [
    {
      "url": "result url",
      "relevanceScore": 0.8,
      "credibilityScore": 0.7,
      "keyPoints": ["point1", "point2"]
    }
  ]
}
`;

            try {
              const analysisResponse = await generateText({
                model,
                prompt: analysisPrompt,
              });
              
              let analysis;
              try {
                const jsonMatch = analysisResponse.text.match(/\{[\s\S]*\}/);
                analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
              } catch {
                analysis = {
                  summary: analysisResponse.text.substring(0, 300),
                  keyFindings: ['Analysis completed'],
                };
              }
              
              // Enhanced result with analysis
              const enhancedResults = searchResult.results.map((r: any, idx: number) => {
                const resultAnalysis = analysis.resultAnalysis?.[idx] || {};
                return {
                  ...r,
                  relevanceScore: resultAnalysis.relevanceScore || 0.5,
                  credibilityScore: resultAnalysis.credibilityScore || 0.5,
                  keyPoints: resultAnalysis.keyPoints || [],
                };
              });
              
              searchResults.push({
                query: queryPlan.query,
                searchType: queryPlan.searchType,
                results: enhancedResults,
                summary: analysis.summary,
                keyFindings: analysis.keyFindings || [],
                sourceAnalysis: analysis,
              });
              
            } catch (analysisError) {
              console.error('Search analysis error:', analysisError);
              // Fallback without analysis
              searchResults.push({
                query: queryPlan.query,
                searchType: queryPlan.searchType,
                results: searchResult.results,
                summary: 'Search completed successfully',
                keyFindings: [],
              });
            }
          }
          
        } catch (searchError) {
          console.error(`Search error for query "${queryPlan.query}":`, searchError);
          searchResults.push({
            query: queryPlan.query,
            searchType: queryPlan.searchType,
            results: [],
            summary: `Search failed: ${searchError instanceof Error ? searchError.message : 'Unknown error'}`,
            keyFindings: [],
          });
        }
      }
      
      return {
        searchResults,
        researchPlan: inputData.researchPlan,
        originalInput: inputData.originalInput,
        startTime: inputData.startTime,
      };
    },
  }))
  
  // Step 3: Source Validation and Quality Assessment
  .then(createStep({
    id: 'source-validation',
    description: 'Validate sources and assess information quality',
    inputSchema: z.object({
      searchResults: z.array(SearchResultWithAnalysisSchema),
      researchPlan: ResearchPlanSchema,
      originalInput: z.any(),
      startTime: z.string(),
    }),
    outputSchema: z.object({
      validatedResults: z.array(SearchResultWithAnalysisSchema),
      validationSummary: z.any(),
      researchPlan: ResearchPlanSchema,
      originalInput: z.any(),
      startTime: z.string(),
    }),
    execute: async ({ inputData }) => {
      if (!inputData.originalInput.includeValidation) {
        return {
          validatedResults: inputData.searchResults,
          validationSummary: { skipped: true },
          researchPlan: inputData.researchPlan,
          originalInput: inputData.originalInput,
          startTime: inputData.startTime,
        };
      }
      
      try {
        // Collect sources for validation
        const sources = inputData.searchResults.flatMap(sr => 
          sr.results.map(r => ({
            url: r.url,
            title: r.title,
            content: r.description || '',
          }))
        ).slice(0, 15); // Limit to top 15 sources
        
        if (sources.length === 0) {
          return {
            validatedResults: inputData.searchResults,
            validationSummary: { noSources: true },
            researchPlan: inputData.researchPlan,
            originalInput: inputData.originalInput,
            startTime: inputData.startTime,
          };
        }
        
        // Execute source validation
        const validationResult = await sourceValidationTool.execute({
          context: {
            sources,
            validationCriteria: ['authority', 'accuracy', 'objectivity'],
            researchTopic: inputData.originalInput.message,
          }
        } as any);
        
        // Update search results with validation scores
        const validatedResults = inputData.searchResults.map(sr => ({
          ...sr,
          results: sr.results.map(r => {
            const validation = validationResult.validationResults?.find(v => v.url === r.url);
            return {
              ...r,
              credibilityScore: validation?.overallScore ? validation.overallScore / 10 : r.credibilityScore,
              validationDetails: validation || undefined,
            };
          }),
        }));
        
        return {
          validatedResults,
          validationSummary: validationResult.summary,
          researchPlan: inputData.researchPlan,
          originalInput: inputData.originalInput,
          startTime: inputData.startTime,
        };
        
      } catch (error) {
        console.error('Source validation error:', error);
        return {
          validatedResults: inputData.searchResults,
          validationSummary: { error: 'Validation failed' },
          researchPlan: inputData.researchPlan,
          originalInput: inputData.originalInput,
          startTime: inputData.startTime,
        };
      }
    },
  }))
  
  // Step 4: Content Synthesis and Analysis
  .then(createStep({
    id: 'content-synthesis',
    description: 'Synthesize information from all sources into comprehensive findings',
    inputSchema: z.object({
      validatedResults: z.array(SearchResultWithAnalysisSchema),
      validationSummary: z.any(),
      researchPlan: ResearchPlanSchema,
      originalInput: z.any(),
      startTime: z.string(),
    }),
    outputSchema: z.object({
      synthesis: SynthesisResultSchema,
      citations: z.array(z.string()).optional(),
      validatedResults: z.array(SearchResultWithAnalysisSchema),
      startTime: z.string(),
      originalInput: z.any(),
    }),
    execute: async ({ inputData }) => {
      try {
        // Prepare sources for synthesis
        const synthesisInputs = inputData.validatedResults.map(sr => ({
          title: sr.query,
          content: sr.summary + '\n\nKey Findings: ' + sr.keyFindings.join(', '),
          credibilityScore: sr.results.reduce((avg, r) => avg + (r.credibilityScore || 0.5), 0) / Math.max(sr.results.length, 1),
          sourceType: sr.searchType,
        }));
        
        // Execute content synthesis
        const synthesisResult = await contentSynthesisTool.execute({
          context: {
            sources: synthesisInputs,
            researchQuestion: inputData.originalInput.message,
            synthesisType: inputData.originalInput.synthesisType,
            outputFormat: 'structured',
            includeConflicts: true,
            confidenceThreshold: 0.6,
          }
        } as any);
        
        let citations: string[] | undefined;
        
        // Generate citations if requested
        if (inputData.originalInput.generateCitations && synthesisResult.success) {
          try {
            const citationSources = inputData.validatedResults.flatMap(sr => 
              sr.results.slice(0, 3).map(r => ({
                url: r.url,
                title: r.title,
                sourceType: 'webpage' as const,
              }))
            ).slice(0, 10);
            
            const citationResult = await citationExtractionTool.execute({
              context: {
                sources: citationSources,
                citationStyle: 'APA',
                includeInText: false,
              }
            } as any);
            
            citations = citationResult.bibliography?.APA || [];
          } catch (citationError) {
            console.error('Citation generation error:', citationError);
          }
        }
        
        // Create adapter for contentSynthesisTool response
        return {
          synthesis: {
            executiveSummary: synthesisResult.synthesis.executiveSummary,
            mainFindings: synthesisResult.synthesis.mainFindings.map(finding => ({
              finding: finding.finding,
              evidence: finding.evidence,
              confidence: finding.confidence,
              sources: finding.supportingSources // Map supportingSources to sources
            })),
            conflicts: synthesisResult.synthesis.conflicts ? synthesisResult.synthesis.conflicts.map(conflict => ({
              topic: conflict.topic,
              conflictingViews: conflict.conflictingViews.map(view => view.position), // Extract just the position strings
              resolution: conflict.resolution
            })) : [],
            citations: synthesisResult.citations || [],
            qualityAssessment: {
              overallReliability: synthesisResult.synthesis.qualityAssessment.sourceReliability,
              sourceQuality: synthesisResult.synthesis.qualityAssessment.evidenceStrength,
              evidenceStrength: synthesisResult.synthesis.qualityAssessment.evidenceStrength,
            }
          },
          citations,
          validatedResults: inputData.validatedResults,
          startTime: inputData.startTime,
          originalInput: inputData.originalInput,
        };
        
      } catch (error) {
        console.error('Synthesis error:', error);
        
        // Fallback synthesis
        const fallbackSynthesis = {
          executiveSummary: 'Research completed with limitations',
          mainFindings: [
            {
              finding: 'Limited information was found',
              evidence: 'Search process encountered errors',
              confidence: 0.5,
              sources: []
            }
          ],
          conflicts: [],
          citations: [],
          qualityAssessment: {
            overallReliability: 'Moderate',
            sourceQuality: 'Variable',
            evidenceStrength: 'Limited',
          },
        };
        
        return {
          synthesis: fallbackSynthesis,
          validatedResults: inputData.validatedResults,
          startTime: inputData.startTime,
          originalInput: inputData.originalInput,
        };
      }
    },
  }))
  
  // Step 5: Final Assembly and Quality Check
  .then(createStep({
    id: 'final-assembly',
    description: 'Assemble final research output with metadata and quality assessment',
    inputSchema: z.object({
      synthesis: SynthesisResultSchema,
      citations: z.array(z.string()).optional(),
      validatedResults: z.array(SearchResultWithAnalysisSchema),
      startTime: z.string(),
      originalInput: z.any(),
    }),
    outputSchema: z.object({
      researchPlan: z.object({
        queries: z.array(z.string()),
        complexity: z.string(),
        steps: z.number(),
      }),
      findings: SynthesisResultSchema,
      process: z.object({
        totalQueries: z.number(),
        sourcesAnalyzed: z.number(),
        iterationsCompleted: z.number(),
        validationResults: z.any().optional(),
      }),
      metadata: z.object({
        startTime: z.string(),
        endTime: z.string(),
        duration: z.string(),
        tools: z.array(z.string()),
      }),
    }),
    execute: async ({ inputData }) => {
      const endTime = new Date().toISOString();
      const startTime = new Date(inputData.startTime);
      const duration = Math.round((new Date().getTime() - startTime.getTime()) / 1000);
      
      // Count total sources analyzed
      const totalSources = inputData.validatedResults.reduce((sum, sr) => sum + sr.results.length, 0);
      
      // Include citations in synthesis if available
      if (inputData.citations && inputData.citations.length > 0) {
        inputData.synthesis.citations = inputData.citations;
      }
      
      return {
        researchPlan: {
          queries: inputData.validatedResults.map(sr => sr.query),
          complexity: inputData.originalInput.complexity,
          steps: 5, // Number of workflow steps
        },
        findings: inputData.synthesis,
        process: {
          totalQueries: inputData.validatedResults.length,
          sourcesAnalyzed: totalSources,
          iterationsCompleted: 1, // Single iteration in this workflow
          validationResults: inputData.originalInput.includeValidation ? 'completed' : 'skipped',
        },
        metadata: {
          startTime: inputData.startTime,
          endTime,
          duration: `${duration} seconds`,
          tools: [
            'braveSearchTool',
            'grokXSearchTool', 
            'sourceValidationTool',
            'contentSynthesisTool',
            'citationExtractionTool'
          ],
        },
      };
    },
  }));

// Commit the workflow
enhancedDeepResearchWorkflow.commit();