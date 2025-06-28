/**
 * Context management configuration exports
 * Provides easy access to all context management features
 */

export { 
  TOKEN_LIMITS, 
  getTokenLimit, 
  getCompressionThreshold, 
  supportsLargeContext,
  getModelsByContextSize,
  DEFAULT_COMPRESSION_THRESHOLD,
  DEFAULT_CONTEXT_WINDOW,
  type ModelTokenLimit 
} from './tokenLimits';

export {
  ContextManager,
  type CompressionInfo,
  type ContextManagerOptions,
  type ToolCallResult
} from './contextManager';

export {
  createAISummarizer,
  createAutoSummarizer,
  createLightweightSummarizer,
  createHighQualitySummarizer,
  type SummarizerOptions
} from './aiSummarizer';

export {
  CompressionMiddleware,
  createCompressionMiddleware,
  withCompressionMiddleware,
  type CompressionEvent,
  type CompressionMiddlewareOptions
} from './compressionMiddleware';

import { createCompressionMiddleware } from './compressionMiddleware';
import { ContextManager } from './contextManager';

/**
 * Quick setup function for enabling context compression on any agent
 */
export function enableContextCompression(modelName: string, options?: {
  compressionMode?: 'lightweight' | 'auto' | 'high-quality';
  maxMessages?: number;
  enableAutoCompression?: boolean;
  enableSemanticRecall?: boolean;
}) {
  return createCompressionMiddleware(modelName, {
    enableAutoCompression: options?.enableAutoCompression !== false,
    compressionMode: options?.compressionMode || 'auto',
    contextManager: new ContextManager({
      model: modelName,
      maxMessages: options?.maxMessages || 20,
      preserveImportantMessages: true,
      enableSemanticRecall: options?.enableSemanticRecall !== false
    })
  });
}