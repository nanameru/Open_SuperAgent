import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemMessage = `
You are a professional researcher. Your task is to analyze the health question the user poses.
Focus on data-rich insights, prioritize reliable, up-to-date sources, and include inline citations.
Be analytical, avoid generalities, and ensure that each section supports data-backed reasoning.
`;

/**
 * OpenAIのDeep Research APIを呼び出す
 */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // ドキュメントに基づきDeep Research APIを呼び出す
    const response = await (openai as any).responses.create({
      model: "o4-mini-deep-research-2025-06-26", // より高速なモデルを使用
      input: [
        {
          role: "developer",
          content: [{ type: "input_text", text: systemMessage }]
        },
        {
          role: "user",
          content: [{ type: "input_text", text: query }]
        }
      ],
      reasoning: {
        summary: "auto"
      },
      tools: [
        { type: "web_search_preview" }
      ]
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Deep Research API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
}
