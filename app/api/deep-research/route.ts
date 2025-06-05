import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, maxIterations = 2, queriesPerIteration = 3 } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'メッセージが必要です' },
        { status: 400 }
      );
    }

    console.log('[Deep Research API] Starting workflow with:', {
      message,
      maxIterations,
      queriesPerIteration
    });

    // 動的にワークフローをインポートして実行
    let result;
    
    try {
      const { deepResearchWorkflow } = await import('@/src/mastra/workflows/deepResearchWorkflow');
      
      // ワークフローが正しく初期化されているか確認
      if (!deepResearchWorkflow) {
        throw new Error('Deep Research Workflow が見つかりません');
      }

      // ワークフローを実行
      result = await (deepResearchWorkflow as any).run({
        message,
        maxIterations,
        queriesPerIteration
      });
      
    } catch (workflowError: any) {
      console.error('[Deep Research API] Workflow execution failed:', workflowError);
      
      // フォールバック: 簡単な検索結果を返す
      const { braveSearchTool } = await import('@/src/mastra/tools/braveSearchTool');
      
      try {
        const searchResult = await braveSearchTool.execute({
          context: { query: message, count: 5 }
        } as any);
        
        result = {
          answer: `検索結果: ${message}\n\n${searchResult.results?.map((r: any) => `- ${r.title}: ${r.description}`).join('\n') || '検索結果が見つかりませんでした'}`,
          sources: searchResult.results?.slice(0, 5).map((r: any) => ({
            title: r.title,
            url: r.url
          })) || [],
          searchQueries: [message],
          iterations: 1,
          knowledgeGaps: ['ワークフローエラーのためフォールバック実行']
        };
        
        console.log('[Deep Research API] Using fallback search result');
        
      } catch (fallbackError) {
        console.error('[Deep Research API] Fallback also failed:', fallbackError);
        throw new Error(`ワークフローとフォールバックの両方が失敗しました: ${workflowError?.message || 'Unknown error'}`);
      }
    }

    // 結果の検証
    if (!result) {
      throw new Error('ワークフローの実行結果が空です');
    }

    console.log('[Deep Research API] Workflow completed:', {
      answer: result.answer?.substring(0, 100) + '...',
      sourcesCount: result.sources?.length || 0,
      iterations: result.iterations
    });

    return NextResponse.json({
      success: true,
      result
    });

  } catch (error) {
    console.error('[Deep Research API] Error:', error);
    
    // より詳細なエラー情報を提供
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Deep Research API] Error stack:', errorStack);
    
    return NextResponse.json(
      { 
        error: 'ワークフローの実行中にエラーが発生しました',
        details: errorMessage,
        type: error?.constructor?.name || 'UnknownError'
      },
      { status: 500 }
    );
  }
} 