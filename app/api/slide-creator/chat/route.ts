import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Edge runtime is fine for a simple proxy

// Define the target Mastra agent ID (ensure this matches your agent's name/ID)
const MASTRA_AGENT_ID = 'slideCreatorAgent'; // Adjust if your agent ID is different
// const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:3003'; // Allow overriding via env var
const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:4111'; // Corrected default port

export async function POST(req: NextRequest) {
  try {
    // Extract the messages from the request
    const reqBody = await req.json();
    const { messages } = reqBody;

    console.log('[API] Received request with messages:', messages);

    // Forward the request to the Mastra API
    const upstreamResponse = await fetch('http://localhost:4111/api/agents/slideCreatorAgent/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!upstreamResponse.ok) {
      console.error(`[API] Upstream error: ${upstreamResponse.status} ${upstreamResponse.statusText}`);
      return new NextResponse(
        JSON.stringify({ error: `Upstream error: ${upstreamResponse.status}` }),
        { 
          status: upstreamResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!upstreamResponse.body) {
      console.error('[API] Upstream response has no body');
      return new NextResponse(
        JSON.stringify({ error: 'Upstream response has no body' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('[API] Successfully connected to upstream. Streaming response back to client.');

    // Create a new ReadableStream to intercept and process the chunks
    const reader = upstreamResponse.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        console.log('\\n--- [API] Mastra Stream Start (Proxying) ---');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[API] Mastra Stream End (Proxying)');
              controller.close();
              break;
            }
            
            // Directly enqueue the chunk from upstream
            controller.enqueue(value);
          }
        } catch (e) {
          console.error('[API] Error processing stream (Proxying):', e);
          controller.error(e);
        }
      }
    });

    // Return the processed stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'An error occurred processing the request' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 