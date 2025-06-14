import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Enhanced PPTX Export Tool
 * --------------------------
 * Advanced PowerPoint export with multiple methods, metadata preservation,
 * and enhanced formatting options. Integrates all existing export methods.
 */

const enhancedPptxExportInputSchema = z.object({
  method: z.enum(['basic', 'advanced', 'hybrid', 'nutrient', 'auto'])
    .describe('Export method: basic (image-based), advanced (HTML parsing), hybrid (combination), nutrient (API-based), auto (best method selection)'),
  
  slides: z.array(z.object({
    html: z.string().describe('HTML content of the slide'),
    metadata: z.object({
      title: z.string().optional(),
      notes: z.string().optional(),
      animations: z.array(z.string()).optional(),
      layout: z.string().optional(),
    }).optional(),
  })).describe('Array of slides with HTML and metadata'),
  
  options: z.object({
    title: z.string().optional().default('AI Generated Presentation'),
    author: z.string().optional().default('AI Agent'),
    subject: z.string().optional(),
    
    // Format options
    slideSize: z.enum(['16:9', '4:3', 'custom']).optional().default('16:9'),
    customSize: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
    
    // Quality options
    imageQuality: z.enum(['low', 'medium', 'high', 'ultra']).optional().default('high'),
    preserveText: z.boolean().optional().default(true),
    preserveAnimations: z.boolean().optional().default(false),
    
    // Advanced options
    includeNotes: z.boolean().optional().default(false),
    includeMetadata: z.boolean().optional().default(true),
    optimizeFileSize: z.boolean().optional().default(false),
    
    // Fallback options
    fallbackMethod: z.enum(['basic', 'advanced', 'hybrid']).optional().default('basic'),
    retryCount: z.number().optional().default(2),
  }).optional().default({}),
});

const enhancedPptxExportOutputSchema = z.object({
  success: z.boolean(),
  method: z.string(),
  data: z.object({
    fileUrl: z.string().optional(),
    fileData: z.string().optional(), // base64 encoded
    fileName: z.string(),
    fileSize: z.number().optional(),
    slideCount: z.number(),
    processingTime: z.number(),
    metadata: z.object({
      exportMethod: z.string(),
      quality: z.string(),
      errors: z.array(z.string()).optional(),
      warnings: z.array(z.string()).optional(),
    }),
  }),
  message: z.string(),
});

export const enhancedPptxExportTool = createTool({
  id: 'enhanced-pptx-export',
  description: 'Advanced PowerPoint export with multiple methods, metadata preservation, and enhanced formatting options.',
  inputSchema: enhancedPptxExportInputSchema,
  outputSchema: enhancedPptxExportOutputSchema,
  execute: async ({ context }) => {
    const { method, slides, options = {} } = context;
    
    const startTime = Date.now();
    
    try {
      // Determine the best export method
      const selectedMethod = method === 'auto' ? selectBestMethod(slides) : method;
      
      let exportResult;
      
      switch (selectedMethod) {
        case 'nutrient':
          exportResult = await exportWithNutrient(slides, options);
          break;
        case 'advanced':
          exportResult = await exportWithAdvanced(slides, options);
          break;
        case 'hybrid':
          exportResult = await exportWithHybrid(slides, options);
          break;
        case 'basic':
        default:
          exportResult = await exportWithBasic(slides, options);
          break;
      }
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        method: selectedMethod,
        data: {
          ...exportResult,
          slideCount: slides.length,
          processingTime,
        },
        message: `PowerPoint export completed using ${selectedMethod} method`,
      };
      
    } catch (error) {
      // Fallback to alternative method
      if (options.fallbackMethod && options.fallbackMethod !== method) {
        try {
          const fallbackResult = await executeWithFallback(slides, options);
          const processingTime = Date.now() - startTime;
          
          return {
            success: true,
            method: options.fallbackMethod,
            data: {
              ...fallbackResult,
              slideCount: slides.length,
              processingTime,
              metadata: {
                exportMethod: options.fallbackMethod,
                quality: options.imageQuality || 'high',
                warnings: [`Primary method failed, used fallback: ${options.fallbackMethod}`],
              },
            },
            message: `PowerPoint export completed using fallback method: ${options.fallbackMethod}`,
          };
        } catch (fallbackError) {
          throw error; // Return original error if fallback also fails
        }
      }
      
      throw error;
    }
  },
});

// Helper function to select the best export method
function selectBestMethod(slides: any[]): string {
  // Analyze slides to determine best method
  const hasComplexHtml = slides.some(slide => 
    slide.html.includes('<svg') || 
    slide.html.includes('transform') ||
    slide.html.includes('animation')
  );
  
  const hasImages = slides.some(slide => 
    slide.html.includes('<img') || 
    slide.html.includes('background-image')
  );
  
  // Decision logic
  if (process.env.NUTRIENT_API_KEY && (hasComplexHtml || slides.length > 10)) {
    return 'nutrient'; // Best for complex presentations
  } else if (hasComplexHtml) {
    return 'hybrid'; // Good balance for complex content
  } else if (hasImages) {
    return 'advanced'; // Good for image-heavy content
  } else {
    return 'basic'; // Simple and reliable
  }
}

// Export with Basic method (existing functionality)
async function exportWithBasic(slides: any[], options: any) {
  // Call existing export-pptx API
  const response = await fetch('/api/export-pptx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides: slides.map(slide => ({
        imageData: `data:image/png;base64,${await htmlToImage(slide.html)}`,
        width: 1920,
        height: 1080,
      })),
      title: options.title,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Basic export failed: ${response.statusText}`);
  }
  
  const fileData = await response.arrayBuffer();
  
  return {
    fileData: Buffer.from(fileData).toString('base64'),
    fileName: `${options.title || 'presentation'}_basic.pptx`,
    fileSize: fileData.byteLength,
    metadata: {
      exportMethod: 'basic',
      quality: options.imageQuality || 'high',
    },
  };
}

// Export with Advanced method (existing functionality)
async function exportWithAdvanced(slides: any[], options: any) {
  // Call existing export-pptx-advanced API
  const response = await fetch('/api/export-pptx-advanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides: slides.map(slide => slide.html),
      title: options.title,
      preserveText: options.preserveText,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Advanced export failed: ${response.statusText}`);
  }
  
  const fileData = await response.arrayBuffer();
  
  return {
    fileData: Buffer.from(fileData).toString('base64'),
    fileName: `${options.title || 'presentation'}_advanced.pptx`,
    fileSize: fileData.byteLength,
    metadata: {
      exportMethod: 'advanced',
      quality: options.imageQuality || 'high',
    },
  };
}

// Export with Hybrid method (existing functionality)
async function exportWithHybrid(slides: any[], options: any) {
  // Call existing export-pptx-advanced-hybrid API
  const response = await fetch('/api/export-pptx-advanced-hybrid', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides: slides.map(slide => slide.html),
      title: options.title,
      optimizeFileSize: options.optimizeFileSize,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Hybrid export failed: ${response.statusText}`);
  }
  
  const fileData = await response.arrayBuffer();
  
  return {
    fileData: Buffer.from(fileData).toString('base64'),
    fileName: `${options.title || 'presentation'}_hybrid.pptx`,
    fileSize: fileData.byteLength,
    metadata: {
      exportMethod: 'hybrid',
      quality: options.imageQuality || 'high',
    },
  };
}

// Export with Nutrient API (existing functionality)
async function exportWithNutrient(slides: any[], options: any) {
  // Call existing export-pptx-nutrient API
  const response = await fetch('/api/export-pptx-nutrient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slides: slides.map(slide => slide.html),
      title: options.title,
      author: options.author,
      includeMetadata: options.includeMetadata,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Nutrient export failed: ${response.statusText}`);
  }
  
  const fileData = await response.arrayBuffer();
  
  return {
    fileData: Buffer.from(fileData).toString('base64'),
    fileName: `${options.title || 'presentation'}_nutrient.pptx`,
    fileSize: fileData.byteLength,
    metadata: {
      exportMethod: 'nutrient',
      quality: 'ultra',
    },
  };
}

// Execute with fallback method
async function executeWithFallback(slides: any[], options: any) {
  switch (options.fallbackMethod) {
    case 'advanced':
      return await exportWithAdvanced(slides, options);
    case 'hybrid':
      return await exportWithHybrid(slides, options);
    case 'basic':
    default:
      return await exportWithBasic(slides, options);
  }
}

// Helper function to convert HTML to image (simplified)
async function htmlToImage(html: string): Promise<string> {
  // This would use html2canvas or similar library
  // For now, return a placeholder
  return 'placeholder-base64-image-data';
}

// Additional utility functions

// Optimize slides for export
export function optimizeSlidesForExport(slides: any[], method: string) {
  return slides.map(slide => {
    let optimizedHtml = slide.html;
    
    // Remove unnecessary attributes for certain methods
    if (method === 'basic') {
      optimizedHtml = optimizedHtml.replace(/data-[^=]*="[^"]*"/g, '');
    }
    
    // Inline CSS for better compatibility
    if (method === 'advanced' || method === 'hybrid') {
      // CSS inlining logic would go here
    }
    
    return {
      ...slide,
      html: optimizedHtml,
    };
  });
}

// Validate slide content
export function validateSlideContent(slides: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  slides.forEach((slide, index) => {
    if (!slide.html || slide.html.trim() === '') {
      errors.push(`Slide ${index + 1}: Empty HTML content`);
    }
    
    // Check for unsupported elements
    if (slide.html.includes('<video') || slide.html.includes('<audio')) {
      errors.push(`Slide ${index + 1}: Video/Audio elements not supported`);
    }
    
    // Check for extremely large content
    if (slide.html.length > 100000) {
      errors.push(`Slide ${index + 1}: Content too large (${slide.html.length} characters)`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}