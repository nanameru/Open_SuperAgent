import { mastra } from '@/src/mastra'; // Import mastra instance
// import { streamText, experimental_streamText } from 'ai'; // experimental_streamText removed
// import { streamText } from 'ai'; // Only import streamText

// Set the runtime to nodejs for browser tools compatibility
export const runtime = 'nodejs';

// Allow streaming responses up to 300 seconds
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get the slideCreatorAgent using the async function
    const { getSlideCreatorAgent } = await import('@/src/mastra/agents/slideCreatorAgent');
    const agent = await getSlideCreatorAgent();
    
    if (!agent) {
      console.error('[API CHAT ROUTE] Agent "slideCreatorAgent" not found.');
      return new Response(JSON.stringify({ error: 'Agent not found.' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Get the stream from the agent
    const stream = await agent.stream(messages);

    // Return the agent's stream as a DataStreamResponse
    return stream.toDataStreamResponse();

  } catch (error) {
    console.error('[API CHAT ROUTE] Error:', error);
    // You might want to return a more structured error response
    return new Response(JSON.stringify({ error: 'An error occurred while processing your request.' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 