import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  let text: string = ''
  
  try {
    const body = await request.json()
    text = body.text

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'テキストが必要です' },
        { status: 400 }
      )
    }

    // Claude APIキーの確認
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('ANTHROPIC_API_KEY not found, using fallback')
      throw new Error('API key not configured')
    }

    // Claude APIを使用してキーワード抽出
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `以下のテキストから重要なキーワードを5-10個抽出してください。名詞、動詞、形容詞を中心に、意味のある単語のみを選んでください。結果はJSON配列形式で返してください。

テキスト: "${text}"

例: ["AI", "機械学習", "データ", "分析", "技術"]`
        }]
      })
    })

    if (!response.ok) {
      console.log(`Claude API error: ${response.status}`)
      throw new Error(`Claude API error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || ''

    // JSONを抽出
    const jsonMatch = content.match(/\[.*?\]/s)
    let keywords: string[] = []

    if (jsonMatch) {
      try {
        keywords = JSON.parse(jsonMatch[0])
        // 配列かどうかチェック
        if (!Array.isArray(keywords)) {
          throw new Error('Not an array')
        }
        // 文字列の配列かどうかチェック
        keywords = keywords.filter(k => typeof k === 'string' && k.trim().length > 0)
      } catch (parseError) {
        console.error('JSON解析エラー:', parseError)
        throw new Error('JSON parse failed')
      }
    } else {
      throw new Error('No JSON found in response')
    }

    return NextResponse.json({ keywords })

  } catch (error) {
    console.error('キーワード抽出エラー:', error)
    
    // フォールバック: 簡単な単語分割
    const fallbackKeywords = text
      .split(/[\s、。！？\n]+/)
      .filter((word: string) => word.length > 1 && word.length < 10)
      .slice(0, 5)

    return NextResponse.json({ 
      keywords: fallbackKeywords.length > 0 ? fallbackKeywords : ['テキスト', '分析', '処理'],
      fallback: true 
    })
  }
} 