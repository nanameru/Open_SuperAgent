import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic'; // Import Anthropic
import { generateText } from 'ai'; // Import generateText

export const htmlSlideTool = tool({
  description: 'Generates the HTML content for a single slide section (within <section class="slide"></section>) using an LLM. It takes a general topic and a specific outline point for this particular slide.',
  parameters: z.object({
    topic: z.string().describe('The main topic or subject of the overall presentation.'),
    outline: z.string().optional().describe('The specific theme, topic, or key points for THIS slide.'),
    slideCount: z.number().default(1).describe('The number of slides to generate with this call. Expected to be 1 by the calling agent.'),
  }),
  execute: async ({ topic, outline, slideCount }) => {
    // slideCount is expected to be 1 when called by slideCreatorAgent.
    // The outline parameter is the specific point for this single slide.

    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}`;

    // Arguments for the new flexible prompt.
    // Future enhancement: These should ideally come from tool parameters or agent context.
    const promptArgs = {
      topic: topic,
      outline: outline || topic, // If outline is not provided, use the main topic.
      slideIndex: 'current', // Placeholder, as this is not passed to the tool currently
      totalSlides: 'N',    // Placeholder, as this is not passed to the tool currently
      primaryColor: '#0056B1', // Default primary color
      accentColor: '#FFB400',  // Default accent color
      bgColor: '#F5F7FA',      // Default background color
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif", // Default font family
      layoutType: 'default',   // Default layout type
      diagramType: 'none',     // Default diagram type (can be 'bar', 'pie', 'flow')
      extras: '',             // Default additional elements (e.g., 'quote,table')
      uniqueClass: uniqueSlideClass
    };

    const systemPrompt = `あなたは「日本語プレゼン資料のハイエンド HTML/CSS デザイナー」です。
以下の入力パラメータを参照し、指示に厳密に従いながらも、状況に応じた最適なスライドを生成してください。

【入力パラメータ】 ※{ ... } は呼び出し側で置換
・メインテーマ          : ${promptArgs.topic}
・このスライドの要点    : ${promptArgs.outline}
・スライド番号 / 総枚数 : ${promptArgs.slideIndex} / ${promptArgs.totalSlides}
・テーマカラー          : ${promptArgs.primaryColor}
・アクセントカラー      : ${promptArgs.accentColor}
・背景カラー            : ${promptArgs.bgColor}
・フォントファミリー    : ${promptArgs.fontFamily}
・レイアウトタイプ      : ${promptArgs.layoutType}
・図解タイプ            : ${promptArgs.diagramType}
・追加要素              : ${promptArgs.extras}

【出力要件】
1. **<style>** ブロックと **<section class="slide ...">...</section>** のみ返す。
2. CSS はクラス \`.${promptArgs.uniqueClass}\` にスコープし、他要素へ影響させない。
3. 未指定パラメータはデフォルト値を採用。
4. 生成する HTML 構造は **layoutType** ('${promptArgs.layoutType}') に応じて以下を参考に柔軟に変形すること。
   - 'default'      : 見出し + 段落 + 図解 + 箇条書き
   - 'image-left'   : 左に図解 / 右に本文
   - 'image-right'  : 右に図解 / 左に本文
   - 'full-graphic' : 図解やヒーローイメージを背景全面に敷き本文を重ねる
5. 図解を生成する場合は **diagramType** ('${promptArgs.diagramType}') に合わせて inline SVG で描画し、日本語ラベルを付ける。
6. 追加要素 **extras** ('${promptArgs.extras}') が含まれる場合は、該当要素を HTML 内で生成する。
   - quote       → <blockquote>
   - code-block  → <pre><code>
   - table       → <table> （2〜3 列、3〜4 行のサンプルで可）
7. 見出し・本文・図解・追加要素の順序は、**layoutType** と UX を考慮して最適化せよ。
8. **日本語 Web フォント**を必ず指定（デフォルト ${promptArgs.fontFamily}）。
9. アクセシビリティ重視: コントラスト比 AA 準拠、alt や aria-label を適宜付与。
10. **禁止事項**
    - <html>, <head>, <body> を含めない
    - 外部画像 URL を使用しない（すべて SVG で完結）
    - CSS リセット・大域フォント変更を行わない
11. 最下部右寄せに "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} — ${promptArgs.topic}" を 0.8rem で薄く表示。
12. **出力フォーマット例**
    \`\`\`
    <style>
    /* スコープされた CSS */
    </style>
    <section class="slide ${promptArgs.uniqueClass}">
      <!-- コンテンツ -->
    </section>
    \`\`\`

【思考プロセス (LLM 内部)】
- 入力値を評価し、必要なデフォルトを補完。
- layoutType・diagramType・extras の組合せから最適な DOM 構造を決定。
- コンテンツとスタイルがバランスよく配置されるように調整。
- SVG 図解は simple かつ視認性を重視し、構造的に正しい要素でマークアップ。

このガイドラインに従い、ハイクオリティかつ状況に合わせた柔軟なスライドを出力せよ。`;

    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; }</style><section class="slide error-slide"><h1>Error</h1><p>Could not generate slide content and CSS.</p></section>';
    let message = `Failed to generate slide for topic "${topic}" and outline "${outline || 'N/A'}".`;

    try {
      // console.log(`[htmlSlideTool] Generating slide for topic: "${topic}", outline: "${outline}"`);
      const { text: generatedHtml } = await generateText({
        model: anthropic('claude-3-7-sonnet-20250219'), // Use Anthropic model
        prompt: systemPrompt, // The detailed instructions form the system prompt
      });

      // Basic validation or cleaning if necessary - for now, assume LLM adheres to format
      if (generatedHtml && generatedHtml.trim().startsWith('<style>')
        && generatedHtml.trim().includes('</style>')
        && generatedHtml.trim().includes('<section class="slide')) {
        slideHtmlAndCss = generatedHtml.trim();
        message = `Successfully generated HTML and CSS for the slide focusing on "${outline || topic}".`;
      } else {
        console.warn("[htmlSlideTool] LLM output did not match expected <style> + <section> format. Using fallback.", generatedHtml);
        // Fallback if LLM output is not as expected, to prevent breaking agent flow.
        slideHtmlAndCss = `<style>.fallback-slide-${Math.random().toString(36).substring(7)} h1 { color: #555; }</style><section class="slide fallback-slide-${Math.random().toString(36).substring(7)}"><h1>${outline || topic}</h1><p>Content generation issue (CSS+HTML). Please check LLM response. Outline was: ${outline}</p></section>`;
        message = `Warning: Generated HTML/CSS for slide "${outline || topic}" might not be correctly formatted.`;
      }

    } catch (error) {
      console.error('[htmlSlideTool] Error generating slide content:', error);
      // Keep the default error HTML and message in case of an exception
    }

    return {
      htmlContent: slideHtmlAndCss, // This key is expected by slideCreatorAgent
      message: message,
    };
  },
}); 