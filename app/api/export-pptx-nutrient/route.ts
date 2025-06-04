import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import FormData from 'form-data';

// Nutrient API設定
const NUTRIENT_API_URL = 'https://api.nutrient.io/build';
const NUTRIENT_API_KEY = process.env.NUTRIENT_API_KEY || 'pdf_live_fy1NX9djc1G2GoPVFljLgpsYUfbWrQU47Uxgj0y5py2';

interface SlideData {
  html: string;
  index: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slides, title = 'プレゼンテーション' } = body;
    
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      return NextResponse.json(
        { error: 'スライドHTMLが提供されていません' },
        { status: 400 }
      );
    }
    
    console.log(`Converting ${slides.length} slides to PPTX using Nutrient API...`);
    
    // すべてのスライドを1つのHTMLドキュメントに結合
    const combinedHtml = createCombinedHtml(slides, title);
    
    // FormDataを作成
    const formData = new FormData();
    
    // Nutrient API用の指示を設定
    const instructions = {
      parts: [
        {
          html: "document"
        }
      ],
      output: {
        type: "pptx"
      }
    };
    
    formData.append('instructions', JSON.stringify(instructions));
    
    // HTMLコンテンツをBufferとして追加
    const htmlBuffer = Buffer.from(combinedHtml, 'utf-8');
    formData.append('document', htmlBuffer, {
      filename: 'index.html',
      contentType: 'text/html'
    });
    
    // Nutrient APIを呼び出し
    const response = await axios.post(NUTRIENT_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${NUTRIENT_API_KEY}`
      },
      responseType: 'arraybuffer',
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    console.log('PPTX conversion successful');
    
    // レスポンスヘッダーを設定してファイルを返す
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9]/gi, '_')}.pptx"`,
        'Content-Length': response.data.length.toString()
      },
    });
    
  } catch (error) {
    console.error('Nutrient PPTX export error:', error);
    
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data ? 
        Buffer.from(error.response.data).toString('utf-8') : 
        error.message;
      
      return NextResponse.json(
        { 
          error: 'PPTXファイルの生成に失敗しました', 
          details: errorMessage,
          status: error.response?.status 
        },
        { status: error.response?.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'PPTXファイルの生成に失敗しました', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// スライドを1つのHTMLドキュメントに結合
function createCombinedHtml(slides: SlideData[], title: string): string {
  const slideHtmlArray = slides.map((slide, index) => {
    // 各スライドのHTMLを処理
    const slideContent = processSlideHtml(slide.html, index);
    
    return `
      <div class="slide" style="page-break-after: always; width: 100%; height: 100vh; position: relative; overflow: hidden;">
        ${slideContent}
      </div>
    `;
  });
  
  // 完全なHTMLドキュメントを作成
  return `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      line-height: 1.6;
      color: #333;
    }
    
    .slide {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 40px;
      background: white;
    }
    
    h1, h2, h3 {
      margin-bottom: 20px;
      text-align: center;
    }
    
    h1 {
      font-size: 48px;
      color: #0056B1;
    }
    
    h2 {
      font-size: 36px;
      color: #0056B1;
    }
    
    h3 {
      font-size: 28px;
      color: #333;
    }
    
    p {
      font-size: 18px;
      margin-bottom: 16px;
      text-align: left;
      max-width: 800px;
    }
    
    ul, ol {
      font-size: 18px;
      margin-bottom: 16px;
      padding-left: 30px;
      max-width: 800px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      width: 100%;
      max-width: 1200px;
    }
    
    .column {
      padding: 20px;
    }
    
    .box, .card {
      background: #f5f7fa;
      border: 1px solid #e1e4e8;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    
    .highlight {
      background: #fff3cd;
      padding: 2px 6px;
      border-radius: 4px;
    }
    
    .center {
      text-align: center;
    }
    
    .icon {
      display: inline-block;
      width: 24px;
      height: 24px;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    /* 図形やチャートのスタイル */
    .diagram, .chart {
      margin: 20px auto;
      text-align: center;
    }
    
    svg {
      max-width: 100%;
      height: auto;
    }
    
    /* ページ番号 */
    .page-number {
      position: absolute;
      bottom: 20px;
      right: 20px;
      font-size: 14px;
      color: #666;
    }
  </style>
</head>
<body>
  ${slideHtmlArray.join('\n')}
</body>
</html>
  `;
}

// 個別のスライドHTMLを処理
function processSlideHtml(html: string, index: number): string {
  // スタイルタグを抽出
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [];
  const styles = styleMatches.join('\n');
  
  // スタイルタグを除去したHTMLコンテンツ
  let content = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // slide-containerクラスがある場合は、その内容を抽出
  const containerMatch = content.match(/<div[^>]*class="[^"]*slide-container[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  if (containerMatch) {
    content = containerMatch[1];
  }
  
  // ページ番号を追加
  content += `<div class="page-number">${index + 1}</div>`;
  
  // スタイルとコンテンツを結合
  return `
    ${styles}
    ${content}
  `;
} 