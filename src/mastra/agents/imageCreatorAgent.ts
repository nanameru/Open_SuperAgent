import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai'; // Assuming OpenAI for the LLM for the agent itself
// import { openAIImageGenerationTool } from '../tools/openAIImageGenerationTool';
import { geminiImageGenerationTool } from '../tools/geminiImageGenerationTool'; // Updated import
import { Memory } from '@mastra/memory';

export const imageCreatorAgent = new Agent({
  // agent_id: 'image-creator-agent-001', // Removed agent_id to address linter error
  name: 'Image Creator Agent',
  instructions: `
    You are an assistant that generates images based on user prompts and returns them as Markdown.
    When a user asks for an image, understand their request and use the geminiImageGenerationTool to create it. // Updated tool name
    After the tool returns the image data (base64), you MUST format your response as a Markdown image.
    For example: "Here is the image you requested:\n\n![Generated Image](data:image/png;base64,BASE64_DATA_HERE)"
    The Gemini tool currently generates one image at a time and does not provide a revised prompt.
    If the user provides a detailed prompt, use it directly. If the prompt is vague, you can ask for clarification or try to enhance it creatively before calling the tool.
    If the image generation fails, inform the user clearly about the error reported by the tool.
  `,
  model: openai('gpt-4o-mini'), // You can choose a different model if preferred
  // getTools: () => ({ // Changed to getTools
  //   geminiImageGenerationTool // Updated tool registration
  // }),
  tools: { // Reverted to the simple tools object
    geminiImageGenerationTool
  },
  memory: new Memory(), // Enable memory for conversation context
}); 