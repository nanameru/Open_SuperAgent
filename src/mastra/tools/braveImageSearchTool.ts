import { tool } from 'ai';
import { z } from 'zod';

interface BraveImageSearchResult {
  title: string;
  url: string;
  source: string;
  thumbnail: {
    src: string;
  };
  properties: {
    url: string;
    placeholder?: string;
  };
  meta_url?: {
    scheme: string;
    netloc: string;
    hostname: string;
    favicon?: string;
    path?: string;
  };
}

interface BraveApiImageResponse {
  type: 'images';
  query: {
    original: string;
    spellcheck_off: boolean;
    show_strict_warning: boolean;
  };
  results: Array<{
    type: 'image_result';
    title: string;
    url: string;
    source: string;
    page_fetched?: string;
    thumbnail: {
      src: string;
    };
    properties: {
      url: string;
      placeholder?: string;
    };
    meta_url?: {
      scheme: string;
      netloc: string;
      hostname: string;
      favicon?: string;
      path?: string;
    };
    confidence?: 'high' | 'medium' | 'low';
  }>;
}

/**
 * braveImageSearchTool
 * --------------------
 * Brave Search API を使用して画像検索を実行し、関連する画像の結果を返します。
 * スライド作成やプレゼンテーション用の画像素材を探すために特別に設計されています。
 *
 * 注意: API キーは環境変数 `BRAVE_API_KEY` で提供する必要があります。
 */
export const braveImageSearchTool = tool({
  description: 'Brave Search API を使用して画像検索を実行し、プレゼンテーションやスライドに適した高品質な画像結果を取得します。検索結果には画像のタイトル、URL、サムネイル、ソース情報が含まれます。',
  parameters: z.object({
    query: z
      .string()
      .min(1)
      .describe('検索したい画像のキーワードやフレーズ。日本語と英語の両方に対応しています。'),
    count: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(10)
      .describe('返す画像結果の数（1-20）。デフォルトは10です。'),
    safesearch: z
      .enum(['strict', 'moderate', 'off'])
      .default('moderate')
      .describe('セーフサーチのレベル。strict（厳格）、moderate（中程度）、off（無効）から選択します。'),
    country: z
      .string()
      .default('jp')
      .describe('検索を実行する国コード（例：jp、us、uk）。デフォルトは日本（jp）です。'),
    search_lang: z
      .string()
      .default('ja')
      .describe('検索言語（例：ja、en、fr）。デフォルトは日本語（ja）です。'),
    spellcheck: z
      .boolean()
      .default(true)
      .describe('スペルチェックを有効にするかどうか。デフォルトは有効です。'),
  }),
  execute: async ({ query, count, safesearch, country, search_lang, spellcheck }) => {
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error(
        'BRAVE_API_KEY 環境変数が設定されていません。Brave Search API キーを設定してください。'
      );
    }

    const endpoint = 'https://api.search.brave.com/res/v1/images/search';
    
    // 画像検索に最適化されたパラメータを設定
    const params = new URLSearchParams({ 
      q: query,
      count: String(count),
      country: country,
      search_lang: search_lang,
      safesearch: safesearch,
      spellcheck: spellcheck ? '1' : '0',
    });

    // レート制限対策: リトライロジックを実装
    let retryCount = 0;
    const maxRetries = 3;
    const baseRetryDelay = 1100; // 1.1秒（レート制限対策）

    while (retryCount < maxRetries) {
      try {
        const resp = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            Accept: 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
          },
        });

        if (resp.status === 429) {
          // レート制限エラーの場合、待機してリトライ
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = baseRetryDelay * retryCount;
            console.warn(`Brave Search API レート制限に達しました。${delay}ms後にリトライします... (試行 ${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }

        if (!resp.ok) {
          throw new Error(`Brave Search API エラー: ${resp.status} ${resp.statusText}`);
        }

        const json = (await resp.json()) as BraveApiImageResponse;

        const imageResults = json.results ?? [];
        const simplified: BraveImageSearchResult[] = imageResults.slice(0, count).map((r) => ({
          title: r.title,
          url: r.url,
          source: r.source,
          thumbnail: r.thumbnail,
          properties: r.properties,
          meta_url: r.meta_url,
        }));

        return {
          results: simplified.map((result) => ({
            title: result.title,
            url: result.url,
            source: result.source,
            imageUrl: result.properties.url,
            thumbnailUrl: result.thumbnail.src,
            placeholderUrl: result.properties.placeholder,
            hostname: result.meta_url?.hostname,
            favicon: result.meta_url?.favicon,
            confidence: 'high' as const, // Brave Search APIは高品質な結果を提供
          })),
          query: json.query,
          message: `"${query}" で${count}件の画像検索結果を取得しました。`,
        };
      } catch (error) {
        if (retryCount < maxRetries - 1 && error instanceof Error && error.message.includes('429')) {
          retryCount++;
          const delay = baseRetryDelay * retryCount;
          console.warn(`Brave Search API エラー後リトライ中... (試行 ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error('[braveImageSearchTool] 画像検索エラー:', error);
        throw new Error(`画像検索に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // すべてのリトライが失敗した場合
    throw new Error('Brave Search API のレート制限により、すべてのリトライが失敗しました');
  },
});