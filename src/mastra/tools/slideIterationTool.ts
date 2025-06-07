import { tool } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

/**
 * Slide Iteration and Feedback Tool
 * 
 * This tool enables iterative improvement of HTML slides based on user feedback.
 * It analyzes existing slides and generates improved versions addressing specific concerns.
 */
export const slideIterationTool = tool({
  description: 'Iterative slide improvement tool that analyzes existing HTML slides and generates enhanced versions based on specific feedback points. Supports systematic A/B testing and continuous refinement.',
  parameters: z.object({
    // Input Content
    originalSlide: z.string().describe('The original HTML slide content to improve.'),
    feedbackPoints: z.array(z.string()).describe('Specific feedback points to address (e.g., "improve readability", "add more visual elements", "simplify layout").'),
    
    // Improvement Targets
    improvementType: z.enum(['design', 'content', 'accessibility', 'structure', 'visual', 'comprehensive']).describe('Primary type of improvement to focus on.'),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium').describe('Priority level for the improvements.'),
    
    // Analysis Options
    analyzeAccessibility: z.boolean().optional().default(true).describe('Analyze and improve accessibility features.'),
    analyzeResponsiveness: z.boolean().optional().default(true).describe('Analyze and improve responsive design.'),
    analyzeSemantics: z.boolean().optional().default(true).describe('Analyze and improve semantic HTML structure.'),
    
    // Framework Consistency
    targetFramework: z.enum(['none', 'revealjs', 'bootstrap', 'tailwind', 'revealjs-bootstrap', 'revealjs-tailwind']).optional().describe('Ensure consistency with specific framework.'),
    
    // Comparison Mode
    generateComparison: z.boolean().optional().default(false).describe('Generate side-by-side comparison with original.'),
    alternativeVersions: z.number().optional().default(1).min(1).max(3).describe('Number of alternative versions to generate (1-3).'),
    
    // Context
    slideContext: z.object({
      topic: z.string().optional().describe('Main slide topic for context.'),
      presentationTheme: z.string().optional().describe('Overall presentation theme.'),
      targetAudience: z.string().optional().describe('Target audience type.'),
      slideIndex: z.number().optional().describe('Position in presentation sequence.'),
    }).optional().describe('Additional context for better improvements.'),
  }),
  execute: async ({ 
    originalSlide, 
    feedbackPoints, 
    improvementType, 
    priority,
    analyzeAccessibility,
    analyzeResponsiveness,
    analyzeSemantics,
    targetFramework,
    generateComparison,
    alternativeVersions,
    slideContext 
  }) => {
    
    // Extract existing slide characteristics
    const slideAnalysis = analyzeSlideStructure(originalSlide);
    
    const analysisPrompt = `
あなたは経験豊富な「スライド改善スペシャリスト」です。
既存のHTMLスライドを分析し、具体的なフィードバックポイントに基づいて改善版を生成してください。

【分析対象スライド】
${originalSlide}

【フィードバックポイント】
${feedbackPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

【改善要求】
・改善タイプ: ${improvementType}
・優先度: ${priority}
・フレームワーク: ${targetFramework || 'なし'}

【分析設定】
・アクセシビリティ分析: ${analyzeAccessibility ? '有効' : '無効'}
・レスポンシブ分析: ${analyzeResponsiveness ? '有効' : '無効'}
・セマンティック分析: ${analyzeSemantics ? '有効' : '無効'}

【コンテキスト情報】
${slideContext ? `
・トピック: ${slideContext.topic || '未指定'}
・プレゼンテーマ: ${slideContext.presentationTheme || '未指定'}
・対象読者: ${slideContext.targetAudience || '未指定'}
・スライド位置: ${slideContext.slideIndex || '未指定'}
` : '・コンテキスト情報なし'}

【改善指針】
1. **フィードバック重視**: 指摘された問題点を確実に解決
2. **漸進的改善**: 既存の良い部分は保持しつつ改善
3. **フレームワーク準拠**: 指定されたフレームワークとの整合性確保
4. **アクセシビリティ強化**: WCAG 2.1 AA準拠
5. **レスポンシブ対応**: 全デバイス対応
6. **コード品質**: 保守性・可読性の向上

【出力要件】
以下のJSON形式で応答してください：
{
  "analysis": {
    "identifiedIssues": ["問題点1", "問題点2"],
    "improvementOpportunities": ["改善機会1", "改善機会2"],
    "currentFramework": "検出されたフレームワーク",
    "accessibilityScore": "現在のアクセシビリティ評価(1-10)",
    "responsivenessScore": "現在のレスポンシブ評価(1-10)"
  },
  "recommendations": [
    {
      "category": "カテゴリ",
      "issue": "具体的な問題",
      "solution": "推奨される解決策",
      "priority": "優先度(critical/high/medium/low)"
    }
  ],
  "improvedSlide": "改善されたHTMLスライドコンテンツ"
}
`;

    try {
      const { text: analysisResult } = await generateText({
        model: anthropic('claude-opus-4-20250514'),
        prompt: analysisPrompt,
      });

      let parsedResult;
      try {
        parsedResult = JSON.parse(analysisResult);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        console.warn('[slideIterationTool] Failed to parse JSON response, using structured fallback');
        parsedResult = {
          analysis: {
            identifiedIssues: feedbackPoints,
            improvementOpportunities: ['Structured improvement analysis'],
            currentFramework: targetFramework || 'none',
            accessibilityScore: 5,
            responsivenessScore: 5
          },
          recommendations: feedbackPoints.map(point => ({
            category: improvementType,
            issue: point,
            solution: `Address: ${point}`,
            priority: priority
          })),
          improvedSlide: originalSlide // Fallback to original if analysis fails
        };
      }

      // Generate alternative versions if requested
      const alternatives = [];
      if (alternativeVersions > 1) {
        for (let i = 2; i <= alternativeVersions; i++) {
          const variantPrompt = `
前回の改善結果を参考に、異なるアプローチで${i}番目のバリエーションを生成してください。

【前回の改善版】
${parsedResult.improvedSlide}

【バリエーション要求】
・バリアント番号: ${i}
・異なる視覚的アプローチ
・代替的なレイアウト構成
・同じフィードバックポイントへの別解法

出力は改善されたHTMLスライドコンテンツのみ：
`;

          try {
            const { text: variantSlide } = await generateText({
              model: anthropic('claude-opus-4-20250514'),
              prompt: variantPrompt,
            });
            
            alternatives.push({
              version: i,
              htmlContent: variantSlide.trim(),
              approach: `Alternative approach ${i}`
            });
          } catch (variantError) {
            console.warn(`[slideIterationTool] Failed to generate variant ${i}:`, variantError);
          }
        }
      }

      // Generate comparison if requested
      let comparison = null;
      if (generateComparison) {
        comparison = {
          original: {
            content: originalSlide,
            analysis: slideAnalysis
          },
          improved: {
            content: parsedResult.improvedSlide,
            improvements: parsedResult.recommendations
          },
          summary: `Generated ${parsedResult.recommendations.length} improvements addressing ${feedbackPoints.length} feedback points`
        };
      }

      return {
        success: true,
        message: `Successfully analyzed and improved slide with ${parsedResult.recommendations.length} recommendations`,
        analysis: parsedResult.analysis,
        recommendations: parsedResult.recommendations,
        improvedSlide: parsedResult.improvedSlide,
        alternatives: alternatives,
        comparison: comparison,
        metadata: {
          improvementType,
          priority,
          targetFramework: targetFramework || 'none',
          feedbackPointsAddressed: feedbackPoints.length,
          alternativeVersionsGenerated: alternatives.length
        }
      };

    } catch (error) {
      console.error('[slideIterationTool] Error during slide analysis and improvement:', error);
      
      return {
        success: false,
        message: `Failed to analyze and improve slide: ${error.message}`,
        analysis: null,
        recommendations: [],
        improvedSlide: originalSlide, // Return original as fallback
        alternatives: [],
        comparison: null,
        metadata: {
          improvementType,
          priority,
          targetFramework: targetFramework || 'none',
          feedbackPointsAddressed: 0,
          alternativeVersionsGenerated: 0,
          error: error.message
        }
      };
    }
  },
});

/**
 * Analyzes the structure and characteristics of an HTML slide
 */
function analyzeSlideStructure(htmlContent: string) {
  const analysis = {
    hasStyleTag: htmlContent.includes('<style>'),
    hasSectionTag: htmlContent.includes('<section'),
    hasSemanticElements: false,
    hasAriaAttributes: false,
    hasResponsiveCSS: false,
    frameworkDetected: 'none',
    approximateComplexity: 'medium'
  };

  // Check for semantic elements
  const semanticElements = ['header', 'main', 'article', 'aside', 'nav', 'figure'];
  analysis.hasSemanticElements = semanticElements.some(element => 
    htmlContent.includes(`<${element}`) || htmlContent.includes(`</${element}>`)
  );

  // Check for ARIA attributes
  const ariaAttributes = ['role=', 'aria-label', 'aria-describedby', 'aria-labelledby'];
  analysis.hasAriaAttributes = ariaAttributes.some(attr => htmlContent.includes(attr));

  // Check for responsive CSS
  const responsiveIndicators = ['@media', 'vw', 'vh', 'flex', 'grid'];
  analysis.hasResponsiveCSS = responsiveIndicators.some(indicator => htmlContent.includes(indicator));

  // Framework detection
  if (htmlContent.includes('container') && htmlContent.includes('row')) {
    analysis.frameworkDetected = 'bootstrap';
  } else if (htmlContent.includes('w-') || htmlContent.includes('flex-')) {
    analysis.frameworkDetected = 'tailwind';
  } else if (htmlContent.includes('data-background') || htmlContent.includes('data-transition')) {
    analysis.frameworkDetected = 'revealjs';
  }

  // Complexity estimation based on content length and features
  const contentLength = htmlContent.length;
  const featureCount = [
    analysis.hasSemanticElements,
    analysis.hasAriaAttributes,
    analysis.hasResponsiveCSS,
    htmlContent.includes('svg'),
    htmlContent.includes('animation')
  ].filter(Boolean).length;

  if (contentLength > 5000 || featureCount >= 4) {
    analysis.approximateComplexity = 'high';
  } else if (contentLength < 2000 && featureCount <= 1) {
    analysis.approximateComplexity = 'low';
  }

  return analysis;
}