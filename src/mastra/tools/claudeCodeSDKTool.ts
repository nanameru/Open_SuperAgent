import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Claude Code SDK Tool
 * ---------------------
 * Comprehensive tool for AI-powered code assistance using Claude's code understanding
 * and generation capabilities. Provides code analysis, generation, refactoring, 
 * testing, and documentation features.
 * 
 * NOTE: The Anthropic API key must be provided via the environment variable `ANTHROPIC_API_KEY`.
 */

// Type definitions for Claude Code SDK responses
interface CodeAnalysis {
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    category: 'syntax' | 'logic' | 'performance' | 'security' | 'style';
    message: string;
    line?: number;
    column?: number;
    severity: 1 | 2 | 3 | 4 | 5;
    fixSuggestion?: string;
  }>;
  metrics: {
    linesOfCode: number;
    complexity: 'low' | 'medium' | 'high';
    maintainabilityIndex: number;
  };
  suggestions: Array<{
    type: 'improvement' | 'optimization' | 'refactor';
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

interface GeneratedCode {
  code: string;
  explanation: string;
  dependencies?: string[];
  tests?: string;
  documentation?: string;
  metadata: {
    linesOfCode: number;
    estimatedComplexity: 'low' | 'medium' | 'high';
  };
}

interface CodeReview {
  overallRating: number; // 1-10
  issues: Array<{
    type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    line?: number;
    suggestion?: string;
  }>;
  strengths: string[];
  improvements: Array<{
    category: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
  summary: string;
}

// Main input schema using union types for different operations
const claudeCodeSDKInputSchema = z.discriminatedUnion('operation', [
  // Code Analysis
  z.object({
    operation: z.literal('analyze'),
    code: z.string().min(1).describe('The code to analyze'),
    language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
    analysisType: z.enum(['syntax', 'logic', 'performance', 'security', 'style', 'comprehensive']).default('comprehensive'),
    includeMetrics: z.boolean().default(true).describe('Include code metrics in analysis'),
    generateSuggestions: z.boolean().default(true).describe('Generate improvement suggestions')
  }),
  
  // Code Generation
  z.object({
    operation: z.literal('generate'),
    specification: z.string().min(1).describe('Description of what code to generate'),
    language: z.string().describe('Target programming language'),
    style: z.enum(['functional', 'oop', 'procedural']).optional().describe('Programming style preference'),
    framework: z.string().optional().describe('Target framework (e.g., React, Express, Django)'),
    includeTests: z.boolean().default(false).describe('Generate unit tests'),
    includeDocumentation: z.boolean().default(false).describe('Generate documentation')
  }),
  
  // Code Review
  z.object({
    operation: z.literal('review'),
    code: z.string().min(1).describe('The code to review'),
    language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
    reviewType: z.enum(['comprehensive', 'security', 'performance', 'style']).default('comprehensive'),
    severity: z.enum(['low', 'medium', 'high']).default('medium').describe('Minimum severity level for issues')
  }),
  
  // Code Refactoring
  z.object({
    operation: z.literal('refactor'),
    code: z.string().min(1).describe('The code to refactor'),
    language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
    refactorType: z.enum(['optimize', 'clean', 'modernize', 'extract-function', 'rename-variables']).describe('Type of refactoring to perform'),
    target: z.enum(['performance', 'readability', 'maintainability']).optional().describe('Refactoring target')
  }),
  
  // Generate Tests
  z.object({
    operation: z.literal('generate-tests'),
    code: z.string().min(1).describe('The code to generate tests for'),
    language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
    testFramework: z.enum(['jest', 'mocha', 'pytest', 'junit', 'auto']).default('auto').describe('Test framework to use'),
    coverage: z.enum(['basic', 'edge-cases', 'comprehensive']).default('comprehensive').describe('Test coverage level')
  }),
  
  // Generate Documentation
  z.object({
    operation: z.literal('generate-docs'),
    code: z.string().min(1).describe('The code to document'),
    language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
    format: z.enum(['jsdoc', 'sphinx', 'markdown', 'inline']).default('inline').describe('Documentation format'),
    includeExamples: z.boolean().default(true).describe('Include usage examples')
  })
]);

// Output schema using union types
const claudeCodeSDKOutputSchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('analyze'),
    analysis: z.object({
      issues: z.array(z.object({
        type: z.enum(['error', 'warning', 'info']),
        category: z.enum(['syntax', 'logic', 'performance', 'security', 'style']),
        message: z.string(),
        line: z.number().optional(),
        column: z.number().optional(),
        severity: z.number().min(1).max(5),
        fixSuggestion: z.string().optional()
      })),
      metrics: z.object({
        linesOfCode: z.number(),
        complexity: z.enum(['low', 'medium', 'high']),
        maintainabilityIndex: z.number()
      }),
      suggestions: z.array(z.object({
        type: z.enum(['improvement', 'optimization', 'refactor']),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      })),
      summary: z.string()
    })
  }),
  z.object({
    operation: z.literal('generate'),
    result: z.object({
      code: z.string(),
      explanation: z.string(),
      dependencies: z.array(z.string()).optional(),
      tests: z.string().optional(),
      documentation: z.string().optional(),
      metadata: z.object({
        linesOfCode: z.number(),
        estimatedComplexity: z.enum(['low', 'medium', 'high'])
      })
    })
  }),
  z.object({
    operation: z.literal('review'),
    review: z.object({
      overallRating: z.number().min(1).max(10),
      issues: z.array(z.object({
        type: z.enum(['bug', 'security', 'performance', 'style', 'maintainability']),
        message: z.string(),
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        line: z.number().optional(),
        suggestion: z.string().optional()
      })),
      strengths: z.array(z.string()),
      improvements: z.array(z.object({
        category: z.string(),
        description: z.string(),
        priority: z.enum(['low', 'medium', 'high'])
      })),
      summary: z.string()
    })
  }),
  z.object({
    operation: z.literal('refactor'),
    result: z.object({
      code: z.string(),
      explanation: z.string(),
      changes: z.array(z.string()),
      improvementSummary: z.string()
    })
  }),
  z.object({
    operation: z.literal('generate-tests'),
    result: z.object({
      tests: z.string(),
      framework: z.string(),
      coverage: z.string(),
      explanation: z.string()
    })
  }),
  z.object({
    operation: z.literal('generate-docs'),
    result: z.object({
      documentation: z.string(),
      format: z.string(),
      sections: z.array(z.string()),
      explanation: z.string()
    })
  })
]);

export const claudeCodeSDKTool = createTool({
  id: 'claude-code-sdk',
  description: 'Comprehensive AI-powered code assistance tool using Claude Code SDK. Provides code analysis, generation, review, refactoring, testing, and documentation capabilities.',
  inputSchema: claudeCodeSDKInputSchema,
  outputSchema: claudeCodeSDKOutputSchema,
  execute: async ({ context }) => {
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set. Please provide your Anthropic API key.'
      );
    }

    const baseURL = 'https://api.anthropic.com/v1/messages';
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anthropicApiKey}`,
      'anthropic-version': '2023-06-01'
    };

    try {
      switch (context.operation) {
        case 'analyze':
          return await analyzeCode(context, headers, baseURL);
        case 'generate':
          return await generateCode(context, headers, baseURL);
        case 'review':
          return await reviewCode(context, headers, baseURL);
        case 'refactor':
          return await refactorCode(context, headers, baseURL);
        case 'generate-tests':
          return await generateTests(context, headers, baseURL);
        case 'generate-docs':
          return await generateDocumentation(context, headers, baseURL);
        default:
          throw new Error(`Unsupported operation: ${(context as any).operation}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Claude Code SDK error: ${error.message}`);
      }
      throw new Error('An unknown error occurred while processing the request.');
    }
  },
});

// Helper functions for each operation
async function analyzeCode(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert code analyzer. Analyze the provided code and return a comprehensive analysis including:
1. Issues (errors, warnings, info) with line numbers if possible
2. Code metrics (lines of code, complexity, maintainability index)
3. Improvement suggestions
4. Summary

Return the analysis in JSON format matching the expected schema.`;

  const userPrompt = `Please analyze this ${context.language || 'code'} with focus on ${context.analysisType}:

\`\`\`${context.language || ''}
${context.code}
\`\`\`

Analysis requirements:
- Include metrics: ${context.includeMetrics}
- Generate suggestions: ${context.generateSuggestions}
- Analysis type: ${context.analysisType}

Return a comprehensive analysis in JSON format.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const analysis = parseJSONResponse(response);

  return {
    operation: 'analyze' as const,
    analysis: analysis
  };
}

async function generateCode(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert code generator. Generate high-quality, production-ready code based on specifications. Include explanations, dependencies, and optionally tests and documentation.`;

  const userPrompt = `Generate ${context.language} code based on this specification:

Specification: ${context.specification}
Language: ${context.language}
Style: ${context.style || 'modern best practices'}
Framework: ${context.framework || 'none specified'}
Include tests: ${context.includeTests}
Include documentation: ${context.includeDocumentation}

Return the result in JSON format with code, explanation, dependencies, and metadata.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate' as const,
    result: result
  };
}

async function reviewCode(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert code reviewer. Provide thorough code reviews focusing on bugs, security, performance, style, and maintainability. Rate the code quality and provide actionable feedback.`;

  const userPrompt = `Review this ${context.language || 'code'} with focus on ${context.reviewType}:

\`\`\`${context.language || ''}
${context.code}
\`\`\`

Review requirements:
- Review type: ${context.reviewType}
- Minimum severity: ${context.severity}
- Include overall rating (1-10)
- Identify strengths and areas for improvement

Return a comprehensive review in JSON format.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const review = parseJSONResponse(response);

  return {
    operation: 'review' as const,
    review: review
  };
}

async function refactorCode(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert code refactoring specialist. Improve code quality while maintaining functionality. Focus on ${context.target || 'overall improvement'}.`;

  const userPrompt = `Refactor this ${context.language || 'code'} with focus on ${context.refactorType}:

\`\`\`${context.language || ''}
${context.code}
\`\`\`

Refactoring requirements:
- Type: ${context.refactorType}
- Target: ${context.target || 'overall improvement'}
- Maintain original functionality
- Explain all changes made

Return the refactored code with explanation in JSON format.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const result = parseJSONResponse(response);

  return {
    operation: 'refactor' as const,
    result: result
  };
}

async function generateTests(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert test generator. Create comprehensive unit tests with ${context.coverage} coverage using ${context.testFramework} framework.`;

  const userPrompt = `Generate tests for this ${context.language || 'code'}:

\`\`\`${context.language || ''}
${context.code}
\`\`\`

Test requirements:
- Framework: ${context.testFramework}
- Coverage level: ${context.coverage}
- Include edge cases and error scenarios
- Follow testing best practices

Return the tests with explanation in JSON format.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate-tests' as const,
    result: result
  };
}

async function generateDocumentation(context: any, headers: any, baseURL: string) {
  const systemPrompt = `You are an expert technical writer. Generate clear, comprehensive documentation in ${context.format} format.`;

  const userPrompt = `Generate documentation for this ${context.language || 'code'}:

\`\`\`${context.language || ''}
${context.code}
\`\`\`

Documentation requirements:
- Format: ${context.format}
- Include examples: ${context.includeExamples}
- Explain purpose, parameters, return values
- Include usage examples if requested

Return the documentation with explanation in JSON format.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate-docs' as const,
    result: result
  };
}

async function makeClaudeRequest(systemPrompt: string, userPrompt: string, headers: any, baseURL: string) {
  const payload = {
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [
      {
        role: 'user',
        content: `${systemPrompt}\n\n${userPrompt}`
      }
    ]
  };

  const response = await fetch(baseURL, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

function parseJSONResponse(response: string): any {
  try {
    // Try to extract JSON from code blocks first
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/```\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Try to parse the entire response as JSON
    return JSON.parse(response);
  } catch (error) {
    // If JSON parsing fails, create a structured response based on the text
    return {
      summary: response,
      rawResponse: response,
      note: 'Response was not in JSON format, returning as text summary'
    };
  }
}