import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { claudeAnalysisTool } from './claudeAnalysisTool';
import { claudeFileTool } from './claudeFileTool';

/**
 * Claude Auto Edit Tool
 * ---------------------
 * Combines Claude analysis capabilities with file editing functionality.
 * This tool can analyze code and directly apply suggested changes.
 */

const claudeAutoEditInputSchema = z.object({
  operation: z.enum(['analyze-and-fix', 'refactor-and-apply', 'generate-and-save'])
    .describe('The operation to perform with automatic file modification'),
  
  filePath: z.string()
    .describe('The file path to read/modify (relative to project root)'),
  
  specification: z.string().optional()
    .describe('For generate-and-save: Description of what code to generate'),
  
  analysisType: z.enum(['syntax', 'logic', 'performance', 'security', 'style', 'comprehensive'])
    .optional().default('comprehensive'),
  
  refactorType: z.enum(['optimize', 'clean', 'modernize', 'extract-function', 'rename-variables'])
    .optional(),
  
  autoApply: z.boolean().optional().default(true)
    .describe('Whether to automatically apply the suggested changes'),
  
  backupOriginal: z.boolean().optional().default(true)
    .describe('Whether to create a backup of the original file'),
});

const claudeAutoEditOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  filePath: z.string(),
  analysis: z.any().optional(),
  originalCode: z.string().optional(),
  modifiedCode: z.string().optional(),
  backupPath: z.string().optional(),
  message: z.string(),
  error: z.string().optional(),
});

export const claudeAutoEditTool = createTool({
  id: 'claude-auto-edit',
  description: 'Analyze, refactor, or generate code with automatic file modification. Combines Claude AI assistance with direct file editing.',
  inputSchema: claudeAutoEditInputSchema,
  outputSchema: claudeAutoEditOutputSchema,
  execute: async ({ context, runtimeContext }) => {
    const { operation, filePath, specification, analysisType, refactorType, autoApply, backupOriginal } = context;
    
    try {
      // Step 1: Read the original file (except for generate-and-save)
      let originalCode = '';
      if (operation !== 'generate-and-save') {
        const readResult = await claudeFileTool.execute({
          context: {
            operation: 'read',
            filePath,
            encoding: 'utf8'
          },
          runtimeContext
        });
        
        if (!readResult.success) {
          return {
            success: false,
            operation,
            filePath,
            message: `Failed to read file: ${readResult.message || 'Unknown error'}`,
            error: readResult.error
          };
        }
        
        originalCode = readResult.content || '';
      }
      
      // Step 2: Process with Claude Code SDK
      let claudeResult: any;
      let modifiedCode = '';
      
      switch (operation) {
        case 'analyze-and-fix': {
          // First analyze the code
          const analysisResult = await claudeAnalysisTool.execute({
            context: {
              operation: 'analyze',
              code: originalCode,
              language: getLanguageFromPath(filePath),
              analysisType,
              includeMetrics: true,
              generateSuggestions: true,
              specification: undefined,
              style: undefined,
              framework: undefined,
              includeTests: false,
              includeDocumentation: false,
              reviewType: 'comprehensive',
              severity: 'medium',
              refactorType: undefined,
              target: undefined,
              testFramework: 'auto',
              coverage: 'comprehensive',
              format: 'inline',
              includeExamples: true,
              projectPath: undefined,
              maxDepth: 3,
              excludePaths: ['node_modules', '.git', '.next', 'dist', 'build']
            },
            runtimeContext
          });
          
          if (!analysisResult.success) {
            throw new Error('Code analysis failed');
          }
          
          // Then refactor based on the analysis
          const refactorResult = await claudeAnalysisTool.execute({
            context: {
              operation: 'refactor',
              code: originalCode,
              language: getLanguageFromPath(filePath),
              refactorType: 'clean',
              target: 'maintainability',
              specification: undefined,
              analysisType: 'comprehensive',
              includeMetrics: true,
              generateSuggestions: true,
              style: undefined,
              framework: undefined,
              includeTests: false,
              includeDocumentation: false,
              reviewType: 'comprehensive',
              severity: 'medium',
              testFramework: 'auto',
              coverage: 'comprehensive',
              format: 'inline',
              includeExamples: true,
              projectPath: undefined,
              maxDepth: 3,
              excludePaths: ['node_modules', '.git', '.next', 'dist', 'build']
            },
            runtimeContext
          });
          
          if (!refactorResult.success || !refactorResult.data.code) {
            throw new Error('Code refactoring failed');
          }
          
          claudeResult = analysisResult.data.result;
          modifiedCode = refactorResult.data.code;
          break;
        }
        
        case 'refactor-and-apply': {
          const refactorResult = await claudeAnalysisTool.execute({
            context: {
              operation: 'refactor',
              code: originalCode,
              language: getLanguageFromPath(filePath),
              refactorType: refactorType || 'clean',
              target: 'maintainability',
              specification: undefined,
              analysisType: 'comprehensive',
              includeMetrics: true,
              generateSuggestions: true,
              style: undefined,
              framework: undefined,
              includeTests: false,
              includeDocumentation: false,
              reviewType: 'comprehensive',
              severity: 'medium',
              testFramework: 'auto',
              coverage: 'comprehensive',
              format: 'inline',
              includeExamples: true,
              projectPath: undefined,
              maxDepth: 3,
              excludePaths: ['node_modules', '.git', '.next', 'dist', 'build']
            },
            runtimeContext
          });
          
          if (!refactorResult.success || !refactorResult.data.code) {
            throw new Error('Code refactoring failed');
          }
          
          claudeResult = refactorResult.data.result;
          modifiedCode = refactorResult.data.code;
          break;
        }
        
        case 'generate-and-save': {
          if (!specification) {
            throw new Error('Specification is required for generate-and-save operation');
          }
          
          const generateResult = await claudeAnalysisTool.execute({
            context: {
              operation: 'generate',
              specification,
              language: getLanguageFromPath(filePath),
              includeTests: false,
              includeDocumentation: true,
              code: undefined,
              analysisType: 'comprehensive',
              includeMetrics: true,
              generateSuggestions: true,
              style: undefined,
              framework: undefined,
              reviewType: 'comprehensive',
              severity: 'medium',
              refactorType: undefined,
              target: undefined,
              testFramework: 'auto',
              coverage: 'comprehensive',
              format: 'inline',
              includeExamples: true,
              projectPath: undefined,
              maxDepth: 3,
              excludePaths: ['node_modules', '.git', '.next', 'dist', 'build']
            },
            runtimeContext
          });
          
          if (!generateResult.success || !generateResult.data.code) {
            throw new Error('Code generation failed');
          }
          
          claudeResult = generateResult.data.result;
          modifiedCode = generateResult.data.code;
          break;
        }
      }
      
      // Step 3: Apply changes if autoApply is true
      let backupPath: string | undefined;
      
      if (autoApply && modifiedCode) {
        // Create backup if requested and file exists
        if (backupOriginal && originalCode) {
          backupPath = `${filePath}.backup.${Date.now()}`;
          await claudeFileTool.execute({
            context: {
              operation: 'write',
              filePath: backupPath,
              content: originalCode,
              encoding: 'utf8',
            },
            runtimeContext
          });
        }
        
        // Write the modified code
        const writeResult = await claudeFileTool.execute({
          context: {
            operation: 'write',
            filePath,
            content: modifiedCode,
            encoding: 'utf8',
          },
          runtimeContext
        });
        
        if (!writeResult.success) {
          throw new Error(`Failed to write file: ${writeResult.message || 'Unknown error'}`);
        }
      }
      
      return {
        success: true,
        operation,
        filePath,
        analysis: claudeResult,
        originalCode: originalCode || undefined,
        modifiedCode,
        backupPath,
        message: autoApply 
          ? `Successfully ${operation} and updated ${filePath}` 
          : `Successfully ${operation} (changes not applied)`
      };
      
    } catch (error) {
      return {
        success: false,
        operation,
        filePath,
        message: `Failed to ${operation}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
});

// Helper function to detect language from file extension
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'css': 'css',
    'scss': 'scss',
    'html': 'html',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
  };
  
  return languageMap[ext || ''] || 'text';
}