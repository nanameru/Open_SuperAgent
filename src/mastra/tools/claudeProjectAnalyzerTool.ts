import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { claudeAnalysisTool } from './claudeAnalysisTool';

/**
 * Claude Project Analyzer Tool
 * ----------------------------
 * Analyzes the current project directory structure and provides intelligent insights
 * using Claude's analysis capabilities. Scans files, identifies patterns, and
 * provides recommendations for project architecture and organization.
 */

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  extension?: string;
  children?: FileInfo[];
}

interface ProjectAnalysis {
  structure: FileInfo;
  summary: {
    totalFiles: number;
    totalDirectories: number;
    fileTypes: Record<string, number>;
    largestFiles: Array<{ path: string; size: number }>;
  };
  insights: {
    framework: string;
    architecture: string;
    recommendations: string[];
    issues: string[];
  };
}

const claudeProjectAnalyzerInputSchema = z.object({
  operation: z.enum(['structure', 'analyze', 'summary'])
    .describe('Operation to perform: structure (scan only), analyze (with Claude insights), summary (overview stats)'),
  
  maxDepth: z.number().optional().default(3)
    .describe('Maximum directory depth to scan'),
  
  includeHidden: z.boolean().optional().default(false)
    .describe('Include hidden files and directories'),
  
  excludePaths: z.array(z.string()).optional().default([
    'node_modules', '.git', '.next', 'dist', 'build', 'coverage'
  ]).describe('Paths to exclude from scanning'),
  
  fileTypes: z.array(z.string()).optional()
    .describe('Specific file types to focus on (e.g., [".ts", ".js", ".tsx"])'),
  
  analysisType: z.enum(['architecture', 'performance', 'security', 'maintainability', 'comprehensive'])
    .optional().default('comprehensive')
    .describe('Type of analysis to perform with Claude'),
});

const claudeProjectAnalyzerOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  data: z.object({
    structure: z.any().optional(),
    summary: z.any().optional(),
    analysis: z.any().optional(),
    metadata: z.object({
      scannedAt: z.string(),
      projectRoot: z.string(),
      totalItems: z.number(),
    }),
  }),
  message: z.string(),
});

export const claudeProjectAnalyzerTool = createTool({
  id: 'claude-project-analyzer',
  description: 'Analyze project directory structure and provide intelligent insights using Claude. Scans files, identifies patterns, and provides architectural recommendations.',
  inputSchema: claudeProjectAnalyzerInputSchema,
  outputSchema: claudeProjectAnalyzerOutputSchema,
  execute: async ({ context }) => {
    const { operation, maxDepth, includeHidden, excludePaths, fileTypes, analysisType } = context;
    
    try {
      const projectRoot = process.cwd();
      
      // Step 1: Scan directory structure
      const structure = await scanDirectory(projectRoot, {
        maxDepth,
        includeHidden,
        excludePaths,
        fileTypes,
        currentDepth: 0,
      });
      
      // Step 2: Generate summary statistics
      const summary = generateSummary(structure);
      
      let analysis = null;
      
      // Step 3: Perform Claude analysis if requested
      if (operation === 'analyze') {
        const projectOverview = createProjectOverview(structure, summary);
        
        const claudeResult = await claudeAnalysisTool.execute({
          operation: 'analyze',
          code: projectOverview,
          language: 'text',
          analysisType: analysisType,
          includeMetrics: true,
          generateSuggestions: true,
        });
        
        if (claudeResult.success) {
          analysis = claudeResult.data.result;
        }
      }
      
      const result: any = {
        metadata: {
          scannedAt: new Date().toISOString(),
          projectRoot,
          totalItems: summary.totalFiles + summary.totalDirectories,
        },
      };
      
      // Include data based on operation
      switch (operation) {
        case 'structure':
          result.structure = structure;
          break;
        case 'summary':
          result.summary = summary;
          break;
        case 'analyze':
          result.structure = structure;
          result.summary = summary;
          result.analysis = analysis;
          break;
      }
      
      return {
        success: true,
        operation,
        data: result,
        message: `Successfully ${operation === 'analyze' ? 'analyzed' : 'scanned'} project structure`,
      };
      
    } catch (error) {
      return {
        success: false,
        operation,
        data: {
          metadata: {
            scannedAt: new Date().toISOString(),
            projectRoot: process.cwd(),
            totalItems: 0,
          },
        },
        message: `Failed to ${operation} project: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

// Helper function to scan directory recursively
async function scanDirectory(
  dirPath: string,
  options: {
    maxDepth: number;
    includeHidden: boolean;
    excludePaths: string[];
    fileTypes?: string[];
    currentDepth: number;
  }
): Promise<FileInfo> {
  const { maxDepth, includeHidden, excludePaths, fileTypes, currentDepth } = options;
  
  const stats = await fs.stat(dirPath);
  const name = path.basename(dirPath);
  
  // Check if this path should be excluded
  if (excludePaths.some(exclude => dirPath.includes(exclude))) {
    throw new Error('Excluded path');
  }
  
  // Check if hidden files should be included
  if (!includeHidden && name.startsWith('.')) {
    throw new Error('Hidden file/directory');
  }
  
  const fileInfo: FileInfo = {
    name,
    path: dirPath,
    type: stats.isDirectory() ? 'directory' : 'file',
  };
  
  if (stats.isFile()) {
    fileInfo.size = stats.size;
    fileInfo.extension = path.extname(name);
    
    // Filter by file types if specified
    if (fileTypes && fileTypes.length > 0) {
      if (!fileTypes.includes(fileInfo.extension)) {
        throw new Error('File type not included');
      }
    }
  }
  
  // Recurse into directories if within depth limit
  if (stats.isDirectory() && currentDepth < maxDepth) {
    try {
      const entries = await fs.readdir(dirPath);
      const children: FileInfo[] = [];
      
      for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        try {
          const child = await scanDirectory(entryPath, {
            ...options,
            currentDepth: currentDepth + 1,
          });
          children.push(child);
        } catch (error) {
          // Skip excluded/filtered items
          continue;
        }
      }
      
      fileInfo.children = children.sort((a, b) => {
        // Directories first, then files, alphabetically
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      // Can't read directory, skip children
    }
  }
  
  return fileInfo;
}

// Helper function to generate summary statistics
function generateSummary(structure: FileInfo): ProjectAnalysis['summary'] {
  let totalFiles = 0;
  let totalDirectories = 0;
  const fileTypes: Record<string, number> = {};
  const allFiles: Array<{ path: string; size: number }> = [];
  
  function traverse(item: FileInfo) {
    if (item.type === 'file') {
      totalFiles++;
      if (item.extension) {
        fileTypes[item.extension] = (fileTypes[item.extension] || 0) + 1;
      }
      if (item.size) {
        allFiles.push({ path: item.path, size: item.size });
      }
    } else {
      totalDirectories++;
    }
    
    if (item.children) {
      item.children.forEach(traverse);
    }
  }
  
  traverse(structure);
  
  // Get largest files (top 10)
  const largestFiles = allFiles
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);
  
  return {
    totalFiles,
    totalDirectories,
    fileTypes,
    largestFiles,
  };
}

// Helper function to create project overview for Claude analysis
function createProjectOverview(structure: FileInfo, summary: ProjectAnalysis['summary']): string {
  const fileTypesList = Object.entries(summary.fileTypes)
    .sort((a, b) => b[1] - a[1])
    .map(([ext, count]) => `${ext}: ${count} files`)
    .join(', ');
  
  const largestFilesList = summary.largestFiles
    .map(file => `${file.path} (${Math.round(file.size / 1024)}KB)`)
    .join('\n');
  
  function createStructureText(item: FileInfo, indent = 0): string {
    const prefix = '  '.repeat(indent);
    let result = `${prefix}${item.type === 'directory' ? '📁' : '📄'} ${item.name}`;
    
    if (item.type === 'file' && item.size) {
      result += ` (${Math.round(item.size / 1024)}KB)`;
    }
    
    result += '\n';
    
    if (item.children) {
      // Limit depth in overview to keep it manageable
      if (indent < 2) {
        for (const child of item.children.slice(0, 10)) { // Limit items per directory
          result += createStructureText(child, indent + 1);
        }
        if (item.children.length > 10) {
          result += `${'  '.repeat(indent + 1)}... and ${item.children.length - 10} more items\n`;
        }
      }
    }
    
    return result;
  }
  
  return `# Project Structure Analysis

## Project Overview
- **Root Directory**: ${structure.path}
- **Total Files**: ${summary.totalFiles}
- **Total Directories**: ${summary.totalDirectories}

## File Types Distribution
${fileTypesList}

## Directory Structure
${createStructureText(structure)}

## Largest Files
${largestFilesList}

## Analysis Request
Please analyze this project structure and provide insights on:
1. **Framework Detection**: What framework/technology stack is being used?
2. **Architecture Pattern**: What architectural patterns are evident?
3. **Organization**: How well is the project organized?
4. **Recommendations**: What improvements could be made?
5. **Potential Issues**: Any structural concerns or anti-patterns?

Focus on identifying the main technology stack, architectural decisions, and providing actionable recommendations for improving the project structure.`;
}