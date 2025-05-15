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
        const decoder = new TextDecoder();
        console.log('\n--- [API] Mastra Stream Start ---');
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[API] Mastra Stream End');
              controller.close();
              break;
            }
            
            // Decode the chunk
            const chunkText = decoder.decode(value, { stream: true });
            console.log('[API] Mastra Stream Chunk:', chunkText);
            
            // Process the chunk to detect and format tool calls
            let processedChunk = chunkText;
            
            try {
              // Check if chunk contains a tool call in the format we expect
              if (chunkText.includes('"tool":') || chunkText.includes('"toolName":')) {
                // The chunk might contain multiple lines, each with a JSON object
                const lines = chunkText.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const jsonData = line.substring(6); // Remove 'data: ' prefix
                    try {
                      const data = JSON.parse(jsonData);
                      
                      // If this is a tool execution chunk
                      if ((data.delta?.content && 
                          (typeof data.delta.content === 'string' && 
                           (data.delta.content.includes('"tool":') || 
                            data.delta.content.includes('"toolName":')))) || 
                          data.delta?.tool_calls) {
                            
                        console.log('[API] Tool execution detected:', data);
                        
                        // If the content is a string with tool data, we convert it to a proper format
                        if (data.delta?.content && typeof data.delta.content === 'string') {
                          try {
                            const toolData = JSON.parse(data.delta.content);
                            
                            // If we can parse JSON from content and it has tool/toolName properties
                            if (toolData.tool || toolData.toolName) {
                              // Create a modified chunk with a special role to help our UI
                              const modifiedData = {
                                ...data,
                                delta: {
                                  ...data.delta,
                                  role: 'tool', // Add this to help our UI distinguish tool messages
                                }
                              };
                              
                              // Replace this chunk in the processedChunk
                              processedChunk = processedChunk.replace(
                                line,
                                `data: ${JSON.stringify(modifiedData)}`
                              );
                              
                              console.log('[API] Modified tool chunk:', processedChunk);
                            }
                          } catch (e) {
                            // Not JSON, ignore
                          }
                        }
                      }
                    } catch (e) {
                      // Invalid JSON, skip this line
                      console.warn('[API] Error parsing JSON from stream chunk:', e);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('[API] Error processing chunk:', e);
            }
            
            // Forward the processed chunk to the client
            controller.enqueue(encoder.encode(processedChunk));
          }
        } catch (e) {
          console.error('[API] Error processing stream:', e);
          controller.error(e);
        }
      }
    });

    // Set up the encoder for sending data back
    const encoder = new TextEncoder();

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