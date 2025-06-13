import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

/**
 * sourceValidationTool
 * --------------------
 * Validates the credibility, bias, and reliability of information sources.
 * Uses domain knowledge, publication patterns, and content analysis to assess
 * source quality for research purposes.
 */
export const sourceValidationTool = createTool({
  id: 'source-validation',
  description: 'Validate the credibility, bias, and reliability of information sources for research purposes.',
  inputSchema: z.object({
    sources: z.array(z.object({
      url: z.string().url(),
      title: z.string(),
      author: z.string().optional(),
      publishDate: z.string().optional(),
      content: z.string().optional(),
    })).describe('Sources to validate'),
    validationCriteria: z.array(z.enum(['authority', 'accuracy', 'objectivity', 'currency', 'coverage'])).default(['authority', 'accuracy', 'objectivity']).describe('Criteria to evaluate'),
    researchTopic: z.string().optional().describe('Research topic for context-specific validation'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    validationResults: z.array(z.object({
      url: z.string(),
      overallScore: z.number().min(0).max(10),
      credibilityLevel: z.enum(['high', 'medium', 'low', 'questionable']),
      strengths: z.array(z.string()),
      concerns: z.array(z.string()),
      biasAssessment: z.object({
        politicalBias: z.string(),
        commercialBias: z.string(),
        selectionBias: z.string(),
        confirmationBias: z.string(),
      }),
      sourceClassification: z.object({
        type: z.string(), // academic, news, government, commercial, blog, etc.
        tier: z.enum(['tier1', 'tier2', 'tier3', 'tier4']),
        expertise: z.string(),
      }),
      recommendations: z.array(z.string()),
    })),
    summary: z.object({
      highQualitySources: z.number(),
      mediumQualitySources: z.number(),
      lowQualitySources: z.number(),
      overallReliability: z.string(),
      recommendedActions: z.array(z.string()),
    }),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      const { sources, validationCriteria, researchTopic } = context;
      const model = anthropic('claude-opus-4-20250514');
      
      const validationResults = [];
      
      for (const source of sources) {
        const validationPrompt = `
Validate the following source for research credibility and bias:

URL: ${source.url}
Title: ${source.title}
Author: ${source.author || 'Not specified'}
Publish Date: ${source.publishDate || 'Not specified'}
${researchTopic ? `Research Topic Context: ${researchTopic}` : ''}

Validation Criteria: ${validationCriteria.join(', ')}

Please evaluate this source based on the following:

1. AUTHORITY: Author expertise, institutional affiliation, domain reputation
2. ACCURACY: Factual correctness, evidence quality, peer review status
3. OBJECTIVITY: Bias assessment, balanced perspective, conflicts of interest
4. CURRENCY: Information recency, relevance to current context
5. COVERAGE: Comprehensiveness, scope appropriateness

For domain analysis, consider:
- .edu, .gov, .org domains (generally higher credibility)
- Major news organizations vs. blog posts
- Academic journals vs. commercial sites
- Professional organizations vs. personal websites

Provide your assessment in the following JSON format:
{
  "overallScore": 0-10,
  "credibilityLevel": "high/medium/low/questionable",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1", "concern2"],
  "biasAssessment": {
    "politicalBias": "assessment of political slant",
    "commercialBias": "assessment of commercial interests",
    "selectionBias": "assessment of selective reporting",
    "confirmationBias": "assessment of confirmation bias"
  },
  "sourceClassification": {
    "type": "academic/news/government/commercial/blog/social/other",
    "tier": "tier1/tier2/tier3/tier4",
    "expertise": "assessment of author/publication expertise"
  },
  "recommendations": ["recommendation1", "recommendation2"]
}

Tier Definitions:
- Tier 1: Peer-reviewed academic, government agencies, established institutions
- Tier 2: Major news organizations, professional publications, expert analysis
- Tier 3: Reputable blogs, industry publications, advocacy organizations
- Tier 4: Personal blogs, social media, unverified sources
`;

        try {
          const response = await generateText({
            model,
            prompt: validationPrompt,
          });

          let validation;
          try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              validation = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found');
            }
          } catch (parseError) {
            // Fallback validation
            const domain = new URL(source.url).hostname;
            const domainLevel = domain.includes('.edu') || domain.includes('.gov') ? 'high' : 
                               domain.includes('.org') ? 'medium' : 'low';
            
            validation = {
              overallScore: domainLevel === 'high' ? 7 : domainLevel === 'medium' ? 5 : 3,
              credibilityLevel: domainLevel,
              strengths: [domainLevel === 'high' ? 'Authoritative domain' : 'Basic analysis completed'],
              concerns: ['Automated analysis only', 'Manual review recommended'],
              biasAssessment: {
                politicalBias: 'Unable to assess automatically',
                commercialBias: 'Unable to assess automatically',
                selectionBias: 'Unable to assess automatically',
                confirmationBias: 'Unable to assess automatically',
              },
              sourceClassification: {
                type: 'other',
                tier: 'tier3',
                expertise: 'Unable to assess automatically',
              },
              recommendations: ['Manual review required', 'Cross-reference with other sources'],
            };
          }

          validationResults.push({
            url: source.url,
            ...validation,
          });

        } catch (error) {
          // Error handling for individual source
          validationResults.push({
            url: source.url,
            overallScore: 0,
            credibilityLevel: 'questionable' as const,
            strengths: [],
            concerns: ['Validation failed', 'Source inaccessible'],
            biasAssessment: {
              politicalBias: 'Unable to assess',
              commercialBias: 'Unable to assess',
              selectionBias: 'Unable to assess',
              confirmationBias: 'Unable to assess',
            },
            sourceClassification: {
              type: 'other',
              tier: 'tier4' as const,
              expertise: 'Unable to assess',
            },
            recommendations: ['Source validation failed', 'Consider alternative sources'],
          });
        }
      }

      // Calculate summary statistics
      const highQuality = validationResults.filter(r => r.credibilityLevel === 'high').length;
      const mediumQuality = validationResults.filter(r => r.credibilityLevel === 'medium').length;
      const lowQuality = validationResults.filter(r => r.credibilityLevel === 'low' || r.credibilityLevel === 'questionable').length;
      
      const averageScore = validationResults.reduce((sum, r) => sum + r.overallScore, 0) / validationResults.length;
      const overallReliability = averageScore >= 7 ? 'High' : averageScore >= 5 ? 'Medium' : 'Low';

      const recommendedActions = [];
      if (lowQuality > highQuality) {
        recommendedActions.push('Seek higher quality sources');
      }
      if (validationResults.some(r => r.concerns.length > 2)) {
        recommendedActions.push('Cross-verify information with multiple sources');
      }
      if (highQuality === 0) {
        recommendedActions.push('Find authoritative sources before proceeding');
      }

      return {
        success: true,
        validationResults,
        summary: {
          highQualitySources: highQuality,
          mediumQualitySources: mediumQuality,
          lowQualitySources: lowQuality,
          overallReliability,
          recommendedActions,
        },
        message: `Validated ${sources.length} sources. Overall reliability: ${overallReliability}`,
      };

    } catch (error) {
      console.error('Source validation error:', error);
      return {
        success: false,
        validationResults: [],
        summary: {
          highQualitySources: 0,
          mediumQualitySources: 0,
          lowQualitySources: 0,
          overallReliability: 'Unknown',
          recommendedActions: ['Validation failed - manual review required'],
        },
        message: `Source validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});