import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Claude Analysis Tool
 * --------------------
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

// Simplified input schema
const claudeAnalysisInputSchema = z.object({
  operation: z.enum(['analyze', 'generate', 'review', 'refactor', 'generate-tests', 'generate-docs', 'analyze-project'])
    .describe('The operation to perform: analyze (code analysis), generate (code generation), review (code review), refactor (code improvement), generate-tests (test generation), generate-docs (documentation generation), or analyze-project (project structure analysis)'),
  
  // Common fields
  code: z.string().optional().describe('The code to analyze/review/refactor/test/document (required for analyze, review, refactor, generate-tests, generate-docs)'),
  language: z.string().optional().describe('Programming language (auto-detected if not provided)'),
  
  // Generation specific
  specification: z.string().optional().describe('Description of what code to generate (required for generate operation)'),
  
  // Analysis specific
  analysisType: z.enum(['syntax', 'logic', 'performance', 'security', 'style', 'comprehensive']).optional().default('comprehensive'),
  includeMetrics: z.boolean().optional().default(true),
  generateSuggestions: z.boolean().optional().default(true),
  
  // Generation specific
  style: z.enum(['functional', 'oop', 'procedural']).optional(),
  framework: z.string().optional(),
  includeTests: z.boolean().optional().default(false),
  includeDocumentation: z.boolean().optional().default(false),
  
  // Review specific
  reviewType: z.enum(['comprehensive', 'security', 'performance', 'style']).optional().default('comprehensive'),
  severity: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  
  // Refactor specific
  refactorType: z.enum(['optimize', 'clean', 'modernize', 'extract-function', 'rename-variables']).optional(),
  target: z.enum(['performance', 'readability', 'maintainability']).optional(),
  
  // Test generation specific
  testFramework: z.enum(['jest', 'mocha', 'pytest', 'junit', 'auto']).optional().default('auto'),
  coverage: z.enum(['basic', 'edge-cases', 'comprehensive']).optional().default('comprehensive'),
  
  // Documentation specific
  format: z.enum(['jsdoc', 'sphinx', 'markdown', 'inline']).optional().default('inline'),
  includeExamples: z.boolean().optional().default(true),
  
  // Project analysis specific
  projectPath: z.string().optional().describe('Path to project directory (defaults to current directory)'),
  maxDepth: z.number().optional().default(3).describe('Maximum directory depth to scan'),
  excludePaths: z.array(z.string()).optional().default(['node_modules', '.git', '.next', 'dist', 'build'])
    .describe('Paths to exclude from project analysis'),
});

// Unified output schema (following webSearchTool pattern)
const claudeAnalysisOutputSchema = z.object({
  operation: z.enum(['analyze', 'generate', 'review', 'refactor', 'generate-tests', 'generate-docs', 'analyze-project']),
  success: z.boolean(),
  data: z.object({
    explanation: z.string(),
    code: z.string().optional(),
    result: z.any().optional(), // Flexible data structure for different operations
    metadata: z.object({
      operation: z.string(),
      timestamp: z.string(),
      processingTime: z.number().optional()
    }).optional()
  })
});

export const claudeAnalysisTool = createTool({
  id: 'claude-analysis',
  description: 'Comprehensive AI-powered code assistance tool using Claude. Provides code analysis, generation, review, refactoring, testing, and documentation capabilities.',
  inputSchema: claudeAnalysisInputSchema,
  outputSchema: claudeAnalysisOutputSchema,
  execute: async ({ context }) => {
    const { operation } = context;
    
    // Validate required fields based on operation
    if (operation === 'generate' && !context.specification) {
      throw new Error('The "specification" field is required for the generate operation.');
    }
    
    if (['analyze', 'review', 'refactor', 'generate-tests', 'generate-docs'].includes(operation) && !context.code) {
      throw new Error(`The "code" field is required for the ${operation} operation.`);
    }

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey || anthropicApiKey.trim() === '') {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not set or empty. Please provide your Anthropic API key.'
      );
    }

    const baseURL = 'https://api.anthropic.com/v1/messages';
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01'
    };

    try {
      switch (operation) {
        case 'analyze':
          return await analyzeCode(context, headers, baseURL, anthropicApiKey);
        case 'generate':
          return await generateCode(context, headers, baseURL, anthropicApiKey);
        case 'review':
          return await reviewCode(context, headers, baseURL, anthropicApiKey);
        case 'refactor':
          return await refactorCode(context, headers, baseURL, anthropicApiKey);
        case 'generate-tests':
          return await generateTests(context, headers, baseURL, anthropicApiKey);
        case 'generate-docs':
          return await generateDocumentation(context, headers, baseURL, anthropicApiKey);
        case 'analyze-project':
          return await analyzeProject(context, headers, baseURL, anthropicApiKey);
        default:
          throw new Error(
            `Unsupported operation: "${operation}". ` +
            'Please use one of: analyze, generate, review, refactor, generate-tests, generate-docs, analyze-project'
          );
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
async function analyzeCode(context: any, headers: any, baseURL: string, apiKey: string) {
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

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const analysis = parseJSONResponse(response);

  return {
    operation: 'analyze' as const,
    success: true,
    data: {
      explanation: 'Code analysis completed successfully',
      result: analysis,
      metadata: {
        operation: 'analyze',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function generateCode(context: any, headers: any, baseURL: string, apiKey: string) {
  const systemPrompt = `You are an expert code generator. Generate high-quality, production-ready code based on specifications. Include explanations, dependencies, and optionally tests and documentation.`;

  const userPrompt = `Generate ${context.language} code based on this specification:

Specification: ${context.specification}
Language: ${context.language}
Style: ${context.style || 'modern best practices'}
Framework: ${context.framework || 'none specified'}
Include tests: ${context.includeTests}
Include documentation: ${context.includeDocumentation}

Return the result in JSON format with code, explanation, dependencies, and metadata.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate' as const,
    success: true,
    data: {
      explanation: result.explanation || 'Code generation completed successfully',
      code: result.code,
      result: result,
      metadata: {
        operation: 'generate',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function reviewCode(context: any, headers: any, baseURL: string, apiKey: string) {
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

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const review = parseJSONResponse(response);

  return {
    operation: 'review' as const,
    success: true,
    data: {
      explanation: 'Code review completed successfully',
      result: review,
      metadata: {
        operation: 'review',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function refactorCode(context: any, headers: any, baseURL: string, apiKey: string) {
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

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const result = parseJSONResponse(response);

  return {
    operation: 'refactor' as const,
    success: true,
    data: {
      explanation: result.explanation || 'Code refactoring completed successfully',
      code: result.code,
      result: result,
      metadata: {
        operation: 'refactor',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function generateTests(context: any, headers: any, baseURL: string, apiKey: string) {
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

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate-tests' as const,
    success: true,
    data: {
      explanation: result.explanation || 'Test generation completed successfully',
      code: result.tests,
      result: result,
      metadata: {
        operation: 'generate-tests',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function generateDocumentation(context: any, headers: any, baseURL: string, apiKey: string) {
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

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const result = parseJSONResponse(response);

  return {
    operation: 'generate-docs' as const,
    success: true,
    data: {
      explanation: result.explanation || 'Documentation generation completed successfully',
      code: result.documentation,
      result: result,
      metadata: {
        operation: 'generate-docs',
        timestamp: new Date().toISOString()
      }
    }
  };
}

async function makeClaudeRequest(systemPrompt: string, userPrompt: string, headers: any, baseURL: string, apiKey?: string) {
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
    console.error('Anthropic API Error Details:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 12) + '...' : 'Not provided'
    });
    throw new Error(`Anthropic API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

async function analyzeProject(context: any, headers: any, baseURL: string, apiKey: string) {
  const fs = require('fs').promises;
  const path = require('path');
  
  const projectPath = context.projectPath || process.cwd();
  const maxDepth = context.maxDepth || 3;
  const excludePaths = context.excludePaths || ['node_modules', '.git', '.next', 'dist', 'build'];
  
  // Scan project structure
  async function scanDirectory(dirPath: string, currentDepth: number = 0): Promise<string> {
    if (currentDepth >= maxDepth) return '';
    
    try {
      const items = await fs.readdir(dirPath);
      let structure = '';
      
      for (const item of items) {
        if (excludePaths.some((exclude: string) => item.includes(exclude))) continue;
        
        const fullPath = path.join(dirPath, item);
        const stat = await fs.stat(fullPath);
        const indent = '  '.repeat(currentDepth);
        
        if (stat.isDirectory()) {
          structure += `${indent}📁 ${item}/\n`;
          structure += await scanDirectory(fullPath, currentDepth + 1);
        } else {
          const ext = path.extname(item);
          structure += `${indent}📄 ${item}\n`;
        }
      }
      
      return structure;
    } catch (error) {
      return '';
    }
  }
  
  const projectStructure = await scanDirectory(projectPath);
  
  const systemPrompt = `You are an expert project architect and code analyst. Analyze the provided project structure and provide comprehensive insights about the project's architecture, technology stack, organization, and recommendations for improvement.`;

  const userPrompt = `Analyze this project structure:

## Project Structure
\`\`\`
${projectStructure}
\`\`\`

Please provide analysis on:
1. **Technology Stack**: What frameworks, libraries, and tools are being used?
2. **Architecture Pattern**: What architectural patterns are evident?
3. **Project Organization**: How well is the project structured?
4. **Strengths**: What are the project's architectural strengths?
5. **Recommendations**: What improvements could be made?
6. **Potential Issues**: Any structural concerns or anti-patterns?

Return the analysis in JSON format with structured insights.`;

  const response = await makeClaudeRequest(systemPrompt, userPrompt, headers, baseURL, apiKey);
  const analysis = parseJSONResponse(response);

  return {
    operation: 'analyze-project' as const,
    success: true,
    data: {
      explanation: 'Project structure analysis completed successfully',
      result: analysis,
      metadata: {
        operation: 'analyze-project',
        timestamp: new Date().toISOString(),
        projectPath,
        scannedDepth: maxDepth,
        excludedPaths: excludePaths
      }
    }
  };
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