import { NextResponse } from 'next/server';
// import { slideCreatorAgent } from '@/mastra/agents/slideCreatorAgent'; // Adjust path if necessary - REMOVED AS UNUSED
// import { OpenAIEmbeddings } from '@langchain/openai'; // Assuming this might be needed by Memory or tools - REMOVED AS UNUSED
import type { Message } from 'ai'; // Changed from @ai-sdk/core
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs


// Configure necessary environment variables, especially for OpenAI API key
// process.env.OPENAI_API_KEY = 'your_openai_api_key_here'; // This should be set in .env.local

// A simple in-memory store for conversation state if slideCreatorAgent's memory isn't sufficient across stateless HTTP requests.
// For production, a more robust solution like Redis or a database would be needed.
interface ConversationState {
  messages: Message[];
  // Potentially other state information like current plan, approved plan etc.
}
const conversationStore: Record<string, ConversationState> = {};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[API /api/slide-creator] Request Body:', JSON.stringify(body, null, 2)); // Log the request body
    const { sessionId, action, topic, slideCount, outline, approvedPlan, message: userProvidedMessage } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    // Initialize or retrieve conversation state
    if (!conversationStore[sessionId]) {
      conversationStore[sessionId] = { messages: [] };
    }
    const currentMessages = conversationStore[sessionId].messages;
    let userMessageContent = '';

    // Construct the input for the agent based on the action
    // The slideCreatorAgent expects a sequence of messages.
    // We need to manage this sequence across API calls using the sessionId.

    if (action === 'initial_request') {
      if (!topic || !slideCount) {
        return NextResponse.json({ error: 'topic and slideCount are required for initial_request' }, { status: 400 });
      }
      userMessageContent = `トピック「${topic}」について、${slideCount}枚のスライドを作成してください。`;
      if (outline) {
        userMessageContent += `\\nアウトラインは以下の通りです：\\n${outline}`;
      }
      currentMessages.push({ id: uuidv4(), role: 'user', content: userMessageContent, createdAt: new Date() });
    } else if (action === 'plan_approval') {
      // Assuming the 'approvedPlan' contains the plan string that the user confirmed.
      // Or simply a confirmation message.
      userMessageContent = approvedPlan ? `プランを承認します。提示されたプランは以下の通りです：\\n${approvedPlan}` : 'プランを承認します。';
      currentMessages.push({ id: uuidv4(), role: 'user', content: userMessageContent, createdAt: new Date() });
    } else if (action === 'user_message') { // Generic user message
        if(!userProvidedMessage) return NextResponse.json({ error: 'message is required for user_message action' }, { status: 400 });
        userMessageContent = userProvidedMessage;
        currentMessages.push({ id: uuidv4(), role: 'user', content: userMessageContent, createdAt: new Date() });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
    console.log(`[API /api/slide-creator] Executing agent for session (${sessionId}) with ${currentMessages.length} messages. Last user message: "${userMessageContent}"`);

    // The slideCreatorAgent might not have an execute method that directly takes an array of Messages.
    // It seems to be designed to work with a streaming/chat interface from @mastra/core.
    // For now, we'll assume it can be adapted or we might need a helper to run it.
    // This part is a placeholder and needs to be aligned with how slideCreatorAgent.execute or similar is actually used.
    
    // This is a conceptual placeholder. The actual interaction with the Mastra agent
    // will depend on its API (e.g., `agent.chat(sessionId).sendMessage(content)`).
    // For a non-streaming API, you might re-instantiate or pass message history.
    // We need to check how slideCreatorAgent from '@mastra/core/agent' actually handles chat sessions or message history.

    // The agent's instructions define specific output formats (plan, json tool call, deliverable).
    // The API response should try to convey these structured outputs.

    // Let's assume the agent's response is the last message it generates.
    // This simplified approach likely needs refinement.
    // agentResponse = await slideCreatorAgent.processMessages(currentMessages); // Fictional method
    // For now, let's try to simulate the interaction based on the agent's documented prompt.
    
    // Simulating agent processing. This would be replaced by actual agent invocation.
    // This might involve calling a method on slideCreatorAgent that takes the message history
    // and returns the next set of messages or actions.
    // For simplicity, this example does not fully implement the agent execution part
    // as it depends heavily on the Mastra framework's specific chat execution model.

    // The agent will respond, and that response might be a plan, a tool call, or the final deliverable.
    // We capture the agent's response and add it to our message history.
    // const agentGeneratedMessage: Message = { role: 'assistant', content: "...", createdAt: new Date() }; // Placeholder
    // currentMessages.push(agentGeneratedMessage);

    // For this step, we will return the current message list and a placeholder for agent's direct response.
    // The client will then need to parse this.
    // In a real scenario, you'd call the Mastra agent here.
    // e.g. const result = await slideCreatorAgent.chat(sessionId).sendMessage({ role: 'user', content: userMessageContent });
    // And then result.content would be the agent's response.

    // Storing the updated messages.
    conversationStore[sessionId].messages = currentMessages;

    // This is a mock response. The actual response will come from the agent.
    let agentResponseMessage = '';
    let nextExpectedAction = '';

    if (action === 'initial_request') {
      // Simulate agent generating a plan
      agentResponseMessage = `\`\`\`plan\nトピック: ${topic}\n総枚数: ${slideCount}\nスライド概要:\n  - 1枚目: ${topic} - タイトルと導入\n  - 2枚目: 主要ポイント１\n  - ${slideCount > 2 ? '...' : (slideCount == 2 ? (slideCount + '枚目: まとめ') : '')}\n  - ${slideCount > 1 ? (slideCount + '枚目: まとめと質疑応答') : ''}\n\`\`\``;
      nextExpectedAction = 'plan_approval';
      currentMessages.push({ id: uuidv4(), role: 'assistant', content: agentResponseMessage, createdAt: new Date() });
    } else if (action === 'plan_approval') {
      // Insert a tool execution indicator message
      currentMessages.push({ id: uuidv4(), role: 'tool', content: 'Using Tool | htmlSlideTool', toolName: 'htmlSlideTool', createdAt: new Date() } as any);
      // Simulate agent generating HTML content after plan approval
      agentResponseMessage = `\`\`\`deliverable\n<!DOCTYPE html>\n<html lang="ja">\n<head>\n  <meta charset="UTF-8">\n  <title>スライド: ${topic || 'プレゼンテーション'}</title>\n  <style>\n    body { font-family: sans-serif; margin: 0; padding: 0; background-color: #f0f0f0; }\n    main { display: flex; flex-direction: column; align-items: center; }\n    .slide { width: 800px; height: 600px; background-color: white; margin-bottom: 20px; border: 1px solid #ccc; padding: 20px; box-sizing: border-box; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; }\n    .slide h1 { font-size: 2.5em; } .slide h2 { font-size: 1.8em; }\n  </style>\n</head>\n<body>\n  <main>\n    <section class="slide"><h1>スライド 1: ${topic || 'タイトル'}</h1><p>これは最初のスライドです。</p></section>\n    <section class="slide"><h2>スライド 2: 主要ポイント</h2><p>これが2番目のスライドです。</p></section>\n    ${slideCount && parseInt(slideCount.toString(), 10) > 2 ? `<section class="slide"><h3>スライド 3: 詳細</h3><p>3番目のスライドです。</p></section>` : ''}\n  </main>\n</body>\n</html>\n\`\`\``;
      nextExpectedAction = 'deliverable'; // Or perhaps 'completed' or similar to indicate end.
      // Deliverable is usually the final content, so an assistant message might not be needed in history for the raw HTML.
      // However, the agent might say "Here is your HTML" before the deliverable block.
      // For simplicity, we treat the deliverable itself as the agent's response data.
    }

    conversationStore[sessionId].messages = currentMessages; // Save updated history if agent added to it

    const apiResponse = {
        action: action, 
        nextExpectedAction: nextExpectedAction,
        data: agentResponseMessage, // This is the plan or the deliverable block
        fullMessageHistory: currentMessages, 
    };
    
    console.log('[API /api/slide-creator] Response:', JSON.stringify(apiResponse, null, 2));
    return NextResponse.json(apiResponse, { status: 200 });

  } catch (error) {
    console.error('[API /api/slide-creator] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
} 