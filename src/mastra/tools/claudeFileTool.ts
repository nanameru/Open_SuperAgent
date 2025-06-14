import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Claude File Tool
 * ----------------
 * Tool for reading and writing files with proper security checks.
 * This tool allows Claude to modify project files directly.
 */

const claudeFileInputSchema = z.object({
  operation: z.enum(['read', 'write', 'append', 'delete'])
    .describe('The file operation to perform'),
  
  filePath: z.string()
    .describe('The file path relative to the project root'),
  
  content: z.string().optional()
    .describe('The content to write (required for write/append operations)'),
  
  encoding: z.enum(['utf8', 'base64']).optional().default('utf8')
    .describe('File encoding'),
});

const claudeFileOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  filePath: z.string(),
  content: z.string().optional(),
  message: z.string(),
  error: z.string().optional(),
});

export const claudeFileTool = createTool({
  id: 'claude-file',
  description: 'Read, write, append, or delete files in the project. Use this tool to modify code files based on Claude suggestions.',
  inputSchema: claudeFileInputSchema,
  outputSchema: claudeFileOutputSchema,
  execute: async ({ context }) => {
    const { operation, filePath, content, encoding } = context;
    
    // Security: Ensure file path is within project directory
    const projectRoot = process.cwd();
    const absolutePath = path.resolve(projectRoot, filePath);
    
    if (!absolutePath.startsWith(projectRoot)) {
      return {
        success: false,
        operation,
        filePath,
        message: 'Security error: File path must be within project directory',
        error: 'Invalid file path'
      };
    }
    
    // Security: Prevent modification of sensitive files
    const sensitivePatterns = [
      /\.env/,
      /\.git\//,
      /node_modules\//,
      /\.mastra\/memory\.db/,
      /package-lock\.json/,
      /yarn\.lock/,
      /pnpm-lock\.yaml/
    ];
    
    if (sensitivePatterns.some(pattern => pattern.test(filePath))) {
      return {
        success: false,
        operation,
        filePath,
        message: 'Security error: Cannot modify sensitive files',
        error: 'Forbidden file'
      };
    }
    
    try {
      switch (operation) {
        case 'read': {
          const fileContent = await fs.readFile(absolutePath, encoding as BufferEncoding);
          return {
            success: true,
            operation,
            filePath,
            content: fileContent,
            message: `Successfully read file: ${filePath}`
          };
        }
        
        case 'write': {
          if (!content) {
            throw new Error('Content is required for write operation');
          }
          
          // Create directory if it doesn't exist
          const dir = path.dirname(absolutePath);
          await fs.mkdir(dir, { recursive: true });
          
          await fs.writeFile(absolutePath, content, encoding as BufferEncoding);
          return {
            success: true,
            operation,
            filePath,
            message: `Successfully wrote to file: ${filePath}`
          };
        }
        
        case 'append': {
          if (!content) {
            throw new Error('Content is required for append operation');
          }
          
          await fs.appendFile(absolutePath, content, encoding as BufferEncoding);
          return {
            success: true,
            operation,
            filePath,
            message: `Successfully appended to file: ${filePath}`
          };
        }
        
        case 'delete': {
          await fs.unlink(absolutePath);
          return {
            success: true,
            operation,
            filePath,
            message: `Successfully deleted file: ${filePath}`
          };
        }
        
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      return {
        success: false,
        operation,
        filePath,
        message: `Failed to ${operation} file`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
});