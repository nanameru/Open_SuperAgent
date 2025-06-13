import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai'; // Assuming OpenAI for the LLM for the agent itself
// import { openAIImageGenerationTool } from '../tools/openAIImageGenerationTool';
import { geminiImageGenerationTool } from '../tools/geminiImageGenerationTool'; // Updated import
import { Memory } from '@mastra/memory';

export const imageCreatorAgent = new Agent({
  // agent_id: 'image-creator-agent-001', // Removed agent_id to address linter error
  name: 'imageCreatorAgent',
  instructions: `
    You are an assistant that generates images based on user prompts and returns them.
    When a user asks for an image, understand their request and use the geminiImageGenerationTool to create it.
    
    After the tool returns the image data, you MUST format your response as follows:
    - If the image has a URL (preferred), display it directly using Markdown image syntax: ![Generated Image](URL_HERE)
    - If only base64 data is available, use data URL format: ![Generated Image](data:image/png;base64,BASE64_DATA_HERE)
    
    The Gemini tool generates images and saves them as files, providing both URL and base64 data.
    ALWAYS prefer using the URL version when available as it's more efficient.
    
    If the user provides a detailed prompt, use it directly. If the prompt is vague, you can ask for clarification
    or try to enhance it creatively before calling the tool.
    
    If the image generation fails, inform the user clearly about the error reported by the tool.
  `,
  model: openai.responses('o3-pro-2025-06-10'), // Changed to use the same model as slideCreatorAgent
  tools: { 
    geminiImageGenerationTool // Register the tool with the agent
  },
  memory: new Memory(), // Enable memory for conversation context
}); 