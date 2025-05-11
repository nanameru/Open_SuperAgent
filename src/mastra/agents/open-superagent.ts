import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';
import { 
  weatherTool,
  htmlSlideTool,
  braveSearchTool,
  advancedCalculatorTool,
  geminiImageGenerationTool
} from '../tools';
import { Memory } from '@mastra/memory';

export const openSuperagent = new Agent({
  name: 'Open Super Agent',
  instructions: `You are a helpful assistant with access to a variety of tools.
Use the available tools to best respond to the user's requests.
Available tools:
- weatherTool: Get current weather for a location.
- htmlSlideTool: Create HTML slides based on a topic and outline.
- braveSearchTool: Perform web searches using Brave Search.
- advancedCalculatorTool: Perform advanced mathematical calculations.
- geminiImageGenerationTool: Generate images using Google's Gemini API.`,
  model: openai('gpt-4o-mini'), // You can choose a different model if preferred
  tools: {
    weatherTool,
    htmlSlideTool,
    braveSearchTool,
    advancedCalculatorTool,
    geminiImageGenerationTool
  },
  memory: new Memory(), // Enable memory for conversation context
}); 