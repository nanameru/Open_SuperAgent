import { tool } from 'ai';
import { z } from 'zod';
import { htmlSlideTool } from './htmlSlideTool';

export const slideModificationTool = tool({
  description: 'Provides feedback loop functionality for HTML slides - regeneration, modification, and iterative improvement based on user feedback.',
  
  metadata: {
    version: '1.0.0',
    purpose: 'Feedback loop and slide improvement',
    compatibleWith: ['htmlSlideTool v2.0.0+'],
    features: ['regeneration', 'partial-modification', 'feedback-analysis', 'diff-comparison']
  },
  
  parameters: z.object({
    slideId: z.string().describe('ID of the slide to modify or regenerate.'),
    action: z.enum(['regenerate', 'modify', 'analyze', 'compare']).describe('Type of feedback action to perform.'),
    feedback: z.string().optional().describe('User feedback describing issues or desired changes.'),
    modificationInstructions: z.string().optional().describe('Specific instructions for modifications.'),
    currentHtml: z.string().optional().describe('Current HTML content of the slide.'),
    targetAspects: z.array(z.enum(['accessibility', 'responsive', 'design', 'content', 'layout', 'colors', 'typography'])).optional().describe('Specific aspects to focus on for improvement.'),
    preserveElements: z.array(z.string()).optional().describe('CSS selectors of elements to preserve during modification.'),
    enhancementLevel: z.enum(['minimal', 'moderate', 'comprehensive']).optional().default('moderate').describe('Level of enhancement to apply.'),
    // Pass-through parameters for htmlSlideTool
    topic: z.string().describe('The main topic of the presentation.'),
    outline: z.string().optional().describe('The specific theme for this slide.'),
    slideIndex: z.number().optional().describe('Current slide number.'),
    totalSlides: z.number().optional().describe('Total slides in presentation.'),
    layoutType: z.enum(['default', 'image-left', 'image-right', 'full-graphic', 'quote', 'comparison', 'timeline', 'list', 'title', 'section-break', 'data-visualization', 'photo-with-caption']).optional(),
    diagramType: z.enum(['auto', 'bar', 'pie', 'flow', 'venn', 'pyramid', 'quadrant', 'mind-map', 'timeline', 'comparison', 'icons', 'none']).optional(),
    colorScheme: z.object({
      primaryColor: z.string().optional(),
      accentColor: z.string().optional(),
      bgColor: z.string().optional(),
    }).optional(),
    designElements: z.array(z.enum(['gradients', 'transparency', 'geometric', 'shadows', 'animations', 'borders', 'whitespace'])).optional(),
    fontFamily: z.string().optional(),
    variant: z.number().optional(),
    accessibilityLevel: z.enum(['basic', 'enhanced', 'full']).optional(),
    responsiveBreakpoints: z.array(z.enum(['mobile', 'tablet', 'desktop', 'large'])).optional(),
  }),
  
  execute: async ({ 
    slideId, 
    action, 
    feedback, 
    modificationInstructions, 
    currentHtml, 
    targetAspects, 
    preserveElements, 
    enhancementLevel,
    // Pass-through parameters
    topic,
    outline,
    slideIndex,
    totalSlides,
    layoutType,
    diagramType,
    colorScheme,
    designElements,
    fontFamily,
    variant,
    accessibilityLevel,
    responsiveBreakpoints
  }) => {
    
    // Analysis of current slide (if provided)
    let analysis = '';
    if (currentHtml) {
      analysis = analyzeSlideContent(currentHtml, targetAspects || []);
    }
    
    // Generate improvement instructions based on feedback and action
    const improvementInstructions = generateImprovementInstructions(
      action,
      feedback || '',
      modificationInstructions || '',
      analysis,
      enhancementLevel || 'moderate',
      targetAspects || []
    );
    
    try {
      // Call the enhanced htmlSlideTool with feedback mode
      const result = await htmlSlideTool.execute({
        topic,
        outline,
        slideIndex,
        totalSlides,
        layoutType,
        diagramType,
        colorScheme,
        designElements,
        fontFamily,
        variant,
        feedbackMode: action === 'regenerate' ? 'regenerate' : 'modify',
        previousSlideId: slideId,
        modificationInstructions: improvementInstructions,
        accessibilityLevel,
        responsiveBreakpoints,
        slideCount: 1
      });
      
      return {
        success: true,
        action: action,
        originalSlideId: slideId,
        newSlideId: result.slideId,
        htmlContent: result.htmlContent,
        message: `${action} completed successfully. ${result.message}`,
        improvementInstructions,
        analysis,
        changes: generateChangeLog(action, targetAspects || [], enhancementLevel || 'moderate'),
        feedback: {
          processed: feedback || '',
          instructions: modificationInstructions || '',
          targetAspects: targetAspects || [],
          preservedElements: preserveElements || []
        },
        metadata: {
          ...result,
          isModification: true,
          modificationLevel: enhancementLevel,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[slideModificationTool] Error:', error);
      return {
        success: false,
        action: action,
        originalSlideId: slideId,
        error: `Failed to ${action} slide: ${error instanceof Error ? error.message : 'Unknown error'}`,
        feedback: {
          processed: feedback || '',
          instructions: modificationInstructions || '',
          targetAspects: targetAspects || []
        }
      };
    }
  },
});

// Helper functions
function analyzeSlideContent(html: string, targetAspects: string[]): string {
  const analyses: string[] = [];
  
  // Basic HTML structure analysis
  if (targetAspects.includes('accessibility') || targetAspects.length === 0) {
    if (!html.includes('aria-')) {
      analyses.push('アクセシビリティ: WAI-ARIA属性が不足しています');
    }
    if (!html.includes('role=')) {
      analyses.push('アクセシビリティ: セマンティックロールが不足しています');
    }
  }
  
  if (targetAspects.includes('responsive') || targetAspects.length === 0) {
    if (!html.includes('@media') && !html.includes('clamp(')) {
      analyses.push('レスポンシブ: メディアクエリまたはレスポンシブデザインが不足しています');
    }
  }
  
  if (targetAspects.includes('design') || targetAspects.length === 0) {
    if (!html.includes('gradient') && !html.includes('box-shadow')) {
      analyses.push('デザイン: モダンなビジュアル要素が不足しています');
    }
  }
  
  return analyses.length > 0 ? analyses.join('; ') : '構造的な問題は検出されませんでした';
}

function generateImprovementInstructions(
  action: string,
  feedback: string,
  modificationInstructions: string,
  analysis: string,
  enhancementLevel: string,
  targetAspects: string[]
): string {
  const instructions: string[] = [];
  
  // Base instructions based on action
  if (action === 'regenerate') {
    instructions.push('スライド全体を再生成してください');
  } else if (action === 'modify') {
    instructions.push('以下の点を重点的に修正してください');
  }
  
  // Add feedback-based instructions
  if (feedback) {
    instructions.push(`ユーザーフィードバック: ${feedback}`);
  }
  
  // Add specific modification instructions
  if (modificationInstructions) {
    instructions.push(`具体的な修正指示: ${modificationInstructions}`);
  }
  
  // Add analysis-based improvements
  if (analysis) {
    instructions.push(`分析結果に基づく改善: ${analysis}`);
  }
  
  // Add target aspect focus
  if (targetAspects.length > 0) {
    instructions.push(`重点改善領域: ${targetAspects.join(', ')}`);
  }
  
  // Add enhancement level guidance
  switch (enhancementLevel) {
    case 'minimal':
      instructions.push('最小限の変更に留めてください');
      break;
    case 'comprehensive':
      instructions.push('包括的な改善と最新のベストプラクティスを適用してください');
      break;
    default:
      instructions.push('適度な改善を行ってください');
  }
  
  return instructions.join('\n');
}

function generateChangeLog(action: string, targetAspects: string[], enhancementLevel: string): string {
  const changes: string[] = [];
  
  changes.push(`アクション: ${action}`);
  changes.push(`改善レベル: ${enhancementLevel}`);
  
  if (targetAspects.length > 0) {
    changes.push(`対象領域: ${targetAspects.join(', ')}`);
  }
  
  // Standard improvements based on the enhanced tool
  changes.push('WAI-ARIA属性の追加・改善');
  changes.push('レスポンシブデザインの最適化');
  changes.push('コード構造の可読性向上');
  changes.push('Reveal.js/Bootstrap/Tailwind CSSベストプラクティスの適用');
  
  return changes.join('\n');
}