import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { 
      message, 
      complexity = 'auto',
      maxIterations = 3,
      includeValidation = true,
      generateCitations = true,
      synthesisType = 'analytical'
    } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Research question is required' },
        { status: 400 }
      );
    }

    console.log('[Enhanced Deep Research API] Starting enhanced workflow with:', {
      message,
      complexity,
      maxIterations,
      includeValidation,
      generateCitations,
      synthesisType
    });

    // Execute enhanced deep research workflow
    let result;
    
    try {
      const { enhancedDeepResearchWorkflow } = await import('@/src/mastra/workflows/enhancedDeepResearchWorkflow');
      
      if (!enhancedDeepResearchWorkflow) {
        throw new Error('Enhanced Deep Research Workflow not found');
      }

      // Execute the enhanced workflow
      result = await (enhancedDeepResearchWorkflow as any).run({
        message,
        complexity,
        maxIterations,
        includeValidation,
        generateCitations,
        synthesisType
      });
      
    } catch (workflowError: any) {
      console.error('[Enhanced Deep Research API] Workflow execution failed:', workflowError);
      
      // Fallback to basic research functionality
      const { deepResearchAgent } = await import('@/src/mastra/agents/deepResearchAgent');
      
      try {
        // Use the research agent as fallback
        const agent = deepResearchAgent;
        const response = await agent.generate([{
          role: 'user',
          content: `Conduct comprehensive research on: ${message}
          
Please provide:
1. Executive summary
2. Key findings with evidence
3. Source analysis and validation
4. Knowledge gaps and limitations
${generateCitations ? '5. Proper citations in APA format' : ''}

Research complexity: ${complexity}
Synthesis type: ${synthesisType}`
        }]);
        
        result = {
          researchPlan: {
            queries: [message],
            complexity,
            steps: 1,
          },
          findings: {
            executiveSummary: response.text,
            mainFindings: [{
              finding: 'Research completed using fallback agent',
              evidence: response.text,
              confidence: 0.7,
              sources: ['Research Agent Analysis'],
            }],
            conflicts: [],
            citations: [],
            qualityAssessment: {
              overallReliability: 'Moderate',
              sourceQuality: 'Agent-based analysis',
              evidenceStrength: 'Limited',
            },
          },
          process: {
            totalQueries: 1,
            sourcesAnalyzed: 0,
            iterationsCompleted: 1,
            validationResults: 'agent-fallback',
          },
          metadata: {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: '< 1 minute',
            tools: ['deepResearchAgent'],
          },
        };
        
        console.log('[Enhanced Deep Research API] Using agent fallback');
        
      } catch (fallbackError) {
        console.error('[Enhanced Deep Research API] Agent fallback also failed:', fallbackError);
        throw new Error(`Both workflow and agent fallback failed: ${workflowError?.message || 'Unknown error'}`);
      }
    }

    // Validate result structure
    if (!result) {
      throw new Error('Workflow execution returned no result');
    }

    console.log('[Enhanced Deep Research API] Workflow completed:', {
      planQueries: result.researchPlan?.queries?.length || 0,
      findingsSummary: result.findings?.executiveSummary?.substring(0, 100) + '...',
      sourcesAnalyzed: result.process?.sourcesAnalyzed || 0,
      duration: result.metadata?.duration || 'unknown'
    });

    return NextResponse.json({
      success: true,
      result,
      enhanced: true, // Flag to indicate this is the enhanced version
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Enhanced Deep Research API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Enhanced Deep Research API] Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: 'Enhanced research workflow execution failed',
        details: errorMessage,
        type: error?.constructor?.name || 'UnknownError',
        enhanced: true,
      },
      { status: 500 }
    );
  }
}