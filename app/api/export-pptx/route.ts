// TEMPORARILY DISABLED FOR DEPLOYMENT - PPTX Export functionality
// This endpoint has been disabled to resolve dependency issues during deployment
// All original code has been commented out below

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'PPTX export is temporarily disabled for deployment', 
      message: 'This feature will be re-enabled after resolving dependency issues'
    }, 
    { status: 503 }
  );
}

/*
// ORIGINAL CODE - COMMENTED OUT FOR DEPLOYMENT
import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

interface SlideImage {
  imageData: string; // base64 encoded image
  width: number;
  height: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slides, title = 'プレゼンテーション' } = body;
    
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: 'スライド画像が提供されていません' },
        { status: 400 }
      );
    }

    // Create new presentation
    const pptx = new PptxGenJS();
    
    // Set presentation properties
    pptx.author = 'AI Agent Presentation';
    pptx.company = 'AI Generated';
    pptx.revision = '1';
    pptx.subject = title;
    pptx.title = title;

    // Add slides
    for (let i = 0; i < slides.length; i++) {
      const slideData: SlideImage = slides[i];
      const slide = pptx.addSlide();
      
      // Add image to slide
      slide.addImage({
        data: slideData.imageData,
        x: 0,
        y: 0,
        w: '100%',
        h: '100%'
      });
    }

    // Generate PPTX
    const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
    
    // Convert buffer to base64
    const base64 = pptxBuffer.toString('base64');
    
    return NextResponse.json({
      success: true,
      data: base64,
      filename: `${title}.pptx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    });
    
  } catch (error) {
    console.error('PPTX export error:', error);
    return NextResponse.json(
      { error: 'PPTX生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
*/