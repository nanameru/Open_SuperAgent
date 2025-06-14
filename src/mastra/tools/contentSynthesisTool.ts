import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText, LanguageModel } from 'ai';

const synthesisOutputSchema = z.object({
  executiveSummary: z.string(),
  mainFindings: z.array(z.object({
    finding: z.string(),
    supportingSources: z.array(z.string()),
    confidence: z.number(),
    evidence: z.string(),
  })),
  thematicAnalysis: z.array(z.object({
    theme: z.string(),
    description: z.string(),
    sources: z.array(z.string()),
    keyPoints: z.array(z.string()),
  })),
  conflicts: z.array(z.object({
    topic: z.string(),
    conflictingViews: z.array(z.object({
      position: z.string(),
      sources: z.array(z.string()),
      evidence: z.string(),
    })),
    resolution: z.string().optional(),
  })).optional(),
  knowledgeGaps: z.array(z.object({
    gap: z.string(),
    impact: z.string(),
    suggestedResearch: z.string(),
  })),
  insights: z.array(z.object({
    insight: z.string(),
    reasoning: z.string(),
    implications: z.string(),
  })),
  qualityAssessment: z.object({
    sourceReliability: z.string(),
    evidenceStrength: z.string(),
    biasRisks: z.array(z.string()),
    limitations: z.array(z.string()),
  }),
});

type SynthesisOutput = z.infer<typeof synthesisOutputSchema>;

const inputSchema = z.object({
  sources: z.array(z.object({
    title: z.string(),
    url: z.string().optional(),
    author: z.string().optional(),
    content: z.string(),
    credibilityScore: z.number().optional(),
    sourceType: z.string().optional(),
    publishDate: z.string().optional(),
  })).describe('Sources to synthesize'),
  researchQuestion: z.string().describe('The main research question or topic'),
  synthesisType: z.enum(['overview', 'comparative', 'analytical', 'narrative', 'argumentative']).default('analytical').describe('Type of synthesis to perform'),
  outputFormat: z.enum(['structured', 'narrative', 'academic', 'executive-summary']).default('structured').describe('Format for the synthesized output'),
  includeConflicts: z.boolean().default(true).describe('Identify and address conflicting information'),
  confidenceThreshold: z.number().min(0).max(1).default(0.7).describe('Minimum confidence level for including information'),
});

function buildSynthesisPrompt(context: z.infer<typeof inputSchema>) {
  const { 
    sources, 
    researchQuestion, 
    synthesisType, 
    outputFormat, 
    includeConflicts, 
    confidenceThreshold 
  } = context;

  const sourceData = sources.map((source, index) => ({
    id: index + 1,
    title: source.title,
    author: source.author || 'Unknown',
    content: source.content.substring(0, 2000), // Limit content length
    credibility: source.credibilityScore || 0.5,
    type: source.sourceType || 'unknown',
    date: source.publishDate || 'unknown',
    url: source.url || 'N/A',
  }));

  return `
You are conducting a comprehensive synthesis of research sources. Analyze the following sources and create a high-quality synthesis.

Research Question: ${researchQuestion}
Synthesis Type: ${synthesisType}
Output Format: ${outputFormat}
Include Conflicts: ${includeConflicts}
Confidence Threshold: ${confidenceThreshold}

Sources to Synthesize:
${sourceData.map(source => `
Source ${source.id}:
Title: ${source.title}
Author: ${source.author}
Type: ${source.type}
Date: ${source.date}
Credibility: ${source.credibility}
Content: ${source.content}
---
`).join('\n')}

Please perform a comprehensive synthesis that includes:

1. EXECUTIVE SUMMARY (2-3 paragraphs summarizing key findings)

2. MAIN FINDINGS (Identify 3-5 key findings with supporting evidence)
   - For each finding, include confidence level (0-1)
   - List supporting sources
   - Provide evidence summary

3. THEMATIC ANALYSIS (Group information by major themes)
   - Identify 3-5 major themes
   - Describe each theme with supporting sources
   - Extract key points for each theme

4. CONFLICT IDENTIFICATION ${includeConflicts ? '(Required)' : '(Optional)'}
   - Identify contradictory information
   - Present different viewpoints with sources
   - Attempt resolution or note unresolved conflicts

5. KNOWLEDGE GAPS
   - Identify what's missing from current sources
   - Assess impact of gaps on conclusions
   - Suggest additional research needed

6. INSIGHTS AND IMPLICATIONS
   - Generate novel insights from synthesis
   - Identify patterns not obvious in individual sources
   - Discuss broader implications

7. QUALITY ASSESSMENT
   - Overall source reliability
   - Evidence strength
   - Potential bias risks
   - Study limitations

Provide your response in the following JSON format:
{
  "executiveSummary": "comprehensive summary",
  "mainFindings": [
    {
      "finding": "finding description",
      "supportingSources": ["source titles"],
      "confidence": 0.8,
      "evidence": "evidence summary"
    }
  ],
  "thematicAnalysis": [
    {
      "theme": "theme name",
      "description": "theme description", 
      "sources": ["source titles"],
      "keyPoints": ["point1", "point2"]
    }
  ],
  "conflicts": [
    {
      "topic": "conflict topic",
      "conflictingViews": [
        {
          "position": "position description",
          "sources": ["source titles"],
          "evidence": "supporting evidence"
        }
      ],
      "resolution": "resolution if possible"
    }
  ],
  "knowledgeGaps": [
    {
      "gap": "gap description",
      "impact": "impact on research",
      "suggestedResearch": "suggested next steps"
    }
  ],
  "insights": [
    {
      "insight": "novel insight",
      "reasoning": "reasoning behind insight",
      "implications": "broader implications"
    }
  ],
  "qualityAssessment": {
    "sourceReliability": "assessment",
    "evidenceStrength": "assessment", 
    "biasRisks": ["risk1", "risk2"],
    "limitations": ["limitation1", "limitation2"]
  }
}

Focus on quality over quantity. Ensure all findings meet the confidence threshold of ${confidenceThreshold}.
`;
}

async function generateAndParseResponse(
  model: LanguageModel,
  prompt: string,
  sources: z.infer<typeof inputSchema>['sources']
): Promise<SynthesisOutput> {
  const response = await generateText({
    model,
    prompt,
  });

  try {
    const jsonMatch = response.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }
  } catch (parseError) {
    return {
      executiveSummary: response.text.substring(0, 500) + '...',
      mainFindings: [
        {
          finding: 'Synthesis completed with limitations',
          supportingSources: sources.map(s => s.title),
          confidence: 0.5,
          evidence: 'Automated analysis performed',
        },
      ],
      thematicAnalysis: [
        {
          theme: 'General Analysis',
          description: 'Analysis of provided sources',
          sources: sources.map(s => s.title),
          keyPoints: ['Content reviewed', 'Basic synthesis attempted'],
        },
      ],
      knowledgeGaps: [
        {
          gap: 'Detailed analysis incomplete',
          impact: 'Limited synthesis quality',
          suggestedResearch: 'Manual review recommended',
        },
      ],
      insights: [
        {
          insight: 'Automated synthesis has limitations',
          reasoning: 'Complex synthesis requires human oversight',
          implications: 'Results should be verified manually',
        },
      ],
      qualityAssessment: {
        sourceReliability: 'Variable',
        evidenceStrength: 'Moderate',
        biasRisks: ['Automated analysis limitations'],
        limitations: ['Parsing errors', 'Limited context understanding'],
      },
    };
  }
}

function formatStructuredOutput(
  outputFormat: z.infer<typeof inputSchema>['outputFormat'],
  synthesis: SynthesisOutput,
  researchQuestion: string
): string {
  switch (outputFormat) {
    case 'academic':
      return `# Research Synthesis: ${researchQuestion}

## Abstract
${synthesis.executiveSummary}

## Main Findings
${synthesis.mainFindings?.map((f, i) => `${i + 1}. ${f.finding} (Confidence: ${f.confidence})\n   Evidence: ${f.evidence}`).join('\n\n')}

## Thematic Analysis
${synthesis.thematicAnalysis?.map(t => `### ${t.theme}\n${t.description}\nKey Points: ${t.keyPoints?.join(', ')}`).join('\n\n')}

## Limitations and Future Research
${synthesis.knowledgeGaps?.map(g => `- ${g.gap}: ${g.suggestedResearch}`).join('\n')}`;

    case 'executive-summary':
      return `# Executive Summary: ${researchQuestion}

${synthesis.executiveSummary}

## Key Findings
${synthesis.mainFindings?.map(f => `• ${f.finding}`).join('\n')}

## Recommendations
${synthesis.insights?.map(i => `• ${i.insight}`).join('\n')}`;

    case 'narrative':
      return `# ${researchQuestion}

${synthesis.executiveSummary}

The research reveals several key themes: ${synthesis.thematicAnalysis?.map(t => t.theme).join(', ')}. 

${synthesis.mainFindings?.map(f => f.finding).join(' ')}

Key insights from this synthesis include: ${synthesis.insights?.map(i => i.insight).join(' ')}`;

    default: // structured
      return JSON.stringify(synthesis, null, 2);
  }
}

/**
 * contentSynthesisTool
 * --------------------
 * Synthesizes information from multiple sources to create comprehensive,
 * well-structured research outputs. Identifies patterns, resolves contradictions,
 * and generates insights that go beyond simple aggregation.
 */
export const contentSynthesisTool = createTool({
  id: 'content-synthesis',
  description: 'Synthesize information from multiple sources to create comprehensive research outputs with analysis and insights.',
  inputSchema,
  outputSchema: z.object({
    success: z.boolean(),
    synthesis: synthesisOutputSchema,
    structuredOutput: z.string(),
    citations: z.array(z.string()),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      const { sources, researchQuestion, synthesisType, outputFormat } = context;
      const model = anthropic('claude-opus-4-20250514');
      
      const synthesisPrompt = buildSynthesisPrompt(context);
      
      const synthesis = await generateAndParseResponse(model, synthesisPrompt, sources);

      const structuredOutput = formatStructuredOutput(outputFormat, synthesis, researchQuestion);

      // Generate citations list
      const citations = sources.map(source => 
        `${source.author || 'Unknown'}. ${source.title}. ${source.url || 'N/A'}`
      );

      return {
        success: true,
        synthesis,
        structuredOutput,
        citations,
        message: `Successfully synthesized ${sources.length} sources using ${synthesisType} approach in ${outputFormat} format.`,
      };

    } catch (error) {
      console.error('Content synthesis error:', error);
      return {
        success: false,
        synthesis: {
          executiveSummary: 'Synthesis failed',
          mainFindings: [],
          thematicAnalysis: [],
          knowledgeGaps: [],
          insights: [],
          qualityAssessment: {
            sourceReliability: 'Unknown',
            evidenceStrength: 'Unknown',
            biasRisks: ['Synthesis failure'],
            limitations: ['Tool error'],
          },
        },
        structuredOutput: 'Synthesis failed due to processing error',
        citations: [],
        message: `Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});