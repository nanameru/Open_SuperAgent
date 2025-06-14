import { NextRequest, NextResponse } from 'next/server';
import { claudeFileTool } from '../../../src/mastra/tools/claudeFileTool';
import { claudeAutoEditTool } from '../../../src/mastra/tools/claudeAutoEditTool';

// This API runs in Node.js runtime, not Edge
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tool, params } = body;
    
    // Validate request
    if (!tool || !params) {
      return NextResponse.json(
        { error: 'Missing tool or params' },
        { status: 400 }
      );
    }
    
    // Execute the requested tool
    let result;
    switch (tool) {
      case 'claudeFile':
        result = await claudeFileTool.execute(params);
        break;
        
      case 'claudeAutoEdit':
        result = await claudeAutoEditTool.execute(params);
        break;
        
      default:
        return NextResponse.json(
          { error: `Unknown tool: ${tool}` },
          { status: 400 }
        );
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Code editor API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}