import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';

/**
 * citationExtractionTool
 * ----------------------
 * Generates proper academic citations in multiple formats (APA, MLA, Chicago)
 * from web sources, documents, and research materials. Extracts metadata
 * and formats citations according to academic standards.
 */
export const citationExtractionTool = createTool({
  id: 'citation-extraction',
  description: 'Generate proper academic citations in multiple formats from web sources and research materials.',
  inputSchema: z.object({
    sources: z.array(z.object({
      url: z.string().url(),
      title: z.string(),
      author: z.string().optional(),
      publishDate: z.string().optional(),
      accessDate: z.string().optional(),
      publisher: z.string().optional(),
      sourceType: z.enum(['webpage', 'article', 'academic', 'news', 'book', 'report', 'other']).default('webpage'),
      additionalInfo: z.object({
        volume: z.string().optional(),
        issue: z.string().optional(),
        pages: z.string().optional(),
        doi: z.string().optional(),
        isbn: z.string().optional(),
      }).optional(),
    })).describe('Sources to generate citations for'),
    citationStyle: z.enum(['APA', 'MLA', 'Chicago', 'all']).default('APA').describe('Citation style to generate'),
    includeInText: z.boolean().default(true).describe('Include in-text citation examples'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    citations: z.array(z.object({
      url: z.string(),
      title: z.string(),
      metadata: z.object({
        author: z.string(),
        publishDate: z.string(),
        accessDate: z.string(),
        publisher: z.string(),
        sourceType: z.string(),
      }),
      citations: z.object({
        APA: z.string().optional(),
        MLA: z.string().optional(),
        Chicago: z.string().optional(),
      }),
      inTextCitation: z.object({
        APA: z.string().optional(),
        MLA: z.string().optional(),
        Chicago: z.string().optional(),
      }).optional(),
      notes: z.array(z.string()),
    })),
    bibliography: z.object({
      APA: z.array(z.string()).optional(),
      MLA: z.array(z.string()).optional(),
      Chicago: z.array(z.string()).optional(),
    }),
    message: z.string(),
  }),
  execute: async ({ context }) => {
    try {
      const { sources, citationStyle, includeInText } = context;
      const model = anthropic('claude-opus-4-20250514');
      
      const citations = [];
      const bibliography: { APA: string[]; MLA: string[]; Chicago: string[] } = { APA: [], MLA: [], Chicago: [] };
      
      for (const source of sources) {
        const currentDate = new Date().toISOString().split('T')[0];
        const accessDate = source.accessDate || currentDate;
        
        // Extract domain and infer publisher if not provided
        const domain = new URL(source.url).hostname;
        const inferredPublisher = source.publisher || domain.replace(/^www\./, '');
        
        // Clean and format metadata
        const metadata = {
          author: source.author || 'Unknown Author',
          publishDate: source.publishDate || 'n.d.',
          accessDate,
          publisher: inferredPublisher,
          sourceType: source.sourceType,
        };

        const citationPrompt = `
Generate proper academic citations for the following source:

Title: ${source.title}
Author: ${metadata.author}
URL: ${source.url}
Publisher: ${metadata.publisher}
Publish Date: ${metadata.publishDate}
Access Date: ${metadata.accessDate}
Source Type: ${metadata.sourceType}
${source.additionalInfo?.doi ? `DOI: ${source.additionalInfo.doi}` : ''}
${source.additionalInfo?.pages ? `Pages: ${source.additionalInfo.pages}` : ''}

Please generate citations in ${citationStyle === 'all' ? 'APA, MLA, and Chicago' : citationStyle} format(s).
${includeInText ? 'Also provide in-text citation examples.' : ''}

Follow these guidelines:
- Use proper formatting for each style
- Handle missing information appropriately (use "n.d." for no date, etc.)
- Format URLs and access dates correctly
- Apply proper capitalization and punctuation
- For web sources, include retrieval information as required

Provide the response in JSON format:
{
  "citations": {
    ${citationStyle === 'all' || citationStyle === 'APA' ? '"APA": "formatted APA citation",' : ''}
    ${citationStyle === 'all' || citationStyle === 'MLA' ? '"MLA": "formatted MLA citation",' : ''}
    ${citationStyle === 'all' || citationStyle === 'Chicago' ? '"Chicago": "formatted Chicago citation"' : ''}
  },
  ${includeInText ? `"inTextCitation": {
    ${citationStyle === 'all' || citationStyle === 'APA' ? '"APA": "APA in-text example",' : ''}
    ${citationStyle === 'all' || citationStyle === 'MLA' ? '"MLA": "MLA in-text example",' : ''}
    ${citationStyle === 'all' || citationStyle === 'Chicago' ? '"Chicago": "Chicago in-text example"' : ''}
  },` : ''}
  "notes": ["note1", "note2"]
}

Notes should include any formatting concerns or missing information warnings.
`;

        try {
          const response = await generateText({
            model,
            prompt: citationPrompt,
          });

          let citationData;
          try {
            const jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              citationData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found');
            }
          } catch (parseError) {
            // Fallback citation generation
            const fallbackCitations: { APA?: string; MLA?: string; Chicago?: string } = {};
            const fallbackInText: { APA?: string; MLA?: string; Chicago?: string } | undefined = includeInText ? {} : undefined;
            
            citationData = {
              citations: fallbackCitations,
              inTextCitation: fallbackInText,
              notes: ['Automated citation generation - please verify formatting'],
            };

            // Basic fallback citations
            if (citationStyle === 'all' || citationStyle === 'APA') {
              citationData.citations.APA = `${metadata.author}. (${metadata.publishDate}). ${source.title}. ${metadata.publisher}. Retrieved ${metadata.accessDate}, from ${source.url}`;
              if (includeInText && citationData.inTextCitation) {
                citationData.inTextCitation.APA = `(${metadata.author}, ${metadata.publishDate})`;
              }
            }
            if (citationStyle === 'all' || citationStyle === 'MLA') {
              citationData.citations.MLA = `${metadata.author}. "${source.title}." ${metadata.publisher}, ${metadata.publishDate}, ${source.url}. Accessed ${metadata.accessDate}.`;
              if (includeInText && citationData.inTextCitation) {
                citationData.inTextCitation.MLA = `(${metadata.author})`;
              }
            }
            if (citationStyle === 'all' || citationStyle === 'Chicago') {
              citationData.citations.Chicago = `${metadata.author}. "${source.title}." ${metadata.publisher}. ${metadata.publishDate}. ${source.url} (accessed ${metadata.accessDate}).`;
              if (includeInText && citationData.inTextCitation) {
                citationData.inTextCitation.Chicago = `(${metadata.author}, ${metadata.publishDate})`;
              }
            }
          }

          citations.push({
            url: source.url,
            title: source.title,
            metadata,
            citations: citationData.citations,
            inTextCitation: citationData.inTextCitation,
            notes: citationData.notes || [],
          });

          // Add to bibliography
          if (citationData.citations.APA) bibliography.APA.push(citationData.citations.APA);
          if (citationData.citations.MLA) bibliography.MLA.push(citationData.citations.MLA);
          if (citationData.citations.Chicago) bibliography.Chicago.push(citationData.citations.Chicago);

        } catch (error) {
          console.error(`Citation generation error for ${source.url}:`, error);
          citations.push({
            url: source.url,
            title: source.title,
            metadata,
            citations: {},
            notes: ['Citation generation failed', 'Manual formatting required'],
          });
        }
      }

      // Sort bibliography alphabetically
      bibliography.APA?.sort();
      bibliography.MLA?.sort();
      bibliography.Chicago?.sort();

      return {
        success: true,
        citations,
        bibliography: Object.fromEntries(
          Object.entries(bibliography).filter(([_, value]) => value && value.length > 0)
        ),
        message: `Generated ${citationStyle === 'all' ? 'multiple format' : citationStyle} citations for ${sources.length} sources.`,
      };

    } catch (error) {
      console.error('Citation extraction error:', error);
      return {
        success: false,
        citations: [],
        bibliography: {},
        message: `Citation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});