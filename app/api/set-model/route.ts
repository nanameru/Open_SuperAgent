import { NextRequest, NextResponse } from 'next/server';

// グローバル変数でモデル設定を保存（実際の実装では、より永続的なストレージを使用することを推奨）
let currentModelConfig = {
  provider: 'gemini',
  modelName: 'gemini-2.5-flash'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, modelName } = body;

    if (!provider || !modelName) {
      return NextResponse.json(
        { error: 'Provider and modelName are required' },
        { status: 400 }
      );
    }

    // モデル設定を更新
    currentModelConfig = {
      provider,
      modelName
    };

    console.log(`[Set Model] Updated model to: ${provider} - ${modelName}`);

    return NextResponse.json({ 
      success: true, 
      model: currentModelConfig 
    });
  } catch (error) {
    console.error('[Set Model] Error:', error);
    return NextResponse.json(
      { error: 'Failed to set model' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ model: currentModelConfig });
}

// モデル設定を取得する関数（他のAPIで使用）
// Next.js Route ハンドラーではexportできないため、GET APIを使用してください 