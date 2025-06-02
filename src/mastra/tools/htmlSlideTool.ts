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
    slideIndex: z.number().optional().describe('Current slide number in sequence (for pagination).'),
    totalSlides: z.number().optional().describe('Total slides in the presentation (for pagination).'),
    layoutType: z.enum(['default', 'image-left', 'image-right', 'full-graphic', 'quote', 'comparison', 'timeline', 'list', 'title', 'section-break', 'data-visualization', 'photo-with-caption']).optional().describe('The desired slide layout type.'),
    diagramType: z.enum(['auto', 'bar', 'pie', 'flow', 'venn', 'pyramid', 'quadrant', 'mind-map', 'timeline', 'comparison', 'icons', 'none']).optional().default('auto').describe('Type of diagram to include in the slide.'),
    colorScheme: z.object({
      primaryColor: z.string().optional().describe('Primary color hex code (e.g., #0056B1).'),
      accentColor: z.string().optional().describe('Accent color hex code (e.g., #FFB400).'),
      bgColor: z.string().optional().describe('Background color hex code (e.g., #F5F7FA).'),
    }).optional().describe('Color scheme for the slide.'),
    designElements: z.array(z.enum(['gradients', 'transparency', 'geometric', 'shadows', 'animations', 'borders', 'whitespace'])).optional().describe('Special design elements to include.'),
    fontFamily: z.string().optional().describe('Font family to use for the slide.'),
    forceInclude: z.string().optional().describe('Specific content that must be included in the slide (e.g., quote, stat, diagram).'),
    variant: z.number().optional().default(1).describe('Generate a specific variant (1, 2, 3) for different design options of the same content.'),
  }),
  execute: async ({ topic, outline, slideCount, slideIndex, totalSlides, layoutType, diagramType, colorScheme, designElements, fontFamily, forceInclude, variant }) => {
    // slideCount is expected to be 1 when called by slideCreatorAgent.
    // The outline parameter is the specific point for this single slide.

    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}-v${variant || 1}`;

    // Arguments for the new flexible prompt.
    const promptArgs = {
      topic: topic,
      outline: outline || topic, // If outline is not provided, use the main topic.
      slideIndex: slideIndex?.toString() || 'current', 
      totalSlides: totalSlides?.toString() || 'N',
      primaryColor: colorScheme?.primaryColor || '#0056B1', // Default primary color
      accentColor: colorScheme?.accentColor || '#FFB400',  // Default accent color
      bgColor: colorScheme?.bgColor || '#F5F7FA',      // Default background color
      fontFamily: fontFamily || "'Noto Sans JP', 'Hiragino Sans', sans-serif", // Default font family
      layoutType: layoutType || 'default',   // Default layout type
      diagramType: diagramType || 'auto',    // Default diagram type
      extras: designElements?.join(', ') || 'modern-design',  // Added modern-design by default
      uniqueClass: uniqueSlideClass,
      variant: variant || 1,
      forceInclude: forceInclude || ''
    };

    const baseDesignPrompt = `あなたはプロフェッショナルな「プレゼンテーションデザイナー」です。
企業の経営陣やカンファレンスでも使用できる高品質なスライドを HTML/CSS で作成してください。

【重要】出力形式の絶対的ルール
必ず以下の形式で出力してください：
1. 最初に<style>タグから始める
2. </style>タグで閉じる
3. 次に<section class="slide ${promptArgs.uniqueClass}">から始める
4. </section>タグで閉じる
5. これ以外の要素（HTMLタグ、説明文、コメントなど）は一切含めない

【入力パラメータ】
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
・必須含有要素          : ${promptArgs.forceInclude}
・バリアント           : ${promptArgs.variant}

【最優先事項】
1. **プロ品質のスライドデザイン** - アップルやグーグルのプレゼンに匹敵する美しさを目指す
2. **視覚的情報伝達** - 文字だけでなく、図解・アイコン・視覚要素を必ず含める
3. **一目で理解できる構成** - 情報は階層化し、視線の流れを意識したレイアウト
4. **バリアント別デザイン** - バリアント値（${promptArgs.variant}）に基づいて異なるデザインスタイルを提供
5. **16:9アスペクト比** - すべてのスライドを16:9アスペクト比に統一

【出力要件】
1. **必ず<style>タグから始め、</style>タグで閉じる**
2. **必ず<section class="slide ${promptArgs.uniqueClass}">から始め、</section>タグで閉じる**
3. **上記以外のタグや文字は一切出力しない**
4. CSS はクラス \`.${promptArgs.uniqueClass}\` にスコープし、他要素へ影響させない
5. **スライドの寸法を16:9のアスペクト比に固定する**
   - width: 100%
   - height: 0
   - padding-bottom: 56.25% (16:9のアスペクト比)
   - または適切なvw/vhユニットを使用
6. 生成する HTML 構造は **layoutType** に応じて以下を参考に柔軟に変形すること。
   - 'default'           : 大きな見出し + 簡潔な本文 + 視覚的図解 + 箇条書き（3項目程度）
   - 'image-left'        : 左側に図解・イラスト / 右側に簡潔な本文とポイント
   - 'image-right'       : 右側に図解・イラスト / 左側に簡潔な本文とポイント
   - 'full-graphic'      : 背景全体に図解・グラデーション・パターンを配置、その上に重要メッセージを配置
   - 'quote'             : 引用を中央に大きく配置、引用者情報は右下に小さく
   - 'comparison'        : 左右または上下で項目を比較する2カラムレイアウト
   - 'timeline'          : 水平または垂直のタイムライン図解を中心に配置
   - 'list'              : 箇条書きを中心としたシンプルな構成（最大5-6項目）
   - 'title'             : メインタイトルスライド（プレゼン冒頭用）
   - 'section-break'     : セクション区切りを示す大見出しのみのスライド
   - 'data-visualization': データビジュアライゼーションを中心としたスライド
   - 'photo-with-caption' : 印象的な写真またはイラストと簡潔なキャプション

7. **図解とビジュアル要素（必須）**
   **diagramType** ('${promptArgs.diagramType}') に基づいて適切な図解を SVG で生成：
   - 'auto'        : 内容に最適な図解を自動選択
   - 'bar'         : 棒グラフ（項目比較に最適）
   - 'pie'         : 円グラフ（構成比に最適）
   - 'flow'        : フロー図（プロセス説明に最適）
   - 'venn'        : ベン図（関係性説明に最適）
   - 'pyramid'     : ピラミッド図（階層説明に最適）
   - 'quadrant'    : 四象限図（分類説明に最適）
   - 'mind-map'    : マインドマップ（概念関係説明に最適）
   - 'timeline'    : タイムライン（時系列説明に最適）
   - 'comparison'  : 比較表（複数項目比較に最適）
   - 'icons'       : テーマに関連するアイコンセット
   - 'none'        : 図解なし（テキストのみ重視する場合）

8. **モダンデザイン要素（必須）**
   以下のデザイン要素を必ず1つ以上含める：
   - 洗練されたグラデーション背景
   - 半透明の図形やオーバーレイ
   - 幾何学的なアクセントパターン
   - 影やドロップシャドウ効果
   - アニメーション効果（CSS transitions/animations）
   - スタイリッシュなボーダーやセパレーター
   - 適切なホワイトスペース（余白）の活用

9. **テキスト設計ガイドライン**
   - 見出し: 32-40px、太字、高コントラスト
   - 本文: 18-24px、読みやすいフォント
   - 箇条書き: 簡潔で1行以内、前後に十分な余白
   - 強調: 色・サイズ・フォントウェイトを使い分ける
   - テキスト量: 1スライドあたり30-50単語程度に抑える
   - フォント: スタイリッシュで読みやすい日本語Webフォントを使用（デフォルト ${promptArgs.fontFamily}）

10. **アクセシビリティとレスポンシブデザイン**
    - コントラスト比 AA 準拠
    - SVG要素には適切なalt/aria属性
    - レスポンシブな要素配置（vw/vh単位の活用）

11. **最下部右寄せに "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} — ${promptArgs.topic}" を洗練されたデザインで表示**

12. **バリアントによるデザイン差別化（バリアント: ${promptArgs.variant}）**
    - バリアント1: 標準的でクリーンなデザイン
    - バリアント2: より大胆で視覚的なインパクトを重視したデザイン
    - バリアント3: よりミニマリストでエレガントなデザイン

13. **必須含有要素の組み込み**
    「${promptArgs.forceInclude}」を確実にスライド内に含めること。

14. **絶対禁止事項**
    - <html>, <head>, <body> タグの使用
    - 外部画像URL（すべてSVGで完結）
    - CSS リセット・大域フォント変更
    - 過度な装飾や読みにくいデザイン
    - 情報過多（1スライドに詰め込みすぎない）
    - **説明文、コメント、マークダウン、バッククォートの使用**
    - **<style>タグと<section>タグ以外のトップレベル要素**

【正しい出力フォーマット（これ以外の形式は禁止）】
<style>
.${promptArgs.uniqueClass} {
  /* ベーススタイル */
}
/* 他のセレクタとスタイル... */
</style>
<section class="slide ${promptArgs.uniqueClass}">
  <!-- スライドコンテンツ -->
</section>

【最重要】上記の形式以外は絶対に出力しないでください。説明やコメントも不要です。`;

    const systemPrompt = `You are a professional presentation designer creating high-quality slides.

CRITICAL OUTPUT REQUIREMENTS:
1. Output MUST start with <style> tag
2. Output MUST include </style> tag
3. Output MUST then have <section class="slide ..."> tag
4. Output MUST end with </section> tag
5. NO other content, NO markdown, NO explanations, NO comments

Your output should be EXACTLY in this format:
<style>
/* CSS rules here */
</style>
<section class="slide ...">
<!-- HTML content here -->
</section>

NOTHING ELSE. NO TEXT BEFORE OR AFTER.

${baseDesignPrompt}`;

    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; }</style><section class="slide error-slide"><h1>Error</h1><p>Could not generate slide content and CSS.</p></section>';
    let message = `Failed to generate slide for topic "${topic}" and outline "${outline || 'N/A'}".`;
    let variantInfo = '';
    if (variant && variant > 1) {
      variantInfo = ` (variant ${variant})`;
    }

    try {
      // console.log(`[htmlSlideTool] Generating slide for topic: "${topic}", outline: "${outline}"`);
      const { text: generatedHtml } = await generateText({
        model: anthropic('claude-opus-4-20250514'), // Use Anthropic model
        prompt: systemPrompt, // The detailed instructions form the system prompt
      });

      // Basic validation or cleaning if necessary - for now, assume LLM adheres to format
      if (generatedHtml && generatedHtml.trim().startsWith('<style>')
        && generatedHtml.trim().includes('</style>')
        && generatedHtml.trim().includes('<section class="slide')) {
        slideHtmlAndCss = generatedHtml.trim();
        message = `Successfully generated HTML and CSS for the slide focusing on "${outline || topic}"${variantInfo}.`;
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
      variant: variant || 1,
      layoutType: layoutType || 'default', 
      diagramType: diagramType || 'auto'
    };
  },
}); 