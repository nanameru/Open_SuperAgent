import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import * as cheerio from 'cheerio';

/**
 * Element Modifier Tool
 * ----------------------
 * Provides precise element modification capabilities for HTML slides.
 * Allows targeting specific elements by various selectors and applying modifications.
 */

const elementModifierInputSchema = z.object({
  operation: z.enum(['modify', 'add', 'remove', 'duplicate', 'move', 'style', 'analyze'])
    .describe('Operation to perform: modify (change element), add (insert element), remove (delete element), duplicate (copy element), move (reposition), style (apply CSS), analyze (inspect element)'),
  
  html: z.string().describe('HTML content to modify'),
  
  // Element targeting
  selector: z.string().optional()
    .describe('CSS selector to target elements (e.g., "#myId", ".myClass", "h1")'),
  elementId: z.string().optional()
    .describe('Specific element ID to target'),
  elementIndex: z.number().optional()
    .describe('Index of element when multiple matches (0-based)'),
  
  // Modification options
  modifications: z.object({
    // Content modifications
    text: z.string().optional().describe('New text content'),
    html: z.string().optional().describe('New HTML content'),
    attributes: z.record(z.string()).optional().describe('Attributes to set/update'),
    
    // Style modifications
    styles: z.record(z.string()).optional().describe('CSS styles to apply'),
    addClass: z.array(z.string()).optional().describe('CSS classes to add'),
    removeClass: z.array(z.string()).optional().describe('CSS classes to remove'),
    
    // Position and size
    position: z.object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      zIndex: z.number().optional(),
    }).optional().describe('Position and dimensions'),
    
    // Animation
    animation: z.object({
      type: z.enum(['fadeIn', 'slideIn', 'bounceIn', 'custom']).optional(),
      duration: z.string().optional(),
      delay: z.string().optional(),
      easing: z.string().optional(),
    }).optional().describe('Animation properties'),
  }).optional().describe('Modifications to apply'),
  
  // Add operation options
  newElement: z.object({
    tag: z.string().describe('HTML tag name'),
    content: z.string().optional().describe('Element content'),
    attributes: z.record(z.string()).optional().describe('Element attributes'),
    styles: z.record(z.string()).optional().describe('CSS styles'),
    position: z.enum(['before', 'after', 'inside-start', 'inside-end']).optional().default('inside-end'),
  }).optional().describe('New element properties for add operation'),
  
  // Move operation options
  moveTarget: z.object({
    selector: z.string().describe('Target selector for move operation'),
    position: z.enum(['before', 'after', 'inside-start', 'inside-end']).default('inside-end'),
  }).optional().describe('Move target properties'),
  
  // Options
  options: z.object({
    preserveFormatting: z.boolean().optional().default(true),
    validateHtml: z.boolean().optional().default(true),
    generateUniqueIds: z.boolean().optional().default(false),
    backupOriginal: z.boolean().optional().default(false),
  }).optional().default({}),
});

const elementModifierOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  data: z.object({
    modifiedHtml: z.string().optional(),
    originalHtml: z.string().optional(),
    affectedElements: z.array(z.object({
      selector: z.string(),
      tag: z.string(),
      id: z.string().optional(),
      classes: z.array(z.string()).optional(),
      changes: z.array(z.string()),
    })).optional(),
    analysis: z.object({
      totalElements: z.number().optional(),
      targetedElements: z.number().optional(),
      elementTypes: z.record(z.number()).optional(),
      issues: z.array(z.string()).optional(),
    }).optional(),
  }),
  message: z.string(),
});

export const elementModifierTool = createTool({
  id: 'element-modifier',
  description: 'Provides precise element modification capabilities for HTML slides with various targeting and modification options.',
  inputSchema: elementModifierInputSchema,
  outputSchema: elementModifierOutputSchema,
  execute: async ({ context }) => {
    const { operation, html, selector, elementId, elementIndex, modifications, newElement, moveTarget, options = {} } = context;
    
    try {
      const $ = cheerio.load(html, {
        decodeEntities: false,
        withStartIndices: false,
        withEndIndices: false,
      });
      
      let affectedElements: any[] = [];
      let analysis: any = {};
      
      switch (operation) {
        case 'modify':
          affectedElements = await modifyElements($, selector, elementId, elementIndex, modifications);
          break;
          
        case 'add':
          if (!newElement) {
            throw new Error('newElement is required for add operation');
          }
          affectedElements = await addElement($, selector, elementId, newElement);
          break;
          
        case 'remove':
          affectedElements = await removeElements($, selector, elementId, elementIndex);
          break;
          
        case 'duplicate':
          affectedElements = await duplicateElements($, selector, elementId, elementIndex);
          break;
          
        case 'move':
          if (!moveTarget) {
            throw new Error('moveTarget is required for move operation');
          }
          affectedElements = await moveElements($, selector, elementId, elementIndex, moveTarget);
          break;
          
        case 'style':
          if (!modifications?.styles) {
            throw new Error('styles are required for style operation');
          }
          affectedElements = await styleElements($, selector, elementId, elementIndex, modifications.styles);
          break;
          
        case 'analyze':
          analysis = await analyzeElements($, selector, elementId);
          break;
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      const modifiedHtml = $.html();
      
      // Validate HTML if requested
      if (options.validateHtml) {
        const validation = validateHtml(modifiedHtml);
        if (!validation.valid) {
          throw new Error(`Invalid HTML generated: ${validation.errors.join(', ')}`);
        }
      }
      
      return {
        success: true,
        operation,
        data: {
          modifiedHtml,
          originalHtml: options.backupOriginal ? html : undefined,
          affectedElements,
          analysis: Object.keys(analysis).length > 0 ? analysis : undefined,
        },
        message: `Element ${operation} completed successfully. ${affectedElements.length} elements affected.`,
      };
      
    } catch (error) {
      return {
        success: false,
        operation,
        data: {},
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Helper function to modify elements
async function modifyElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number, modifications?: any): Promise<any[]> {
  const elements = findElements($, selector, elementId, elementIndex);
  const affectedElements: any[] = [];
  
  elements.each((i, element) => {
    const $el = $(element);
    const changes: string[] = [];
    
    // Text content
    if (modifications?.text !== undefined) {
      $el.text(modifications.text);
      changes.push('text');
    }
    
    // HTML content
    if (modifications?.html !== undefined) {
      $el.html(modifications.html);
      changes.push('html');
    }
    
    // Attributes
    if (modifications?.attributes) {
      Object.entries(modifications.attributes).forEach(([key, value]) => {
        $el.attr(key, value as string);
        changes.push(`attr:${key}`);
      });
    }
    
    // Styles
    if (modifications?.styles) {
      Object.entries(modifications.styles).forEach(([key, value]) => {
        $el.css(key, value as string);
        changes.push(`style:${key}`);
      });
    }
    
    // Add classes
    if (modifications?.addClass) {
      modifications.addClass.forEach((className: string) => {
        $el.addClass(className);
        changes.push(`addClass:${className}`);
      });
    }
    
    // Remove classes
    if (modifications?.removeClass) {
      modifications.removeClass.forEach((className: string) => {
        $el.removeClass(className);
        changes.push(`removeClass:${className}`);
      });
    }
    
    // Position and size
    if (modifications?.position) {
      const pos = modifications.position;
      const positionStyles: any = {};
      
      if (pos.x !== undefined) positionStyles.left = pos.x + 'px';
      if (pos.y !== undefined) positionStyles.top = pos.y + 'px';
      if (pos.width !== undefined) positionStyles.width = pos.width + 'px';
      if (pos.height !== undefined) positionStyles.height = pos.height + 'px';
      if (pos.zIndex !== undefined) positionStyles['z-index'] = pos.zIndex.toString();
      
      if (Object.keys(positionStyles).length > 0) {
        positionStyles.position = 'absolute';
        $el.css(positionStyles);
        changes.push('position');
      }
    }
    
    // Animation
    if (modifications?.animation) {
      const anim = modifications.animation;
      const animationCSS: any = {};
      
      if (anim.type && anim.type !== 'custom') {
        animationCSS['animation-name'] = anim.type;
      }
      if (anim.duration) animationCSS['animation-duration'] = anim.duration;
      if (anim.delay) animationCSS['animation-delay'] = anim.delay;
      if (anim.easing) animationCSS['animation-timing-function'] = anim.easing;
      
      $el.css(animationCSS);
      changes.push('animation');
    }
    
    affectedElements.push({
      selector: getElementSelector($el),
      tag: $el.prop('tagName')?.toLowerCase() || '',
      id: $el.attr('id'),
      classes: $el.attr('class')?.split(/\s+/).filter(Boolean),
      changes,
    });
  });
  
  return affectedElements;
}

// Helper function to add elements
async function addElement($: cheerio.CheerioAPI, selector?: string, elementId?: string, newElement?: any): Promise<any[]> {
  const targetElements = findElements($, selector, elementId);
  const affectedElements: any[] = [];
  
  if (targetElements.length === 0) {
    throw new Error('No target elements found for add operation');
  }
  
  targetElements.each((i, element) => {
    const $target = $(element);
    const $newEl = $(`<${newElement.tag}></${newElement.tag}>`);
    
    // Set content
    if (newElement.content) {
      $newEl.html(newElement.content);
    }
    
    // Set attributes
    if (newElement.attributes) {
      Object.entries(newElement.attributes).forEach(([key, value]) => {
        $newEl.attr(key, value as string);
      });
    }
    
    // Set styles
    if (newElement.styles) {
      $newEl.css(newElement.styles);
    }
    
    // Position the element
    switch (newElement.position) {
      case 'before':
        $target.before($newEl);
        break;
      case 'after':
        $target.after($newEl);
        break;
      case 'inside-start':
        $target.prepend($newEl);
        break;
      case 'inside-end':
      default:
        $target.append($newEl);
        break;
    }
    
    affectedElements.push({
      selector: getElementSelector($newEl),
      tag: newElement.tag,
      id: $newEl.attr('id'),
      classes: $newEl.attr('class')?.split(/\s+/).filter(Boolean),
      changes: ['added'],
    });
  });
  
  return affectedElements;
}

// Helper function to remove elements
async function removeElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number): Promise<any[]> {
  const elements = findElements($, selector, elementId, elementIndex);
  const affectedElements: any[] = [];
  
  elements.each((i, element) => {
    const $el = $(element);
    
    affectedElements.push({
      selector: getElementSelector($el),
      tag: $el.prop('tagName')?.toLowerCase() || '',
      id: $el.attr('id'),
      classes: $el.attr('class')?.split(/\s+/).filter(Boolean),
      changes: ['removed'],
    });
    
    $el.remove();
  });
  
  return affectedElements;
}

// Helper function to duplicate elements
async function duplicateElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number): Promise<any[]> {
  const elements = findElements($, selector, elementId, elementIndex);
  const affectedElements: any[] = [];
  
  elements.each((i, element) => {
    const $el = $(element);
    const $clone = $el.clone();
    
    // Generate unique ID if original has one
    const originalId = $clone.attr('id');
    if (originalId) {
      $clone.attr('id', `${originalId}_copy_${Date.now()}`);
    }
    
    $el.after($clone);
    
    affectedElements.push({
      selector: getElementSelector($clone),
      tag: $clone.prop('tagName')?.toLowerCase() || '',
      id: $clone.attr('id'),
      classes: $clone.attr('class')?.split(/\s+/).filter(Boolean),
      changes: ['duplicated'],
    });
  });
  
  return affectedElements;
}

// Helper function to move elements
async function moveElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number, moveTarget?: any): Promise<any[]> {
  const elements = findElements($, selector, elementId, elementIndex);
  const targetElements = $(moveTarget.selector);
  const affectedElements: any[] = [];
  
  if (targetElements.length === 0) {
    throw new Error('No target elements found for move operation');
  }
  
  const $moveTargetEl = targetElements.first();
  
  elements.each((i, element) => {
    const $el = $(element);
    
    // Position the element
    switch (moveTarget.position) {
      case 'before':
        $moveTargetEl.before($el);
        break;
      case 'after':
        $moveTargetEl.after($el);
        break;
      case 'inside-start':
        $moveTargetEl.prepend($el);
        break;
      case 'inside-end':
      default:
        $moveTargetEl.append($el);
        break;
    }
    
    affectedElements.push({
      selector: getElementSelector($el),
      tag: $el.prop('tagName')?.toLowerCase() || '',
      id: $el.attr('id'),
      classes: $el.attr('class')?.split(/\s+/).filter(Boolean),
      changes: ['moved'],
    });
  });
  
  return affectedElements;
}

// Helper function to style elements
async function styleElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number, styles?: any): Promise<any[]> {
  const elements = findElements($, selector, elementId, elementIndex);
  const affectedElements: any[] = [];
  
  elements.each((i, element) => {
    const $el = $(element);
    
    $el.css(styles);
    
    affectedElements.push({
      selector: getElementSelector($el),
      tag: $el.prop('tagName')?.toLowerCase() || '',
      id: $el.attr('id'),
      classes: $el.attr('class')?.split(/\s+/).filter(Boolean),
      changes: ['styled'],
    });
  });
  
  return affectedElements;
}

// Helper function to analyze elements
async function analyzeElements($: cheerio.CheerioAPI, selector?: string, elementId?: string): Promise<any> {
  const allElements = $('*');
  const targetElements = selector ? $(selector) : (elementId ? $(`#${elementId}`) : allElements);
  
  const elementTypes: Record<string, number> = {};
  const issues: string[] = [];
  
  allElements.each((i, element) => {
    const tagName = $(element).prop('tagName')?.toLowerCase() || 'unknown';
    elementTypes[tagName] = (elementTypes[tagName] || 0) + 1;
    
    // Check for common issues
    const $el = $(element);
    if ($el.attr('id') && $(`#${$el.attr('id')}`).length > 1) {
      issues.push(`Duplicate ID found: ${$el.attr('id')}`);
    }
    
    if ($el.prop('tagName') === 'IMG' && !$el.attr('alt')) {
      issues.push('Image missing alt attribute');
    }
  });
  
  return {
    totalElements: allElements.length,
    targetedElements: targetElements.length,
    elementTypes,
    issues,
  };
}

// Helper function to find elements
function findElements($: cheerio.CheerioAPI, selector?: string, elementId?: string, elementIndex?: number): cheerio.Cheerio<cheerio.Element> {
  let elements: cheerio.Cheerio<cheerio.Element>;
  
  if (elementId) {
    elements = $(`#${elementId}`);
  } else if (selector) {
    elements = $(selector);
  } else {
    throw new Error('Either selector or elementId must be provided');
  }
  
  if (elementIndex !== undefined) {
    elements = elements.eq(elementIndex);
  }
  
  return elements;
}

// Helper function to get element selector
function getElementSelector($el: cheerio.Cheerio<cheerio.Element>): string {
  const id = $el.attr('id');
  if (id) return `#${id}`;
  
  const className = $el.attr('class');
  if (className) return `.${className.split(/\s+/)[0]}`;
  
  const tagName = $el.prop('tagName')?.toLowerCase();
  return tagName || 'element';
}

// Helper function to validate HTML
function validateHtml(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Basic validation
  if (!html.trim()) {
    errors.push('Empty HTML content');
  }
  
  // Check for unclosed tags (simplified)
  const openTags = html.match(/<[^/][^>]*>/g) || [];
  const closeTags = html.match(/<\/[^>]+>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    errors.push('Mismatched HTML tags detected');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}