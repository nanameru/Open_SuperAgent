import { NextRequest, NextResponse } from 'next/server';

// Mastraエージェントのストリームエンドポイント
// 環境変数などから取得することを推奨
const mastraAgentStreamUrl = process.env.MASTRA_AGENT_STREAM_URL || 'http://localhost:4111/api/agents/slideCreatorAgent/stream';

export async function GET(req: NextRequest) {
  console.log(`[SSE Route] Received GET request for URL: ${req.url}`);
  console.log(`[SSE Route] Attempting to proxy to Mastra server URL: ${mastraAgentStreamUrl}`);

  try {
    console.log('[SSE Route] Preparing to fetch from Mastra server...');
    
    const requestBody = {
      messages: [{ role: 'user', content: 'Please provide the event stream for the current slide creation context.' }]
    };
    console.log('[SSE Route] Mastra request body:', JSON.stringify(requestBody));

    const mastraResponse = await fetch(mastraAgentStreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      // @ts-ignore duplex is a valid option for Node.js fetch but might not be in all TS lib versions
      duplex: 'half', 
    });

    console.log(`[SSE Route] Received response from Mastra server. Status: ${mastraResponse.status}`);

    if (!mastraResponse.ok) {
      const errorBody = await mastraResponse.text();
      console.error(`[SSE Route] Error from Mastra server (${mastraResponse.status}):`, errorBody);
      return NextResponse.json(
        { error: 'Failed to connect to Mastra stream', details: errorBody },
        { status: mastraResponse.status }
      );
    }

    if (!mastraResponse.body) {
      console.error('[SSE Route] No response body from Mastra stream, despite OK status.');
      return NextResponse.json(
        { error: 'No response body from Mastra stream' },
        { status: 500 }
      );
    }

    console.log('[SSE Route] Successfully connected to Mastra stream. Streaming response to client...');
    
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'text/event-stream');
    responseHeaders.set('Cache-Control', 'no-cache, no-transform');
    responseHeaders.set('Connection', 'keep-alive');
    // X-Accel-Buffering is useful for Nginx environments to disable response buffering
    responseHeaders.set('X-Accel-Buffering', 'no'); 

    return new Response(mastraResponse.body, {
      headers: responseHeaders,
      status: mastraResponse.status, // Should be 200 if mastraResponse.ok was true
    });

  } catch (error: any) {
    console.error('[SSE Route] FATAL ERROR in try-catch block:', error);
    // Log the full error object if possible, and its message and stack for more details
    if (error instanceof Error) {
      console.error('[SSE Route] Error name:', error.name);
      console.error('[SSE Route] Error message:', error.message);
      console.error('[SSE Route] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error in SSE proxy', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 