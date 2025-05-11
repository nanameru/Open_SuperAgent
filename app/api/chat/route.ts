import { mastra } from '@/src/mastra'; // Import mastra instance
// import { streamText, experimental_streamText } from 'ai'; // experimental_streamText removed
import { streamText } from 'ai'; // Only import streamText

// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Get the slideCreatorAgent
    // const agent = mastra.getAgent('Slide Creator Agent');
    const agent = mastra.getAgent('slideCreatorAgent'); // Changed to use the registration key
    if (!agent) {
      // console.error('[API CHAT ROUTE] Agent "Slide Creator Agent" not found.');
      console.error('[API CHAT ROUTE] Agent "slideCreatorAgent" not found.'); // Updated error message
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