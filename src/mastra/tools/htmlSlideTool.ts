import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic'; // Import Anthropic
import { generateText } from 'ai'; // Import generateText

export const htmlSlideTool = tool({
  description: 'Generates professional HTML slides with enhanced prompt specifications, Reveal.js compatibility, and human review optimization. Supports detailed customization for slide structure, design, target audience, and tone.',
  parameters: z.object({
    topic: z.string().describe('The main topic or subject of the overall presentation.'),
    outline: z.string().optional().describe('The specific theme, topic, or key points for THIS slide.'),
    slideCount: z.number().default(1).describe('The number of slides to generate with this call. Expected to be 1 by the calling agent.'),
    slideIndex: z.number().optional().describe('Current slide number in sequence (for pagination).'),
    totalSlides: z.number().optional().describe('Total slides in the presentation (for pagination).'),
    
    // Enhanced prompt specifications
    targetAudience: z.object({
      level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional().default('intermediate').describe('Technical/knowledge level of the audience.'),
      role: z.string().optional().describe('Professional role or context (e.g., "executives", "developers", "students", "general public").'),
      industry: z.string().optional().describe('Industry or domain context (e.g., "healthcare", "finance", "education", "technology").'),
      size: z.enum(['small-group', 'medium-group', 'large-audience', 'webinar']).optional().default('medium-group').describe('Audience size context.'),
    }).optional().describe('Target audience specifications for content adaptation.'),
    
    presentationContext: z.object({
      purpose: z.enum(['educate', 'persuade', 'inform', 'entertain', 'sell', 'report']).optional().default('inform').describe('Primary purpose of the presentation.'),
      setting: z.enum(['conference', 'meeting', 'classroom', 'webinar', 'pitch', 'report']).optional().default('meeting').describe('Presentation setting/context.'),
      duration: z.number().optional().describe('Total presentation duration in minutes.'),
      tone: z.enum(['professional', 'casual', 'academic', 'inspiring', 'urgent', 'friendly']).optional().default('professional').describe('Overall tone and style.'),
    }).optional().describe('Presentation context and purpose.'),
    
    contentSpecification: z.object({
      complexity: z.enum(['simple', 'moderate', 'detailed', 'comprehensive']).optional().default('moderate').describe('Content complexity level.'),
      focusAreas: z.array(z.string()).optional().describe('Key focus areas or themes to emphasize.'),
      keyMessage: z.string().optional().describe('Primary message or takeaway for this slide.'),
      supportingData: z.string().optional().describe('Supporting data, statistics, or evidence to include.'),
    }).optional().describe('Detailed content specifications.'),
    
    // Enhanced design and layout options
    layoutType: z.enum(['default', 'image-left', 'image-right', 'full-graphic', 'quote', 'comparison', 'timeline', 'list', 'title', 'section-break', 'data-visualization', 'photo-with-caption', 'reveal-title', 'reveal-content', 'reveal-transition']).optional().describe('The desired slide layout type, including Reveal.js specific layouts.'),
    diagramType: z.enum(['auto', 'bar', 'pie', 'flow', 'venn', 'pyramid', 'quadrant', 'mind-map', 'timeline', 'comparison', 'icons', 'none']).optional().default('auto').describe('Type of diagram to include in the slide.'),
    
    revealJsOptions: z.object({
      transition: z.enum(['slide', 'fade', 'convex', 'concave', 'zoom']).optional().default('slide').describe('Reveal.js transition effect.'),
      backgroundType: z.enum(['color', 'gradient', 'image', 'video']).optional().default('color').describe('Background type for Reveal.js.'),
      verticalSlide: z.boolean().optional().default(false).describe('Whether this is a vertical (nested) slide in Reveal.js.'),
      notes: z.string().optional().describe('Speaker notes for Reveal.js presenter mode.'),
    }).optional().describe('Reveal.js specific configuration options.'),
    
    colorScheme: z.object({
      primaryColor: z.string().optional().describe('Primary color hex code (e.g., #0056B1).'),
      accentColor: z.string().optional().describe('Accent color hex code (e.g., #FFB400).'),
      bgColor: z.string().optional().describe('Background color hex code (e.g., #F5F7FA).'),
    }).optional().describe('Color scheme for the slide.'),
    designElements: z.array(z.enum(['gradients', 'transparency', 'geometric', 'shadows', 'animations', 'borders', 'whitespace'])).optional().describe('Special design elements to include.'),
    fontFamily: z.string().optional().describe('Font family to use for the slide.'),
    forceInclude: z.string().optional().describe('Specific content that must be included in the slide (e.g., quote, stat, diagram).'),
    variant: z.number().optional().default(1).describe('Generate a specific variant (1, 2, 3) for different design options of the same content.'),
    
    // Human review and feedback options
    humanReviewMode: z.boolean().optional().default(true).describe('Enable human review mode with editable regions and semantic markup.'),
    feedbackContext: z.string().optional().describe('Previous feedback or refinement requests for iterative improvement.'),
    refinementTarget: z.enum(['content', 'design', 'layout', 'tone', 'clarity']).optional().describe('Specific area to focus refinement on.'),
  }),
  execute: async ({ 
    topic, outline, slideCount, slideIndex, totalSlides, 
    targetAudience, presentationContext, contentSpecification,
    layoutType, diagramType, revealJsOptions,
    colorScheme, designElements, fontFamily, forceInclude, variant,
    humanReviewMode, feedbackContext, refinementTarget
  }) => {
    // slideCount is expected to be 1 when called by slideCreatorAgent.
    // The outline parameter is the specific point for this single slide.

    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}-v${variant || 1}`;

    // Enhanced arguments with new parameters
    const promptArgs = {
      topic: topic,
      outline: outline || topic,
      slideIndex: slideIndex?.toString() || 'current', 
      totalSlides: totalSlides?.toString() || 'N',
      
      // Enhanced context
      audienceLevel: targetAudience?.level || 'intermediate',
      audienceRole: targetAudience?.role || 'general audience',
      audienceIndustry: targetAudience?.industry || 'general',
      audienceSize: targetAudience?.size || 'medium-group',
      
      presentationPurpose: presentationContext?.purpose || 'inform',
      presentationSetting: presentationContext?.setting || 'meeting', 
      presentationTone: presentationContext?.tone || 'professional',
      presentationDuration: presentationContext?.duration || null,
      
      contentComplexity: contentSpecification?.complexity || 'moderate',
      keyMessage: contentSpecification?.keyMessage || '',
      focusAreas: contentSpecification?.focusAreas?.join(', ') || '',
      supportingData: contentSpecification?.supportingData || '',
      
      // Design and technical
      primaryColor: colorScheme?.primaryColor || '#0056B1',
      accentColor: colorScheme?.accentColor || '#FFB400',
      bgColor: colorScheme?.bgColor || '#F5F7FA',
      fontFamily: fontFamily || "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      layoutType: layoutType || 'default',
      diagramType: diagramType || 'auto',
      extras: designElements?.join(', ') || 'modern-design',
      
      // Reveal.js specific
      revealTransition: revealJsOptions?.transition || 'slide',
      revealBackground: revealJsOptions?.backgroundType || 'color',
      isVerticalSlide: revealJsOptions?.verticalSlide || false,
      speakerNotes: revealJsOptions?.notes || '',
      
      // Human review and feedback
      humanReview: humanReviewMode ?? true,
      feedbackContext: feedbackContext || '',
      refinementFocus: refinementTarget || '',
      
      uniqueClass: uniqueSlideClass,
      variant: variant || 1,
      forceInclude: forceInclude || ''
    };

    const baseDesignPrompt = `あなたは高度な「プレゼンテーションデザイナー」として、SlidesAI.io、Presentations.AI、Reveal.jsのベストプラクティスを適用した最高品質のスライドを作成してください。

【重要】出力形式の絶対的ルール（Reveal.js互換）
必ず以下のReveal.js互換形式で出力してください：
1. 最初に<style>タグから始める
2. </style>タグで閉じる
3. 次に<section class="slide ${promptArgs.uniqueClass}" data-transition="${promptArgs.revealTransition}" data-background-type="${promptArgs.revealBackground}">から始める
4. 人間レビュー用コメント配置（humanReview: ${promptArgs.humanReview}）
5. </section>タグで閉じる
6. これ以外の要素（HTMLタグ、説明文、コメントなど）は一切含めない

【コンテキスト仕様】
・メインテーマ          : ${promptArgs.topic}
・このスライドの要点    : ${promptArgs.outline}
・スライド番号 / 総枚数 : ${promptArgs.slideIndex} / ${promptArgs.totalSlides}

【対象読者分析】
・知識レベル           : ${promptArgs.audienceLevel} (beginner/intermediate/advanced/expert)
・読者の役割           : ${promptArgs.audienceRole}
・業界・分野           : ${promptArgs.audienceIndustry}
・読者規模             : ${promptArgs.audienceSize}

【プレゼンテーション仕様】
・目的                 : ${promptArgs.presentationPurpose} (educate/persuade/inform/entertain/sell/report)
・設定・環境           : ${promptArgs.presentationSetting} (conference/meeting/classroom/webinar/pitch/report)
・トーン               : ${promptArgs.presentationTone} (professional/casual/academic/inspiring/urgent/friendly)
・推定時間             : ${promptArgs.presentationDuration ? promptArgs.presentationDuration + '分' : '指定なし'}

【コンテンツ詳細仕様】
・複雑度               : ${promptArgs.contentComplexity} (simple/moderate/detailed/comprehensive)
・キーメッセージ       : ${promptArgs.keyMessage}
・重点分野             : ${promptArgs.focusAreas}
・裏付けデータ         : ${promptArgs.supportingData}

【デザイン・技術仕様】
・テーマカラー         : ${promptArgs.primaryColor}
・アクセントカラー     : ${promptArgs.accentColor}
・背景カラー           : ${promptArgs.bgColor}
・フォントファミリー   : ${promptArgs.fontFamily}
・レイアウトタイプ     : ${promptArgs.layoutType}
・図解タイプ           : ${promptArgs.diagramType}
・追加要素             : ${promptArgs.extras}
・必須含有要素         : ${promptArgs.forceInclude}
・バリアント          : ${promptArgs.variant}

【Reveal.js仕様】
・トランジション効果   : ${promptArgs.revealTransition} (slide/fade/convex/concave/zoom)
・背景タイプ           : ${promptArgs.revealBackground} (color/gradient/image/video)
・垂直スライド         : ${promptArgs.isVerticalSlide ? 'はい' : 'いいえ'}
・スピーカーノート     : ${promptArgs.speakerNotes}

【反復改善・フィードバック】
・前回フィードバック   : ${promptArgs.feedbackContext}
・改善焦点             : ${promptArgs.refinementFocus} (content/design/layout/tone/clarity)

【最優先事項（SlidesAI.io / Presentations.AI / Reveal.js ベストプラクティス統合）】
1. **プロ品質のスライドデザイン** - SlidesAI.ioレベルの洗練性とReveal.jsの技術力を融合
2. **読者中心設計** - ${promptArgs.audienceLevel}レベルの${promptArgs.audienceRole}に最適化
3. **視覚的情報伝達** - 図解・アイコン・視覚要素で${promptArgs.presentationPurpose}を効果的に実現
4. **人間編集最適化** - 後編集しやすいセマンティック構造と明確なコメント配置
5. **Reveal.js完全互換** - data属性とクラス設計でReveal.jsエコシステムと完全連携
6. **反復改善対応** - フィードバック（${promptArgs.feedbackContext}）を反映し、${promptArgs.refinementFocus}を重点改善

【Reveal.js互換出力要件】
1. **Reveal.js仕様のsectionタグ**: <section class="slide ${promptArgs.uniqueClass}" data-transition="${promptArgs.revealTransition}" data-background="${promptArgs.revealBackground}">
2. **人間レビューモード**: ${promptArgs.humanReview ? 'HTML内に<!-- EDIT: [セクション名] --> コメントを配置' : 'コメントなしの最適化済み出力'}
3. **セマンティック構造**: Reveal.js標準のdata属性とARIA属性を適切に配置
4. **スピーカーノート**: ${promptArgs.speakerNotes ? '<aside class="notes">' + promptArgs.speakerNotes + '</aside>' : ''}を末尾に配置
5. **CSS スコープ化**: 必ずクラス \`.${promptArgs.uniqueClass}\` にスコープし、他要素へ影響させない
6. **16:9アスペクト比**: width: 100vw; height: 100vh; または適切なReveal.js準拠寸法
7. **レスポンシブ対応**: Reveal.jsのビューポート変更に対応した柔軟なサイジング

【拡張レイアウトタイプ（Reveal.js最適化）】
   - 'default'             : 大きな見出し + 簡潔な本文 + 視覚的図解 + 箇条書き（3項目程度）
   - 'image-left'          : 左側に図解・イラスト / 右側に簡潔な本文とポイント
   - 'image-right'         : 右側に図解・イラスト / 左側に簡潔な本文とポイント
   - 'full-graphic'        : 背景全体に図解・グラデーション・パターンを配置、その上に重要メッセージを配置
   - 'quote'               : 引用を中央に大きく配置、引用者情報は右下に小さく
   - 'comparison'          : 左右または上下で項目を比較する2カラムレイアウト
   - 'timeline'            : 水平または垂直のタイムライン図解を中心に配置
   - 'list'                : 箇条書きを中心としたシンプルな構成（最大5-6項目）
   - 'title'               : メインタイトルスライド（プレゼン冒頭用）
   - 'section-break'       : セクション区切りを示す大見出しのみのスライド
   - 'data-visualization'  : データビジュアライゼーションを中心としたスライド
   - 'photo-with-caption'  : 印象的な写真またはイラストと簡潔なキャプション
   - 'reveal-title'        : Reveal.js標準のタイトルスライド（data-background対応）
   - 'reveal-content'      : Reveal.js標準のコンテンツスライド（fragment対応）
   - 'reveal-transition'   : Reveal.js遷移エフェクト最適化スライド

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

8. **構造化されたHTML生成（必須）**
   PPTXへの正確な変換のため、以下の構造化ルールに従う：
   
   a) スライドコンテナ構造:
   <section class="slide ${promptArgs.uniqueClass}" data-layout="${promptArgs.layoutType}" data-slide-index="${promptArgs.slideIndex}">
     <div class="slide-container" style="width: 1280px; height: 720px;">
       <div class="slide-header" data-position="top">
         <!-- タイトル要素 -->
       </div>
       <div class="slide-body" data-layout="${promptArgs.layoutType}">
         <!-- メインコンテンツ -->
       </div>
       <div class="slide-footer" data-position="bottom">
         <!-- フッター要素 -->
       </div>
     </div>
   </section>

   b) セマンティックな要素:
   - タイトル: <h1 class="slide-title" data-element-type="title">
   - サブタイトル: <h2 class="slide-subtitle" data-element-type="subtitle">
   - 本文: <p class="slide-text" data-element-type="body">
   - リスト: <ul class="slide-list" data-element-type="list">
   - 強調ボックス: <div class="concept-box" data-element-type="highlight-box">
   - 図表: <div class="diagram-container" data-element-type="diagram">
   - アイコン: <i class="icon" data-element-type="icon" data-icon-name="...">

   c) レイアウト情報:
   - 2カラム: <div class="flex-container" data-layout="two-column">
              <div class="column-left" data-width="50%">...</div>
              <div class="column-right" data-width="50%">...</div>
            </div>
   - グリッド: <div class="grid-container" data-layout="grid" data-columns="3">

   d) 位置情報:
   - 明示的な位置指定: data-position="top|center|bottom|left|right"
   - サイズ指定: data-width="50%" data-height="200px"

9. **モダンデザイン要素（必須）**
   以下のデザイン要素を必ず1つ以上含める：
   - 洗練されたグラデーション背景
   - 半透明の図形やオーバーレイ
   - 幾何学的なアクセントパターン
   - 影やドロップシャドウ効果
   - アニメーション効果（CSS transitions/animations）
   - スタイリッシュなボーダーやセパレーター
   - 適切なホワイトスペース（余白）の活用

10. **テキスト設計ガイドライン**
   - 見出し: 32-40px、太字、高コントラスト
   - 本文: 18-24px、読みやすいフォント
   - 箇条書き: 簡潔で1行以内、前後に十分な余白
   - 強調: 色・サイズ・フォントウェイトを使い分ける
   - テキスト量: 1スライドあたり30-50単語程度に抑える
   - フォント: スタイリッシュで読みやすい日本語Webフォントを使用（デフォルト ${promptArgs.fontFamily}）

11. **アクセシビリティとレスポンシブデザイン**
    - コントラスト比 AA 準拠
    - SVG要素には適切なalt/aria属性
    - レスポンシブな要素配置（vw/vh単位の活用）

12. **最下部右寄せに "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} — ${promptArgs.topic}" を洗練されたデザインで表示**

13. **バリアントによるデザイン差別化（バリアント: ${promptArgs.variant}）**
    - バリアント1: 標準的でクリーンなデザイン
    - バリアント2: より大胆で視覚的なインパクトを重視したデザイン
    - バリアント3: よりミニマリストでエレガントなデザイン

14. **必須含有要素の組み込み**
    「${promptArgs.forceInclude}」を確実にスライド内に含めること。

15. **人間レビュー・編集最適化**
    ${promptArgs.humanReview ? `
    - HTML内に <!-- EDIT: [タイトル] --> <!-- EDIT: [本文] --> <!-- EDIT: [図解] --> 等のコメントを配置
    - 各セクションを明確に分離し、編集しやすい構造にする
    - data-editable="true" 属性を編集可能要素に付与
    - クラス名は意味的で理解しやすい命名規則を使用` : `
    - 最適化された出力（コメントなし）
    - 高パフォーマンス重視の軽量マークアップ`}

16. **反復改善・フィードバック対応**
    ${promptArgs.feedbackContext ? `
    前回フィードバック対応:
    - フィードバック内容: ${promptArgs.feedbackContext}
    - 改善焦点: ${promptArgs.refinementFocus}
    - 上記の点を重点的に改善し、より良いスライドを生成する` : `
    - 初回生成のため、全体的なバランスを重視
    - 今後の改善のためのベースライン品質を確保`}

17. **読者・コンテキスト適応**
    - 読者レベル（${promptArgs.audienceLevel}）に適した語彙・概念の複雑さ
    - プレゼン目的（${promptArgs.presentationPurpose}）に最適化された構成
    - 設定・環境（${promptArgs.presentationSetting}）に適した視覚的インパクト
    - トーン（${promptArgs.presentationTone}）に合致した色調・フォント選択

18. **Reveal.js統合ベストプラクティス**
    - data-background-* 属性でReveal.jsの背景機能と連携
    - class="fragment" でコンテンツのアニメーション表示対応
    - data-fragment-index でアニメーション順序制御
    - <aside class="notes"> でスピーカーノート統合

19. **絶対禁止事項**
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
        message = `Successfully generated enhanced HTML slide with Reveal.js compatibility and human review optimization for "${outline || topic}"${variantInfo}. Target audience: ${promptArgs.audienceLevel} ${promptArgs.audienceRole}. Purpose: ${promptArgs.presentationPurpose}. ${promptArgs.feedbackContext ? 'Applied feedback: ' + promptArgs.refinementFocus : 'Ready for iterative refinement.'}`;
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
      diagramType: diagramType || 'auto',
      
      // Enhanced metadata for improved workflow
      enhancedFeatures: {
        revealJsCompatible: true,
        humanReviewMode: promptArgs.humanReview,
        targetAudience: {
          level: promptArgs.audienceLevel,
          role: promptArgs.audienceRole,
          industry: promptArgs.audienceIndustry
        },
        presentationContext: {
          purpose: promptArgs.presentationPurpose,
          setting: promptArgs.presentationSetting,
          tone: promptArgs.presentationTone
        },
        feedbackApplied: !!promptArgs.feedbackContext,
        refinementFocus: promptArgs.refinementFocus
      },
      
      // Reveal.js specific metadata
      revealJsMetadata: {
        transition: promptArgs.revealTransition,
        backgroundType: promptArgs.revealBackground,
        isVerticalSlide: promptArgs.isVerticalSlide,
        hasNotes: !!promptArgs.speakerNotes
      }
    };
  },
}); 