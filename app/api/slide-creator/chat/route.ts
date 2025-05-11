import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Edge runtime is fine for a simple proxy

// Define the target Mastra agent ID (ensure this matches your agent's name/ID)
const MASTRA_AGENT_ID = 'slideCreatorAgent'; // Adjust if your agent ID is different
// const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:3003'; // Allow overriding via env var
const MASTRA_SERVER_URL = process.env.MASTRA_SERVER_URL || 'http://localhost:4111'; // Corrected default port

export async function POST(req: NextRequest) {
  try {
    const requestBody = await req.text(); // Get the raw request body as text
    const upstreamUrl = `${MASTRA_SERVER_URL}/api/agents/${MASTRA_AGENT_ID}/stream`;

    console.log(`[Proxy] Forwarding request to: ${upstreamUrl}`);
    // console.log(`[Proxy] Request Body: ${requestBody}`); // Uncomment for debugging if needed

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers your Mastra server might expect
        // e.g., API keys if Mastra server is protected
      },
      body: requestBody, // Forward the raw body
    });

    // Check if the upstream request was successful
    if (!upstreamResponse.ok) {
      const errorBody = await upstreamResponse.text();
      console.error(`[Proxy] Error from upstream server (${upstreamResponse.status}): ${errorBody}`);
      return new NextResponse(
        JSON.stringify({
          error: `Upstream server error: ${upstreamResponse.status}`,
          details: errorBody,
        }),
        { 
          status: upstreamResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Ensure the response from Mastra is a stream
    if (!upstreamResponse.body) {
      console.error('[Proxy] Upstream response has no body');
      return new NextResponse(
        JSON.stringify({ error: 'Upstream response has no body' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    console.log('[Proxy] Successfully connected to upstream. Streaming response back to client.');

    // Stream the response back to the client
    // The Vercel AI SDK's useChat hook expects text/event-stream or a compatible format.
    // Mastra's /stream endpoint should provide this.
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        // Ensure the Content-Type is what the client expects for streaming
        'Content-Type': upstreamResponse.headers.get('Content-Type') || 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e));

    console.error('\n🔴 [Proxy API /api/slide-creator/chat Error] An unexpected error occurred! 🔴');
    console.error('----------------------------------------------------------------------');
    console.error('Error Timestamp:', new Date().toISOString());
    console.error('Error Message:', error.message);
    console.error('Error Name:', error.name);
    console.error('Error Stack Trace (if available):');
    console.error(error.stack || 'No stack trace available.');
    console.error('\nFull Error Object (for deeper inspection):');
    console.error(error);
    console.error('----------------------------------------------------------------------\n');

    return NextResponse.json(
      {
        error: 'An internal server error occurred in the proxy.',
        errorMessage: error.message,
        errorName: error.name,
      },
      { status: 500 }
    );
  }
} 