import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'edge';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = `
You are a research assistant. Your task is to create a detailed research plan based on the user's query.
The output must be a JSON object that strictly follows this format:
{
  "title": "A concise and informative title for the research.",
  "steps": [
    {
      "type": "search",
      "description": "A description of the first web search step."
    },
    {
      "type": "search",
      "description": "A description of the second web search step."
    },
    {
      "type": "analyze",
      "description": "A description of the analysis step."
    },
    {
      "type": "report",
      "description": "A description of the final report generation step."
    }
  ]
}
Each step's 'type' must be one of 'search', 'analyze', or 'report'.
Do not include any text, explanations, or markdown formatting outside of the JSON object itself.
`;

/**
 * ユーザーのクエリに基づいてリサーチ計画を生成するAPI
 */
export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: query,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const planJson = response.choices[0].message.content;

    if (!planJson) {
      throw new Error('APIから有効な計画が返されませんでした。');
    }

    // パースして内容を検証（念のため）
    const parsedPlan = JSON.parse(planJson);

    return NextResponse.json(parsedPlan);

  } catch (error) {
    console.error('[Research Plan API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: errorMessage }, { status: 500 });
  }
} 