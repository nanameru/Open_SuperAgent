/**
 * AI-powered conversation summarizer
 * Uses actual AI models to generate intelligent summaries similar to Cursor's approach
 */

import { Message } from 'ai';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

export interface SummarizerOptions {
  provider: 'gemini' | 'openai' | 'claude';
  model?: string;
  temperature?: number;
}

/**
 * Create AI summarizer function for context compression
 */
export function createAISummarizer(options: SummarizerOptions) {
  const { provider, model, temperature = 0.3 } = options;
  
  return async (messages: Message[]): Promise<string> => {
    try {
      // Prepare the model based on provider
      let aiModel;
      let defaultModel: string;
      
      switch (provider) {
        case 'gemini':
          defaultModel = model || 'gemini-2.0-flash-exp';
          aiModel = google(defaultModel);
          break;
        case 'openai':
          defaultModel = model || 'gpt-4o-mini';
          aiModel = openai(defaultModel);
          break;
        case 'claude':
          defaultModel = model || 'claude-3-5-sonnet-20241022';
          aiModel = anthropic(defaultModel);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
      
      // Convert messages to a format suitable for summarization
      const conversationText = convertMessagesToText(messages);
      
      // Create summarization prompt inspired by Cursor's approach
      const summaryPrompt = `
あなたは会話履歴の要約を作成する専門家です。以下の会話を要約してください。

【要約の要件】
1. **重要な情報を保持**: ユーザーの意図、実行されたツール、生成された結果など
2. **簡潔で効率的**: トークン数を大幅に削減しながら文脈を保持
3. **継続性の確保**: この要約の後に会話を続けても違和感のないようにする
4. **ツール実行結果**: 重要なツール実行とその結果を要約に含める

【会話履歴】
${conversationText}

【要約指示】
上記の会話を簡潔に要約し、重要な情報（ユーザーの質問、ツール実行結果、生成されたコンテンツなど）を失わないようにしてください。この要約は、元の会話履歴の代わりに使用され、AIが文脈を理解して適切に応答するために使用されます。

要約:`;

      const result = await generateText({
        model: aiModel,
        prompt: summaryPrompt,
        temperature,
        maxTokens: 1000, // Limit summary length
      });
      
      return result.text;
    } catch (error) {
      console.error('AI summarization failed:', error);
      throw error;
    }
  };
}

/**
 * Convert messages array to readable text format for summarization
 */
function convertMessagesToText(messages: Message[]): string {
  const textParts: string[] = [];
  
  for (const message of messages) {
    const roleLabel = message.role === 'user' ? 'ユーザー' : 
                     message.role === 'assistant' ? 'アシスタント' : 
                     message.role;
    
    if (typeof message.content === 'string') {
      textParts.push(`${roleLabel}: ${message.content}`);
    } else if (Array.isArray(message.content)) {
      for (const part of message.content as any[]) {
        if (part.type === 'text') {
          textParts.push(`${roleLabel}: ${part.text}`);
        } else if (part.type === 'tool-call') {
          textParts.push(`${roleLabel}: [ツール実行] ${part.toolName}(${JSON.stringify(part.args)})`);
        } else if (part.type === 'tool-result') {
          const resultText = typeof part.result === 'string' ? 
            part.result : 
            JSON.stringify(part.result).substring(0, 200) + '...';
          textParts.push(`システム: [ツール結果] ${part.toolCallId}: ${resultText}`);
        }
      }
    }
  }
  
  return textParts.join('\n\n');
}

/**
 * Create summarizer with automatic provider detection based on current model
 */
export function createAutoSummarizer(currentModel: string): (messages: Message[]) => Promise<string> {
  let provider: 'gemini' | 'openai' | 'claude';
  
  if (currentModel.includes('gemini')) {
    provider = 'gemini';
  } else if (currentModel.includes('gpt') || currentModel.includes('o3') || currentModel.includes('o4')) {
    provider = 'openai';
  } else if (currentModel.includes('claude')) {
    provider = 'claude';
  } else {
    // Default fallback to gemini for fast and efficient summarization
    provider = 'gemini';
  }
  
  return createAISummarizer({ 
    provider, 
    model: provider === 'gemini' ? 'gemini-2.5-flash' : undefined,
    temperature: 0.2 // Lower temperature for more consistent summaries
  });
}

/**
 * Lightweight summarizer using Gemini 2.5 Flash for fast compression
 */
export function createLightweightSummarizer(): (messages: Message[]) => Promise<string> {
  return createAISummarizer({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.1
  });
}

/**
 * High-quality summarizer using Gemini 2.5 Flash for optimal speed and performance
 */
export function createHighQualitySummarizer(): (messages: Message[]) => Promise<string> {
  return createAISummarizer({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    temperature: 0.2
  });
}