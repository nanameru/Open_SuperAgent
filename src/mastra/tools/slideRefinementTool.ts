import { tool } from 'ai';
import { z } from 'zod';
import { htmlSlideTool } from './htmlSlideTool';

export const slideRefinementTool = tool({
  description: 'Refines and improves existing HTML slides based on human feedback and iterative improvement requests. Supports detailed refinement targeting specific aspects like content, design, layout, tone, or clarity.',
  parameters: z.object({
    originalSlide: z.object({
      htmlContent: z.string().describe('The original HTML content of the slide to be refined.'),
      topic: z.string().describe('The original topic/title of the slide.'),
      outline: z.string().optional().describe('The original outline or key points.'),
      layoutType: z.string().optional().describe('The original layout type used.'),
      variant: z.number().optional().describe('The original variant number.'),
    }).describe('Original slide information to be refined.'),
    
    refinementRequest: z.object({
      feedbackText: z.string().describe('Specific feedback or improvement requests from the user.'),
      targetArea: z.enum(['content', 'design', 'layout', 'tone', 'clarity', 'audience-adaptation', 'visual-impact', 'overall']).describe('Primary area to focus refinement on.'),
      priority: z.enum(['minor', 'moderate', 'major', 'complete-redesign']).default('moderate').describe('Level of changes requested.'),
      specificIssues: z.array(z.string()).optional().describe('Specific issues or problems to address.'),
      desiredOutcome: z.string().optional().describe('What the user wants to achieve with this refinement.'),
    }).describe('Detailed refinement specifications.'),
    
    contextUpdate: z.object({
      newTargetAudience: z.object({
        level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
        role: z.string().optional(),
        industry: z.string().optional(),
        size: z.enum(['small-group', 'medium-group', 'large-audience', 'webinar']).optional(),
      }).optional().describe('Updated target audience if different from original.'),
      
      newPresentationContext: z.object({
        purpose: z.enum(['educate', 'persuade', 'inform', 'entertain', 'sell', 'report']).optional(),
        setting: z.enum(['conference', 'meeting', 'classroom', 'webinar', 'pitch', 'report']).optional(),
        tone: z.enum(['professional', 'casual', 'academic', 'inspiring', 'urgent', 'friendly']).optional(),
        duration: z.number().optional(),
      }).optional().describe('Updated presentation context if changed.'),
      
      newDesignPreferences: z.object({
        colorScheme: z.object({
          primaryColor: z.string().optional(),
          accentColor: z.string().optional(),
          bgColor: z.string().optional(),
        }).optional(),
        layoutType: z.string().optional(),
        designElements: z.array(z.string()).optional(),
      }).optional().describe('Updated design preferences.'),
    }).optional().describe('Context updates for the refinement.'),
    
    iterationNumber: z.number().default(1).describe('Which iteration/round of refinement this is (1 = first refinement, 2 = second, etc.).'),
    maintainCompatibility: z.boolean().default(true).describe('Whether to maintain Reveal.js compatibility and human review features.'),
  }),
  
  execute: async ({ 
    originalSlide, 
    refinementRequest, 
    contextUpdate, 
    iterationNumber, 
    maintainCompatibility 
  }) => {
    // Construct feedback context string for the enhanced htmlSlideTool
    const feedbackContext = `
Iteration ${iterationNumber} Refinement:
- Target Area: ${refinementRequest.targetArea}
- Priority Level: ${refinementRequest.priority}
- User Feedback: ${refinementRequest.feedbackText}
${refinementRequest.specificIssues ? '- Specific Issues: ' + refinementRequest.specificIssues.join(', ') : ''}
${refinementRequest.desiredOutcome ? '- Desired Outcome: ' + refinementRequest.desiredOutcome : ''}
- Previous Slide Layout: ${originalSlide.layoutType || 'default'}
- Original Variant: ${originalSlide.variant || 1}
`.trim();

    try {
      // Prepare enhanced parameters for the refined slide generation
      const enhancedParams: any = {
        topic: originalSlide.topic,
        outline: originalSlide.outline || originalSlide.topic,
        slideIndex: 1, // Single slide refinement
        totalSlides: 1,
        
        // Apply context updates or use intelligent defaults
        targetAudience: contextUpdate?.newTargetAudience ? {
          level: contextUpdate.newTargetAudience.level || 'intermediate',
          role: contextUpdate.newTargetAudience.role || 'general audience',
          industry: contextUpdate.newTargetAudience.industry || 'general',
          size: contextUpdate.newTargetAudience.size || 'medium-group',
        } : {
          level: 'intermediate',
          role: 'general audience',
          industry: 'general',
          size: 'medium-group',
        },
        
        presentationContext: contextUpdate?.newPresentationContext ? {
          purpose: contextUpdate.newPresentationContext.purpose || 'inform',
          setting: contextUpdate.newPresentationContext.setting || 'meeting',
          tone: contextUpdate.newPresentationContext.tone || 'professional',
          duration: contextUpdate.newPresentationContext.duration,
        } : {
          purpose: 'inform',
          setting: 'meeting',
          tone: 'professional',
        },
        
        contentSpecification: {
          complexity: refinementRequest.priority === 'minor' ? 'simple' : 
                     refinementRequest.priority === 'moderate' ? 'moderate' :
                     refinementRequest.priority === 'major' ? 'detailed' : 'comprehensive',
          keyMessage: refinementRequest.desiredOutcome || '',
          focusAreas: refinementRequest.specificIssues || [],
        },
        
        // Design updates
        layoutType: contextUpdate?.newDesignPreferences?.layoutType || originalSlide.layoutType || 'default',
        colorScheme: contextUpdate?.newDesignPreferences?.colorScheme,
        designElements: contextUpdate?.newDesignPreferences?.designElements,
        
        // Refinement-specific parameters
        humanReviewMode: maintainCompatibility,
        feedbackContext: feedbackContext,
        refinementTarget: refinementRequest.targetArea,
        
        // Increment variant to show this is a refined version
        variant: (originalSlide.variant || 1) + iterationNumber,
        
        // Reveal.js compatibility
        revealJsOptions: {
          transition: 'slide',
          backgroundType: 'color',
          verticalSlide: false,
          notes: `Refined slide - Iteration ${iterationNumber}. Focus: ${refinementRequest.targetArea}`,
        },
      };

      // Call the enhanced htmlSlideTool with refinement context
      const refinedSlide = await htmlSlideTool.execute(enhancedParams);
      
      return {
        success: true,
        message: `Successfully refined slide (iteration ${iterationNumber}) focusing on ${refinementRequest.targetArea}. ${refinedSlide.message}`,
        
        // Refined slide content
        htmlContent: refinedSlide.htmlContent,
        originalHtmlContent: originalSlide.htmlContent, // Keep original for comparison
        
        // Refinement metadata
        refinementDetails: {
          iterationNumber,
          targetArea: refinementRequest.targetArea,
          priority: refinementRequest.priority,
          feedbackApplied: refinementRequest.feedbackText,
          changesRequested: refinementRequest.specificIssues || [],
          desiredOutcome: refinementRequest.desiredOutcome,
        },
        
        // Enhanced slide features
        enhancedFeatures: refinedSlide.enhancedFeatures,
        revealJsMetadata: refinedSlide.revealJsMetadata,
        
        // Comparison data for human review
        comparison: {
          originalVariant: originalSlide.variant || 1,
          refinedVariant: (originalSlide.variant || 1) + iterationNumber,
          originalLayout: originalSlide.layoutType || 'default',
          refinedLayout: enhancedParams.layoutType,
          improvementsTargeted: refinementRequest.targetArea,
        },
        
        // Next iteration guidance
        nextIterationGuidance: {
          canRefineAgain: true,
          suggestedFocusAreas: refinementRequest.targetArea === 'overall' ? 
            ['content', 'design', 'layout'] : 
            ['overall', 'visual-impact', 'clarity'],
          recommendedPriority: refinementRequest.priority === 'complete-redesign' ? 'moderate' : refinementRequest.priority,
        }
      };
      
    } catch (error) {
      console.error('[slideRefinementTool] Error refining slide:', error);
      
      return {
        success: false,
        message: `Failed to refine slide: ${error instanceof Error ? error.message : 'Unknown error'}`,
        htmlContent: originalSlide.htmlContent, // Return original as fallback
        originalHtmlContent: originalSlide.htmlContent,
        refinementDetails: {
          iterationNumber,
          targetArea: refinementRequest.targetArea,
          priority: refinementRequest.priority,
          feedbackApplied: refinementRequest.feedbackText,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      };
    }
  },
});