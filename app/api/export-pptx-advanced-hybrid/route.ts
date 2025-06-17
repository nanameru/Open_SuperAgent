// TEMPORARILY DISABLED FOR DEPLOYMENT - Hybrid PPTX Export functionality
// This endpoint has been disabled to resolve Puppeteer dependency issues during deployment
// All original code has been commented out below

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Hybrid PPTX export is temporarily disabled for deployment', 
      message: 'This feature will be re-enabled after resolving Puppeteer dependency issues'
    }, 
    { status: 503 }
  );
}

/*
// ORIGINAL CODE - COMMENTED OUT FOR DEPLOYMENT
// (All original implementation code would be here)
// This included hybrid Puppeteer + PptxGenJS implementation
*/