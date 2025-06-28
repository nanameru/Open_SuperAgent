/**
 * Automatic compression middleware for Mastra agents
 * Provides automatic context compression similar to Cursor's implementation
 */

import { Message } from 'ai';
import { ContextManager, CompressionInfo } from './contextManager';
import { createAutoSummarizer, createLightweightSummarizer } from './aiSummarizer';

export interface CompressionEvent {
  type: 'compression-triggered' | 'compression-completed' | 'compression-failed';
  timestamp: Date;
  compressionInfo?: CompressionInfo;
  error?: Error;
}

export interface CompressionMiddlewareOptions {
  contextManager: ContextManager;
  model: string;
  enableAutoCompression?: boolean;
  compressionMode?: 'lightweight' | 'auto' | 'high-quality';
  onCompressionEvent?: (event: CompressionEvent) => void;
}

export class CompressionMiddleware {
  private contextManager: ContextManager;
  private model: string;
  private enableAutoCompression: boolean;
  private compressionMode: 'lightweight' | 'auto' | 'high-quality';
  private onCompressionEvent?: (event: CompressionEvent) => void;
  private isCompressing: boolean = false;

  constructor(options: CompressionMiddlewareOptions) {
    this.contextManager = options.contextManager;
    this.model = options.model;
    this.enableAutoCompression = options.enableAutoCompression !== false;
    this.compressionMode = options.compressionMode || 'auto';
    this.onCompressionEvent = options.onCompressionEvent;
  }

  /**
   * Check if compression is needed and trigger if necessary
   * This method should be called before sending messages to the AI model
   */
  async checkAndCompress(messages: Message[]): Promise<{
    messages: Message[];
    wasCompressed: boolean;
    compressionInfo?: CompressionInfo;
  }> {
    if (!this.enableAutoCompression || this.isCompressing) {
      return { messages, wasCompressed: false };
    }

    try {
      // Check if compression is needed
      const shouldCompress = await this.contextManager.shouldCompress(messages);
      
      if (!shouldCompress) {
        return { messages, wasCompressed: false };
      }

      this.emitEvent({
        type: 'compression-triggered',
        timestamp: new Date()
      });

      // Perform compression
      return await this.performCompression(messages);

    } catch (error) {
      console.error('Compression check failed:', error);
      this.emitEvent({
        type: 'compression-failed',
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // Return original messages if compression fails
      return { messages, wasCompressed: false };
    }
  }

  /**
   * Force compression regardless of token count
   */
  async forceCompress(messages: Message[]): Promise<{
    messages: Message[];
    wasCompressed: boolean;
    compressionInfo?: CompressionInfo;
  }> {
    if (this.isCompressing) {
      return { messages, wasCompressed: false };
    }

    try {
      this.emitEvent({
        type: 'compression-triggered',
        timestamp: new Date()
      });

      return await this.performCompression(messages);
    } catch (error) {
      console.error('Forced compression failed:', error);
      this.emitEvent({
        type: 'compression-failed',
        timestamp: new Date(),
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      return { messages, wasCompressed: false };
    }
  }

  /**
   * Perform the actual compression
   */
  private async performCompression(messages: Message[]): Promise<{
    messages: Message[];
    wasCompressed: boolean;
    compressionInfo: CompressionInfo;
  }> {
    this.isCompressing = true;

    try {
      // Create AI summarizer based on compression mode
      const aiSummarizer = this.createSummarizer();
      
      // Perform compression
      const result = await this.contextManager.compressConversation(messages, aiSummarizer);
      
      this.emitEvent({
        type: 'compression-completed',
        timestamp: new Date(),
        compressionInfo: result.compressionInfo
      });

      return {
        messages: result.compressedMessages,
        wasCompressed: true,
        compressionInfo: result.compressionInfo
      };

    } finally {
      this.isCompressing = false;
    }
  }

  /**
   * Create AI summarizer based on compression mode
   */
  private createSummarizer(): (messages: Message[]) => Promise<string> {
    switch (this.compressionMode) {
      case 'lightweight':
        return createLightweightSummarizer();
      case 'auto':
        return createAutoSummarizer(this.model);
      case 'high-quality':
        // For high-quality, use Claude if available, otherwise auto
        try {
          return createAutoSummarizer(this.model);
        } catch {
          return createLightweightSummarizer();
        }
      default:
        return createLightweightSummarizer();
    }
  }

  /**
   * Update model and reconfigure context manager
   */
  updateModel(newModel: string): void {
    this.model = newModel;
    this.contextManager.updateModel(newModel);
  }

  /**
   * Enable or disable auto compression
   */
  setAutoCompression(enabled: boolean): void {
    this.enableAutoCompression = enabled;
  }

  /**
   * Change compression mode
   */
  setCompressionMode(mode: 'lightweight' | 'auto' | 'high-quality'): void {
    this.compressionMode = mode;
  }

  /**
   * Get current compression status
   */
  getStatus(): {
    isCompressing: boolean;
    autoCompressionEnabled: boolean;
    compressionMode: string;
    model: string;
  } {
    return {
      isCompressing: this.isCompressing,
      autoCompressionEnabled: this.enableAutoCompression,
      compressionMode: this.compressionMode,
      model: this.model
    };
  }

  /**
   * Emit compression event
   */
  private emitEvent(event: CompressionEvent): void {
    if (this.onCompressionEvent) {
      try {
        this.onCompressionEvent(event);
      } catch (error) {
        console.error('Error in compression event handler:', error);
      }
    }
  }
}

/**
 * Create compression middleware with default settings
 */
export function createCompressionMiddleware(
  model: string,
  options?: Partial<CompressionMiddlewareOptions>
): CompressionMiddleware {
  const contextManager = new ContextManager({
    model,
    maxMessages: 20,
    preserveImportantMessages: true,
    enableSemanticRecall: true
  });

  return new CompressionMiddleware({
    contextManager,
    model,
    enableAutoCompression: true,
    compressionMode: 'auto',
    ...options
  });
}

/**
 * Wrapper function to integrate compression middleware with agent message processing
 */
export function withCompressionMiddleware<T extends { messages: Message[] }>(
  middleware: CompressionMiddleware
) {
  return async function(
    input: T,
    processFunction: (compressedInput: T) => Promise<any>
  ): Promise<any> {
    try {
      // Check and compress messages if needed
      const compressionResult = await middleware.checkAndCompress(input.messages);
      
      // Create modified input with potentially compressed messages
      const compressedInput = {
        ...input,
        messages: compressionResult.messages
      };

      // Process with compressed messages
      const result = await processFunction(compressedInput);

      // If compression occurred, add metadata to result
      if (compressionResult.wasCompressed && result && typeof result === 'object') {
        result._compressionInfo = compressionResult.compressionInfo;
      }

      return result;
    } catch (error) {
      console.error('Error in compression middleware wrapper:', error);
      // Fall back to original processing if compression fails
      return await processFunction(input);
    }
  };
}