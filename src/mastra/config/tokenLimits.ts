/**
 * Token limits for different AI models
 * Based on official documentation and API specifications
 * Updated: 2025-06-27
 */

export interface ModelTokenLimit {
  contextWindow: number;
  maxOutput?: number;
  description?: string;
}

export const TOKEN_LIMITS: Record<string, ModelTokenLimit> = {
  // OpenAI GPT-4.1 Series (100万トークン級)
  'gpt-4.1': {
    contextWindow: 1_000_000,
    maxOutput: 32_000,
    description: 'GPT-4.1 with 1M context window'
  },
  'gpt-4.1-mini': {
    contextWindow: 1_000_000,
    maxOutput: 16_000,
    description: 'GPT-4.1 mini with 1M context window'
  },
  'gpt-4.1-nano': {
    contextWindow: 1_000_000,
    maxOutput: 8_000,
    description: 'GPT-4.1 nano with 1M context window'
  },
  
  // OpenAI o-Series (20万トークン級)
  'o3': {
    contextWindow: 200_000,
    maxOutput: 100_000,
    description: 'OpenAI o3 with 200k context window'
  },
  'o3-pro': {
    contextWindow: 200_000,
    maxOutput: 100_000,
    description: 'OpenAI o3 Pro with 200k context window'
  },
  'o3-pro-2025-06-10': {
    contextWindow: 200_000,
    maxOutput: 100_000,
    description: 'OpenAI o3 Pro (2025-06-10) with 200k context window'
  },
  'o4-mini': {
    contextWindow: 200_000,
    maxOutput: 32_000,
    description: 'OpenAI o4-mini with 200k context window'
  },
  
  // Anthropic Claude 4 Series (20万トークン級)
  'claude-4-opus': {
    contextWindow: 200_000,
    maxOutput: 8_000,
    description: 'Claude 4 Opus with 200k context window'
  },
  'claude-4-sonnet': {
    contextWindow: 200_000,
    maxOutput: 8_000,
    description: 'Claude 4 Sonnet with 200k context window'
  },
  
  // Google Gemini 2.5 Series (100万トークン級)
  'gemini-2.5-pro': {
    contextWindow: 1_000_000,
    maxOutput: 8_000,
    description: 'Gemini 2.5 Pro with 1M context window (2M planned)'
  },
  'gemini-2.5-flash': {
    contextWindow: 1_048_576,
    maxOutput: 8_000,
    description: 'Gemini 2.5 Flash with 1,048,576 context window'
  },
  'gemini-2.5-flash-lite': {
    contextWindow: 1_000_000,
    maxOutput: 8_000,
    description: 'Gemini 2.5 Flash-Lite with 1M context window'
  },
  
  // Current Gemini Models (from the project)
  'gemini-2.0-flash-exp': {
    contextWindow: 1_048_576,
    maxOutput: 8_000,
    description: 'Gemini 2.0 Flash Experimental with 1,048,576 context window'
  },
  'gemini-1.5-pro': {
    contextWindow: 2_097_152,
    maxOutput: 8_000,
    description: 'Gemini 1.5 Pro with 2M context window'
  },
  'gemini-1.5-flash': {
    contextWindow: 1_048_576,
    maxOutput: 8_000,
    description: 'Gemini 1.5 Flash with 1,048,576 context window'
  },
  
  // Legacy OpenAI Models
  'gpt-4': {
    contextWindow: 128_000,
    maxOutput: 4_000,
    description: 'GPT-4 with 128k context window'
  },
  'gpt-4-turbo': {
    contextWindow: 128_000,
    maxOutput: 4_000,
    description: 'GPT-4 Turbo with 128k context window'
  },
  'gpt-4o': {
    contextWindow: 128_000,
    maxOutput: 16_000,
    description: 'GPT-4o with 128k context window'
  },
  'gpt-4o-mini': {
    contextWindow: 128_000,
    maxOutput: 16_000,
    description: 'GPT-4o mini with 128k context window'
  },
  
  // Legacy Claude Models
  'claude-3-5-sonnet': {
    contextWindow: 200_000,
    maxOutput: 8_000,
    description: 'Claude 3.5 Sonnet with 200k context window'
  },
  'claude-3-opus': {
    contextWindow: 200_000,
    maxOutput: 4_000,
    description: 'Claude 3 Opus with 200k context window'
  },
  'claude-3-haiku': {
    contextWindow: 200_000,
    maxOutput: 4_000,
    description: 'Claude 3 Haiku with 200k context window'
  },
};

/**
 * Get token limit for a specific model
 * @param model Model name
 * @returns ModelTokenLimit or null if not found
 */
export function getTokenLimit(model: string): ModelTokenLimit | null {
  // Normalize model name to handle variations
  const normalizedModel = normalizeModelName(model);
  return TOKEN_LIMITS[normalizedModel] || null;
}

/**
 * Normalize model name to handle variations in naming
 * @param model Original model name
 * @returns Normalized model name
 */
function normalizeModelName(model: string): string {
  // Handle common model name variations
  const normalizations: Record<string, string> = {
    'gpt-4-1': 'gpt-4.1',
    'gpt-4.1.0': 'gpt-4.1',
    'claude-opus-4': 'claude-4-opus',
    'claude-sonnet-4': 'claude-4-sonnet',
    'gemini-pro-2.5': 'gemini-2.5-pro',
    'gemini-flash-2.5': 'gemini-2.5-flash',
  };
  
  return normalizations[model] || model;
}

/**
 * Get compression threshold token count for a model (95% of context window)
 * @param model Model name
 * @returns Token count threshold or null if model not found
 */
export function getCompressionThreshold(model: string): number | null {
  const limit = getTokenLimit(model);
  if (!limit) return null;
  
  return Math.floor(limit.contextWindow * 0.95);
}

/**
 * Check if a model supports large context (>= 1M tokens)
 * @param model Model name
 * @returns true if model supports large context
 */
export function supportsLargeContext(model: string): boolean {
  const limit = getTokenLimit(model);
  return limit ? limit.contextWindow >= 1_000_000 : false;
}

/**
 * Get all available models grouped by context window size
 * @returns Object with models grouped by context size
 */
export function getModelsByContextSize(): {
  large: string[];     // >= 1M tokens
  medium: string[];    // 200k - 999k tokens
  standard: string[];  // < 200k tokens
} {
  const large: string[] = [];
  const medium: string[] = [];
  const standard: string[] = [];
  
  Object.entries(TOKEN_LIMITS).forEach(([model, limit]) => {
    if (limit.contextWindow >= 1_000_000) {
      large.push(model);
    } else if (limit.contextWindow >= 200_000) {
      medium.push(model);
    } else {
      standard.push(model);
    }
  });
  
  return { large, medium, standard };
}

// Default compression threshold (95%)
export const DEFAULT_COMPRESSION_THRESHOLD = 0.95;

// Default fallback context window for unknown models
export const DEFAULT_CONTEXT_WINDOW = 128_000;