/**
 * Context Manager for AI Agent conversations
 * Provides AI-driven summarization and compression similar to Cursor's approach
 */

import { Message } from 'ai';
import { 
  getTokenLimit, 
  getCompressionThreshold, 
  DEFAULT_COMPRESSION_THRESHOLD,
  DEFAULT_CONTEXT_WINDOW 
} from './tokenLimits';

export interface CompressionInfo {
  originalTokenCount: number;
  newTokenCount: number;
  compressionRatio: number;
  timestamp: Date;
}

export interface ContextManagerOptions {
  model: string;
  compressionThreshold?: number;
  maxMessages?: number;
  preserveImportantMessages?: boolean;
  enableSemanticRecall?: boolean;
}

export interface ToolCallResult {
  toolName: string;
  input: any;
  output: any;
  timestamp: Date;
  tokenCount?: number;
}

export class ContextManager {
  private model: string;
  private compressionThreshold: number;
  private maxMessages: number;
  private preserveImportantMessages: boolean;
  private enableSemanticRecall: boolean;

  // Important tool calls that should be preserved during compression
  private static readonly IMPORTANT_TOOLS = [
    'htmlSlideTool',
    'webSearchTool',
    'geminiImageGenerationTool',
    'geminiVideoGenerationTool',
    'imagen4GenerationTool',
    'graphicRecordingTool',
    'minimaxTTSTool'
  ];

  constructor(options: ContextManagerOptions) {
    this.model = options.model;
    this.compressionThreshold = options.compressionThreshold || DEFAULT_COMPRESSION_THRESHOLD;
    this.maxMessages = options.maxMessages || 20;
    this.preserveImportantMessages = options.preserveImportantMessages !== false;
    this.enableSemanticRecall = options.enableSemanticRecall || false;
  }

  /**
   * Estimate token count for messages (simple heuristic)
   * In production, this should use the actual model's tokenizer
   */
  private estimateTokenCount(messages: Message[]): number {
    let totalTokens = 0;
    
    for (const message of messages) {
      const content = message.content as any;
      
      if (typeof content === 'string') {
        // Rough estimation: ~4 characters per token for most models
        totalTokens += Math.ceil(content.length / 4);
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part?.type === 'text' && part?.text) {
            totalTokens += Math.ceil(part.text.length / 4);
          } else if (part?.type === 'tool-call' || part?.type === 'tool-result') {
            // Tool calls/results are typically more token-dense
            const jsonString = JSON.stringify(part);
            totalTokens += Math.ceil(jsonString.length / 3);
          }
        }
      }
      
      // Add tokens for role and metadata
      totalTokens += 10;
    }
    
    return totalTokens;
  }

  /**
   * Get context window limit for the current model
   */
  private getContextLimit(): number {
    const limit = getTokenLimit(this.model);
    return limit?.contextWindow || DEFAULT_CONTEXT_WINDOW;
  }

  /**
   * Check if compression is needed based on token count
   */
  async shouldCompress(messages: Message[], force: boolean = false): Promise<boolean> {
    if (force) return true;
    
    if (messages.length === 0) return false;

    const tokenCount = this.estimateTokenCount(messages);
    const threshold = getCompressionThreshold(this.model);
    
    if (!threshold) {
      // Fallback to manual calculation
      const contextLimit = this.getContextLimit();
      return tokenCount > (contextLimit * this.compressionThreshold);
    }
    
    return tokenCount > threshold;
  }

  /**
   * Extract important messages that should be preserved during compression
   */
  private extractImportantMessages(messages: Message[]): {
    important: Message[];
    regular: Message[];
  } {
    if (!this.preserveImportantMessages) {
      return { important: [], regular: messages };
    }

    const important: Message[] = [];
    const regular: Message[] = [];
    
    // Always preserve the last few messages
    const recentCount = Math.min(3, messages.length);
    const recentMessages = messages.slice(-recentCount);
    
    for (const message of messages) {
      let isImportant = false;
      
      // Check if message is in recent messages
      if (recentMessages.includes(message)) {
        isImportant = true;
      }
      
      // Check for important tool calls
      const content = message.content as any;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part?.type === 'tool-call' && 
              part?.toolName && 
              ContextManager.IMPORTANT_TOOLS.includes(part.toolName)) {
            isImportant = true;
            break;
          }
        }
      }
      
      // Check for error messages or critical information
      if (typeof message.content === 'string') {
        const content = message.content.toLowerCase();
        if (content.includes('error') || 
            content.includes('failed') || 
            content.includes('generated') ||
            content.includes('created')) {
          isImportant = true;
        }
      }
      
      if (isImportant) {
        important.push(message);
      } else {
        regular.push(message);
      }
    }
    
    return { important, regular };
  }

  /**
   * Generate summary of conversation history using AI
   * This method can be overridden to use actual AI models
   */
  private async generateSummary(messages: Message[], aiSummarizer?: (messages: Message[]) => Promise<string>): Promise<string> {
    if (aiSummarizer) {
      try {
        return await aiSummarizer(messages);
      } catch (error) {
        console.warn('AI summarization failed, falling back to simple summary:', error);
      }
    }
    
    // Fallback to rule-based summary
    const { important, regular } = this.extractImportantMessages(messages);
    
    let summary = "=== 会話要約 ===\n";
    
    // Count different types of interactions
    let userMessages = 0;
    let toolCalls = 0;
    let generatedContent = 0;
    
    for (const message of regular) {
      if (message.role === 'user') userMessages++;
      
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'tool-call') toolCalls++;
        }
      }
      
      if (typeof message.content === 'string' && 
          (message.content.includes('generated') || message.content.includes('created'))) {
        generatedContent++;
      }
    }
    
    summary += `ユーザーメッセージ: ${userMessages}件\n`;
    summary += `ツール実行: ${toolCalls}件\n`;
    summary += `生成コンテンツ: ${generatedContent}件\n`;
    
    // Add key topics discussed
    const topics = new Set<string>();
    for (const message of regular) {
      if (typeof message.content === 'string') {
        const content = message.content.toLowerCase();
        if (content.includes('slide') || content.includes('presentation')) topics.add('プレゼンテーション作成');
        if (content.includes('search') || content.includes('検索')) topics.add('情報検索');
        if (content.includes('image') || content.includes('画像')) topics.add('画像生成');
        if (content.includes('video') || content.includes('動画')) topics.add('動画生成');
        if (content.includes('browser') || content.includes('ブラウザ')) topics.add('ブラウザ自動化');
      }
    }
    
    if (topics.size > 0) {
      summary += `主なトピック: ${Array.from(topics).join(', ')}\n`;
    }
    
    summary += "\n重要な情報は以下のメッセージで保持されています。";
    
    return summary;
  }

  /**
   * Compress conversation history to fit within token limits
   */
  async compressConversation(
    messages: Message[], 
    aiSummarizer?: (messages: Message[]) => Promise<string>
  ): Promise<{
    compressedMessages: Message[];
    compressionInfo: CompressionInfo;
  }> {
    const originalTokenCount = this.estimateTokenCount(messages);
    
    if (messages.length === 0) {
      return {
        compressedMessages: [],
        compressionInfo: {
          originalTokenCount: 0,
          newTokenCount: 0,
          compressionRatio: 1,
          timestamp: new Date()
        }
      };
    }

    const { important, regular } = this.extractImportantMessages(messages);
    
    // Generate summary of regular messages
    const summary = await this.generateSummary(regular, aiSummarizer);
    
    // Create compressed message history
    const compressedMessages: Message[] = [];
    
    // Add summary as the first message
    if (regular.length > 0) {
      compressedMessages.push({
        id: `summary-${Date.now()}`,
        role: 'assistant',
        content: summary
      });
    }
    
    // Add important messages
    compressedMessages.push(...important);
    
    const newTokenCount = this.estimateTokenCount(compressedMessages);
    const compressionRatio = originalTokenCount > 0 ? newTokenCount / originalTokenCount : 1;
    
    return {
      compressedMessages,
      compressionInfo: {
        originalTokenCount,
        newTokenCount,
        compressionRatio,
        timestamp: new Date()
      }
    };
  }

  /**
   * Filter tool results to keep only important ones
   */
  filterToolResults(toolResults: ToolCallResult[]): ToolCallResult[] {
    return toolResults.filter(result => {
      // Keep important tools
      if (ContextManager.IMPORTANT_TOOLS.includes(result.toolName)) {
        return true;
      }
      
      // Keep small results (less than ~250 tokens)
      const outputString = JSON.stringify(result.output);
      const estimatedTokens = Math.ceil(outputString.length / 4);
      
      return estimatedTokens < 250;
    });
  }

  /**
   * Get memory configuration for Mastra agents
   */
  getMemoryConfig() {
    return {
      lastMessages: this.maxMessages,
      semanticRecall: false, // Disable semantic recall to avoid vector store requirement
      threads: {
        generateTitle: true,
      },
      // Custom compression settings could be added here
      compressionEnabled: true,
      compressionThreshold: this.compressionThreshold,
    };
  }

  /**
   * Update model and recalculate limits
   */
  updateModel(newModel: string): void {
    this.model = newModel;
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextManagerOptions {
    return {
      model: this.model,
      compressionThreshold: this.compressionThreshold,
      maxMessages: this.maxMessages,
      preserveImportantMessages: this.preserveImportantMessages,
      enableSemanticRecall: this.enableSemanticRecall,
    };
  }
}