import { tool } from 'ai';
import { z } from 'zod';
import { google } from '@ai-sdk/google';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { xai } from '@ai-sdk/xai';
import { generateText, CoreMessage } from 'ai'; // Import generateText and CoreMessage

// Helper function to create model dynamically
function createModelForSlide(provider: string, modelName: string) {
  switch (provider) {
    case 'openai':
      // Handle special OpenAI models
      if (modelName === 'o3-pro-2025-06-10') {
        return openai.responses(modelName);
      }
      return openai(modelName);
    case 'claude':
      return anthropic(modelName);
    case 'gemini':
      return google(modelName);
    case 'grok':
      return xai(modelName);
    default:
      // Fallback to default Gemini model
      return google('models/gemini-2.5-pro');
  }
}

export const htmlSlideTool = tool({
  description: 'A powerful tool for generating HTML slide content with extensive customization options. Creates professional slides based on topic and outline, with special priority given to user-provided images for image-based slide generation.\n\nKey Features:\n- 12 layout types: default, image-left, image-right, full-graphic, quote, comparison, timeline, list, title, section-break, data-visualization, photo-with-caption\n- 11 diagram types: auto, bar, pie, flow, venn, pyramid, quadrant, mind-map, timeline, comparison, icons\n- Customizable color schemes with primary, accent, and background colors\n- Advanced design elements: gradients, transparency, geometric patterns, shadows, animations, borders, whitespace\n- Image-based slide generation that analyzes and reflects visual content and style\n- Dynamic model selection support (OpenAI, Claude, Gemini, Grok)\n- Variant generation for multiple design options of the same content',
  parameters: z.object({
    topic: z.string().describe('The main topic or subject of the overall presentation.'),
    outline: z.string().optional().describe('The specific theme, topic, or key points for THIS slide.'),
    slideCount: z.number().default(1).describe('The number of slides to generate with this call. Expected to be 1 by the calling agent.'),
    slideIndex: z.number().optional().describe('Current slide number in sequence (for pagination).'),
    totalSlides: z.number().optional().describe('Total slides in the presentation (for pagination).'),
    imageDataUrl: z.string().optional().describe('A data URL of an image provided by the user. If present, the slide generation should be based on the visual content and style of this image.'),
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
    // Add model parameters
    modelProvider: z.string().optional().describe('The AI model provider to use (openai, claude, gemini, grok).'),
    modelName: z.string().optional().describe('The specific model name to use.'),
  }),
  execute: async ({ topic, outline, slideCount, slideIndex, totalSlides, imageDataUrl, layoutType, diagramType, colorScheme, designElements, fontFamily, forceInclude, variant, modelProvider, modelName }) => {
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
日本のビジネス文化に精通し、企業の経営陣やカンファレンスでも使用できる高品質なスライドを HTML/CSS で作成してください。

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
・参照画像              : ${imageDataUrl ? '提供されています。この画像を最優先で分析し、スライドを生成してください。' : 'なし'}
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

【日本ビジネス文化への特別配慮】
★ **間（ma）の概念**: 意味のある空白スペースを効果的に活用し、情報密度が高くても視覚的に落ち着いたデザインを実現
★ **情報の包括性**: 日本のビジネス文化では詳細情報が重視されるため、西洋式ミニマルとは異なり、必要な情報を適切に配置
★ **階層性の重視**: 組織や概念の階層を明確に表現し、上下関係や重要度を視覚的に示す
★ **プロセス重視**: 結果だけでなく、そこに至る思考過程や分析手順を可視化（道理/doryokuの表現）
★ **文化的色彩配慮**: 
  - 青系統：安定性と信頼性（最も安全な選択）
  - 赤の過度使用回避：強すぎる印象を避ける
  - 白の慎重使用：喪との関連を考慮
  - 金色：威厳と格調を表現（適度に使用）
★ **数字の文化的配慮**: 4と9の使用を可能な限り避け、奇数を好む傾向に配慮
★ **80%現代+20%伝統**: モダンなデザインベースに和の要素を微細に織り込む

【最優先事項】
1. **【超最優先】参照画像の反映**: 参照画像が提供されている場合、その画像の内容、雰囲気、色、レイアウトを完全に理解し、それらを忠実に再現するスライドを生成してください。テキストコンテンツも画像に合わせて調整すること。
2. **日本式プロ品質デザイン** - 国際的な美しさと日本の美意識を融合したデザイン
3. **包括的情報伝達** - 文字と図解の調和による充実した情報提供（日本式の詳細重視）
4. **階層的構成理解** - 情報の重要度と組織階層を明確に表現したレイアウト
5. **文化的適応デザイン** - バリアント値（${promptArgs.variant}）に基づく日本ビジネス文化適応型デザイン
6. **標準アスペクト比** - 16:9アスペクト比で国際標準に対応

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

10. **日本式テキスト設計ガイドライン**
   - 見出し: 32-40px、太字、高コントラスト
   - 本文: 18-24px、読みやすいフォント
   - 箇条書き: 日本式の詳細情報を含む形式、適切な間（ma）で区切り
   - 強調: 色・サイズ・フォントウェイトを使い分ける
   - テキスト量: 日本のビジネス文化に合わせ、包括的情報を提供（50-80単語程度）
   - フォント選択の文化的配慮:
     * 明朝体系: 伝統・権威・フォーマル（重要発表用）
     * ゴシック体系: 現代性・明確性・読みやすさ（一般ビジネス用）
     * 丸ゴシック系: 親しみやすさ・顧客向け（サービス業用）
     * デフォルト: ${promptArgs.fontFamily}

11. **業界別適応デザイン指針**
   - **製造業**: PDCA・改善・5S手法の視覚化、プロセスフロー重視
   - **IT・技術業**: 詳細技術仕様、アーキテクチャ図、システム構成の明確化
   - **金融業**: 規制遵守とリスク管理の強調、保守的で信頼性重視のデザイン
   - **サービス業**: おもてなし哲学、顧客体験、長期関係構築の視覚化

12. **文化的禁忌と配慮事項**
    - **避けるべき色彩パターン**: 過度な赤（火災・危険の連想）、大面積の白（喪の連想）
    - **避けるべき数字**: 4（死の音）、9（苦の音） - 例やステップ数で可能な限り回避
    - **避けるべき視覚的要素**: 菊の花（皇室専用）、しおれた花、鋭利な物体のメタファー
    - **推奨する要素**: 奇数の使用、季節感（適度に）、自然な非対称性

13. **アクセシビリティとレスポンシブデザイン**
    - コントラスト比 AA 準拠
    - SVG要素には適切なalt/aria属性
    - レスポンシブな要素配置（vw/vh単位の活用）

14. **最下部右寄せに "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} — ${promptArgs.topic}" を洗練されたデザインで表示**

15. **日本式バリアントによるデザイン差別化（バリアント: ${promptArgs.variant}）**
    - バリアント1: 伝統的で信頼性重視のデザイン（保守的・階層明確）
    - バリアント2: 現代的で革新性を表現したデザイン（進歩的・国際的）
    - バリアント3: 和モダンでエレガントなデザイン（美意識・品格重視）

16. **必須含有要素の組み込み**
    「${promptArgs.forceInclude}」を確実にスライド内に含めること。

17. **絶対禁止事項**
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

    const systemPreamble = `You are a professional presentation designer specializing in Japanese business culture and creating high-quality slides for Japanese corporate environments.

CRITICAL CULTURAL AWARENESS:
- Understand Japanese business aesthetics: balance of ma (meaningful space) with comprehensive information
- Respect Japanese color psychology and cultural taboos
- Apply 80% modern + 20% traditional design philosophy
- Prioritize hierarchy, process visualization, and detailed information over Western minimalism

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

NOTHING ELSE. NO TEXT BEFORE OR AFTER.`;

    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; }</style><section class="slide error-slide"><h1>Error</h1><p>Could not generate slide content and CSS.</p></section>';
    let message = `Failed to generate slide for topic "${topic}" and outline "${outline || 'N/A'}".`;
    let variantInfo = '';
    if (variant && variant > 1) {
      variantInfo = ` (variant ${variant})`;
    }

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const userContent: any = [{ type: 'text', text: baseDesignPrompt }];

        if (imageDataUrl) {
          userContent.unshift({
            type: 'image',
            image: imageDataUrl,
          } as any);
        }

        // Create model dynamically based on provided parameters
        const model = createModelForSlide(
          modelProvider || 'gemini',
          modelName || 'models/gemini-2.5-pro'
        );
        
        console.log(`[htmlSlideTool] Generating slide for topic: "${topic}", outline: "${outline}" using ${modelProvider || 'gemini'} model: ${modelName || 'models/gemini-2.5-pro'}`);
        
        const { text: generatedHtml } = await generateText({
          model: model,
          system: systemPreamble,
          messages: [{ role: 'user', content: userContent }],
        });

        if (generatedHtml && generatedHtml.trim().startsWith('<style>') && generatedHtml.trim().includes('</style>') && generatedHtml.trim().includes('<section class="slide')) {
          slideHtmlAndCss = generatedHtml.trim();
          message = `Successfully generated HTML and CSS for the slide focusing on "${outline || topic}"${variantInfo}.`;
          break; // Success, exit loop
        } else {
          message = `Attempt ${attempt}/${maxRetries}: Generated content was not in the expected format.`;
          if (attempt === maxRetries) {
             console.warn("[htmlSlideTool] LLM output did not match expected <style> + <section> format after all retries.", generatedHtml);
             slideHtmlAndCss = `<style>.fallback-slide h1 { color: #555; }</style><section class="slide fallback-slide"><h1>${outline || topic}</h1><p>Content generation issue after ${maxRetries} retries. Please check LLM response.</p></section>`;
          }
        }
      } catch (error) {
        message = `Attempt ${attempt}/${maxRetries}: Error generating slide content.`;
        if (attempt === maxRetries) {
          console.error(`[htmlSlideTool] Error generating slide content after ${maxRetries} attempts:`, error);
        }
      }
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