import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';

/**
 * Claude Code SDK Tool
 * ---------------------
 * Executes development commands and workflows using the official Claude Code SDK.
 * Focused on command execution, Git operations, and development workflows.
 * 
 * NOTE: Requires Claude Code to be installed globally via npm install -g @anthropic-ai/claude-code
 * or uses the locally installed version from node_modules.
 */

const claudeCodeSDKInputSchema = z.object({
  operation: z.enum(['execute', 'git', 'workflow'])
    .describe('The operation to perform: execute (run custom Claude Code command), git (Git operations), workflow (dev workflow commands)'),
  
  // General execution
  command: z.string().optional()
    .describe('The command/prompt to send to Claude Code (required for execute operation)'),
  
  // Git operations  
  gitOperation: z.enum(['status', 'diff', 'commit', 'push', 'pull', 'branch', 'merge', 'log']).optional()
    .describe('Git operation to perform'),
  commitMessage: z.string().optional()
    .describe('Commit message for commit operations'),
  branchName: z.string().optional()
    .describe('Branch name for branch operations'),
  remote: z.string().optional()
    .describe('Remote name for push/pull operations'),
  
  // Workflow operations
  workflowOperation: z.enum(['test', 'build', 'lint', 'format', 'install', 'audit']).optional()
    .describe('Development workflow operation to perform'),
  target: z.string().optional()
    .describe('Specific target for the operation'),
  options: z.string().optional()
    .describe('Additional options for the command'),
  
  // General options
  model: z.string().optional()
    .describe('AI model to use (e.g., claude-3-5-sonnet-20241022)'),
  maxTokens: z.number().optional()
    .describe('Maximum tokens for the response'),
  temperature: z.number().optional()
    .describe('Temperature for response generation'),
  workingDirectory: z.string().optional()
    .describe('Working directory for Claude Code execution'),
  timeout: z.number().optional().default(30000)
    .describe('Timeout in milliseconds'),
});

const claudeCodeSDKOutputSchema = z.object({
  operation: z.enum(['execute', 'git', 'workflow']),
  success: z.boolean(),
  data: z.object({
    explanation: z.string(),
    output: z.string().optional(),
    code: z.string().optional(),
    result: z.any().optional(),
    metadata: z.object({
      operation: z.string(),
      timestamp: z.string(),
      executionTime: z.number().optional(),
      workingDirectory: z.string().optional(),
    }).optional()
  })
});

export const claudeCodeSDKTool = createTool({
  id: 'claude-code-sdk',
  description: 'Execute development commands and workflows using Claude Code SDK. Focused on command execution, Git operations, and development workflows (test, build, lint, etc.).',
  inputSchema: claudeCodeSDKInputSchema,
  outputSchema: claudeCodeSDKOutputSchema,
  execute: async ({ context }) => {
    const { operation, timeout = 30000, workingDirectory } = context;
    
    try {
      const startTime = Date.now();
      
      let result: any;
      
      switch (operation) {
        case 'execute':
          result = await executeClaudeCode(context, timeout, workingDirectory);
          break;
        case 'git':
          result = await executeGitOperations(context, timeout, workingDirectory);
          break;
        case 'workflow':
          result = await executeWorkflow(context, timeout, workingDirectory);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        operation,
        success: true,
        data: {
          explanation: result.explanation || `${operation} operation completed successfully`,
          output: result.output,
          code: result.code,
          result: result.result,
          metadata: {
            operation,
            timestamp: new Date().toISOString(),
            executionTime,
            workingDirectory: workingDirectory || process.cwd(),
          }
        }
      };
      
    } catch (error) {
      return {
        operation,
        success: false,
        data: {
          explanation: `Failed to execute ${operation} operation`,
          result: {
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          metadata: {
            operation,
            timestamp: new Date().toISOString(),
            workingDirectory: workingDirectory || process.cwd(),
          }
        }
      };
    }
  },
});

// Helper function to execute Claude Code commands
async function executeClaudeCode(context: any, timeout: number, workingDirectory?: string): Promise<any> {
  if (!context.command) {
    throw new Error('Command is required for execute operation');
  }
  
  const args = [];
  
  // Add model if specified
  if (context.model) {
    args.push('--model', context.model);
  }
  
  // Add max tokens if specified
  if (context.maxTokens) {
    args.push('--max-tokens', context.maxTokens.toString());
  }
  
  // Add temperature if specified
  if (context.temperature) {
    args.push('--temperature', context.temperature.toString());
  }
  
  // Add print flag for non-interactive mode and the command
  args.push('-p', context.command);
  
  const result = await runClaudeCodeCommand(args, timeout, workingDirectory);
  
  return {
    explanation: 'Claude Code command executed successfully',
    output: result.output,
    result: {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    }
  };
}


// Helper function for Git operations
async function executeGitOperations(context: any, timeout: number, workingDirectory?: string): Promise<any> {
  if (!context.gitOperation) {
    throw new Error('gitOperation is required for git operation');
  }
  
  let prompt = '';
  
  switch (context.gitOperation) {
    case 'status':
      prompt = 'git status';
      break;
    case 'diff':
      prompt = 'git diff';
      break;
    case 'commit':
      prompt = context.commitMessage 
        ? `git commit -m "${context.commitMessage}"`
        : 'git commit';
      break;
    case 'push':
      prompt = context.remote 
        ? `git push ${context.remote}`
        : 'git push';
      break;
    case 'pull':
      prompt = context.remote 
        ? `git pull ${context.remote}`
        : 'git pull';
      break;
    case 'branch':
      prompt = context.branchName 
        ? `git checkout -b ${context.branchName}`
        : 'git branch';
      break;
    case 'merge':
      prompt = context.branchName 
        ? `git merge ${context.branchName}`
        : 'git status --porcelain';
      break;
    case 'log':
      prompt = 'git log --oneline -10';
      break;
  }
  
  const result = await runClaudeCodeCommand(['-p', prompt], timeout, workingDirectory);
  
  return {
    explanation: `Git ${context.gitOperation} operation completed`,
    output: result.output,
    result: {
      operation: context.gitOperation,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    }
  };
}



// Helper function for workflow operations
async function executeWorkflow(context: any, timeout: number, workingDirectory?: string): Promise<any> {
  if (!context.workflowOperation) {
    throw new Error('workflowOperation is required for workflow operation');
  }
  
  let prompt = '';
  const targetText = context.target ? ` for ${context.target}` : '';
  const optionsText = context.options ? ` with options: ${context.options}` : '';
  
  switch (context.workflowOperation) {
    case 'test':
      prompt = `Run tests${targetText}${optionsText}.`;
      break;
    case 'build':
      prompt = `Build the project${targetText}${optionsText}.`;
      break;
    case 'lint':
      prompt = `Run linting${targetText}${optionsText} and fix any issues found.`;
      break;
    case 'format':
      prompt = `Format code${targetText}${optionsText}.`;
      break;
    case 'install':
      prompt = `Install dependencies${targetText}${optionsText}.`;
      break;
    case 'audit':
      prompt = `Audit dependencies${targetText}${optionsText} for security vulnerabilities.`;
      break;
  }
  
  const result = await runClaudeCodeCommand(['-p', prompt], timeout, workingDirectory);
  
  return {
    explanation: `Workflow ${context.workflowOperation} operation completed`,
    output: result.output,
    result: {
      operation: context.workflowOperation,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    }
  };
}

// Core function to run Claude Code commands
async function runClaudeCodeCommand(args: string[], timeout: number, workingDirectory?: string): Promise<{
  output: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}> {
  return new Promise((resolve, reject) => {
    // Try to find Claude Code executable
    const claudeCodePath = findClaudeCodeExecutable();
    
    if (!claudeCodePath) {
      reject(new Error('Claude Code not found. Please install it via: npm install -g @anthropic-ai/claude-code'));
      return;
    }
    
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      reject(new Error('ANTHROPIC_API_KEY environment variable is not set. Please set it to use Claude Code.'));
      return;
    }
    
    const child = spawn(claudeCodePath, args, {
      cwd: workingDirectory || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure API key is available
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      }
    });
    
    // Close stdin to prevent interactive mode
    child.stdin?.end();
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    const timeoutId = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Claude Code command timed out after ${timeout}ms. stderr: ${stderr}`));
    }, timeout);
    
    child.on('close', (exitCode) => {
      clearTimeout(timeoutId);
      // Include both stdout and stderr in output for debugging
      const output = stdout + (stderr ? `\nstderr: ${stderr}` : '');
      resolve({
        output,
        stdout,
        stderr,
        exitCode
      });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeoutId);
      reject(new Error(`Failed to execute Claude Code: ${error.message}`));
    });
  });
}

// Helper function to find Claude Code executable
function findClaudeCodeExecutable(): string | null {
  // Check if 'claude' command is available (not 'claude-code')
  try {
    const { execSync } = require('child_process');
    const result = execSync('which claude', { encoding: 'utf8' }).trim();
    if (result) return result;
  } catch (error) {
    // Not found as 'claude'
  }
  
  // Check if installed globally as 'claude-code'
  try {
    const { execSync } = require('child_process');
    const result = execSync('which claude-code', { encoding: 'utf8' }).trim();
    if (result) return result;
  } catch (error) {
    // Not found globally
  }
  
  // Check local node_modules
  const localPath = path.join(process.cwd(), 'node_modules', '.bin', 'claude');
  try {
    require('fs').accessSync(localPath);
    return localPath;
  } catch (error) {
    // Not found locally
  }
  
  // Check alternative local path
  const altLocalPath = path.join(process.cwd(), 'node_modules', '.bin', 'claude-code');
  try {
    require('fs').accessSync(altLocalPath);
    return altLocalPath;
  } catch (error) {
    // Not found locally
  }
  
  return null;
}