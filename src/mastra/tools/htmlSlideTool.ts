import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic'; // Import Anthropic
import { generateText } from 'ai'; // Import generateText

/**
 * Enhanced HTML Slide Generation Tool
 * 
 * This tool generates high-quality HTML slides with enhanced features:
 * - Semantic HTML structure with accessibility features
 * - Reveal.js framework compatibility
 * - CSS framework integration (Bootstrap, Tailwind)
 * - Detailed input specifications for precise customization
 * - Iterative feedback loop support
 * - Improved code readability and maintainability
 */
export const htmlSlideTool = tool({
  description: 'Enhanced HTML slide generation tool that creates professional, accessible slides with semantic structure. Supports detailed customization including theme, target audience, tone, and framework integration (Reveal.js, Bootstrap, Tailwind CSS).',
  parameters: z.object({
    // Core Content Parameters
    topic: z.string().describe('The main topic or subject of the overall presentation.'),
    outline: z.string().optional().describe('The specific theme, topic, or key points for THIS slide.'),
    slideCount: z.number().default(1).describe('The number of slides to generate with this call. Expected to be 1 by the calling agent.'),
    slideIndex: z.number().optional().describe('Current slide number in sequence (for pagination).'),
    totalSlides: z.number().optional().describe('Total slides in the presentation (for pagination).'),
    
    // Enhanced Input Specifications
    presentationTheme: z.string().optional().describe('Overall presentation theme or purpose (e.g., "corporate quarterly review", "product launch", "educational workshop").'),
    targetAudience: z.enum(['executives', 'technical', 'general', 'students', 'customers', 'investors', 'academic', 'mixed']).optional().default('general').describe('Primary target audience for the presentation.'),
    tone: z.enum(['professional', 'casual', 'academic', 'creative', 'persuasive', 'informative', 'inspirational', 'technical']).optional().default('professional').describe('Desired tone and style of the presentation.'),
    
    // Layout and Structure
    layoutType: z.enum(['default', 'image-left', 'image-right', 'full-graphic', 'quote', 'comparison', 'timeline', 'list', 'title', 'section-break', 'data-visualization', 'photo-with-caption']).optional().describe('The desired slide layout type.'),
    slideStructure: z.object({
      hasTitle: z.boolean().optional().default(true).describe('Whether to include a slide title.'),
      hasBulletPoints: z.boolean().optional().default(true).describe('Whether to include bullet points.'),
      hasImages: z.boolean().optional().default(true).describe('Whether to include images or diagrams.'),
      hasFooter: z.boolean().optional().default(true).describe('Whether to include a footer.'),
      maxBulletPoints: z.number().optional().default(5).describe('Maximum number of bullet points (1-8).'),
    }).optional().describe('Detailed structure specifications for the slide.'),
    
    // Visual Design
    diagramType: z.enum(['auto', 'bar', 'pie', 'flow', 'venn', 'pyramid', 'quadrant', 'mind-map', 'timeline', 'comparison', 'icons', 'none']).optional().default('auto').describe('Type of diagram to include in the slide.'),
    colorScheme: z.object({
      primaryColor: z.string().optional().describe('Primary color hex code (e.g., #0056B1).'),
      accentColor: z.string().optional().describe('Accent color hex code (e.g., #FFB400).'),
      bgColor: z.string().optional().describe('Background color hex code (e.g., #F5F7FA).'),
      textColor: z.string().optional().describe('Primary text color hex code (e.g., #333333).'),
      palette: z.enum(['corporate', 'modern', 'vibrant', 'minimal', 'dark', 'light', 'custom']).optional().default('corporate').describe('Predefined color palette style.'),
    }).optional().describe('Comprehensive color scheme for the slide.'),
    designStyle: z.object({
      spacing: z.enum(['compact', 'normal', 'spacious']).optional().default('normal').describe('Overall spacing and margin preferences.'),
      typography: z.enum(['modern', 'classic', 'minimal', 'bold']).optional().default('modern').describe('Typography style preference.'),
      borderRadius: z.enum(['none', 'subtle', 'rounded', 'heavy']).optional().default('subtle').describe('Border radius styling preference.'),
    }).optional().describe('Detailed design style preferences.'),
    designElements: z.array(z.enum(['gradients', 'transparency', 'geometric', 'shadows', 'animations', 'borders', 'whitespace', 'icons', 'patterns'])).optional().describe('Special design elements to include.'),
    fontFamily: z.string().optional().describe('Font family to use for the slide.'),
    
    // Framework Integration
    framework: z.enum(['none', 'revealjs', 'bootstrap', 'tailwind', 'revealjs-bootstrap', 'revealjs-tailwind']).optional().default('none').describe('CSS framework integration preference.'),
    revealJsOptions: z.object({
      transition: z.enum(['none', 'fade', 'slide', 'convex', 'concave', 'zoom']).optional().default('fade').describe('Reveal.js slide transition effect.'),
      backgroundTransition: z.enum(['none', 'fade', 'slide', 'convex', 'concave', 'zoom']).optional().default('fade').describe('Background transition effect.'),
      enableFragments: z.boolean().optional().default(false).describe('Enable fragment animations within the slide.'),
    }).optional().describe('Reveal.js specific configuration options.'),
    
    // Accessibility and Responsive Design
    accessibility: z.object({
      highContrast: z.boolean().optional().default(false).describe('Use high contrast colors for better visibility.'),
      largeText: z.boolean().optional().default(false).describe('Use larger text sizes for better readability.'),
      includeAltText: z.boolean().optional().default(true).describe('Include alt text for images and diagrams.'),
      keyboardNav: z.boolean().optional().default(true).describe('Ensure keyboard navigation compatibility.'),
    }).optional().describe('Accessibility enhancement options.'),
    responsiveDesign: z.boolean().optional().default(true).describe('Generate responsive design that works on different screen sizes.'),
    
    // Content Enhancement
    forceInclude: z.string().optional().describe('Specific content that must be included in the slide (e.g., quote, stat, diagram).'),
    excludeContent: z.string().optional().describe('Content types or elements to avoid in the slide.'),
    variant: z.number().optional().default(1).describe('Generate a specific variant (1, 2, 3) for different design options of the same content.'),
    
    // Iterative Feedback Support
    feedbackMode: z.boolean().optional().default(false).describe('Enable feedback mode for iterative improvements.'),
    previousVersion: z.string().optional().describe('HTML content of previous version for comparison and improvement.'),
    feedbackPoints: z.array(z.string()).optional().describe('Specific feedback points to address in this iteration.'),
  }),
  execute: async ({ 
    topic, 
    outline, 
    slideCount, 
    slideIndex, 
    totalSlides, 
    // Enhanced parameters
    presentationTheme,
    targetAudience,
    tone,
    layoutType, 
    slideStructure,
    diagramType, 
    colorScheme, 
    designStyle,
    designElements, 
    fontFamily, 
    framework,
    revealJsOptions,
    accessibility,
    responsiveDesign,
    forceInclude, 
    excludeContent,
    variant,
    feedbackMode,
    previousVersion,
    feedbackPoints 
  }) => {
    // Enhanced slide generation with comprehensive parameter support
    // slideCount is expected to be 1 when called by slideCreatorAgent.

    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}-v${variant || 1}`;

    // Enhanced prompt arguments with comprehensive parameter support
    const promptArgs = {
      // Core content
      topic: topic,
      outline: outline || topic,
      slideIndex: slideIndex?.toString() || 'current', 
      totalSlides: totalSlides?.toString() || 'N',
      
      // Enhanced specifications
      presentationTheme: presentationTheme || 'general presentation',
      targetAudience: targetAudience || 'general',
      tone: tone || 'professional',
      
      // Structure
      slideStructure: {
        hasTitle: slideStructure?.hasTitle ?? true,
        hasBulletPoints: slideStructure?.hasBulletPoints ?? true,
        hasImages: slideStructure?.hasImages ?? true,
        hasFooter: slideStructure?.hasFooter ?? true,
        maxBulletPoints: slideStructure?.maxBulletPoints || 5,
      },
      
      // Visual design
      colorScheme: {
        primaryColor: colorScheme?.primaryColor || '#0056B1',
        accentColor: colorScheme?.accentColor || '#FFB400',
        bgColor: colorScheme?.bgColor || '#F5F7FA',
        textColor: colorScheme?.textColor || '#333333',
        palette: colorScheme?.palette || 'corporate',
      },
      designStyle: {
        spacing: designStyle?.spacing || 'normal',
        typography: designStyle?.typography || 'modern',
        borderRadius: designStyle?.borderRadius || 'subtle',
      },
      fontFamily: fontFamily || "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      layoutType: layoutType || 'default',
      diagramType: diagramType || 'auto',
      designElements: designElements?.join(', ') || 'modern-design',
      
      // Framework integration
      framework: framework || 'none',
      revealJsOptions: revealJsOptions || {},
      
      // Accessibility and responsive
      accessibility: accessibility || {},
      responsiveDesign: responsiveDesign ?? true,
      
      // Content control
      forceInclude: forceInclude || '',
      excludeContent: excludeContent || '',
      
      // Feedback and iteration
      feedbackMode: feedbackMode || false,
      previousVersion: previousVersion || '',
      feedbackPoints: feedbackPoints || [],
      
      // Technical
      uniqueClass: uniqueSlideClass,
      variant: variant || 1,
    };

    // Enhanced design prompt with comprehensive feature support
    const baseDesignPrompt = `あなたは最先端の「エンハンスド・プレゼンテーションデザイナー」です。
高品質でアクセシブル、かつ最新のベストプラクティスに準拠したHTMLスライドを作成してください。

【重要】出力形式の絶対的ルール
必ず以下の形式で出力してください：
1. 最初に<style>タグから始める
2. </style>タグで閉じる
3. 次に<section>タグから始める
4. </section>タグで閉じる
5. これ以外の要素（HTMLタグ、説明文、コメントなど）は一切含めない

【入力パラメータ】
■ 基本情報
・メインテーマ            : ${promptArgs.topic}
・スライド要点            : ${promptArgs.outline}
・プレゼンテーマ          : ${promptArgs.presentationTheme}
・対象読者                : ${promptArgs.targetAudience}
・トーン                  : ${promptArgs.tone}
・スライド番号 / 総枚数   : ${promptArgs.slideIndex} / ${promptArgs.totalSlides}

■ 構造設定
・タイトル表示            : ${promptArgs.slideStructure.hasTitle}
・箇条書き表示            : ${promptArgs.slideStructure.hasBulletPoints}
・画像/図表表示           : ${promptArgs.slideStructure.hasImages}
・フッター表示            : ${promptArgs.slideStructure.hasFooter}
・最大箇条書き数          : ${promptArgs.slideStructure.maxBulletPoints}
・レイアウトタイプ        : ${promptArgs.layoutType}
・図解タイプ              : ${promptArgs.diagramType}

■ デザイン設定
・カラーパレット          : ${promptArgs.colorScheme.palette}
・プライマリカラー        : ${promptArgs.colorScheme.primaryColor}
・アクセントカラー        : ${promptArgs.colorScheme.accentColor}
・背景カラー              : ${promptArgs.colorScheme.bgColor}
・テキストカラー          : ${promptArgs.colorScheme.textColor}
・スペーシング            : ${promptArgs.designStyle.spacing}
・タイポグラフィ          : ${promptArgs.designStyle.typography}
・ボーダー半径            : ${promptArgs.designStyle.borderRadius}
・フォントファミリー      : ${promptArgs.fontFamily}
・デザイン要素            : ${promptArgs.designElements}

■ フレームワーク統合
・フレームワーク          : ${promptArgs.framework}
・Reveal.js設定           : ${JSON.stringify(promptArgs.revealJsOptions)}

■ アクセシビリティ
・高コントラスト          : ${promptArgs.accessibility.highContrast || false}
・大きなテキスト          : ${promptArgs.accessibility.largeText || false}
・alt属性含有             : ${promptArgs.accessibility.includeAltText || true}
・キーボード対応          : ${promptArgs.accessibility.keyboardNav || true}
・レスポンシブデザイン    : ${promptArgs.responsiveDesign}

■ コンテンツ制御
・必須含有要素            : ${promptArgs.forceInclude}
・除外要素                : ${promptArgs.excludeContent}
・バリアント              : ${promptArgs.variant}

■ フィードバック対応
・フィードバックモード    : ${promptArgs.feedbackMode}
・前バージョン            : ${promptArgs.previousVersion ? '有り' : '無し'}
・改善ポイント            : ${promptArgs.feedbackPoints.join(', ')}

【最優先事項】
1. **セマンティックHTML構造** - header, main, section, article, aside, navなどの適切な使用
2. **アクセシビリティ対応** - WCAG 2.1 AA準拠、適切なARIA属性、高コントラスト、キーボード操作
3. **フレームワーク統合** - 指定されたフレームワーク（${promptArgs.framework}）に最適化された構造
4. **レスポンシブデザイン** - モバイル・タブレット・デスクトップ対応
5. **プロ品質デザイン** - 業界標準に匹敵する美しさと機能性
6. **反復改善対応** - フィードバックに基づく継続的改善

【セマンティックHTML構造要件】
フレームワーク統合に応じた適切な構造を生成：

A) フレームワーク無し (none):
<section class="slide ${promptArgs.uniqueClass}" 
         role="main" 
         aria-labelledby="slide-title-${promptArgs.slideIndex}"
         data-slide-index="${promptArgs.slideIndex}"
         data-framework="none">

B) Reveal.js統合 (revealjs系):
<section class="slide ${promptArgs.uniqueClass}" 
         data-background-color="${promptArgs.colorScheme.bgColor}"
         data-transition="${promptArgs.revealJsOptions.transition || 'fade'}"
         ${promptArgs.revealJsOptions.enableFragments ? 'data-fragments="true"' : ''}
         role="main"
         aria-labelledby="slide-title-${promptArgs.slideIndex}">

C) Bootstrap統合:
<section class="slide ${promptArgs.uniqueClass} container-fluid" 
         role="main" 
         aria-labelledby="slide-title-${promptArgs.slideIndex}">
  <div class="row">
    <div class="col-12">

D) Tailwind統合:
<section class="slide ${promptArgs.uniqueClass} w-full h-screen flex flex-col" 
         role="main" 
         aria-labelledby="slide-title-${promptArgs.slideIndex}">

【アクセシビリティ要件】
1. **ARIA属性**: 適切なrole, aria-label, aria-describedby属性
2. **コントラスト比**: ${promptArgs.accessibility.highContrast ? '4.5:1以上（AAA準拠）' : '3:1以上（AA準拠）'}
3. **フォーカス管理**: キーボードナビゲーション対応
4. **代替テキスト**: すべての画像・図表にalt属性
5. **文字サイズ**: ${promptArgs.accessibility.largeText ? '24px以上' : '18px以上'}

【レスポンシブデザイン要件】
- **モバイル**: 320px-768px対応
- **タブレット**: 768px-1024px対応  
- **デスクトップ**: 1024px以上対応
- **ブレークポイント**: CSS Grid・Flexboxを活用

【フレームワーク固有要件】
${promptArgs.framework === 'revealjs' || promptArgs.framework.includes('revealjs') ? `
■ Reveal.js対応:
- data-background-*, data-transition属性の活用
- fragment クラスによる段階的表示
- speaker notes対応（<aside class="notes">）
- vertical slides対応可能
` : ''}

${promptArgs.framework.includes('bootstrap') ? `
■ Bootstrap対応:
- Grid システム（container, row, col）の活用
- Utility classes（spacing, typography, colors）
- Component classes（card, btn, alert等）
- Responsive breakpoints（sm, md, lg, xl）
` : ''}

${promptArgs.framework.includes('tailwind') ? `
■ Tailwind CSS対応:
- Utility-first アプローチ
- Responsive prefixes（sm:, md:, lg:, xl:）
- Flexbox・Grid utilities
- Color・Typography・Spacing utilities
` : ''}

【コンテンツ生成ガイドライン】
1. **対象読者適応**: ${promptArgs.targetAudience}向けの適切な語彙・表現
2. **トーン適応**: ${promptArgs.tone}に応じた文体・デザイン
3. **構造適応**: 指定された構造設定に厳密に従う
4. **フィードバック反映**: ${promptArgs.feedbackMode ? '前バージョンの問題点を改善' : '初回生成'}

【出力要件】
1. **フォーマット厳守**: <style>～</style><section>～</section>のみ
2. **フレームワーク準拠**: ${promptArgs.framework}の規約に従った構造
3. **アクセシビリティ準拠**: WCAG 2.1 AA基準クリア
4. **レスポンシブ対応**: 全デバイス対応CSS
5. **セマンティック**: 意味的に正しいHTML構造

【絶対禁止事項】
- 外部依存ファイル（CDN、画像URL等）
- インラインスタイル（style属性）の多用
- 非セマンティックな div スープ
- アクセシビリティ無視
- フレームワーク規約違反

【最重要】指定されたフレームワーク（${promptArgs.framework}）の規約を遵守し、
アクセシビリティとレスポンシブデザインを確実に実装してください。`;

    // Enhanced system prompt for comprehensive slide generation
    const systemPrompt = `You are an advanced presentation designer specializing in accessible, semantic HTML slides.

CRITICAL OUTPUT REQUIREMENTS:
1. Output MUST start with <style> tag
2. Output MUST include </style> tag  
3. Output MUST then have <section> tag (with appropriate framework classes)
4. Output MUST end with </section> tag
5. NO other content, NO markdown, NO explanations, NO comments

FRAMEWORK INTEGRATION REQUIREMENTS:
- Framework: ${promptArgs.framework}
- Use appropriate CSS classes and structure for the specified framework
- Ensure compatibility with framework conventions

ACCESSIBILITY REQUIREMENTS:
- Include proper ARIA attributes (role, aria-label, aria-describedby)
- Use semantic HTML elements (header, main, article, aside)
- Ensure sufficient color contrast ratios
- Provide alt text for all visual elements

RESPONSIVE DESIGN REQUIREMENTS:
- Mobile-first approach (min-width breakpoints)
- Flexible layouts using CSS Grid/Flexbox
- Scalable typography and spacing

Your output should be EXACTLY in this format:
<style>
/* Enhanced CSS with framework integration, accessibility, and responsive design */
</style>
<section class="slide ...">
<!-- Semantic HTML content with proper ARIA attributes -->
</section>

NOTHING ELSE. NO TEXT BEFORE OR AFTER.

${baseDesignPrompt}`;

    // Enhanced error handling and fallback generation
    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; padding: 2rem; }</style><section class="slide error-slide" role="main" aria-label="Error slide"><header><h1>Error</h1></header><main><p>Could not generate slide content and CSS.</p></main></section>';
    let message = `Failed to generate enhanced slide for topic "${topic}" and outline "${outline || 'N/A'}".`;
    
    // Enhanced variant and feature information
    let variantInfo = '';
    if (variant && variant > 1) {
      variantInfo = ` (variant ${variant})`;
    }
    
    let featureInfo = [];
    if (framework && framework !== 'none') featureInfo.push(`framework: ${framework}`);
    if (accessibility?.highContrast) featureInfo.push('high contrast');
    if (accessibility?.largeText) featureInfo.push('large text');
    if (feedbackMode) featureInfo.push('feedback mode');
    
    const featuresText = featureInfo.length > 0 ? ` with ${featureInfo.join(', ')}` : '';

    try {
      // Enhanced generation with comprehensive logging
      console.log(`[Enhanced htmlSlideTool] Generating slide for topic: "${topic}", framework: "${framework}", audience: "${targetAudience}"`);
      
      const { text: generatedHtml } = await generateText({
        model: anthropic('claude-opus-4-20250514'), // Use Anthropic model
        prompt: systemPrompt, // Enhanced instructions
      });

      // Enhanced validation with framework-specific checks
      if (generatedHtml && generatedHtml.trim().startsWith('<style>')
        && generatedHtml.trim().includes('</style>')
        && generatedHtml.trim().includes('<section')) {
        
        // Additional validation for framework integration
        const isFrameworkCompliant = framework === 'none' || 
          (framework.includes('bootstrap') && generatedHtml.includes('container')) ||
          (framework.includes('tailwind') && generatedHtml.includes('flex')) ||
          (framework.includes('revealjs') && generatedHtml.includes('data-'));
        
        slideHtmlAndCss = generatedHtml.trim();
        message = `Successfully generated enhanced HTML slide for "${outline || topic}"${variantInfo}${featuresText}.`;
        
        if (!isFrameworkCompliant) {
          message += ` Note: Framework integration may need verification.`;
        }
        
      } else {
        console.warn("[Enhanced htmlSlideTool] LLM output did not match expected format. Using enhanced fallback.", generatedHtml);
        
        // Enhanced fallback with semantic structure
        const fallbackId = Math.random().toString(36).substring(7);
        slideHtmlAndCss = `<style>
.fallback-slide-${fallbackId} { 
  padding: 2rem; 
  font-family: ${promptArgs.fontFamily}; 
  background: ${promptArgs.colorScheme.bgColor};
  color: ${promptArgs.colorScheme.textColor};
}
@media (max-width: 768px) {
  .fallback-slide-${fallbackId} { padding: 1rem; }
}
</style>
<section class="slide fallback-slide-${fallbackId}" role="main" aria-labelledby="fallback-title">
  <header>
    <h1 id="fallback-title">${outline || topic}</h1>
  </header>
  <main>
    <p>Enhanced content generation in progress. Framework: ${framework}</p>
  </main>
</section>`;
        message = `Warning: Enhanced HTML/CSS for slide "${outline || topic}" generated with fallback template.`;
      }

    } catch (error) {
      console.error('[Enhanced htmlSlideTool] Error generating slide content:', error);
      // Keep the enhanced error HTML and message
    }

    // Enhanced return object with additional metadata
    return {
      htmlContent: slideHtmlAndCss,
      message: message,
      variant: variant || 1,
      layoutType: layoutType || 'default',
      diagramType: diagramType || 'auto',
      // Enhanced metadata
      framework: framework || 'none',
      targetAudience: targetAudience || 'general',
      tone: tone || 'professional',
      accessibility: {
        highContrast: accessibility?.highContrast || false,
        largeText: accessibility?.largeText || false,
        includeAltText: accessibility?.includeAltText ?? true,
        keyboardNav: accessibility?.keyboardNav ?? true,
      },
      responsiveDesign: responsiveDesign ?? true,
      feedbackMode: feedbackMode || false,
      features: featureInfo,
    };
  },
}); 