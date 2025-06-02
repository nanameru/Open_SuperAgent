import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { evaluate } from 'mathjs';
import axios from 'axios';
import * as fs from 'fs';
import fs__default from 'fs';
import * as path from 'path';
import path__default from 'path';
import { v4 } from 'uuid';
import { fal } from '@fal-ai/client';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

const htmlSlideTool = tool({
  description: 'Generates the HTML content for a single slide section (within <section class="slide"></section>) using an LLM. It takes a general topic and a specific outline point for this particular slide.',
  parameters: z.object({
    topic: z.string().describe("The main topic or subject of the overall presentation."),
    outline: z.string().optional().describe("The specific theme, topic, or key points for THIS slide."),
    slideCount: z.number().default(1).describe("The number of slides to generate with this call. Expected to be 1 by the calling agent."),
    slideIndex: z.number().optional().describe("Current slide number in sequence (for pagination)."),
    totalSlides: z.number().optional().describe("Total slides in the presentation (for pagination)."),
    layoutType: z.enum(["default", "image-left", "image-right", "full-graphic", "quote", "comparison", "timeline", "list", "title", "section-break", "data-visualization", "photo-with-caption"]).optional().describe("The desired slide layout type."),
    diagramType: z.enum(["auto", "bar", "pie", "flow", "venn", "pyramid", "quadrant", "mind-map", "timeline", "comparison", "icons", "none"]).optional().default("auto").describe("Type of diagram to include in the slide."),
    colorScheme: z.object({
      primaryColor: z.string().optional().describe("Primary color hex code (e.g., #0056B1)."),
      accentColor: z.string().optional().describe("Accent color hex code (e.g., #FFB400)."),
      bgColor: z.string().optional().describe("Background color hex code (e.g., #F5F7FA).")
    }).optional().describe("Color scheme for the slide."),
    designElements: z.array(z.enum(["gradients", "transparency", "geometric", "shadows", "animations", "borders", "whitespace"])).optional().describe("Special design elements to include."),
    fontFamily: z.string().optional().describe("Font family to use for the slide."),
    forceInclude: z.string().optional().describe("Specific content that must be included in the slide (e.g., quote, stat, diagram)."),
    variant: z.number().optional().default(1).describe("Generate a specific variant (1, 2, 3) for different design options of the same content.")
  }),
  execute: async ({ topic, outline, slideCount, slideIndex, totalSlides, layoutType, diagramType, colorScheme, designElements, fontFamily, forceInclude, variant }) => {
    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}-v${variant || 1}`;
    const promptArgs = {
      topic,
      outline: outline || topic,
      // If outline is not provided, use the main topic.
      slideIndex: slideIndex?.toString() || "current",
      totalSlides: totalSlides?.toString() || "N",
      primaryColor: colorScheme?.primaryColor || "#0056B1",
      // Default primary color
      accentColor: colorScheme?.accentColor || "#FFB400",
      // Default accent color
      bgColor: colorScheme?.bgColor || "#F5F7FA",
      // Default background color
      fontFamily: fontFamily || "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      // Default font family
      layoutType: layoutType || "default",
      // Default layout type
      diagramType: diagramType || "auto",
      // Default diagram type
      extras: designElements?.join(", ") || "modern-design",
      // Added modern-design by default
      uniqueClass: uniqueSlideClass,
      variant: variant || 1,
      forceInclude: forceInclude || ""
    };
    const baseDesignPrompt = `\u3042\u306A\u305F\u306F\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u306A\u300C\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u30C7\u30B6\u30A4\u30CA\u30FC\u300D\u3067\u3059\u3002
\u4F01\u696D\u306E\u7D4C\u55B6\u9663\u3084\u30AB\u30F3\u30D5\u30A1\u30EC\u30F3\u30B9\u3067\u3082\u4F7F\u7528\u3067\u304D\u308B\u9AD8\u54C1\u8CEA\u306A\u30B9\u30E9\u30A4\u30C9\u3092 HTML/CSS \u3067\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u5165\u529B\u30D1\u30E9\u30E1\u30FC\u30BF\u3011
\u30FB\u30E1\u30A4\u30F3\u30C6\u30FC\u30DE          : ${promptArgs.topic}
\u30FB\u3053\u306E\u30B9\u30E9\u30A4\u30C9\u306E\u8981\u70B9    : ${promptArgs.outline}
\u30FB\u30B9\u30E9\u30A4\u30C9\u756A\u53F7 / \u7DCF\u679A\u6570 : ${promptArgs.slideIndex} / ${promptArgs.totalSlides}
\u30FB\u30C6\u30FC\u30DE\u30AB\u30E9\u30FC          : ${promptArgs.primaryColor}
\u30FB\u30A2\u30AF\u30BB\u30F3\u30C8\u30AB\u30E9\u30FC      : ${promptArgs.accentColor}
\u30FB\u80CC\u666F\u30AB\u30E9\u30FC            : ${promptArgs.bgColor}
\u30FB\u30D5\u30A9\u30F3\u30C8\u30D5\u30A1\u30DF\u30EA\u30FC    : ${promptArgs.fontFamily}
\u30FB\u30EC\u30A4\u30A2\u30A6\u30C8\u30BF\u30A4\u30D7      : ${promptArgs.layoutType}
\u30FB\u56F3\u89E3\u30BF\u30A4\u30D7            : ${promptArgs.diagramType}
\u30FB\u8FFD\u52A0\u8981\u7D20              : ${promptArgs.extras}
\u30FB\u5FC5\u9808\u542B\u6709\u8981\u7D20          : ${promptArgs.forceInclude}
\u30FB\u30D0\u30EA\u30A2\u30F3\u30C8           : ${promptArgs.variant}

\u3010\u6700\u512A\u5148\u4E8B\u9805\u3011
1. **\u30D7\u30ED\u54C1\u8CEA\u306E\u30B9\u30E9\u30A4\u30C9\u30C7\u30B6\u30A4\u30F3** - \u30A2\u30C3\u30D7\u30EB\u3084\u30B0\u30FC\u30B0\u30EB\u306E\u30D7\u30EC\u30BC\u30F3\u306B\u5339\u6575\u3059\u308B\u7F8E\u3057\u3055\u3092\u76EE\u6307\u3059
2. **\u8996\u899A\u7684\u60C5\u5831\u4F1D\u9054** - \u6587\u5B57\u3060\u3051\u3067\u306A\u304F\u3001\u56F3\u89E3\u30FB\u30A2\u30A4\u30B3\u30F3\u30FB\u8996\u899A\u8981\u7D20\u3092\u5FC5\u305A\u542B\u3081\u308B
3. **\u4E00\u76EE\u3067\u7406\u89E3\u3067\u304D\u308B\u69CB\u6210** - \u60C5\u5831\u306F\u968E\u5C64\u5316\u3057\u3001\u8996\u7DDA\u306E\u6D41\u308C\u3092\u610F\u8B58\u3057\u305F\u30EC\u30A4\u30A2\u30A6\u30C8
4. **\u30D0\u30EA\u30A2\u30F3\u30C8\u5225\u30C7\u30B6\u30A4\u30F3** - \u30D0\u30EA\u30A2\u30F3\u30C8\u5024\uFF08${promptArgs.variant}\uFF09\u306B\u57FA\u3065\u3044\u3066\u7570\u306A\u308B\u30C7\u30B6\u30A4\u30F3\u30B9\u30BF\u30A4\u30EB\u3092\u63D0\u4F9B
5. **16:9\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4** - \u3059\u3079\u3066\u306E\u30B9\u30E9\u30A4\u30C9\u309216:9\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4\u306B\u7D71\u4E00

\u3010\u51FA\u529B\u8981\u4EF6\u3011
1. **<style>** \u30D6\u30ED\u30C3\u30AF\u3068 **<section class="slide ...">...</section>** \u306E\u307F\u8FD4\u3059\u3002
2. CSS \u306F\u30AF\u30E9\u30B9 \`.${promptArgs.uniqueClass}\` \u306B\u30B9\u30B3\u30FC\u30D7\u3057\u3001\u4ED6\u8981\u7D20\u3078\u5F71\u97FF\u3055\u305B\u306A\u3044\u3002
3. \u672A\u6307\u5B9A\u30D1\u30E9\u30E1\u30FC\u30BF\u306F\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u3092\u63A1\u7528\u3002
4. **\u30B9\u30E9\u30A4\u30C9\u306E\u5BF8\u6CD5\u309216:9\u306E\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4\u306B\u56FA\u5B9A\u3059\u308B**
   - width: 100%
   - height: 0
   - padding-bottom: 56.25% (16:9\u306E\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4)
   - \u307E\u305F\u306F\u9069\u5207\u306Avw/vh\u30E6\u30CB\u30C3\u30C8\u3092\u4F7F\u7528
5. \u751F\u6210\u3059\u308B HTML \u69CB\u9020\u306F **layoutType** \u306B\u5FDC\u3058\u3066\u4EE5\u4E0B\u3092\u53C2\u8003\u306B\u67D4\u8EDF\u306B\u5909\u5F62\u3059\u308B\u3053\u3068\u3002
   - 'default'           : \u5927\u304D\u306A\u898B\u51FA\u3057 + \u7C21\u6F54\u306A\u672C\u6587 + \u8996\u899A\u7684\u56F3\u89E3 + \u7B87\u6761\u66F8\u304D\uFF083\u9805\u76EE\u7A0B\u5EA6\uFF09
   - 'image-left'        : \u5DE6\u5074\u306B\u56F3\u89E3\u30FB\u30A4\u30E9\u30B9\u30C8 / \u53F3\u5074\u306B\u7C21\u6F54\u306A\u672C\u6587\u3068\u30DD\u30A4\u30F3\u30C8
   - 'image-right'       : \u53F3\u5074\u306B\u56F3\u89E3\u30FB\u30A4\u30E9\u30B9\u30C8 / \u5DE6\u5074\u306B\u7C21\u6F54\u306A\u672C\u6587\u3068\u30DD\u30A4\u30F3\u30C8
   - 'full-graphic'      : \u80CC\u666F\u5168\u4F53\u306B\u56F3\u89E3\u30FB\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u30FB\u30D1\u30BF\u30FC\u30F3\u3092\u914D\u7F6E\u3001\u305D\u306E\u4E0A\u306B\u91CD\u8981\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u914D\u7F6E
   - 'quote'             : \u5F15\u7528\u3092\u4E2D\u592E\u306B\u5927\u304D\u304F\u914D\u7F6E\u3001\u5F15\u7528\u8005\u60C5\u5831\u306F\u53F3\u4E0B\u306B\u5C0F\u3055\u304F
   - 'comparison'        : \u5DE6\u53F3\u307E\u305F\u306F\u4E0A\u4E0B\u3067\u9805\u76EE\u3092\u6BD4\u8F03\u3059\u308B2\u30AB\u30E9\u30E0\u30EC\u30A4\u30A2\u30A6\u30C8
   - 'timeline'          : \u6C34\u5E73\u307E\u305F\u306F\u5782\u76F4\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u56F3\u89E3\u3092\u4E2D\u5FC3\u306B\u914D\u7F6E
   - 'list'              : \u7B87\u6761\u66F8\u304D\u3092\u4E2D\u5FC3\u3068\u3057\u305F\u30B7\u30F3\u30D7\u30EB\u306A\u69CB\u6210\uFF08\u6700\u59275-6\u9805\u76EE\uFF09
   - 'title'             : \u30E1\u30A4\u30F3\u30BF\u30A4\u30C8\u30EB\u30B9\u30E9\u30A4\u30C9\uFF08\u30D7\u30EC\u30BC\u30F3\u5192\u982D\u7528\uFF09
   - 'section-break'     : \u30BB\u30AF\u30B7\u30E7\u30F3\u533A\u5207\u308A\u3092\u793A\u3059\u5927\u898B\u51FA\u3057\u306E\u307F\u306E\u30B9\u30E9\u30A4\u30C9
   - 'data-visualization': \u30C7\u30FC\u30BF\u30D3\u30B8\u30E5\u30A2\u30E9\u30A4\u30BC\u30FC\u30B7\u30E7\u30F3\u3092\u4E2D\u5FC3\u3068\u3057\u305F\u30B9\u30E9\u30A4\u30C9
   - 'photo-with-caption' : \u5370\u8C61\u7684\u306A\u5199\u771F\u307E\u305F\u306F\u30A4\u30E9\u30B9\u30C8\u3068\u7C21\u6F54\u306A\u30AD\u30E3\u30D7\u30B7\u30E7\u30F3

6. **\u56F3\u89E3\u3068\u30D3\u30B8\u30E5\u30A2\u30EB\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
   **diagramType** ('${promptArgs.diagramType}') \u306B\u57FA\u3065\u3044\u3066\u9069\u5207\u306A\u56F3\u89E3\u3092 SVG \u3067\u751F\u6210\uFF1A
   - 'auto'        : \u5185\u5BB9\u306B\u6700\u9069\u306A\u56F3\u89E3\u3092\u81EA\u52D5\u9078\u629E
   - 'bar'         : \u68D2\u30B0\u30E9\u30D5\uFF08\u9805\u76EE\u6BD4\u8F03\u306B\u6700\u9069\uFF09
   - 'pie'         : \u5186\u30B0\u30E9\u30D5\uFF08\u69CB\u6210\u6BD4\u306B\u6700\u9069\uFF09
   - 'flow'        : \u30D5\u30ED\u30FC\u56F3\uFF08\u30D7\u30ED\u30BB\u30B9\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'venn'        : \u30D9\u30F3\u56F3\uFF08\u95A2\u4FC2\u6027\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'pyramid'     : \u30D4\u30E9\u30DF\u30C3\u30C9\u56F3\uFF08\u968E\u5C64\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'quadrant'    : \u56DB\u8C61\u9650\u56F3\uFF08\u5206\u985E\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'mind-map'    : \u30DE\u30A4\u30F3\u30C9\u30DE\u30C3\u30D7\uFF08\u6982\u5FF5\u95A2\u4FC2\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'timeline'    : \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\uFF08\u6642\u7CFB\u5217\u8AAC\u660E\u306B\u6700\u9069\uFF09
   - 'comparison'  : \u6BD4\u8F03\u8868\uFF08\u8907\u6570\u9805\u76EE\u6BD4\u8F03\u306B\u6700\u9069\uFF09
   - 'icons'       : \u30C6\u30FC\u30DE\u306B\u95A2\u9023\u3059\u308B\u30A2\u30A4\u30B3\u30F3\u30BB\u30C3\u30C8
   - 'none'        : \u56F3\u89E3\u306A\u3057\uFF08\u30C6\u30AD\u30B9\u30C8\u306E\u307F\u91CD\u8996\u3059\u308B\u5834\u5408\uFF09

7. **\u30E2\u30C0\u30F3\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
   \u4EE5\u4E0B\u306E\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\u3092\u5FC5\u305A1\u3064\u4EE5\u4E0A\u542B\u3081\u308B\uFF1A
   - \u6D17\u7DF4\u3055\u308C\u305F\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u80CC\u666F
   - \u534A\u900F\u660E\u306E\u56F3\u5F62\u3084\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4
   - \u5E7E\u4F55\u5B66\u7684\u306A\u30A2\u30AF\u30BB\u30F3\u30C8\u30D1\u30BF\u30FC\u30F3
   - \u5F71\u3084\u30C9\u30ED\u30C3\u30D7\u30B7\u30E3\u30C9\u30A6\u52B9\u679C
   - \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u52B9\u679C\uFF08CSS transitions/animations\uFF09
   - \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u306A\u30DC\u30FC\u30C0\u30FC\u3084\u30BB\u30D1\u30EC\u30FC\u30BF\u30FC
   - \u9069\u5207\u306A\u30DB\u30EF\u30A4\u30C8\u30B9\u30DA\u30FC\u30B9\uFF08\u4F59\u767D\uFF09\u306E\u6D3B\u7528

8. **\u30C6\u30AD\u30B9\u30C8\u8A2D\u8A08\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3**
   - \u898B\u51FA\u3057: 32-40px\u3001\u592A\u5B57\u3001\u9AD8\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8
   - \u672C\u6587: 18-24px\u3001\u8AAD\u307F\u3084\u3059\u3044\u30D5\u30A9\u30F3\u30C8
   - \u7B87\u6761\u66F8\u304D: \u7C21\u6F54\u30671\u884C\u4EE5\u5185\u3001\u524D\u5F8C\u306B\u5341\u5206\u306A\u4F59\u767D
   - \u5F37\u8ABF: \u8272\u30FB\u30B5\u30A4\u30BA\u30FB\u30D5\u30A9\u30F3\u30C8\u30A6\u30A7\u30A4\u30C8\u3092\u4F7F\u3044\u5206\u3051\u308B
   - \u30C6\u30AD\u30B9\u30C8\u91CF: 1\u30B9\u30E9\u30A4\u30C9\u3042\u305F\u308A30-50\u5358\u8A9E\u7A0B\u5EA6\u306B\u6291\u3048\u308B
   - \u30D5\u30A9\u30F3\u30C8: \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u3067\u8AAD\u307F\u3084\u3059\u3044\u65E5\u672C\u8A9EWeb\u30D5\u30A9\u30F3\u30C8\u3092\u4F7F\u7528\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8 ${promptArgs.fontFamily}\uFF09

9. **\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u3068\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30C7\u30B6\u30A4\u30F3**
   - \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4 AA \u6E96\u62E0
   - SVG\u8981\u7D20\u306B\u306F\u9069\u5207\u306Aalt/aria\u5C5E\u6027
   - \u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u306A\u8981\u7D20\u914D\u7F6E\uFF08vw/vh\u5358\u4F4D\u306E\u6D3B\u7528\uFF09

10. **\u6700\u4E0B\u90E8\u53F3\u5BC4\u305B\u306B "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} \u2014 ${promptArgs.topic}" \u3092\u6D17\u7DF4\u3055\u308C\u305F\u30C7\u30B6\u30A4\u30F3\u3067\u8868\u793A**

11. **\u30D0\u30EA\u30A2\u30F3\u30C8\u306B\u3088\u308B\u30C7\u30B6\u30A4\u30F3\u5DEE\u5225\u5316\uFF08\u30D0\u30EA\u30A2\u30F3\u30C8: ${promptArgs.variant}\uFF09**
   - \u30D0\u30EA\u30A2\u30F3\u30C81: \u6A19\u6E96\u7684\u3067\u30AF\u30EA\u30FC\u30F3\u306A\u30C7\u30B6\u30A4\u30F3
   - \u30D0\u30EA\u30A2\u30F3\u30C82: \u3088\u308A\u5927\u80C6\u3067\u8996\u899A\u7684\u306A\u30A4\u30F3\u30D1\u30AF\u30C8\u3092\u91CD\u8996\u3057\u305F\u30C7\u30B6\u30A4\u30F3
   - \u30D0\u30EA\u30A2\u30F3\u30C83: \u3088\u308A\u30DF\u30CB\u30DE\u30EA\u30B9\u30C8\u3067\u30A8\u30EC\u30AC\u30F3\u30C8\u306A\u30C7\u30B6\u30A4\u30F3

12. **\u5FC5\u9808\u542B\u6709\u8981\u7D20\u306E\u7D44\u307F\u8FBC\u307F**
   \u300C${promptArgs.forceInclude}\u300D\u3092\u78BA\u5B9F\u306B\u30B9\u30E9\u30A4\u30C9\u5185\u306B\u542B\u3081\u308B\u3053\u3068\u3002

13. **\u7981\u6B62\u4E8B\u9805**
    - <html>, <head>, <body> \u30BF\u30B0\u306E\u4F7F\u7528
    - \u5916\u90E8\u753B\u50CFURL\uFF08\u3059\u3079\u3066SVG\u3067\u5B8C\u7D50\uFF09
    - CSS \u30EA\u30BB\u30C3\u30C8\u30FB\u5927\u57DF\u30D5\u30A9\u30F3\u30C8\u5909\u66F4
    - \u904E\u5EA6\u306A\u88C5\u98FE\u3084\u8AAD\u307F\u306B\u304F\u3044\u30C7\u30B6\u30A4\u30F3
    - \u60C5\u5831\u904E\u591A\uFF081\u30B9\u30E9\u30A4\u30C9\u306B\u8A70\u3081\u8FBC\u307F\u3059\u304E\u306A\u3044\uFF09

\u3010\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u4F8B\u3011
\`\`\`
<style>
/* \u30B9\u30B3\u30FC\u30D7\u3055\u308C\u305FCSS */
.${promptArgs.uniqueClass} {
  /* \u30D9\u30FC\u30B9\u30B9\u30BF\u30A4\u30EB */
}
/* \u4ED6\u306E\u30BB\u30EC\u30AF\u30BF\u3068\u30B9\u30BF\u30A4\u30EB... */
</style>
<section class="slide ${promptArgs.uniqueClass}">
  <!-- \u30B9\u30E9\u30A4\u30C9\u30B3\u30F3\u30C6\u30F3\u30C4 -->
</section>
\`\`\`

\u3010\u601D\u8003\u30D7\u30ED\u30BB\u30B9\u3011
1. \u30B9\u30E9\u30A4\u30C9\u306E\u76EE\u7684\u3092\u7406\u89E3\uFF08\u8AAC\u660E\u30FB\u6BD4\u8F03\u30FB\u5F37\u8ABF\u30FB\u30D7\u30ED\u30BB\u30B9\u89E3\u8AAC\u306A\u3069\uFF09
2. \u76EE\u7684\u306B\u6700\u9069\u306A\u30EC\u30A4\u30A2\u30A6\u30C8\u3068\u56F3\u89E3\u30BF\u30A4\u30D7\u3092\u9078\u629E
3. \u5185\u5BB9\u306E\u968E\u5C64\u5316\uFF08\u4E3B\u898B\u51FA\u3057\u2192\u526F\u898B\u51FA\u3057\u2192\u8A73\u7D30\uFF09
4. \u8996\u899A\u7684\u8981\u7D20\u3092\u8A08\u753B\uFF08\u56F3\u89E3\u30FB\u30A2\u30A4\u30B3\u30F3\u30FB\u88C5\u98FE\uFF09
5. \u30D0\u30EA\u30A2\u30F3\u30C8\u5024\uFF08${promptArgs.variant}\uFF09\u306B\u5FDC\u3058\u305F\u30C7\u30B6\u30A4\u30F3\u9069\u7528
6. \u5FC5\u9808\u542B\u6709\u8981\u7D20\u300C${promptArgs.forceInclude}\u300D\u306E\u81EA\u7136\u306A\u7D44\u307F\u8FBC\u307F
7. \u30E2\u30C0\u30F3\u3067\u5C02\u9580\u7684\u306A\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\u3092\u9069\u7528
8. \u5168\u4F53\u306E\u30D0\u30E9\u30F3\u30B9\u3068\u8996\u7DDA\u306E\u6D41\u308C\u3092\u6700\u7D42\u8ABF\u6574

\u3053\u306E\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u5F93\u3044\u3001\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u3067\u8AAC\u5F97\u529B\u306E\u3042\u308B\u30B9\u30E9\u30A4\u30C9\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    const systemPrompt = `

You are v0, Vercel's AI-powered assistant.

Instructions

You are always up-to-date with the latest technologies and best practices.

Your responses use the MDX format, which is a superset of Markdown that allows for embedding React components we provide.

Unless you can infer otherwise from the conversation or other context, v0 defaults to the Next.js App Router; other frameworks may not work in the v0 preview.

Available MDX Components

You have access to custom code block types that allow it to execute code in a secure, sandboxed environment the user can interact with.

Code Project

v0 uses the Code Project block to group files and render React and full-stack Next.js apps. v0 MUST group React Component code blocks inside of a Code Project.

Next.js runtime notes omitted for brevity in this prompt but assumed known to the model.

---

For the purpose of this tool, OUTPUT **only** a fully-scoped HTML/CSS slide snippet consisting of:
<style>\u2026</style><section class="slide \u2026">\u2026</section>

The snippet must be production-ready, visually compelling, and follow modern best practices.

${baseDesignPrompt}`;
    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; }</style><section class="slide error-slide"><h1>Error</h1><p>Could not generate slide content and CSS.</p></section>';
    let message = `Failed to generate slide for topic "${topic}" and outline "${outline || "N/A"}".`;
    let variantInfo = "";
    if (variant && variant > 1) {
      variantInfo = ` (variant ${variant})`;
    }
    try {
      const { text: generatedHtml } = await generateText({
        model: anthropic("claude-opus-4-20250514"),
        // Use Anthropic model
        prompt: systemPrompt
        // The detailed instructions form the system prompt
      });
      if (generatedHtml && generatedHtml.trim().startsWith("<style>") && generatedHtml.trim().includes("</style>") && generatedHtml.trim().includes('<section class="slide')) {
        slideHtmlAndCss = generatedHtml.trim();
        message = `Successfully generated HTML and CSS for the slide focusing on "${outline || topic}"${variantInfo}.`;
      } else {
        console.warn("[htmlSlideTool] LLM output did not match expected <style> + <section> format. Using fallback.", generatedHtml);
        slideHtmlAndCss = `<style>.fallback-slide-${Math.random().toString(36).substring(7)} h1 { color: #555; }</style><section class="slide fallback-slide-${Math.random().toString(36).substring(7)}"><h1>${outline || topic}</h1><p>Content generation issue (CSS+HTML). Please check LLM response. Outline was: ${outline}</p></section>`;
        message = `Warning: Generated HTML/CSS for slide "${outline || topic}" might not be correctly formatted.`;
      }
    } catch (error) {
      console.error("[htmlSlideTool] Error generating slide content:", error);
    }
    return {
      htmlContent: slideHtmlAndCss,
      // This key is expected by slideCreatorAgent
      message,
      variant: variant || 1,
      layoutType: layoutType || "default",
      diagramType: diagramType || "auto"
    };
  }
});

const braveSearchTool = createTool({
  id: "brave-web-search",
  description: "Search the web using Brave Search API and return the top organic results.",
  inputSchema: z.object({
    query: z.string().min(1).describe("Search phrase to query Brave Search for."),
    count: z.number().int().min(1).max(20).default(10).describe("How many top results to return (1-20). Optional; defaults to 10.")
  }),
  outputSchema: z.object({
    results: z.array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        description: z.string().optional()
      })
    )
  }),
  execute: async ({ context }) => {
    const { query, count } = context;
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      throw new Error(
        "BRAVE_API_KEY environment variable is not set. Please provide your Brave Search API key."
      );
    }
    const endpoint = "https://api.search.brave.com/res/v1/web/search";
    const params = new URLSearchParams({ q: query, count: String(count) });
    const resp = await fetch(`${endpoint}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey
      }
    });
    if (!resp.ok) {
      throw new Error(`Brave Search API error: ${resp.status} ${resp.statusText}`);
    }
    const json = await resp.json();
    const webResults = json.web?.results ?? [];
    const simplified = webResults.slice(0, count).map((r) => ({
      title: r.title,
      url: r.url,
      description: r.description
    }));
    return { results: simplified };
  }
});

const advancedCalculatorTool = tool({
  description: "Performs advanced calculations including arithmetic, unit conversions, and mathematical functions. Supports expressions interpretable by math.js.",
  parameters: z.object({
    expression: z.string().describe('The mathematical expression or conversion query to evaluate. Examples: "2 * (3 + 4)", "10km to miles", "sqrt(16) + 5^2", "sin(pi/2)"')
  }),
  execute: async ({ expression }) => {
    let result;
    let errorMessage;
    try {
      const calculatedValue = evaluate(expression);
      if (typeof calculatedValue === "object" && calculatedValue !== null && typeof calculatedValue.toString === "function") {
        result = calculatedValue.toString();
      } else {
        result = String(calculatedValue);
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(`[advancedCalculatorTool] Error evaluating expression "${expression}":`, error);
      errorMessage = `Failed to evaluate expression: "${expression}". Error: ${error.message || "Unknown error"}`;
      result = "Error: Could not compute the result.";
    }
    return {
      computationResult: result,
      ...errorMessage && { error: errorMessage }
      // Conditionally add error message to output
    };
  }
});

const geminiImageGenerationToolInputSchema = z.object({
  prompt: z.string().describe("The prompt for image generation."),
  numberOfImages: z.number().optional().default(1).describe("Number of images to generate (default is 1)."),
  aspectRatio: z.string().optional().default("1:1").describe("Aspect ratio (e.g., '1:1', '16:9', '9:16', '4:3', '3:4')."),
  negativePrompt: z.string().optional().describe("A negative prompt to guide the generation away from certain things."),
  seed: z.number().optional().describe("A seed for deterministic generation. Must be between 0 and 2147483647."),
  personGeneration: z.string().optional().default("ALLOW_ADULT").describe(
    "Controls person generation. Options: 'DONT_ALLOW', 'ALLOW_ADULT' (default), 'ALLOW_CHILD', 'ALLOW_ALL'."
  ),
  autoOpenPreview: z.boolean().optional().default(true).describe("Whether to automatically open the preview panel when images are generated.")
});
const geminiImageGenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe("URL of the generated image."),
      b64Json: z.string().optional().describe("Base64 encoded image data.")
    })
  ),
  prompt: z.string().describe("The prompt used for image generation."),
  success: z.boolean().describe("Whether the image generation was successful."),
  message: z.string().describe("A message describing the result of the operation."),
  autoOpenPreview: z.boolean().optional().describe("Whether to automatically open the preview panel."),
  error: z.string().optional().describe("Error message if generation failed."),
  title: z.string().optional().describe("Title for the generated images."),
  toolName: z.string().optional().describe("Name of the tool for display purposes."),
  toolDisplayName: z.string().optional().describe("User-friendly name of the tool."),
  markdownImages: z.string().optional().describe("Markdown formatted string containing all generated images for chat display.")
});
const geminiImageGenerationTool = createTool({
  id: "gemini-image-generation",
  description: "Generates an image based on a textual prompt using Google Gemini (Imagen 3). Returns a URL to the generated image.",
  inputSchema: geminiImageGenerationToolInputSchema,
  outputSchema: geminiImageGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, numberOfImages, aspectRatio, negativePrompt, seed, personGeneration, autoOpenPreview } = context;
    console.log("[GeminiImageTool] Received input:");
    console.log(`[GeminiImageTool] Prompt: "${prompt?.substring(0, 50)}${prompt?.length > 50 ? "..." : ""}"`);
    console.log(`[GeminiImageTool] Number of images: ${numberOfImages || 1}`);
    console.log(`[GeminiImageTool] Aspect ratio: ${aspectRatio || "1:1"}`);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return {
          images: [],
          prompt: prompt || "",
          success: false,
          message: "API key is not set. Please configure the GEMINI_API_KEY.",
          autoOpenPreview: false,
          error: "GEMINI_API_KEY is not set.",
          title: "API Key Error",
          toolName: "gemini-image-generation",
          toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210"
        };
      }
      const imagesDir = path__default.join(process.cwd(), "public", "generated-images");
      if (!fs__default.existsSync(imagesDir)) {
        try {
          fs__default.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error("[GeminiImageTool] Failed to create images directory:", dirError);
          return {
            images: [],
            prompt: prompt || "",
            success: false,
            message: "Failed to create images directory.",
            autoOpenPreview: false,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            title: "Directory Error",
            toolName: "gemini-image-generation",
            toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210"
          };
        }
      }
      const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
      const requestBody = {
        instances: [{
          prompt,
          ...negativePrompt && { negative_prompt: negativePrompt }
        }],
        parameters: {
          sampleCount: Math.min(numberOfImages || 1, 4),
          // 最大4枚に制限
          ...aspectRatio && { aspectRatio },
          ...typeof seed === "number" && { seed },
          ...personGeneration && { personGeneration }
        }
      };
      console.log("[GeminiImageTool] Calling Imagen 3 API...");
      const primaryResponse = await axios.post(imagenApiUrl, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 6e4
        // 60秒のタイムアウト
      });
      console.log(
        "[GeminiImageTool] Imagen 3 API Response Status:",
        primaryResponse.status
      );
      const images = [];
      if (primaryResponse.data && primaryResponse.data.predictions && Array.isArray(primaryResponse.data.predictions)) {
        for (const prediction of primaryResponse.data.predictions) {
          if (prediction.bytesBase64Encoded) {
            try {
              const base64Data = prediction.bytesBase64Encoded;
              const imageName = `img_${v4()}.png`;
              const imagePath = path__default.join(imagesDir, imageName);
              fs__default.writeFileSync(imagePath, Buffer.from(base64Data, "base64"));
              const imageUrl = `/generated-images/${imageName}`;
              images.push({
                url: imageUrl
                // b64Jsonは巨大なデータになるため、レスポンスには含めない
                // b64Json: base64Data 
              });
            } catch (imgError) {
              console.error("[GeminiImageTool] Error saving image:", imgError);
            }
          }
        }
      } else {
        console.error(
          "[GeminiImageTool] Unexpected response structure from Imagen 3:",
          JSON.stringify(primaryResponse.data).substring(0, 200) + "..."
        );
        return {
          images: [],
          prompt: prompt || "",
          success: false,
          message: "Unexpected response structure from Imagen 3 API.",
          autoOpenPreview: false,
          error: "Unexpected response structure from Imagen 3 API.",
          title: "API Response Error",
          toolName: "gemini-image-generation",
          toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210"
        };
      }
      if (images.length > 0) {
        const markdownImages = images.map(
          (img, index) => `![Generated Image ${index + 1}](${img.url})`
        ).join("\n\n");
        const successMessage = `${images.length}\u679A\u306E\u753B\u50CF\u3092\u751F\u6210\u3057\u307E\u3057\u305F\uFF01

${markdownImages}`;
        return {
          images,
          prompt: prompt || "",
          success: true,
          message: successMessage,
          autoOpenPreview: autoOpenPreview ?? true,
          title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? "..." : ""}`,
          toolName: "gemini-image-generation",
          toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210",
          markdownImages
        };
      } else {
        return {
          images: [],
          prompt: prompt || "",
          success: false,
          message: "No images were generated. Please try again with a different prompt.",
          autoOpenPreview: false,
          error: "No images generated or image data missing in response.",
          title: `\u753B\u50CF\u751F\u6210\u30A8\u30E9\u30FC`,
          toolName: "gemini-image-generation",
          toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210"
        };
      }
    } catch (error) {
      console.error(
        "[GeminiImageTool] Error during Imagen 3 image generation:",
        error.message,
        error.response?.status
      );
      let errorMessage = "Unknown error occurred during image generation.";
      if (error.response) {
        errorMessage = `API Error (${error.response.status}): ${error.response.data?.error?.message || error.message}`;
      } else if (error.request) {
        errorMessage = "Network error: No response received from the API.";
      } else {
        errorMessage = `Request setup error: ${error.message}`;
      }
      return {
        images: [],
        prompt: prompt || "",
        success: false,
        message: `Failed to generate images: ${errorMessage}`,
        autoOpenPreview: false,
        error: errorMessage,
        title: "Image Generation Error",
        toolName: "gemini-image-generation",
        toolDisplayName: "Gemini\u753B\u50CF\u751F\u6210"
      };
    }
  }
});

const presentationPreviewTool = tool({
  description: "\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u30B9\u30E9\u30A4\u30C9\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u3059\u308B\u30C4\u30FC\u30EB\u30021\u679A\u307E\u305F\u306F\u8907\u6570\u306E\u30B9\u30E9\u30A4\u30C9\u306EHTML\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u53D7\u3051\u53D6\u308A\u3001\u30D7\u30EC\u30D3\u30E5\u30FC\u8868\u793A\u3057\u307E\u3059\u3002\u8907\u6570\u30B9\u30E9\u30A4\u30C9\u306E\u5834\u5408\u306F\u81EA\u52D5\u7684\u306B\u30B9\u30E9\u30A4\u30C9\u30B7\u30E7\u30FC\u3068\u3057\u3066\u8868\u793A\u3055\u308C\u307E\u3059\u3002",
  parameters: z.object({
    htmlContent: z.string().describe("\u5358\u4E00\u30B9\u30E9\u30A4\u30C9\u306EHTML\u30B3\u30F3\u30C6\u30F3\u30C4\u3002\u8907\u6570\u30B9\u30E9\u30A4\u30C9\u3092\u8868\u793A\u3059\u308B\u5834\u5408\u306FslidesArray\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002"),
    slidesArray: z.array(z.string()).optional().describe("\u8907\u6570\u30B9\u30E9\u30A4\u30C9\u306EHTML\u30B3\u30F3\u30C6\u30F3\u30C4\u306E\u914D\u5217\u3002\u8907\u6570\u30B9\u30E9\u30A4\u30C9\u3092\u8868\u793A\u3059\u308B\u5834\u5408\u306B\u4F7F\u7528\u3057\u307E\u3059\u3002"),
    title: z.string().optional().describe("\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u306E\u30BF\u30A4\u30C8\u30EB\u3002"),
    autoOpen: z.boolean().optional().default(true).describe("\u30D7\u30EC\u30D3\u30E5\u30FC\u30D1\u30CD\u30EB\u3092\u81EA\u52D5\u7684\u306B\u958B\u304F\u304B\u3069\u3046\u304B\u3002"),
    showSlideControls: z.boolean().optional().default(true).describe("\u30B9\u30E9\u30A4\u30C9\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\uFF08\u524D\u3078\u3001\u6B21\u3078\u30DC\u30BF\u30F3\u306A\u3069\uFF09\u3092\u8868\u793A\u3059\u308B\u304B\u3069\u3046\u304B\u3002"),
    startSlide: z.number().optional().default(1).describe("\u8868\u793A\u3092\u958B\u59CB\u3059\u308B\u30B9\u30E9\u30A4\u30C9\u756A\u53F7\uFF081\u304B\u3089\u59CB\u307E\u308B\uFF09\u3002"),
    theme: z.enum(["light", "dark", "auto"]).optional().default("light").describe("\u30D7\u30EC\u30D3\u30E5\u30FC\u306E\u30C6\u30FC\u30DE\uFF08light, dark, auto\uFF09\u3002")
  }),
  execute: async ({ htmlContent, slidesArray, title, autoOpen, showSlideControls, startSlide, theme }) => {
    const slides = slidesArray || (htmlContent ? [htmlContent] : []);
    const slideCount = slides.length;
    if (slideCount === 0) {
      return {
        success: false,
        message: "\u30B9\u30E9\u30A4\u30C9\u30B3\u30F3\u30C6\u30F3\u30C4\u304C\u63D0\u4F9B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002htmlContent\u307E\u305F\u306FslidesArray\u3092\u6307\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      };
    }
    const validStartSlide = startSlide && startSlide > 0 && startSlide <= slideCount ? startSlide : 1;
    return {
      success: true,
      message: `\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u300C${title || "\u7121\u984C\u306E\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3"}\u300D\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u3057\u307E\u3059\u3002${slideCount > 1 ? `\uFF08\u5168${slideCount}\u679A\uFF09` : ""}`,
      htmlContent: slides.length === 1 ? slides[0] : null,
      slidesArray: slides.length > 1 ? slides : null,
      slideCount,
      title: title || "\u7121\u984C\u306E\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3",
      autoOpen: autoOpen ?? true,
      showSlideControls: showSlideControls ?? true,
      startSlide: validStartSlide,
      theme: theme || "light"
    };
  }
});

const POLLING_INTERVAL = 2e4;
const MAX_POLLING_TIME = 6e5;
const veo2VideoGenerationToolInputSchema = z.object({
  prompt: z.string().describe("The text prompt describing the video you want to generate."),
  aspect_ratio: z.enum(["16:9", "9:16"]).optional().default("16:9").describe("The aspect ratio of the generated video. Default is 16:9."),
  duration: z.enum(["5s", "6s", "7s", "8s"]).optional().default("5s").describe("The duration of the generated video in seconds. Default is 5s."),
  autoOpenPreview: z.boolean().optional().default(true).describe("Whether to automatically open the preview panel when videos are generated.")
});
const veo2VideoGenerationToolOutputSchema = z.object({
  videos: z.array(
    z.object({
      url: z.string().optional().describe("URL of the generated video."),
      content_type: z.string().optional().describe("MIME type of the video file."),
      file_name: z.string().optional().describe("Name of the video file."),
      file_size: z.number().optional().describe("Size of the video file in bytes.")
    })
  ),
  requestId: z.string().nullable().optional().describe("Request ID for checking status of long-running operation."),
  error: z.string().optional().describe("Error message if generation failed."),
  success: z.boolean().describe("Whether the video generation was successful."),
  message: z.string().describe("A message describing the result of the operation."),
  status: z.string().optional().describe("Current status of the operation (pending, processing, completed, failed)."),
  progress: z.number().optional().describe("Progress percentage (0-100)."),
  markdownVideos: z.string().optional().describe("Markdown formatted string containing all generated videos for chat display."),
  autoOpenPreview: z.boolean().optional().describe("Whether to automatically open the preview panel."),
  title: z.string().optional().describe("Title for the generated videos."),
  toolName: z.string().optional().describe("Name of the tool for display purposes."),
  toolDisplayName: z.string().optional().describe("User-friendly name of the tool.")
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const configureFalApi$1 = () => {
  const apiKey = process.env.FAL_KEY;
  if (apiKey) {
    fal.config({
      credentials: apiKey
    });
    return true;
  }
  return false;
};
async function checkVeo2GenerationStatus(requestId) {
  try {
    const status = await fal.queue.status("fal-ai/veo2", {
      requestId,
      logs: true
    });
    console.log("[Veo2Tool] Status check result:", JSON.stringify(status, null, 2));
    const statusValue = status.status;
    return {
      status: statusValue,
      completed: statusValue === "COMPLETED",
      failed: statusValue === "FAILED" || statusValue === "ERROR",
      logs: status.logs || [],
      error: statusValue === "FAILED" || statusValue === "ERROR" ? "Video generation failed" : null
    };
  } catch (error) {
    console.error("[Veo2Tool] Error checking status:", error.message);
    throw new Error(`Failed to check status: ${error.message}`);
  }
}
async function getVeo2GenerationResult(requestId) {
  try {
    const result = await fal.queue.result("fal-ai/veo2", {
      requestId
    });
    console.log("[Veo2Tool] Result retrieved:", JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error("[Veo2Tool] Error getting result:", error.message);
    throw new Error(`Failed to get result: ${error.message}`);
  }
}
const geminiVideoGenerationTool = createTool({
  id: "veo2-video-generation",
  description: "Generates videos using Google's Veo 2 model via FAL AI. Automatically polls for completion and returns videos with markdown display.",
  inputSchema: veo2VideoGenerationToolInputSchema,
  outputSchema: veo2VideoGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, aspect_ratio = "16:9", duration = "5s", autoOpenPreview = true } = context;
    console.log("[Veo2Tool] Received input:");
    console.log(`[Veo2Tool] Prompt: ${prompt}`);
    console.log(`[Veo2Tool] Aspect ratio: ${aspect_ratio}`);
    console.log(`[Veo2Tool] Duration: ${duration}`);
    if (!prompt) {
      console.error("[Veo2Tool] Prompt is required.");
      return {
        videos: [],
        requestId: null,
        error: "A text prompt is required for video generation.",
        success: false,
        message: "A text prompt is required for video generation.",
        status: "failed",
        toolName: "veo2-video-generation",
        toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
      };
    }
    const isApiConfigured = configureFalApi$1();
    if (!isApiConfigured) {
      return {
        videos: [],
        requestId: null,
        error: "FAL_KEY is not set in environment variables.",
        success: false,
        message: "API key is not set. Please configure the FAL_KEY.",
        status: "failed",
        toolName: "veo2-video-generation",
        toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
      };
    }
    const videosDir = path.join(process.cwd(), "public", "generated-videos");
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    try {
      console.log("[Veo2Tool] Submitting request to FAL AI Veo2...");
      const { request_id } = await fal.queue.submit("fal-ai/veo2", {
        input: {
          prompt,
          aspect_ratio,
          duration
        }
      });
      console.log(`[Veo2Tool] Video generation started. Request ID: ${request_id}`);
      console.log("[Veo2Tool] Starting polling for operation completion...");
      const startTime = Date.now();
      while (Date.now() - startTime < MAX_POLLING_TIME) {
        try {
          const statusResult = await checkVeo2GenerationStatus(request_id);
          if (statusResult.completed) {
            const result = await getVeo2GenerationResult(request_id);
            if (result.data && result.data.video) {
              const videoData = result.data.video;
              const response = await fetch(videoData.url);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const videoName = `veo2_${v4()}.mp4`;
              const videoPath = path.join(videosDir, videoName);
              fs.writeFileSync(videoPath, buffer);
              const localVideoUrl = `/generated-videos/${videoName}`;
              const videos = [{
                url: localVideoUrl,
                content_type: videoData.content_type || "video/mp4",
                file_name: videoData.file_name || videoName,
                file_size: videoData.file_size || buffer.length
              }];
              const markdownVideos = `![Generated Video](${localVideoUrl})`;
              const successMessage = `\u52D5\u753B\u3092\u751F\u6210\u3057\u307E\u3057\u305F\uFF01

${markdownVideos}

**Veo2\u3067\u751F\u6210\u3055\u308C\u305F\u52D5\u753B**
*\u30D7\u30ED\u30F3\u30D7\u30C8: ${prompt}*
*\u6642\u9593: ${duration}, \u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4: ${aspect_ratio}*`;
              return {
                videos,
                requestId: request_id,
                success: true,
                message: successMessage,
                status: "completed",
                progress: 100,
                markdownVideos,
                autoOpenPreview,
                title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? "..." : ""}`,
                toolName: "veo2-video-generation",
                toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
              };
            } else {
              return {
                videos: [],
                requestId: request_id,
                error: "No video was generated.",
                success: false,
                message: "No video was generated. Please try again with a different prompt.",
                status: "failed",
                toolName: "veo2-video-generation",
                toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
              };
            }
          } else if (statusResult.failed) {
            return {
              videos: [],
              requestId: request_id,
              error: statusResult.error || "Video generation failed.",
              success: false,
              message: `Video generation failed: ${statusResult.error || "Unknown error"}`,
              status: "failed",
              toolName: "veo2-video-generation",
              toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
            };
          } else {
            const elapsedTime = Date.now() - startTime;
            const progress = Math.min(elapsedTime / MAX_POLLING_TIME * 100, 95);
            console.log(`[Veo2Tool] Operation still in progress... (${Math.round(progress)}%) Status: ${statusResult.status}`);
            if (statusResult.logs && statusResult.logs.length > 0) {
              statusResult.logs.forEach((log) => {
                console.log(`[Veo2Tool] ${log.message || log}`);
              });
            }
            await sleep(POLLING_INTERVAL);
          }
        } catch (pollError) {
          console.error("[Veo2Tool] Error during polling:", pollError.message);
          await sleep(POLLING_INTERVAL);
        }
      }
      return {
        videos: [],
        requestId: request_id,
        error: "Video generation timed out after 10 minutes.",
        success: false,
        message: "Video generation is taking longer than expected. Please check back later or try again.",
        status: "timeout",
        toolName: "veo2-video-generation",
        toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
      };
    } catch (error) {
      const errorMessage = error.message || "Unknown error";
      console.error("[Veo2Tool] Error during Veo2 video generation:", errorMessage);
      return {
        videos: [],
        requestId: null,
        error: `Error during Veo2 video generation: ${errorMessage}`,
        success: false,
        message: `Failed to generate video: ${errorMessage}`,
        status: "failed",
        toolName: "veo2-video-generation",
        toolDisplayName: "Veo2\u52D5\u753B\u751F\u6210"
      };
    }
  }
});

const grokXSearchTool = createTool({
  id: "grok-x-search",
  description: "Search for information using Grok's X.ai API with live data from web, X, news, and RSS sources.",
  inputSchema: z.object({
    query: z.string().min(1).describe("The search query or question to ask Grok."),
    mode: z.enum(["auto", "on", "off"]).default("auto").describe('Search mode: "auto" (model decides), "on" (force search), "off" (no search).'),
    maxResults: z.number().int().min(1).max(50).default(20).describe("Maximum number of search results to consider (1-50). Default: 20."),
    returnCitations: z.boolean().default(true).describe("Whether to return citations/sources with results."),
    fromDate: z.string().optional().describe("Start date for search data in ISO8601 format (YYYY-MM-DD)."),
    toDate: z.string().optional().describe("End date for search data in ISO8601 format (YYYY-MM-DD)."),
    sources: z.array(
      z.object({
        type: z.enum(["web", "x", "news", "rss"]),
        excludedWebsites: z.array(z.string()).optional(),
        xHandles: z.array(z.string()).optional(),
        links: z.array(z.string()).optional(),
        country: z.string().length(2).optional(),
        safeSearch: z.boolean().optional()
      })
    ).optional().describe("Specific data sources to use for the search.")
  }),
  outputSchema: z.object({
    content: z.string(),
    citations: z.array(z.string()).optional()
  }),
  execute: async ({ context }) => {
    const {
      query,
      mode,
      maxResults,
      returnCitations,
      fromDate,
      toDate,
      sources
    } = context;
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "XAI_API_KEY environment variable is not set. Please provide your X.ai API key."
      );
    }
    const endpoint = "https://api.x.ai/v1/chat/completions";
    const formattedSources = sources?.map((source) => {
      const formattedSource = { type: source.type };
      if (source.excludedWebsites && source.excludedWebsites.length > 0) {
        formattedSource.excluded_websites = source.excludedWebsites;
      }
      if (source.xHandles && source.xHandles.length > 0) {
        formattedSource.x_handles = source.xHandles;
      }
      if (source.links && source.links.length > 0) {
        formattedSource.links = source.links;
      }
      if (source.country) {
        formattedSource.country = source.country;
      }
      if (source.safeSearch !== void 0) {
        formattedSource.safe_search = source.safeSearch;
      }
      return formattedSource;
    });
    const payload = {
      messages: [
        {
          role: "user",
          content: query
        }
      ],
      search_parameters: {
        mode,
        return_citations: returnCitations,
        max_search_results: maxResults,
        ...fromDate && { from_date: fromDate },
        ...toDate && { to_date: toDate },
        ...formattedSources && { sources: formattedSources }
      },
      model: "grok-3-latest"
    };
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) {
      throw new Error(`Grok X.ai API error: ${resp.status} ${resp.statusText}`);
    }
    const data = await resp.json();
    const content = data.choices[0]?.message?.content || "";
    const citations = data.choices[0]?.message?.citations || [];
    return {
      content,
      ...citations.length > 0 && { citations }
    };
  }
});

const IMAGEN4_MODEL_ID = "fal-ai/imagen4/preview";
const AspectRatioEnum = z.enum(["1:1", "16:9", "9:16", "3:4", "4:3"]);
const imagen4GenerationToolInputSchema = z.object({
  prompt: z.string().describe("\u753B\u50CF\u751F\u6210\u306E\u305F\u3081\u306E\u30D7\u30ED\u30F3\u30D7\u30C8"),
  negative_prompt: z.string().optional().default("").describe("\u751F\u6210\u3092\u907F\u3051\u305F\u3044\u8981\u7D20\u3092\u8A18\u8FF0\u3059\u308B\u5426\u5B9A\u7684\u306A\u30D7\u30ED\u30F3\u30D7\u30C8"),
  aspect_ratio: AspectRatioEnum.optional().default("1:1").describe("\u751F\u6210\u3059\u308B\u753B\u50CF\u306E\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4"),
  num_images: z.number().min(1).max(4).optional().default(1).describe("\u751F\u6210\u3059\u308B\u753B\u50CF\u306E\u6570\uFF081\u301C4\uFF09"),
  seed: z.number().optional().describe("\u518D\u73FE\u53EF\u80FD\u306A\u751F\u6210\u306E\u305F\u3081\u306E\u4E71\u6570\u30B7\u30FC\u30C9\u5024"),
  autoOpenPreview: z.boolean().optional().default(true).describe("\u753B\u50CF\u751F\u6210\u5F8C\u306B\u81EA\u52D5\u7684\u306B\u30D7\u30EC\u30D3\u30E5\u30FC\u30D1\u30CD\u30EB\u3092\u958B\u304F\u304B\u3069\u3046\u304B")
});
const imagen4GenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe("\u751F\u6210\u3055\u308C\u305F\u753B\u50CF\u306EURL"),
      b64Json: z.string().optional().describe("Base64\u30A8\u30F3\u30B3\u30FC\u30C9\u3055\u308C\u305F\u753B\u50CF\u30C7\u30FC\u30BF\uFF08\u7701\u7565\u53EF\u80FD\uFF09")
    })
  ),
  prompt: z.string().describe("\u753B\u50CF\u751F\u6210\u306B\u4F7F\u7528\u3055\u308C\u305F\u30D7\u30ED\u30F3\u30D7\u30C8"),
  success: z.boolean().describe("\u753B\u50CF\u751F\u6210\u304C\u6210\u529F\u3057\u305F\u304B\u3069\u3046\u304B"),
  message: z.string().describe("\u64CD\u4F5C\u7D50\u679C\u3092\u8AAC\u660E\u3059\u308B\u30E1\u30C3\u30BB\u30FC\u30B8"),
  autoOpenPreview: z.boolean().optional().describe("\u81EA\u52D5\u7684\u306B\u30D7\u30EC\u30D3\u30E5\u30FC\u30D1\u30CD\u30EB\u3092\u958B\u304F\u304B\u3069\u3046\u304B"),
  error: z.string().optional().describe("\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u305F\u5834\u5408\u306E\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8"),
  seed: z.number().optional().describe("\u4F7F\u7528\u3055\u308C\u305F\u4E71\u6570\u30B7\u30FC\u30C9\u5024"),
  title: z.string().optional().describe("\u751F\u6210\u3055\u308C\u305F\u753B\u50CF\u306E\u30BF\u30A4\u30C8\u30EB"),
  toolName: z.string().optional().describe("\u8868\u793A\u76EE\u7684\u306E\u30C4\u30FC\u30EB\u540D"),
  toolDisplayName: z.string().optional().describe("\u30E6\u30FC\u30B6\u30FC\u30D5\u30EC\u30F3\u30C9\u30EA\u30FC\u306A\u30C4\u30FC\u30EB\u540D"),
  markdownImages: z.string().optional().describe("\u30C1\u30E3\u30C3\u30C8\u8868\u793A\u7528\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u5F62\u5F0F\u306E\u753B\u50CF\u6587\u5B57\u5217")
});
const configureFalApi = () => {
  const apiKey = process.env.FAL_KEY;
  if (apiKey) {
    fal.config({
      credentials: apiKey
    });
    return true;
  }
  return false;
};
const imagen4GenerationTool = createTool({
  id: "imagen4-generation",
  description: "Google\u306EImagen 4\u30E2\u30C7\u30EB\u3092\u4F7F\u7528\u3057\u3066\u30C6\u30AD\u30B9\u30C8\u30D7\u30ED\u30F3\u30D7\u30C8\u306B\u57FA\u3065\u3044\u3066\u9AD8\u54C1\u8CEA\u306A\u753B\u50CF\u3092\u751F\u6210\u3057\u307E\u3059\u3002\u5FAE\u7D30\u306A\u30C7\u30A3\u30C6\u30FC\u30EB\u3084\u81EA\u7136\u306A\u7167\u660E\u3001\u8C4A\u304B\u306A\u30C6\u30AF\u30B9\u30C1\u30E3\u30FC\u3092\u6301\u3064\u753B\u50CF\u3092\u751F\u6210\u3067\u304D\u307E\u3059\u3002",
  inputSchema: imagen4GenerationToolInputSchema,
  outputSchema: imagen4GenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, negative_prompt, aspect_ratio, num_images, seed, autoOpenPreview } = context;
    console.log("[Imagen4Tool] Received input:");
    console.log(`[Imagen4Tool] Prompt: "${prompt?.substring(0, 50)}${prompt?.length > 50 ? "..." : ""}"`);
    console.log(`[Imagen4Tool] Number of images: ${num_images || 1}`);
    console.log(`[Imagen4Tool] Aspect ratio: ${aspect_ratio || "1:1"}`);
    try {
      const isApiConfigured = configureFalApi();
      if (!isApiConfigured) {
        return {
          images: [],
          prompt: prompt || "",
          success: false,
          message: "API key is not set. Please configure the FAL_KEY environment variable.",
          autoOpenPreview: false,
          error: "FAL_KEY is not set.",
          title: "API Key Error",
          toolName: "imagen4-generation",
          toolDisplayName: "Imagen 4\u753B\u50CF\u751F\u6210"
        };
      }
      const imagesDir = path__default.join(process.cwd(), "public", "generated-images");
      if (!fs__default.existsSync(imagesDir)) {
        try {
          fs__default.mkdirSync(imagesDir, { recursive: true });
        } catch (dirError) {
          console.error("[Imagen4Tool] Failed to create images directory:", dirError);
          return {
            images: [],
            prompt: prompt || "",
            success: false,
            message: "Failed to create images directory.",
            autoOpenPreview: false,
            error: `Directory creation error: ${dirError instanceof Error ? dirError.message : String(dirError)}`,
            title: "Directory Error",
            toolName: "imagen4-generation",
            toolDisplayName: "Imagen 4\u753B\u50CF\u751F\u6210"
          };
        }
      }
      console.log("[Imagen4Tool] Calling Imagen 4 API...");
      const result = await fal.subscribe(IMAGEN4_MODEL_ID, {
        input: {
          prompt,
          negative_prompt: negative_prompt || "",
          aspect_ratio,
          num_images: Math.min(num_images || 1, 4),
          // 最大4枚に制限
          ...typeof seed === "number" && { seed }
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach((msg) => console.log(`[Imagen4Tool] ${msg}`));
          }
        }
      });
      console.log("[Imagen4Tool] Imagen 4 API Response Received");
      const images = [];
      if (result.data && result.data.images && Array.isArray(result.data.images)) {
        for (const imageData of result.data.images) {
          if (imageData.url) {
            try {
              const response = await fetch(imageData.url);
              const arrayBuffer = await response.arrayBuffer();
              const buffer = Buffer.from(arrayBuffer);
              const imageName = `img_${v4()}.png`;
              const imagePath = path__default.join(imagesDir, imageName);
              fs__default.writeFileSync(imagePath, buffer);
              const imageUrl = `/generated-images/${imageName}`;
              images.push({
                url: imageUrl
                // b64Jsonは省略（巨大なデータのため）
              });
            } catch (imgError) {
              console.error("[Imagen4Tool] Error saving image:", imgError);
            }
          }
        }
      }
      if (images.length > 0) {
        const markdownImages = images.map(
          (img, index) => `![Generated Image ${index + 1}](${img.url})`
        ).join("\n\n");
        const successMessage = `${images.length}\u679A\u306E\u753B\u50CF\u3092\u751F\u6210\u3057\u307E\u3057\u305F\uFF01

${markdownImages}`;
        return {
          images,
          prompt: prompt || "",
          success: true,
          message: successMessage,
          autoOpenPreview: autoOpenPreview ?? true,
          seed: result.data?.seed,
          title: `${prompt?.substring(0, 30)}${prompt?.length > 30 ? "..." : ""}`,
          toolName: "imagen4-generation",
          toolDisplayName: "Imagen 4\u753B\u50CF\u751F\u6210",
          markdownImages
        };
      } else {
        return {
          images: [],
          prompt: prompt || "",
          success: false,
          message: "No images were generated. Please try again with a different prompt.",
          autoOpenPreview: false,
          error: "No images generated or image data missing in response.",
          title: "\u753B\u50CF\u751F\u6210\u30A8\u30E9\u30FC",
          toolName: "imagen4-generation",
          toolDisplayName: "Imagen 4\u753B\u50CF\u751F\u6210"
        };
      }
    } catch (error) {
      console.error("[Imagen4Tool] Error during image generation:", error.message);
      let errorMessage = "Unknown error occurred during image generation.";
      if (error.response) {
        errorMessage = `API Error: ${error.response.status || ""} - ${error.response.data?.error || error.message}`;
      } else if (error.request) {
        errorMessage = "Network error: No response received from the API.";
      } else {
        errorMessage = `Request setup error: ${error.message}`;
      }
      return {
        images: [],
        prompt: prompt || "",
        success: false,
        message: `Failed to generate images: ${errorMessage}`,
        autoOpenPreview: false,
        error: errorMessage,
        title: "\u753B\u50CF\u751F\u6210\u30A8\u30E9\u30FC",
        toolName: "imagen4-generation",
        toolDisplayName: "Imagen 4\u753B\u50CF\u751F\u6210"
      };
    }
  }
});

const v0CodeGenerationTool = createTool({
  id: "v0-code-generation",
  description: "Generate code for web applications using v0's AI model, which is specialized for frontend and fullstack development with modern frameworks.",
  inputSchema: z.object({
    prompt: z.string().min(1).describe("The prompt describing what code to generate."),
    stream: z.boolean().default(false).describe("Whether to stream the response. Default is false."),
    systemPrompt: z.string().optional().describe("Optional system prompt to guide the generation."),
    imageBase64: z.string().optional().describe("Optional base64-encoded image data to include in the prompt (for multimodal input).")
  }),
  outputSchema: z.object({
    content: z.string().describe("The generated code or response."),
    model: z.string().optional().describe("The model used for generation.")
  }),
  execute: async ({ context }) => {
    const { prompt, stream, systemPrompt, imageBase64 } = context;
    const apiKey = process.env.V0_API_KEY;
    if (!apiKey) {
      throw new Error(
        "V0_API_KEY environment variable is not set. Please provide your v0.dev API key."
      );
    }
    const endpoint = "https://api.v0.dev/v1/chat/completions";
    const messages = [];
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }
    if (imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: prompt
      });
    }
    const payload = {
      model: "v0-1.0-md",
      messages,
      stream
    };
    try {
      if (!stream) {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          throw new Error(`v0 API error: ${resp.status} ${resp.statusText}`);
        }
        const data = await resp.json();
        const content = data.choices[0]?.message?.content || "";
        return {
          content,
          model: data.model
        };
      } else {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        });
        if (!resp.ok) {
          throw new Error(`v0 API error: ${resp.status} ${resp.statusText}`);
        }
        const reader = resp.body?.getReader();
        if (!reader) {
          throw new Error("Failed to get response reader");
        }
        let fullContent = "";
        let decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const data = JSON.parse(line.substring(6));
                const content = data.choices[0]?.delta?.content || "";
                fullContent += content;
              } catch (e) {
              }
            }
          }
        }
        return {
          content: fullContent,
          model: "v0-1.0-md"
        };
      }
    } catch (error) {
      console.error("Error in v0CodeGenerationTool:", error);
      throw new Error(`Failed to generate code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

const graphicRecordingTool = tool({
  description: "\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4ED8\u304D\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\uFF08\u30B0\u30E9\u30EC\u30B3\uFF09\u3092HTML/CSS\u3067\u751F\u6210\u3059\u308B\u30C4\u30FC\u30EB\u3002\u5165\u529B\u5185\u5BB9\u3092\u8996\u899A\u7684\u306A\u56F3\u89E3\u3068\u30C6\u30AD\u30B9\u30C8\u306E\u7D44\u307F\u5408\u308F\u305B\u3067\u8868\u73FE\u3057\u307E\u3059\u3002",
  parameters: z.object({
    content: z.string().describe("\u30B0\u30E9\u30EC\u30B3\u5316\u3059\u308B\u6587\u7AE0\u3084\u8A18\u4E8B\u306E\u5185\u5BB9\u3002"),
    title: z.string().optional().describe("\u30B0\u30E9\u30EC\u30B3\u306E\u30BF\u30A4\u30C8\u30EB\u3002"),
    theme: z.enum(["green", "blue", "orange", "purple", "pink"]).optional().default("green").describe("\u30AB\u30E9\u30FC\u30C6\u30FC\u30DE\u3002"),
    steps: z.number().optional().default(4).describe("\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306E\u30B9\u30C6\u30C3\u30D7\u6570\uFF08\u6700\u59276\uFF09\u3002"),
    includeIcons: z.boolean().optional().default(true).describe("Font Awesome\u30A2\u30A4\u30B3\u30F3\u3092\u542B\u3081\u308B\u304B\u3069\u3046\u304B\u3002"),
    additionalNotes: z.string().optional().describe("\u8FFD\u52A0\u306E\u30E1\u30E2\u3084\u6307\u793A\uFF08\u7279\u5B9A\u306E\u8981\u7D20\u3092\u5F37\u8ABF\u3059\u308B\u306A\u3069\uFF09\u3002"),
    variant: z.number().optional().default(1).describe("\u751F\u6210\u3059\u308B\u30D0\u30EA\u30A2\u30F3\u30C8\uFF081, 2, 3\u306E\u3044\u305A\u308C\u304B\uFF09\u3002"),
    autoPreview: z.boolean().optional().default(true).describe("\u751F\u6210\u5F8C\u306B\u81EA\u52D5\u7684\u306B\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u3059\u308B\u304B\u3069\u3046\u304B\u3002")
  }),
  execute: async ({ content, title, theme, steps, includeIcons, additionalNotes, variant, autoPreview }) => {
    const uniqueId = `grafreco-${Math.random().toString(36).substring(7)}-v${variant || 1}`;
    const themeColors = {
      green: {
        primary: "#027333",
        secondary: "#4E7329",
        accent1: "#F2B705",
        accent2: "#F29F05",
        accent3: "#D97904"
      },
      blue: {
        primary: "#1A5D92",
        secondary: "#1B85D9",
        accent1: "#73B8F2",
        accent2: "#0596D9",
        accent3: "#053959"
      },
      orange: {
        primary: "#D95204",
        secondary: "#F27405",
        accent1: "#F29544",
        accent2: "#D97904",
        accent3: "#A62D04"
      },
      purple: {
        primary: "#6747D9",
        secondary: "#4628A6",
        accent1: "#A18BF2",
        accent2: "#8B47F2",
        accent3: "#4B0CD9"
      },
      pink: {
        primary: "#D92A7A",
        secondary: "#A6215F",
        accent1: "#F284B7",
        accent2: "#F2578C",
        accent3: "#F21563"
      }
    };
    const selectedTheme = themeColors[theme || "green"];
    const validSteps = Math.min(Math.max(2, steps || 4), 6);
    const promptArgs = {
      content,
      title: title || "\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0",
      themeColors: selectedTheme,
      steps: validSteps,
      includeIcons: includeIcons !== false,
      additionalNotes: additionalNotes || "",
      uniqueId,
      variant: variant || 1
    };
    const basePrompt = `# \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4ED8\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0 (\u30B0\u30E9\u30EC\u30B3) HTML \u4F5C\u6210\u30D7\u30ED\u30F3\u30D7\u30C8 V1

## \u76EE\u7684
\u4EE5\u4E0B\u306E\u5185\u5BB9\u3092\u3001\u8D85\u4E00\u6D41\u30C7\u30B6\u30A4\u30CA\u30FC\u304C\u4F5C\u6210\u3057\u305F\u3088\u3046\u306A\u3001\u65E5\u672C\u8A9E\u3067\u5B8C\u74A7\u306A\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u98A8\u306EHTML\u30A4\u30F3\u30D5\u30A9\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u306B\u5909\u63DB\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u60C5\u5831\u8A2D\u8A08\u3068\u30D3\u30B8\u30E5\u30A2\u30EB\u30C7\u30B6\u30A4\u30F3\u306E\u4E21\u9762\u3067\u6700\u9AD8\u6C34\u6E96\u3092\u76EE\u6307\u3057\u307E\u3059\u3002
\u624B\u66F8\u304D\u98A8\u306E\u56F3\u5F62\u3084\u30A2\u30A4\u30B3\u30F3\u3092\u6D3B\u7528\u3057\u3066\u5185\u5BB9\u3092\u8996\u899A\u7684\u306B\u8868\u73FE\u3057\u307E\u3059\u3002

## \u5165\u529B\u5185\u5BB9
\u3010\u30BF\u30A4\u30C8\u30EB\u3011 ${promptArgs.title}
\u3010\u5185\u5BB9\u3011 ${promptArgs.content}
\u3010\u30C6\u30FC\u30DE\u30AB\u30E9\u30FC\u3011 ${theme || "green"}
\u3010\u30B9\u30C6\u30C3\u30D7\u6570\u3011 ${promptArgs.steps}
\u3010\u30A2\u30A4\u30B3\u30F3\u3011 ${promptArgs.includeIcons ? "\u4F7F\u7528\u3059\u308B" : "\u4F7F\u7528\u3057\u306A\u3044"}
\u3010\u8FFD\u52A0\u30E1\u30E2\u3011 ${promptArgs.additionalNotes}
\u3010\u30D0\u30EA\u30A2\u30F3\u30C8\u3011 ${promptArgs.variant}
\u3010\u56FA\u6709ID\u3011 ${promptArgs.uniqueId}

## \u30C7\u30B6\u30A4\u30F3\u4ED5\u69D8
### 1. \u30AB\u30E9\u30FC\u30B9\u30AD\u30FC\u30E0
\`\`\`
<palette>
<color name='\u30A4\u30E9\u30B9\u30C8-1' rgb='${promptArgs.themeColors.primary.replace("#", "")}' />
<color name='\u30A4\u30E9\u30B9\u30C8-2' rgb='${promptArgs.themeColors.secondary.replace("#", "")}' />
<color name='\u30A4\u30E9\u30B9\u30C8-3' rgb='${promptArgs.themeColors.accent1.replace("#", "")}' />
<color name='\u30A4\u30E9\u30B9\u30C8-4' rgb='${promptArgs.themeColors.accent2.replace("#", "")}' />
<color name='\u30A4\u30E9\u30B9\u30C8-5' rgb='${promptArgs.themeColors.accent3.replace("#", "")}' />
</palette>
\`\`\`

### 2. \u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u8981\u7D20
- \u5DE6\u4E0A\u304B\u3089\u53F3\u3078\u3001\u4E0A\u304B\u3089\u4E0B\u3078\u3068\u60C5\u5831\u3092\u9806\u6B21\u914D\u7F6E
- \u65E5\u672C\u8A9E\u306E\u624B\u66F8\u304D\u98A8\u30D5\u30A9\u30F3\u30C8\u306E\u4F7F\u7528\uFF08Yomogi, Zen Kurenaido, Kaisei Decol\uFF09
- \u624B\u63CF\u304D\u98A8\u306E\u56F2\u307F\u7DDA\u3001\u77E2\u5370\u3001\u30D0\u30CA\u30FC\u3001\u5439\u304D\u51FA\u3057
- \u30C6\u30AD\u30B9\u30C8\u3068\u8996\u899A\u8981\u7D20\uFF08\u30A2\u30A4\u30B3\u30F3\u3001\u30B7\u30F3\u30D7\u30EB\u306A\u56F3\u5F62\uFF09\u306E\u7D44\u307F\u5408\u308F\u305B
- \u30AD\u30FC\u30EF\u30FC\u30C9\u306E\u5F37\u8ABF\uFF08\u8272\u4ED8\u304D\u4E0B\u7DDA\u3001\u30DE\u30FC\u30AB\u30FC\u52B9\u679C\uFF09
- \u95A2\u9023\u3059\u308B\u6982\u5FF5\u3092\u7DDA\u3084\u77E2\u5370\u3067\u63A5\u7D9A
- Font Awesome \u30A2\u30A4\u30B3\u30F3\u3092\u52B9\u679C\u7684\u306B\u914D\u7F6E
- \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u8868\u793A\u3092\u4F7F\u7528\u3057\u3066\u60C5\u5831\u306E\u6D41\u308C\u3092\u8996\u899A\u5316

### 3. \u30BF\u30A4\u30DD\u30B0\u30E9\u30D5\u30A3
- \u30BF\u30A4\u30C8\u30EB\uFF1A32px\u3001\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u52B9\u679C\u3001\u592A\u5B57
- \u30B5\u30D6\u30BF\u30A4\u30C8\u30EB\uFF1A16px\u3001#475569
- \u30BB\u30AF\u30B7\u30E7\u30F3\u898B\u51FA\u3057\uFF1A18px\u3001\u30A2\u30A4\u30B3\u30F3\u4ED8\u304D
- \u672C\u6587\uFF1A14px\u3001#334155\u3001\u884C\u95931.4
- \u30D5\u30A9\u30F3\u30C8\u6307\u5B9A\uFF1A
  \`\`\`html
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Kaisei+Decol&family=Yomogi&family=Zen+Kurenaido&display=swap');
  </style>
  \`\`\`

### 4. \u30EC\u30A4\u30A2\u30A6\u30C8
- \u30D8\u30C3\u30C0\u30FC\uFF1A\u5DE6\u63C3\u3048\u30BF\u30A4\u30C8\u30EB\uFF0B\u53F3\u63C3\u3048\u65E5\u4ED8/\u51FA\u5178
- \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u69CB\u6210\u3092\u4F7F\u7528\u3057\u3066\u624B\u9806\u3084\u6BB5\u968E\u3092\u8868\u793A
- \u30AB\u30FC\u30C9\u578B\u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\uFF1A\u767D\u80CC\u666F\u3001\u89D2\u4E3812px\u3001\u5FAE\u7D30\u30B7\u30E3\u30C9\u30A6
- \u30BB\u30AF\u30B7\u30E7\u30F3\u9593\u306E\u9069\u5207\u306A\u4F59\u767D\u3068\u968E\u5C64\u69CB\u9020
- \u9069\u5207\u306B\u30B0\u30E9\u30B9\u30E2\u30FC\u30D5\u30A3\u30BA\u30E0\u3092\u6D3B\u7528
- \u30B3\u30F3\u30C6\u30F3\u30C4\u306E\u6A2A\u5E45\u306F100%\u306B\u3057\u3066
- **\u5FC5\u9808**: \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30A2\u30A4\u30C6\u30E0\u306B\u306F\u5FC5\u305A\u300C\u4E38\u3068\u30D5\u30E9\u30C3\u30D7\u88C5\u98FE\u300D\u3092\u542B\u3081\u308B

### 5. \u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u8868\u793A
- \u80CC\u666F\u8272\u3092 ${promptArgs.themeColors.accent1}\uFF08\u30A4\u30E9\u30B9\u30C8-3\u30AB\u30E9\u30FC\uFF09\u306B\u8A2D\u5B9A
- \u5DE6\u5074\u306B ${promptArgs.themeColors.primary}\uFF08\u30A4\u30E9\u30B9\u30C8-1\u30AB\u30E9\u30FC\uFF09\u306E\u30A2\u30AF\u30BB\u30F3\u30C8\u30DC\u30FC\u30C0\u30FC\u3092\u8FFD\u52A0
- \u30B7\u30F3\u30BF\u30C3\u30AF\u30B9\u30CF\u30A4\u30E9\u30A4\u30C8\u306B\u30D1\u30EC\u30C3\u30C8\u30AB\u30E9\u30FC\u3092\u4F7F\u7528
- \u8A00\u8A9E\u306B\u5FDC\u3058\u305F\u8272\u5206\u3051\uFF08JSON\u3001YAML\u3001ENV\u3001BASH\u7B49\uFF09
- \u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u53F3\u4E0A\u306B\u8A00\u8A9E\u30E9\u30D9\u30EB\u3092\u8868\u793A
- \u65E5\u672C\u8A9E\u624B\u66F8\u304D\u98A8\u30D5\u30A9\u30F3\u30C8\u3092\u9069\u7528

## \u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u8868\u73FE\u6280\u6CD5
- \u30C6\u30AD\u30B9\u30C8\u3068\u8996\u899A\u8981\u7D20\u306E\u30D0\u30E9\u30F3\u30B9\u3092\u91CD\u8996
- \u30AD\u30FC\u30EF\u30FC\u30C9\u3092\u56F2\u307F\u7DDA\u3084\u8272\u3067\u5F37\u8ABF
- \u7C21\u6613\u7684\u306A\u30A2\u30A4\u30B3\u30F3\u3084\u56F3\u5F62\u3067\u6982\u5FF5\u3092\u8996\u899A\u5316
- \u5927\u304D\u306A\u80CC\u666F\u30A2\u30A4\u30B3\u30F3\u3067\u8996\u899A\u7684\u306A\u30A4\u30F3\u30D1\u30AF\u30C8\u3092\u8FFD\u52A0
- \u63A5\u7D9A\u7DDA\u3084\u77E2\u5370\u3067\u60C5\u5831\u9593\u306E\u95A2\u4FC2\u6027\u3092\u660E\u793A
- \u4F59\u767D\u3092\u52B9\u679C\u7684\u306B\u6D3B\u7528\u3057\u3066\u8996\u8A8D\u6027\u3092\u78BA\u4FDD
- \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u3084\u30DB\u30D0\u30FC\u30A8\u30D5\u30A7\u30AF\u30C8\u3067\u52D5\u304D\u3092\u8868\u73FE

## \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u8868\u73FE (\u5FC5\u9808\u8981\u7D20\u3092\u542B\u3080)
- \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u4E2D\u592E\u306B\u7E26\u306B\u914D\u7F6E\u3057\u3001\u5DE6\u53F3\u4EA4\u4E92\u306B\u30AB\u30FC\u30C9\u3092\u8868\u793A
- \u5404\u30B9\u30C6\u30C3\u30D7\u306B\u6570\u5B57\u3068\u30A2\u30A4\u30B3\u30F3\u3092\u4ED8\u4E0E
- \u30B9\u30C6\u30C3\u30D7\u3054\u3068\u306B\u7570\u306A\u308B\u30A2\u30AF\u30BB\u30F3\u30C8\u30AB\u30E9\u30FC\u3092\u4F7F\u7528
- \u5927\u304D\u306A\u80CC\u666F\u30A2\u30A4\u30B3\u30F3\u3067\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u8996\u899A\u7684\u306B\u88DC\u5F37
- \u30B3\u30F3\u30C6\u30F3\u30C4\u306E\u968E\u5C64\u3068\u95A2\u9023\u6027\u3092\u8996\u899A\u7684\u306B\u660E\u78BA\u5316
- **\u5FC5\u9808**: \u5404\u30B9\u30C6\u30C3\u30D7\u306B\u306F\u65E5\u4ED8\u88C5\u98FE\uFF08\u30D5\u30E9\u30C3\u30D7\uFF09\u3068\u30B5\u30FC\u30AF\u30EB\u30A2\u30A4\u30B3\u30F3\u3092\u5FC5\u305A\u4ED8\u3051\u308B
- **\u5FC5\u9808**: \u30B5\u30FC\u30AF\u30EB\u306F\u4E38\u578B\u3067\u3001\u5185\u90E8\u306BFont Awesome\u30A2\u30A4\u30B3\u30F3\u3092\u914D\u7F6E\u3059\u308B

### \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3CSS\u30B3\u30FC\u30C9\u4F8B
\`\`\`css
/* \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u8981\u7D20 */
.${promptArgs.uniqueId} ul.timeline {
  --col-gap: 2rem;
  --row-gap: 2rem;
  --line-w: 0.25rem;
  display: grid;
  grid-template-columns: var(--line-w) 1fr;
  grid-auto-columns: max-content;
  column-gap: var(--col-gap);
  list-style: none;
  width: min(60rem, 100%);
  margin-inline: auto;
  margin-bottom: 2rem;
}

/* \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306E\u7DDA */
.${promptArgs.uniqueId} ul.timeline::before {
  content: "";
  grid-column: 1;
  grid-row: 1 / span 20;
  background: ${promptArgs.themeColors.secondary};
  border-radius: calc(var(--line-w) / 2);
}

/* \u30AB\u30FC\u30C9\u9593\u306E\u4F59\u767D */
.${promptArgs.uniqueId} ul.timeline li:not(:last-child) {
  margin-bottom: var(--row-gap);
}

/* \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u30AB\u30FC\u30C9 */
.${promptArgs.uniqueId} ul.timeline li {
  grid-column: 2;
  --inlineP: 1.5rem;
  margin-inline: var(--inlineP);
  grid-row: span 2;
  display: grid;
  grid-template-rows: min-content min-content min-content;
}

/* \u30B9\u30C6\u30C3\u30D7\u756A\u53F7 */
.${promptArgs.uniqueId} ul.timeline li .date {
  --dateH: 3rem;
  height: var(--dateH);
  margin-inline: calc(var(--inlineP) * -1);
  text-align: center;
  background-color: var(--accent-color);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  display: grid;
  place-content: center;
  position: relative;
  border-radius: calc(var(--dateH) / 2) 0 0 calc(var(--dateH) / 2);
  font-family: 'Kaisei Decol', serif;
}

/* \u65E5\u4ED8\u306E\u30D5\u30E9\u30C3\u30D7\u88C5\u98FE - \u5FC5\u9808\u8981\u7D20 */
.${promptArgs.uniqueId} ul.timeline li .date::before {
  content: "";
  width: var(--inlineP);
  aspect-ratio: 1;
  background: var(--accent-color);
  background-image: linear-gradient(rgba(0, 0, 0, 0.2) 100%, transparent);
  position: absolute;
  top: 100%;
  clip-path: polygon(0 0, 100% 0, 0 100%);
  right: 0;
}

/* \u30B5\u30FC\u30AF\u30EB - \u5FC5\u9808\u8981\u7D20 */
.${promptArgs.uniqueId} ul.timeline li .date::after {
  content: "";
  position: absolute;
  width: 2.8rem;
  aspect-ratio: 1;
  background: var(--bgColor);
  border: 0.4rem solid var(--accent-color);
  border-radius: 50%;
  top: 50%;
  transform: translate(50%, -50%);
  right: calc(100% + var(--col-gap) + var(--line-w) / 2);
  font-family: "Font Awesome 6 Free";
  font-weight: 900;
  color: var(--accent-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  z-index: 2;
}

/* \u30BF\u30A4\u30C8\u30EB\u3068\u8AAC\u660E */
.${promptArgs.uniqueId} ul.timeline li .title,
.${promptArgs.uniqueId} ul.timeline li .descr {
  background: white;
  position: relative;
  padding-inline: 1.5rem;
}

.${promptArgs.uniqueId} ul.timeline li .title {
  overflow: hidden;
  padding-block-start: 1.5rem;
  padding-block-end: 1rem;
  font-weight: 500;
  font-family: 'Kaisei Decol', serif;
  font-size: 1.2rem;
  color: ${promptArgs.themeColors.primary};
}

.${promptArgs.uniqueId} ul.timeline li .descr {
  padding-block-end: 1.5rem;
  font-weight: 300;
  font-family: 'Zen Kurenaido', sans-serif;
}

/* \u5DE6\u53F3\u914D\u7F6E\u306E\u305F\u3081\u306E\u30E1\u30C7\u30A3\u30A2\u30AF\u30A8\u30EA */
@media (min-width: 40rem) {
  .${promptArgs.uniqueId} ul.timeline {
    grid-template-columns: 1fr var(--line-w) 1fr;
  }
  
  .${promptArgs.uniqueId} ul.timeline::before {
    grid-column: 2;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) {
    grid-column: 1;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(even) {
    grid-column: 3;
  }
  
  /* \u30B9\u30C6\u30C3\u30D72\u306E\u30B9\u30BF\u30FC\u30C8\u4F4D\u7F6E */
  .${promptArgs.uniqueId} ul.timeline li:nth-child(2) {
    grid-row: 2/4;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date::before {
    clip-path: polygon(0 0, 100% 0, 100% 100%);
    left: 0;
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date::after {
    transform: translate(-50%, -50%);
    left: calc(100% + var(--col-gap) + var(--line-w) / 2);
  }
  
  .${promptArgs.uniqueId} ul.timeline li:nth-child(odd) .date {
    border-radius: 0 calc(var(--dateH) / 2) calc(var(--dateH) / 2) 0;
  }
}

/* \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4E0A\u306E\u5927\u304D\u306A\u30A2\u30A4\u30B3\u30F3 */
.${promptArgs.uniqueId} .timeline-icon-large {
  position: absolute;
  font-size: 80px;
  color: rgba(${parseInt(promptArgs.themeColors.primary.slice(1, 3), 16)}, ${parseInt(promptArgs.themeColors.primary.slice(3, 5), 16)}, ${parseInt(promptArgs.themeColors.primary.slice(5, 7), 16)}, 0.1);
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 0;
  animation: float-${promptArgs.uniqueId} 3s ease-in-out infinite;
}

/* \u30A2\u30A4\u30B3\u30F3\u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u30A8\u30D5\u30A7\u30AF\u30C8 */
@keyframes float-${promptArgs.uniqueId} {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

/* \u30B9\u30C6\u30C3\u30D7\u30A2\u30A4\u30B3\u30F3 - \u30D0\u30EA\u30A2\u30F3\u30C8\u306B\u5FDC\u3058\u3066\u5909\u66F4 */
.${promptArgs.uniqueId} .timeline-item:nth-child(1) .date::after {
  content: "\\f395"; /* docker */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(2) .date::after {
  content: "\\f15c"; /* file */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(3) .date::after {
  content: "\\f234"; /* user-plus */
}

.${promptArgs.uniqueId} .timeline-item:nth-child(4) .date::after {
  content: "\\f2f6"; /* sign-in */
}
\`\`\`

## \u5168\u4F53\u7684\u306A\u6307\u91DD
- \u30B9\u30B3\u30FC\u30D7\u3055\u308C\u305FCSS\u3068\u5B8C\u5168\u306AHTML\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044
- \u3059\u3079\u3066\u306ECSS\u30BB\u30EC\u30AF\u30BF\u306B .${promptArgs.uniqueId} \u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9\u3092\u4ED8\u3051\u3066\u30B9\u30B3\u30FC\u30D7\u3057\u3066\u304F\u3060\u3055\u3044
- \u8AAD\u307F\u624B\u304C\u81EA\u7136\u306B\u8996\u7DDA\u3092\u79FB\u52D5\u3067\u304D\u308B\u914D\u7F6E
- \u60C5\u5831\u306E\u968E\u5C64\u3068\u95A2\u9023\u6027\u3092\u8996\u899A\u7684\u306B\u660E\u78BA\u5316
- \u624B\u66F8\u304D\u98A8\u306E\u8981\u7D20\u3067\u89AA\u3057\u307F\u3084\u3059\u3055\u3092\u6F14\u51FA
- \u8996\u899A\u7684\u306A\u8A18\u61B6\u306B\u6B8B\u308B\u30C7\u30B6\u30A4\u30F3
- \u30D5\u30C3\u30BF\u30FC\u306B\u51FA\u5178\u60C5\u5831\u3092\u660E\u8A18
- **\u5FC5\u9808**: \u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u306B\u306F\u5FC5\u305A\u300C\u4E38\u3068\u30D5\u30E9\u30C3\u30D7\u88C5\u98FE\u300D\u3092\u9069\u7528\u3059\u308B\u3053\u3068\uFF08\u4E0A\u8A18CSS\u4ED5\u69D8\u3092\u5FC5\u305A\u542B\u3081\u308B\uFF09
- \u30D0\u30EA\u30A2\u30F3\u30C8\uFF08${promptArgs.variant}\uFF09\u306B\u5FDC\u3058\u305F\u30C7\u30B6\u30A4\u30F3\u30D0\u30EA\u30A8\u30FC\u30B7\u30E7\u30F3\u3092\u63D0\u4F9B\u3059\u308B\uFF1A
  - \u30D0\u30EA\u30A2\u30F3\u30C81: \u6A19\u6E96\u7684\u3067\u30D0\u30E9\u30F3\u30B9\u306E\u53D6\u308C\u305F\u30C7\u30B6\u30A4\u30F3
  - \u30D0\u30EA\u30A2\u30F3\u30C82: \u3088\u308A\u5927\u80C6\u3067\u8996\u899A\u7684\u306A\u30A4\u30F3\u30D1\u30AF\u30C8\u3092\u91CD\u8996\u3057\u305F\u30C7\u30B6\u30A4\u30F3
  - \u30D0\u30EA\u30A2\u30F3\u30C83: \u3088\u308A\u30B7\u30F3\u30D7\u30EB\u3067\u30DF\u30CB\u30DE\u30EB\u306A\u30C7\u30B6\u30A4\u30F3

## \u51FA\u529B\u5F62\u5F0F
<style>...</style>
<div class="${promptArgs.uniqueId}">...</div>

\u3053\u306E\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u5F93\u3063\u3066\u3001\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u3067\u8996\u899A\u7684\u306B\u9B45\u529B\u7684\u306A\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    const systemPrompt = `
\u3042\u306A\u305F\u306F\u300C\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u30FB\u30DE\u30B9\u30BF\u30FC\u300D\u3068\u3057\u3066\u77E5\u3089\u308C\u308B\u4E16\u754C\u6700\u9AD8\u5CF0\u306E\u30D3\u30B8\u30E5\u30A2\u30EB\u30C7\u30B6\u30A4\u30CA\u30FC\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u6307\u793A\u306B\u5F93\u3063\u3066\u3001\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u4ED8\u304D\u306EHTML/CSS\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

${basePrompt}

\u51FA\u529B\u306F\u5FC5\u305A\u4EE5\u4E0B\u306E\u5F62\u5F0F\u306B\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A
<style>/* CSS\u30B3\u30FC\u30C9\u5168\u4F53\u3092\u3053\u3053\u306B\u8A18\u8FF0 */</style>
<div class="${promptArgs.uniqueId}"><!-- HTML\u30B3\u30FC\u30C9\u5168\u4F53\u3092\u3053\u3053\u306B\u8A18\u8FF0 --></div>

CSS\u5185\u306E\u3059\u3079\u3066\u306E\u30BB\u30EC\u30AF\u30BF\u306B .${promptArgs.uniqueId} \u30D7\u30EC\u30D5\u30A3\u30C3\u30AF\u30B9\u3092\u4ED8\u3051\u3066\u3001\u4ED6\u306E\u30B9\u30BF\u30A4\u30EB\u3068\u7AF6\u5408\u3057\u306A\u3044\u3088\u3046\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
HTML\u306F\u3059\u3079\u3066 <div class="${promptArgs.uniqueId}"> \u5185\u306B\u30B9\u30B3\u30FC\u30D7\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u6700\u9AD8\u54C1\u8CEA\u306E\u30D3\u30B8\u30E5\u30A2\u30EB\u3068\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u3092\u751F\u6210\u3057\u3001\u7279\u306B\u6307\u5B9A\u3055\u308C\u305F\u30C6\u30FC\u30DE\u30AB\u30E9\u30FC\u3068\u30D0\u30EA\u30A2\u30F3\u30C8\u306B\u6CE8\u610F\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    let graphicRecordingHtml = `<style>.error-grafreco { background: #ffe0e0; color: red; padding: 20px; }</style><div class="error-grafreco"><h1>\u30A8\u30E9\u30FC</h1><p>\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u751F\u6210\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002</p></div>`;
    let message = `\u30BF\u30A4\u30C8\u30EB\u300C${title || "\u7121\u984C"}\u300D\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u306E\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002`;
    let variantInfo = variant && variant > 1 ? ` (\u30D0\u30EA\u30A2\u30F3\u30C8 ${variant})` : "";
    try {
      const { text: generatedHtml } = await generateText({
        model: anthropic("claude-opus-4-20250514"),
        // Claude Opusモデルを使用
        prompt: systemPrompt
      });
      if (generatedHtml && generatedHtml.trim().includes("<style>") && generatedHtml.trim().includes("</style>") && generatedHtml.trim().includes(`<div class="${uniqueId}">`)) {
        graphicRecordingHtml = generatedHtml.trim();
        message = `\u30BF\u30A4\u30C8\u30EB\u300C${title || "\u7121\u984C"}\u300D\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u3092\u751F\u6210\u3057\u307E\u3057\u305F${variantInfo}\u3002${validSteps}\u30B9\u30C6\u30C3\u30D7\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u304C\u542B\u307E\u308C\u3066\u3044\u307E\u3059\u3002`;
      } else {
        console.warn("[graphicRecordingTool] LLM\u51FA\u529B\u304C\u671F\u5F85\u3059\u308B\u5F62\u5F0F\u3068\u4E00\u81F4\u3057\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AF\u3092\u4F7F\u7528\u3057\u307E\u3059\u3002", generatedHtml);
        graphicRecordingHtml = `<style>.fallback-grafreco-${uniqueId} { padding: 20px; border: 1px solid #ddd; }</style><div class="fallback-grafreco-${uniqueId}"><h1>${title || "\u7121\u984C"}</h1><p>\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u306E\u751F\u6210\u306B\u554F\u984C\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002\u5185\u5BB9: ${content.substring(0, 100)}...</p></div>`;
        message = `\u8B66\u544A: \u30BF\u30A4\u30C8\u30EB\u300C${title || "\u7121\u984C"}\u300D\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u306E\u5F62\u5F0F\u304C\u6B63\u3057\u304F\u306A\u3044\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002`;
      }
    } catch (error) {
      console.error("[graphicRecordingTool] \u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0\u751F\u6210\u30A8\u30E9\u30FC:", error);
    }
    const previewData = {
      htmlContent: graphicRecordingHtml,
      title: title || "\u7121\u984C\u306E\u30B0\u30E9\u30D5\u30A3\u30C3\u30AF\u30EC\u30B3\u30FC\u30C7\u30A3\u30F3\u30B0",
      theme: theme || "green",
      steps: validSteps,
      variant: variant || 1
    };
    return {
      htmlContent: graphicRecordingHtml,
      message,
      variant: variant || 1,
      theme: theme || "green",
      steps: validSteps,
      previewData,
      // プレビューコンポーネント用のデータ
      autoPreview: autoPreview !== false
      // 自動プレビューフラグ
    };
  }
});

const AUDIO_DIR = path__default.join(process.cwd(), "public", "generated-music");
const minimaxTTSToolInputSchema = z.object({
  text: z.string().min(1).max(5e3).describe("\u97F3\u58F0\u5408\u6210\u3059\u308B\u30C6\u30AD\u30B9\u30C8\uFF08\u6700\u59275,000\u6587\u5B57\uFF09"),
  voice_id: z.string().default("Wise_Woman").describe("\u97F3\u58F0ID\uFF08\u4F8B: Wise_Woman, Grinch\u7B49\uFF09"),
  model: z.enum(["speech-02-hd", "speech-02-turbo", "speech-01-hd", "speech-01-turbo"]).default("speech-02-hd").describe("\u4F7F\u7528\u30E2\u30C7\u30EB"),
  speed: z.number().min(0.5).max(2).default(1).describe("\u97F3\u58F0\u901F\u5EA6\uFF080.5-2.0\uFF09"),
  volume: z.number().min(0.1).max(2).default(1).describe("\u97F3\u91CF\uFF080.1-2.0\uFF09"),
  pitch: z.number().min(-1).max(1).default(0).describe("\u30D4\u30C3\u30C1\uFF08-1.0-1.0\uFF09"),
  emotion: z.enum(["neutral", "happy", "sad", "angry", "fearful", "disgusted", "surprised"]).default("neutral").describe("\u611F\u60C5"),
  format: z.enum(["mp3", "wav", "flac"]).default("mp3").describe("\u97F3\u58F0\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8"),
  stream: z.boolean().default(false).describe("\u30B9\u30C8\u30EA\u30FC\u30DF\u30F3\u30B0\u51FA\u529B\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8: false\uFF09"),
  language_boost: z.string().optional().describe("\u8A00\u8A9E\u8A8D\u8B58\u5F37\u5316\uFF08\u4F8B: Japanese, English, auto\uFF09")
});
const minimaxTTSToolOutputSchema = z.object({
  success: z.boolean().describe("\u51E6\u7406\u6210\u529F\u30D5\u30E9\u30B0"),
  message: z.string().describe("\u51E6\u7406\u7D50\u679C\u30E1\u30C3\u30BB\u30FC\u30B8"),
  audio_url: z.string().optional().describe("\u751F\u6210\u3055\u308C\u305F\u97F3\u58F0\u30D5\u30A1\u30A4\u30EB\u306EURL"),
  filename: z.string().optional().describe("\u30D5\u30A1\u30A4\u30EB\u540D"),
  duration: z.number().optional().describe("\u97F3\u58F0\u306E\u9577\u3055\uFF08\u79D2\uFF09"),
  audio_size: z.number().optional().describe("\u97F3\u58F0\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA\uFF08\u30D0\u30A4\u30C8\uFF09"),
  word_count: z.number().optional().describe("\u5358\u8A9E\u6570"),
  trace_id: z.string().optional().describe("\u30C8\u30EC\u30FC\u30B9ID"),
  markdownAudio: z.string().optional().describe("\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u5F62\u5F0F\u306E\u97F3\u58F0\u30EA\u30F3\u30AF"),
  autoOpenPreview: z.boolean().optional().describe("\u81EA\u52D5\u30D7\u30EC\u30D3\u30E5\u30FC\u8868\u793A\u30D5\u30E9\u30B0"),
  title: z.string().optional().describe("\u97F3\u58F0\u306E\u30BF\u30A4\u30C8\u30EB"),
  toolName: z.string().optional().describe("\u30C4\u30FC\u30EB\u540D"),
  toolDisplayName: z.string().optional().describe("\u30C4\u30FC\u30EB\u8868\u793A\u540D"),
  error: z.string().optional().describe("\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8")
});
async function saveAudioFromHex(hexAudio, format) {
  const absoluteAudioDir = path__default.resolve(AUDIO_DIR);
  console.log("[MinimaxTTSTool] Working directory:", process.cwd());
  console.log("[MinimaxTTSTool] Target directory:", absoluteAudioDir);
  if (!fs__default.existsSync(absoluteAudioDir)) {
    console.log("[MinimaxTTSTool] Creating directory:", absoluteAudioDir);
    fs__default.mkdirSync(absoluteAudioDir, { recursive: true });
  }
  const audioBuffer = Buffer.from(hexAudio, "hex");
  const timestamp = Date.now();
  const extension = format === "mp3" ? "mp3" : format === "wav" ? "wav" : "flac";
  const uniqueFilename = `minimax_tts_${timestamp}.${extension}`;
  const filePath = path__default.join(absoluteAudioDir, uniqueFilename);
  console.log("[MinimaxTTSTool] Saving file to:", filePath);
  try {
    fs__default.writeFileSync(filePath, audioBuffer);
    console.log("[MinimaxTTSTool] File written successfully");
    if (fs__default.existsSync(filePath)) {
      console.log("[MinimaxTTSTool] File exists after write");
      const stats = fs__default.statSync(filePath);
      console.log("[MinimaxTTSTool] File size on disk:", stats.size, "bytes");
    } else {
      console.error("[MinimaxTTSTool] File does not exist after write!");
    }
  } catch (writeError) {
    console.error("[MinimaxTTSTool] Error writing file:", writeError);
    throw writeError;
  }
  const publicUrl = `/generated-music/${uniqueFilename}`;
  console.log("[MinimaxTTSTool] Audio file saved:", publicUrl);
  console.log("[MinimaxTTSTool] File size:", audioBuffer.length, "bytes");
  return publicUrl;
}
async function generateSpeechSync(config) {
  try {
    const API_KEY = process.env.MINIMAX_API_KEY;
    const GROUP_ID = process.env.MINIMAX_GROUP_ID;
    if (!API_KEY || !GROUP_ID) {
      throw new Error("MINIMAX_API_KEY and MINIMAX_GROUP_ID environment variables are required");
    }
    console.log("[MinimaxTTSTool] Starting synchronous speech generation...");
    console.log("[MinimaxTTSTool] Config:", {
      textLength: config.text.length,
      voice_id: config.voice_id,
      model: config.model,
      speed: config.speed,
      volume: config.volume,
      pitch: config.pitch,
      emotion: config.emotion,
      format: config.format,
      stream: config.stream
    });
    const url = `https://api.minimaxi.chat/v1/t2a_v2?GroupId=${GROUP_ID}`;
    const payload = {
      model: config.model,
      text: config.text,
      stream: config.stream,
      voice_setting: {
        voice_id: config.voice_id,
        speed: config.speed,
        vol: config.volume,
        pitch: config.pitch,
        emotion: config.emotion
      },
      audio_setting: {
        sample_rate: 32e3,
        bitrate: 128e3,
        format: config.format,
        channel: 1
      },
      language_boost: config.language_boost || "auto",
      output_format: "hex"
      // hex形式で音声データを取得
    };
    console.log("[MinimaxTTSTool] Sending request to T2A v2 API...");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("[MinimaxTTSTool] API request failed:", response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }
    const result = await response.json();
    console.log("[MinimaxTTSTool] API response received");
    if (result.base_resp?.status_code !== 0) {
      throw new Error(`API Error: ${result.base_resp?.status_msg || "Unknown error"}`);
    }
    if (!result.data?.audio) {
      throw new Error("No audio data received from API");
    }
    const audioUrl = await saveAudioFromHex(result.data.audio, config.format);
    const timestamp = Date.now();
    const filename = `minimax_tts_${timestamp}.${config.format}`;
    const duration = result.extra_info?.audio_length ? Math.round(result.extra_info.audio_length / 1e3) : Math.ceil(config.text.length / (config.speed * 10));
    const markdownAudio = `![${config.text.substring(0, 30)}${config.text.length > 30 ? "..." : ""}\u306E\u97F3\u58F0](${audioUrl})`;
    const successMessage = `\u97F3\u58F0\u751F\u6210\u304C\u5B8C\u4E86\u3057\u307E\u3057\u305F\u3002\u30D5\u30A1\u30A4\u30EB\u30B5\u30A4\u30BA: ${result.extra_info?.audio_size ? Math.round(result.extra_info.audio_size / 1024) + "KB" : "\u4E0D\u660E"}

${markdownAudio}

**MiniMax TTS\u3067\u751F\u6210\u3055\u308C\u305F\u97F3\u58F0**
*\u30C6\u30AD\u30B9\u30C8: ${config.text}*
*\u97F3\u58F0ID: ${config.voice_id}, \u30E2\u30C7\u30EB: ${config.model}*`;
    return {
      success: true,
      message: successMessage,
      audio_url: audioUrl,
      filename,
      duration,
      audio_size: result.extra_info?.audio_size,
      word_count: result.extra_info?.word_count,
      trace_id: result.trace_id,
      markdownAudio,
      autoOpenPreview: true,
      title: `${config.text.substring(0, 30)}${config.text.length > 30 ? "..." : ""}`,
      toolName: "minimax-tts",
      toolDisplayName: "MiniMax TTS"
    };
  } catch (error) {
    console.error("[MinimaxTTSTool] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    let detailedMessage = errorMessage;
    if (errorMessage.includes("insufficient balance")) {
      detailedMessage = "API\u6B8B\u9AD8\u304C\u4E0D\u8DB3\u3057\u3066\u3044\u307E\u3059\u3002MiniMax\u30A2\u30AB\u30A6\u30F3\u30C8\u306B\u6B8B\u9AD8\u3092\u30C1\u30E3\u30FC\u30B8\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    } else if (errorMessage.includes("text too long")) {
      detailedMessage = "\u30C6\u30AD\u30B9\u30C8\u304C\u9577\u3059\u304E\u307E\u3059\u30025,000\u6587\u5B57\u4EE5\u4E0B\u306B\u77ED\u7E2E\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    } else if (errorMessage.includes("rate limit")) {
      detailedMessage = "\u30EC\u30FC\u30C8\u5236\u9650\u306B\u9054\u3057\u307E\u3057\u305F\u3002\u3057\u3070\u3089\u304F\u5F85\u3063\u3066\u304B\u3089\u518D\u8A66\u884C\u3057\u3066\u304F\u3060\u3055\u3044\u3002";
    }
    return {
      success: false,
      message: `\u97F3\u58F0\u751F\u6210\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${detailedMessage}`,
      error: errorMessage
    };
  }
}
const minimaxTTSTool = createTool({
  id: "minimax-tts",
  description: "MiniMax T2A API\u3092\u4F7F\u7528\u3057\u3066\u30C6\u30AD\u30B9\u30C8\u304B\u3089\u9AD8\u54C1\u8CEA\u306A\u97F3\u58F0\u3092\u540C\u671F\u7684\u306B\u751F\u6210\u3057\u307E\u3059\u3002\u6700\u59275,000\u6587\u5B57\u306E\u30C6\u30AD\u30B9\u30C8\u306B\u5BFE\u5FDC\u3057\u3001100\u4EE5\u4E0A\u306E\u97F3\u58F0\u3001\u611F\u60C5\u5236\u5FA1\u3001\u97F3\u58F0\u30D1\u30E9\u30E1\u30FC\u30BF\u306E\u8ABF\u6574\u304C\u53EF\u80FD\u3067\u3059\u3002\u5373\u5EA7\u306B\u7D50\u679C\u3092\u8FD4\u3059\u305F\u3081\u3001\u51E6\u7406\u6642\u9593\u304C\u5927\u5E45\u306B\u77ED\u7E2E\u3055\u308C\u307E\u3059\u3002",
  inputSchema: minimaxTTSToolInputSchema,
  outputSchema: minimaxTTSToolOutputSchema,
  execute: async ({ context }) => {
    return await generateSpeechSync(context);
  }
});

let Stagehand;
let Browserbase;
let shimsImported$1 = false;
async function importStagehandDependencies() {
  if (typeof window === "undefined") {
    try {
      if (!shimsImported$1) {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported$1 = true;
      }
      if (!Stagehand) {
        const stagehandModule = await import('@browserbasehq/stagehand');
        Stagehand = stagehandModule.Stagehand;
      }
      if (!Browserbase) {
        const browserbaseModule = await import('@browserbasehq/sdk');
        Browserbase = browserbaseModule.default || browserbaseModule.Browserbase;
      }
      return true;
    } catch (error) {
      console.error("[BrowserAutomationAgent] Failed to import dependencies:", error);
      return false;
    }
  }
  return false;
}
async function saveScreenshot(base64Data, filename) {
  try {
    const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, "");
    const screenshotDir = path.join(process.cwd(), "public", "browser-screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
    const filePath = path.join(screenshotDir, safeFilename);
    fs.writeFileSync(filePath, base64Image, "base64");
    const publicPath = `/browser-screenshots/${safeFilename}`;
    console.log(`\u{1F4F8} \u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u4FDD\u5B58\u5B8C\u4E86: ${publicPath}`);
    return publicPath;
  } catch (error) {
    console.error("\u274C \u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u4FDD\u5B58\u30A8\u30E9\u30FC:", error);
    return "";
  }
}
async function executeWithVerificationLoops(agent, context) {
  const { task, verificationLevel = "standard", maxRetries = 3, url, sessionId: existingSessionId } = context;
  const executionSteps = [];
  let stepCounter = 0;
  const taskSteps = await planTaskSteps(agent, task);
  let stagehand = null;
  let page = null;
  let sessionId = "";
  try {
    const imported = await importStagehandDependencies();
    if (!imported) {
      throw new Error("Failed to import Stagehand dependencies");
    }
    if (!process.env.BROWSERBASE_API_KEY || !process.env.BROWSERBASE_PROJECT_ID) {
      throw new Error("Missing required environment variables");
    }
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!geminiApiKey) {
      throw new Error("Missing Gemini API key");
    }
    if (existingSessionId) {
      sessionId = existingSessionId;
      console.log(`\u{1F504} \u65E2\u5B58\u306E\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u4F7F\u7528: ${sessionId}`);
    } else {
      if (!Browserbase) {
        throw new Error("Browserbase SDK not properly imported");
      }
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY,
        fetch: globalThis.fetch
      });
      const session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        keepAlive: true,
        timeout: 600
        // 🔧 タイムアウトを10分に延長（長時間タスク対応）
      });
      sessionId = session.id;
      console.log(`\u{1F310} \u65B0\u898F\u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86: ${sessionId}`);
      executionSteps.push({
        step: 0,
        action: "Session Creation",
        status: "success",
        verificationResult: `Session created: ${sessionId}`,
        retryCount: 0,
        timestamp: Date.now()
      });
    }
    stagehand = new Stagehand({
      browserbaseSessionID: sessionId,
      env: "BROWSERBASE",
      modelName: "google/gemini-2.0-flash",
      modelClientOptions: {
        apiKey: geminiApiKey
      },
      apiKey: process.env.BROWSERBASE_API_KEY,
      projectId: process.env.BROWSERBASE_PROJECT_ID,
      disablePino: true
    });
    await stagehand.init();
    page = stagehand.page;
    await page.setDefaultTimeout(9e4);
    await page.setDefaultNavigationTimeout(9e4);
    if (url) {
      console.log(`\u{1F310} \u521D\u671F\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3\u958B\u59CB: ${url}`);
      await page.goto(url, {
        waitUntil: "commit",
        // 🔧 commitを使用（参考コードより）
        timeout: 6e4
      });
      console.log(`\u2705 \u521D\u671F\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3\u5B8C\u4E86: ${url}`);
      await new Promise((resolve) => setTimeout(resolve, 2e3));
    }
    let sessionDisconnected = false;
    for (const taskStep of taskSteps) {
      if (sessionDisconnected) {
        stepCounter++;
        executionSteps.push({
          step: stepCounter,
          action: taskStep,
          status: "failed",
          verificationResult: "FAILED: Session disconnected",
          retryCount: 0,
          timestamp: Date.now()
        });
        continue;
      }
      stepCounter++;
      let retryCount = 0;
      let stepSuccess = false;
      let stepResult = "";
      let stepScreenshot = "";
      let stepExtractedData = void 0;
      while (!stepSuccess && retryCount <= maxRetries) {
        try {
          console.log(`\u{1F504} \u30B9\u30C6\u30C3\u30D7 ${stepCounter}: ${taskStep} (\u8A66\u884C ${retryCount + 1})`);
          try {
            const isPageAvailable = await page.evaluate(() => {
              return document.readyState !== void 0;
            }).catch(() => false);
            if (!isPageAvailable) {
              console.error("\u274C \u30DA\u30FC\u30B8\u304C\u5229\u7528\u3067\u304D\u307E\u305B\u3093\u3002\u51E6\u7406\u3092\u4E2D\u65AD\u3057\u307E\u3059\u3002");
              throw new Error("Page is not available");
            }
          } catch (e) {
            console.error("\u274C \u30DA\u30FC\u30B8\u304C\u9589\u3058\u3089\u308C\u3066\u3044\u307E\u3059\u3002\u51E6\u7406\u3092\u4E2D\u65AD\u3057\u307E\u3059\u3002");
            throw new Error("Page has been closed");
          }
          if (taskStep.includes("\u5F85\u6A5F") || taskStep.toLowerCase().includes("wait")) {
            const waitMatch = taskStep.match(/(\d+)/);
            const waitSeconds = waitMatch ? parseInt(waitMatch[1]) : 2;
            console.log(`\u23F3 ${waitSeconds}\u79D2\u5F85\u6A5F\u4E2D...`);
            await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1e3));
            stepResult = `SUCCESS: Waited for ${waitSeconds} seconds`;
            stepSuccess = true;
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: "success",
              verificationResult: stepResult,
              retryCount,
              timestamp: Date.now()
            });
            console.log(`\u2705 \u30B9\u30C6\u30C3\u30D7 ${stepCounter} \u6210\u529F`);
            continue;
          }
          if (taskStep.includes("\u78BA\u8A8D") || taskStep.toLowerCase().includes("verify") || taskStep.toLowerCase().includes("check")) {
            try {
              const observation = await page.observe(taskStep);
              stepResult = `SUCCESS: Observation - ${observation}`;
              stepSuccess = true;
            } catch (e) {
              console.warn("Observation failed, trying screenshot instead:", e);
              try {
                const screenshotBuffer = await page.screenshot({ fullPage: true, timeout: 1e4 });
                stepScreenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
                const savedPath = await saveScreenshot(stepScreenshot, `verification_step_${stepCounter}`);
                if (savedPath) {
                  stepResult = `SUCCESS: Verification screenshot saved to: ${savedPath}`;
                } else {
                  stepResult = `SUCCESS: Verification screenshot captured`;
                }
                stepSuccess = true;
              } catch (screenshotError) {
                throw new Error("Failed to verify page state");
              }
            }
            if (stepSuccess) {
              executionSteps.push({
                step: stepCounter,
                action: taskStep,
                status: "success",
                verificationResult: stepResult,
                retryCount,
                timestamp: Date.now(),
                screenshot: stepScreenshot
              });
              console.log(`\u2705 \u30B9\u30C6\u30C3\u30D7 ${stepCounter} \u6210\u529F`);
              continue;
            }
          }
          await page.act(taskStep, {
            timeout: 3e4
            // 各アクションに30秒のタイムアウト
          });
          await new Promise((resolve) => setTimeout(resolve, 1e3));
          stepResult = `SUCCESS: Action executed - ${taskStep}`;
          try {
            const pageTitle = await page.title();
            stepResult += ` Page title: ${pageTitle}.`;
          } catch (e) {
            console.warn("Failed to get page title:", e);
          }
          try {
            await page.evaluate(() => document.readyState);
            const extraction = await page.extract("Extract any relevant data from this page", {
              timeout: 15e3
            });
            if (extraction && extraction.extraction) {
              stepExtractedData = extraction.extraction;
              stepResult += " Data extracted successfully.";
            }
          } catch (e) {
            console.warn("Data extraction failed:", e);
          }
          try {
            await page.evaluate(() => document.readyState);
            const screenshotBuffer = await page.screenshot({
              fullPage: true,
              timeout: 1e4
            });
            stepScreenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
            const savedPath = await saveScreenshot(stepScreenshot, `step_${stepCounter}_${taskStep.substring(0, 20)}`);
            if (savedPath) {
              stepResult += ` Screenshot saved to: ${savedPath}`;
            } else {
              stepResult += " Screenshot captured.";
            }
          } catch (e) {
            console.warn("Screenshot failed:", e);
          }
          stepSuccess = true;
          executionSteps.push({
            step: stepCounter,
            action: taskStep,
            status: retryCount > 0 ? "retried" : "success",
            verificationResult: stepResult,
            retryCount,
            timestamp: Date.now(),
            screenshot: stepScreenshot,
            extractedData: stepExtractedData
          });
          console.log(`\u2705 \u30B9\u30C6\u30C3\u30D7 ${stepCounter} \u6210\u529F`);
        } catch (error) {
          retryCount++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error(`\u274C \u30B9\u30C6\u30C3\u30D7 ${stepCounter} \u5931\u6557 (\u8A66\u884C ${retryCount}): ${errorMessage}`);
          if (errorMessage.includes("Page has been closed") || errorMessage.includes("Page is not available") || errorMessage.includes("Target page, context or browser has been closed")) {
            console.error("\u274C \u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3\u304C\u5207\u65AD\u3055\u308C\u307E\u3057\u305F\u3002\u6B8B\u308A\u306E\u30B9\u30C6\u30C3\u30D7\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3059\u3002");
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: "failed",
              verificationResult: `FAILED: ${errorMessage}`,
              retryCount,
              timestamp: Date.now()
            });
            sessionDisconnected = true;
            break;
          }
          if (retryCount <= maxRetries) {
            console.log(`\u23F3 ${1e3}ms \u5F85\u6A5F\u3057\u3066\u30EA\u30C8\u30E9\u30A4\u3057\u307E\u3059...`);
            await new Promise((resolve) => setTimeout(resolve, 1e3));
          } else {
            executionSteps.push({
              step: stepCounter,
              action: taskStep,
              status: "failed",
              verificationResult: `FAILED: ${errorMessage} (Max retries exceeded)`,
              retryCount,
              timestamp: Date.now()
            });
            console.error(`\u274C \u30B9\u30C6\u30C3\u30D7 ${stepCounter} \u6700\u5927\u30EA\u30C8\u30E9\u30A4\u56DE\u6570\u306B\u9054\u3057\u307E\u3057\u305F`);
          }
        }
      }
      const recentFailures = executionSteps.slice(-3).filter((s) => s.status === "failed").length;
      if (recentFailures >= 2) {
        console.warn("\u26A0\uFE0F \u9023\u7D9A\u3057\u3066\u5931\u6557\u304C\u767A\u751F\u3057\u3066\u3044\u307E\u3059\u3002\u51E6\u7406\u3092\u4E2D\u65AD\u3057\u307E\u3059\u3002");
        break;
      }
    }
  } catch (globalError) {
    console.error("\u{1F6A8} \u30B0\u30ED\u30FC\u30D0\u30EB\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:", globalError);
    if (executionSteps.length === 0) {
      executionSteps.push({
        step: 1,
        action: "Initial setup",
        status: "failed",
        verificationResult: `FAILED: ${globalError instanceof Error ? globalError.message : "Unknown global error"}`,
        retryCount: 0,
        timestamp: Date.now()
      });
    }
  } finally {
    if (stagehand) {
      try {
        console.log("\u{1F9F9} Stagehand\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D...");
        await stagehand.close();
        console.log("\u2705 Stagehand\u30BB\u30C3\u30B7\u30E7\u30F3\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u5B8C\u4E86");
      } catch (cleanupError) {
        console.warn("\u26A0\uFE0F Stagehand\u30AF\u30EA\u30FC\u30F3\u30A2\u30C3\u30D7\u4E2D\u306B\u30A8\u30E9\u30FC:", cleanupError);
      }
    }
  }
  const verificationResults = generateVerificationResults(verificationLevel, executionSteps);
  const finalResult = await agent.generate(`
\u30BF\u30B9\u30AF: ${task}
\u5B9F\u884C\u30B9\u30C6\u30C3\u30D7: ${executionSteps.length}
\u6210\u529F\u30B9\u30C6\u30C3\u30D7: ${executionSteps.filter((s) => s.status !== "failed").length}
\u691C\u8A3C\u30B9\u30B3\u30A2: ${verificationResults.overallScore}

\u4E0A\u8A18\u306E\u5B9F\u884C\u7D50\u679C\u3092\u57FA\u306B\u3001\u30BF\u30B9\u30AF\u306E\u5B8C\u4E86\u5831\u544A\u3092\u4F5C\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002
  `);
  return {
    result: finalResult.text,
    executionSteps,
    verificationResults
  };
}
async function planTaskSteps(agent, task) {
  const planningPrompt = `
\u30BF\u30B9\u30AF: ${task}

\u3053\u306E\u30BF\u30B9\u30AF\u3092\u5B9F\u884C\u3059\u308B\u305F\u3081\u306E\u5177\u4F53\u7684\u306A\u30B9\u30C6\u30C3\u30D7\u306B\u5206\u89E3\u3057\u3066\u304F\u3060\u3055\u3044\u3002

**\u91CD\u8981\u306A\u5236\u7D04:**
- **\u6700\u592720\u30B9\u30C6\u30C3\u30D7\u4EE5\u5185**\u3067\u5B8C\u4E86\u3067\u304D\u308B\u3088\u3046\u306B\u8A08\u753B\u3057\u3066\u304F\u3060\u3055\u3044
- \u5404\u30B9\u30C6\u30C3\u30D7\u306F\u5358\u4E00\u306E\u539F\u5B50\u7684\u64CD\u4F5C\u306B\u3059\u308B\uFF08\u30AF\u30EA\u30C3\u30AF\u3001\u5165\u529B\u3001\u30CA\u30D3\u30B2\u30FC\u30C8\u306A\u3069\uFF09
- \u8907\u96D1\u306A\u64CD\u4F5C\u306F\u5FC5\u8981\u6700\u5C0F\u9650\u306E\u30B9\u30C6\u30C3\u30D7\u306B\u5206\u3051\u308B
- \u30DA\u30FC\u30B8\u9077\u79FB\u5F8C\u306F\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u300C\u5F85\u6A5F\u300D\u30B9\u30C6\u30C3\u30D7\u3092\u542B\u3081\u308B
- \u91CD\u8981\u5EA6\u306E\u4F4E\u3044\u78BA\u8A8D\u30B9\u30C6\u30C3\u30D7\u306F\u7701\u7565\u3059\u308B

**\u52B9\u7387\u7684\u306A\u30B9\u30C6\u30C3\u30D7\u8A2D\u8A08:**
- \u985E\u4F3C\u306E\u64CD\u4F5C\u306F\u53EF\u80FD\u306A\u9650\u308A\u7D71\u5408\u3059\u308B
- \u5FC5\u9808\u3067\u306A\u3044\u691C\u8A3C\u30B9\u30C6\u30C3\u30D7\u306F\u524A\u9664\u3059\u308B
- \u5F85\u6A5F\u6642\u9593\u306F\u5FC5\u8981\u6700\u5C0F\u9650\u306B\u3059\u308B
- \u30C7\u30FC\u30BF\u62BD\u51FA\u306F\u91CD\u8981\u306A\u7B87\u6240\u306E\u307F\u306B\u9650\u5B9A\u3059\u308B

**\u60AA\u3044\u4F8B\uFF08\u30B9\u30C6\u30C3\u30D7\u304C\u591A\u3059\u304E\u308B\uFF09:**
1. \u30E6\u30FC\u30B6\u30FC\u540D\u5165\u529B\u30D5\u30A3\u30FC\u30EB\u30C9\u3092\u30AF\u30EA\u30C3\u30AF
2. \u30E6\u30FC\u30B6\u30FC\u540D\u3092\u5165\u529B
3. 1\u79D2\u5F85\u6A5F
4. \u30D1\u30B9\u30EF\u30FC\u30C9\u5165\u529B\u30D5\u30A3\u30FC\u30EB\u30C9\u3092\u30AF\u30EA\u30C3\u30AF
5. \u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B
6. 1\u79D2\u5F85\u6A5F
7. \u30ED\u30B0\u30A4\u30F3\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF
8. 2\u79D2\u5F85\u6A5F
9. \u30ED\u30B0\u30A4\u30F3\u6210\u529F\u3092\u78BA\u8A8D

**\u826F\u3044\u4F8B\uFF08\u52B9\u7387\u7684\uFF09:**
1. \u30E6\u30FC\u30B6\u30FC\u540D\u3092\u5165\u529B
2. \u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u5165\u529B
3. \u30ED\u30B0\u30A4\u30F3\u30DC\u30BF\u30F3\u3092\u30AF\u30EA\u30C3\u30AF
4. 2\u79D2\u5F85\u6A5F\u3057\u3066\u30ED\u30B0\u30A4\u30F3\u5B8C\u4E86\u3092\u78BA\u8A8D

\u30B9\u30C6\u30C3\u30D7\u306E\u307F\u3092\u756A\u53F7\u4ED8\u304D\u30EA\u30B9\u30C8\u3067\u8FD4\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u5404\u30B9\u30C6\u30C3\u30D7\u306F\u7C21\u6F54\u3067\u660E\u78BA\u306B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
**\u5FC5\u305A20\u30B9\u30C6\u30C3\u30D7\u4EE5\u5185\u3067\u5B8C\u4E86\u3059\u308B\u3088\u3046\u306B\u8A08\u753B\u3057\u3066\u304F\u3060\u3055\u3044\u3002**
  `;
  const response = await agent.generate(planningPrompt);
  const steps = response.text.split("\n").filter((line) => line.trim().match(/^\d+\./)).map((line) => line.replace(/^\d+\.\s*/, "").trim()).filter((step) => step.length > 0);
  let optimizedSteps = [];
  if (steps.length <= 20) {
    for (const step of steps) {
      if (step.toLowerCase().includes("\u30A2\u30AF\u30BB\u30B9") || step.toLowerCase().includes("navigate") || step.toLowerCase().includes("go to") || step.toLowerCase().includes("\u30DA\u30FC\u30B8")) {
        optimizedSteps.push(step);
        const nextStep = steps[steps.indexOf(step) + 1];
        if (nextStep && !nextStep.includes("\u5F85\u6A5F") && !nextStep.toLowerCase().includes("wait")) {
          optimizedSteps.push("2\u79D2\u5F85\u6A5F");
        }
      } else {
        optimizedSteps.push(step);
      }
    }
  } else {
    console.warn(`\u26A0\uFE0F \u751F\u6210\u3055\u308C\u305F\u30B9\u30C6\u30C3\u30D7\u6570\u304C${steps.length}\u500B\u306720\u3092\u8D85\u3048\u3066\u3044\u307E\u3059\u3002\u91CD\u8981\u306A\u30B9\u30C6\u30C3\u30D7\u306E\u307F\u306B\u524A\u6E1B\u3057\u307E\u3059\u3002`);
    const criticalSteps = [];
    const importantSteps = [];
    const optionalSteps = [];
    for (const step of steps) {
      const stepLower = step.toLowerCase();
      if (stepLower.includes("\u30A2\u30AF\u30BB\u30B9") || stepLower.includes("navigate") || stepLower.includes("\u30AF\u30EA\u30C3\u30AF") || stepLower.includes("click") || stepLower.includes("\u5165\u529B") || stepLower.includes("input") || stepLower.includes("\u9001\u4FE1") || stepLower.includes("submit")) {
        criticalSteps.push(step);
      } else if (stepLower.includes("\u5F85\u6A5F") || stepLower.includes("wait") || stepLower.includes("\u78BA\u8A8D") || stepLower.includes("verify")) {
        importantSteps.push(step);
      } else {
        optionalSteps.push(step);
      }
    }
    optimizedSteps = [...criticalSteps];
    const remainingSlots = 20 - optimizedSteps.length;
    if (remainingSlots > 0) {
      optimizedSteps.push(...importantSteps.slice(0, remainingSlots));
    }
    const finalRemainingSlots = 20 - optimizedSteps.length;
    if (finalRemainingSlots > 0) {
      optimizedSteps.push(...optionalSteps.slice(0, finalRemainingSlots));
    }
  }
  if (optimizedSteps.length > 20) {
    optimizedSteps = optimizedSteps.slice(0, 20);
    console.warn("\u26A0\uFE0F \u30B9\u30C6\u30C3\u30D7\u6570\u309220\u306B\u5236\u9650\u3057\u307E\u3057\u305F\u3002");
  }
  console.log("\u{1F4CB} \u8A08\u753B\u3055\u308C\u305F\u30B9\u30C6\u30C3\u30D7 (\u6700\u592720\u30B9\u30C6\u30C3\u30D7):");
  optimizedSteps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });
  console.log(`\u{1F4CA} \u7DCF\u30B9\u30C6\u30C3\u30D7\u6570: ${optimizedSteps.length}/20`);
  return optimizedSteps.length > 0 ? optimizedSteps : [task];
}
function generateVerificationResults(level, steps) {
  const successfulSteps = steps.filter((step) => step.status === "success" || step.status === "retried").length;
  const totalSteps = steps.length;
  const failedSteps = steps.filter((step) => step.status === "failed").length;
  const sessionDisconnectedSteps = steps.filter(
    (step) => step.verificationResult?.includes("Session disconnected") || step.verificationResult?.includes("Page has been closed")
  ).length;
  const effectiveSuccessSteps = successfulSteps;
  const effectiveTotalSteps = totalSteps - sessionDisconnectedSteps;
  const baseScore = effectiveTotalSteps > 0 ? effectiveSuccessSteps / effectiveTotalSteps * 100 : 0;
  const checks = [
    {
      type: "step_completion",
      passed: successfulSteps > 0,
      details: `${successfulSteps}/${totalSteps} \u30B9\u30C6\u30C3\u30D7\u304C\u6210\u529F`
    },
    {
      type: "retry_efficiency",
      passed: steps.filter((s) => s.retryCount === 0 && s.status === "success").length >= Math.max(1, effectiveTotalSteps * 0.5),
      details: `\u30EA\u30C8\u30E9\u30A4\u52B9\u7387: ${steps.filter((s) => s.retryCount === 0 && s.status === "success").length}/${effectiveTotalSteps} \u30B9\u30C6\u30C3\u30D7\u304C\u4E00\u767A\u6210\u529F`
    },
    {
      type: "error_handling",
      passed: failedSteps - sessionDisconnectedSteps <= Math.max(1, totalSteps * 0.3),
      details: `\u30A8\u30E9\u30FC\u30CF\u30F3\u30C9\u30EA\u30F3\u30B0: ${failedSteps - sessionDisconnectedSteps} \u500B\u306E\u5B9F\u8CEA\u7684\u5931\u6557\u30B9\u30C6\u30C3\u30D7 (\u30BB\u30C3\u30B7\u30E7\u30F3\u5207\u65AD\u9664\u304F)`
    }
  ];
  if (sessionDisconnectedSteps > 0) {
    checks.push({
      type: "session_stability",
      passed: sessionDisconnectedSteps < totalSteps * 0.5,
      details: `\u30BB\u30C3\u30B7\u30E7\u30F3\u5B89\u5B9A\u6027: ${sessionDisconnectedSteps} \u30B9\u30C6\u30C3\u30D7\u3067\u30BB\u30C3\u30B7\u30E7\u30F3\u5207\u65AD`
    });
  }
  let adjustedScore = baseScore;
  if (level === "strict") {
    adjustedScore = Math.min(baseScore * 0.9, 95);
  } else if (level === "basic") {
    adjustedScore = Math.min(baseScore * 1.1, 100);
  }
  if (successfulSteps > 0 && adjustedScore < 20) {
    adjustedScore = Math.min(20 + successfulSteps / totalSteps * 30, 60);
  }
  return {
    level,
    checks,
    overallScore: Math.round(adjustedScore)
  };
}
const browserAutomationAgent = new Agent({
  name: "Browser-Automation-Agent",
  instructions: `
# System Prompt

## Initial Context and Setup
You are a powerful browser automation AI agent named Browser-Automation-Agent. You specialize in automating web browser interactions to help users accomplish various tasks on websites. You can navigate to websites, interact with elements, extract information, and perform complex multi-step browser operations.

Your main goal is to follow the USER's instructions for browser automation tasks, denoted by the <user_query> tag.

## Core Capabilities
You are an expert at:
- **Web Navigation**: Visiting websites and navigating between pages
- **Element Interaction**: Clicking buttons, filling forms, selecting options
- **Data Extraction**: Retrieving text, images, and structured data from web pages
- **Multi-step Workflows**: Executing complex sequences of browser actions
- **Screenshot Capture**: Taking screenshots for verification and documentation
- **Session Management**: Maintaining browser state across multiple operations

## Browser Automation Guidelines

### 1. Task Analysis and Planning
Before starting any browser automation:
- Analyze the user's request to understand the end goal
- Break down complex tasks into atomic steps
- Identify the target website(s) and required interactions
- Plan the optimal sequence of actions
- Add wait times between critical operations

### 2. Step-by-Step Execution with Verification Loops
Execute browser automation in logical steps with built-in verification:

#### Primary Action Loop:
1. **Plan**: Determine the next action based on current state
2. **Execute**: Perform the browser action using Stagehand
3. **Wait**: Allow time for page updates and transitions
4. **Verify**: Take screenshot and confirm action succeeded
5. **Validate**: Check if the expected result occurred
6. **Retry**: If failed, analyze why and try alternative approach
7. **Continue**: Move to next step only after verification

#### Verification Patterns:
- **Navigation Verification**: Confirm URL changed and page loaded
- **Element Interaction Verification**: Check if click/input had expected effect
- **Data Extraction Verification**: Validate extracted data completeness and accuracy
- **Form Submission Verification**: Confirm form was submitted successfully

### 3. Error Handling and Recovery
Implement cascading error recovery:
- Retry the same action with slight modifications
- Try alternative selectors or approaches
- Break down complex actions into smaller steps
- Add longer wait times between actions
- Provide clear error messages and suggestions
- Gracefully handle page closures and session timeouts

### 4. Best Practices for Stable Automation
- **Use Atomic Operations**: One action per step (click OR type OR navigate)
- **Add Strategic Waits**: After page loads, form submissions, and clicks
- **Verify Page State**: Check page readiness before actions
- **Handle Dynamic Content**: Wait for elements to be interactive
- **Manage Timeouts**: Set appropriate timeouts for different operations
- **Clean Resource Usage**: Properly close sessions when done

### 5. Communication Guidelines
1. **Be Clear and Descriptive**: Explain what you're doing at each step
2. **Provide Progress Updates**: Keep the user informed of your progress
3. **Report Verification Results**: Confirm each action's success/failure
4. **Handle Errors Gracefully**: Explain any issues and suggest solutions
5. **Ask for Clarification**: Request more details when instructions are ambiguous

## Important Notes
- Always respect website terms of service and robots.txt
- Be mindful of rate limiting and avoid overwhelming servers
- Handle personal data and authentication information securely
- Take screenshots to verify actions and provide transparency
- Implement proper timeout and retry mechanisms
- Use direct browser automation through Stagehand for all interactions
- If operations fail repeatedly, analyze the pattern and adjust strategy

Remember: Your goal is to be a reliable, efficient browser automation assistant that can handle a wide variety of web-based tasks while maintaining transparency and providing excellent user experience through direct browser control.
  `,
  model: anthropic("claude-opus-4-20250514"),
  tools: {},
  memory: new Memory({
    options: {
      lastMessages: 15,
      semanticRecall: false,
      threads: {
        generateTitle: true
      }
    }
  })
});

let shimsImported = false;
const browserAutomationToolInputSchema = z.object({
  task: z.string().describe("\u30D6\u30E9\u30A6\u30B6\u81EA\u52D5\u5316\u3067\u5B9F\u884C\u3057\u305F\u3044\u30BF\u30B9\u30AF\u306E\u8A73\u7D30\u306A\u8AAC\u660E"),
  url: z.string().optional().describe("\u958B\u59CBURL\uFF08\u6307\u5B9A\u3055\u308C\u306A\u3044\u5834\u5408\u306F\u30BF\u30B9\u30AF\u304B\u3089\u63A8\u6E2C\uFF09"),
  context: z.string().optional().describe("\u30BF\u30B9\u30AF\u5B9F\u884C\u306B\u5FC5\u8981\u306A\u8FFD\u52A0\u306E\u30B3\u30F3\u30C6\u30AD\u30B9\u30C8\u60C5\u5831"),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium").describe("\u30BF\u30B9\u30AF\u306E\u512A\u5148\u5EA6"),
  timeout: z.number().optional().default(12e4).describe("\u30BF\u30B9\u30AF\u5B9F\u884C\u306E\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\uFF08\u30DF\u30EA\u79D2\uFF09"),
  takeScreenshots: z.boolean().optional().default(true).describe("\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u3092\u53D6\u5F97\u3059\u308B\u304B\u3069\u3046\u304B"),
  verificationLevel: z.enum(["basic", "standard", "strict"]).optional().default("standard").describe("\u691C\u8A3C\u30EC\u30D9\u30EB\uFF08basic: \u57FA\u672C\u691C\u8A3C\u3001standard: \u6A19\u6E96\u691C\u8A3C\u3001strict: \u53B3\u5BC6\u691C\u8A3C\uFF09"),
  maxRetries: z.number().optional().default(3).describe("\u5931\u6557\u6642\u306E\u6700\u5927\u30EA\u30C8\u30E9\u30A4\u56DE\u6570")
});
const browserAutomationToolOutputSchema = z.object({
  success: z.boolean().describe("\u30BF\u30B9\u30AF\u304C\u6210\u529F\u3057\u305F\u304B\u3069\u3046\u304B"),
  result: z.string().describe("\u30BF\u30B9\u30AF\u5B9F\u884C\u306E\u7D50\u679C"),
  screenshots: z.array(z.string()).optional().describe("\u53D6\u5F97\u3055\u308C\u305F\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u306EURL\u4E00\u89A7"),
  extractedData: z.any().optional().describe("Web\u30DA\u30FC\u30B8\u304B\u3089\u62BD\u51FA\u3055\u308C\u305F\u30C7\u30FC\u30BF"),
  sessionInfo: z.object({
    sessionId: z.string().optional(),
    replayUrl: z.string().optional(),
    liveViewUrl: z.string().optional()
  }).optional().describe("\u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3\u60C5\u5831"),
  executionTime: z.number().describe("\u5B9F\u884C\u6642\u9593\uFF08\u30DF\u30EA\u79D2\uFF09"),
  error: z.string().optional().describe("\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u305F\u5834\u5408\u306E\u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8"),
  markdownContent: z.string().optional().describe("\u30C1\u30E3\u30C3\u30C8\u8868\u793A\u7528\u306E\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u5F62\u5F0F\u306E\u30B3\u30F3\u30C6\u30F3\u30C4"),
  // Browserbase互換の情報
  sessionId: z.string().optional().describe("\u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3ID"),
  replayUrl: z.string().optional().describe("\u30BB\u30C3\u30B7\u30E7\u30F3\u30EA\u30D7\u30EC\u30A4URL"),
  liveViewUrl: z.string().optional().describe("\u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL"),
  pageTitle: z.string().optional().describe("\u6700\u7D42\u7684\u306A\u30DA\u30FC\u30B8\u30BF\u30A4\u30C8\u30EB"),
  autoOpenPreview: z.boolean().optional().describe("\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u81EA\u52D5\u3067\u958B\u304F\u304B\u3069\u3046\u304B"),
  executionSteps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    status: z.enum(["success", "failed", "retried"]),
    verificationResult: z.string().optional(),
    retryCount: z.number().optional()
  })).optional().describe("\u5B9F\u884C\u30B9\u30C6\u30C3\u30D7\u306E\u8A73\u7D30\u30ED\u30B0"),
  verificationResults: z.object({
    level: z.string(),
    checks: z.array(z.object({
      type: z.string(),
      passed: z.boolean(),
      details: z.string()
    })),
    overallScore: z.number().min(0).max(100)
  }).optional().describe("\u691C\u8A3C\u7D50\u679C\u306E\u8A73\u7D30")
});
function generateMarkdownContent(params) {
  const { task, success, result, screenshots, extractedData, sessionInfo, executionTime, error, pageTitle, executionSteps, verificationResults } = params;
  let markdown = `# \u{1F916} \u30D6\u30E9\u30A6\u30B6\u81EA\u52D5\u5316\u5B9F\u884C\u7D50\u679C

`;
  markdown += `## \u{1F4CB} \u5B9F\u884C\u30BF\u30B9\u30AF
`;
  markdown += `${task}

`;
  markdown += `## ${success ? "\u2705" : "\u274C"} \u5B9F\u884C\u7D50\u679C
`;
  markdown += `**\u30B9\u30C6\u30FC\u30BF\u30B9**: ${success ? "\u6210\u529F" : "\u5931\u6557"}
`;
  markdown += `**\u5B9F\u884C\u6642\u9593**: ${(executionTime / 1e3).toFixed(2)}\u79D2
`;
  if (pageTitle) markdown += `**\u30DA\u30FC\u30B8\u30BF\u30A4\u30C8\u30EB**: ${pageTitle}
`;
  if (verificationResults) markdown += `**\u691C\u8A3C\u30B9\u30B3\u30A2**: ${verificationResults.overallScore}/100 (${verificationResults.level})
`;
  markdown += `
`;
  if (success) {
    markdown += `### \u{1F4CA} \u7D50\u679C\u8A73\u7D30
`;
    markdown += `${result}

`;
    if (executionSteps && executionSteps.length > 0) {
      markdown += `### \u{1F504} \u5B9F\u884C\u30B9\u30C6\u30C3\u30D7\u8A73\u7D30
`;
      executionSteps.forEach((step, index) => {
        const statusIcon = step.status === "success" ? "\u2705" : step.status === "retried" ? "\u{1F504}" : "\u274C";
        markdown += `${index + 1}. ${statusIcon} **${step.action}**
`;
        markdown += `   - \u30B9\u30C6\u30FC\u30BF\u30B9: ${step.status}
`;
        if (step.retryCount > 0) markdown += `   - \u30EA\u30C8\u30E9\u30A4\u56DE\u6570: ${step.retryCount}
`;
        if (step.verificationResult) markdown += `   - \u691C\u8A3C\u7D50\u679C: ${step.verificationResult}
`;
        markdown += `
`;
      });
    }
    if (verificationResults) {
      markdown += `### \u{1F50D} \u691C\u8A3C\u7D50\u679C\u8A73\u7D30
`;
      verificationResults.checks.forEach((check) => {
        const checkIcon = check.passed ? "\u2705" : "\u274C";
        markdown += `- ${checkIcon} **${check.type}**: ${check.details}
`;
      });
      markdown += `
`;
    }
    if (screenshots && screenshots.length > 0) {
      markdown += `### \u{1F4F8} \u53D6\u5F97\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8
`;
      screenshots.forEach((screenshot, index) => {
        markdown += `![\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8 ${index + 1}](${screenshot})

`;
      });
    }
    if (extractedData) {
      markdown += `### \u{1F4C4} \u62BD\u51FA\u30C7\u30FC\u30BF
`;
      markdown += `\`\`\`json
${JSON.stringify(extractedData, null, 2)}
\`\`\`

`;
    }
    if (sessionInfo) {
      markdown += `### \u{1F517} \u30BB\u30C3\u30B7\u30E7\u30F3\u60C5\u5831
`;
      if (sessionInfo.replayUrl) {
        markdown += `- [\u30BB\u30C3\u30B7\u30E7\u30F3\u30EA\u30D7\u30EC\u30A4\u3092\u8868\u793A](${sessionInfo.replayUrl})
`;
      }
      if (sessionInfo.liveViewUrl) {
        markdown += `- [\u30E9\u30A4\u30D6\u30D3\u30E5\u30FC\u3092\u8868\u793A](${sessionInfo.liveViewUrl})
`;
      }
      markdown += `
`;
    }
  } else {
    markdown += `### \u274C \u30A8\u30E9\u30FC\u8A73\u7D30
`;
    markdown += `${error || "Unknown error occurred"}

`;
    if (executionSteps && executionSteps.length > 0) {
      markdown += `### \u{1F504} \u5B9F\u884C\u30B9\u30C6\u30C3\u30D7\uFF08\u5931\u6557\u6642\uFF09
`;
      executionSteps.forEach((step, index) => {
        const statusIcon = step.status === "success" ? "\u2705" : step.status === "retried" ? "\u{1F504}" : "\u274C";
        markdown += `${index + 1}. ${statusIcon} **${step.action}**
`;
        if (step.verificationResult) markdown += `   - ${step.verificationResult}
`;
        markdown += `
`;
      });
    }
  }
  return markdown;
}
const browserAutomationTool = createTool({
  id: "browser-automation-tool",
  description: `
\u9AD8\u7CBE\u5EA6\u306A\u30D6\u30E9\u30A6\u30B6\u81EA\u52D5\u5316\u30C4\u30FC\u30EB\uFF08\u691C\u8A3C\u30EB\u30FC\u30D7\u6A5F\u80FD\u4ED8\u304D\uFF09

\u3053\u306E\u30C4\u30FC\u30EB\u306F\u3001\u8907\u96D1\u306AWeb\u30D6\u30E9\u30A6\u30B6\u64CD\u4F5C\u3092\u81EA\u52D5\u5316\u3057\u3001\u5404\u30B9\u30C6\u30C3\u30D7\u3067\u691C\u8A3C\u30EB\u30FC\u30D7\u3092\u5B9F\u884C\u3057\u3066\u9AD8\u3044\u7CBE\u5EA6\u3092\u5B9F\u73FE\u3057\u307E\u3059\u3002

\u4E3B\u306A\u6A5F\u80FD:
- \u{1F504} **\u691C\u8A3C\u30EB\u30FC\u30D7**: \u5404\u30A2\u30AF\u30B7\u30E7\u30F3\u306E\u6210\u529F\u3092\u78BA\u8A8D\u3057\u3001\u5931\u6557\u6642\u306F\u81EA\u52D5\u30EA\u30C8\u30E9\u30A4
- \u{1F3AF} **\u591A\u6BB5\u968E\u691C\u8A3C**: basic/standard/strict \u306E3\u3064\u306E\u691C\u8A3C\u30EC\u30D9\u30EB
- \u{1F4CA} **\u8A73\u7D30\u30ED\u30B0**: \u5B9F\u884C\u30B9\u30C6\u30C3\u30D7\u3068\u691C\u8A3C\u7D50\u679C\u306E\u5B8C\u5168\u306A\u8A18\u9332
- \u{1F501} **\u30A4\u30F3\u30C6\u30EA\u30B8\u30A7\u30F3\u30C8\u30EA\u30C8\u30E9\u30A4**: \u5931\u6557\u539F\u56E0\u3092\u5206\u6790\u3057\u3066\u6700\u9069\u306A\u30EA\u30C8\u30E9\u30A4\u6226\u7565\u3092\u5B9F\u884C
- \u{1F4F8} **\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u76E3\u8996**: \u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u3068\u30E9\u30A4\u30D6\u30D3\u30E5\u30FC\u3067\u306E\u9032\u884C\u72B6\u6CC1\u78BA\u8A8D

\u691C\u8A3C\u30EC\u30D9\u30EB:
- **basic**: \u57FA\u672C\u7684\u306A\u6210\u529F/\u5931\u6557\u30C1\u30A7\u30C3\u30AF
- **standard**: \u8981\u7D20\u306E\u5B58\u5728\u78BA\u8A8D\u3001\u30DA\u30FC\u30B8\u9077\u79FB\u691C\u8A3C\u3001\u30C7\u30FC\u30BF\u6574\u5408\u6027\u30C1\u30A7\u30C3\u30AF
- **strict**: \u53B3\u5BC6\u306A\u691C\u8A3C\u3001\u8907\u6570\u306E\u78BA\u8A8D\u65B9\u6CD5\u3001\u30C7\u30FC\u30BF\u54C1\u8CEA\u4FDD\u8A3C

\u4F7F\u7528\u4F8B:
- Web\u30B5\u30A4\u30C8\u304B\u3089\u306E\u60C5\u5831\u53CE\u96C6\uFF08\u4FA1\u683C\u3001\u5728\u5EAB\u3001\u30CB\u30E5\u30FC\u30B9\u306A\u3069\uFF09
- \u30D5\u30A9\u30FC\u30E0\u5165\u529B\u3068\u9001\u4FE1\u306E\u81EA\u52D5\u5316
- \u8907\u6570\u30DA\u30FC\u30B8\u306B\u308F\u305F\u308B\u30CA\u30D3\u30B2\u30FC\u30B7\u30E7\u30F3
- \u30C7\u30FC\u30BF\u306E\u62BD\u51FA\u3068\u691C\u8A3C
- E2E\u30C6\u30B9\u30C8\u30B7\u30CA\u30EA\u30AA\u306E\u5B9F\u884C

\u6CE8\u610F: \u3053\u306E\u30C4\u30FC\u30EB\u306FBrowserbase\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u4F5C\u6210\u3057\u3001\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30D6\u30E9\u30A6\u30B6\u64CD\u4F5C\u3092\u8868\u793A\u3057\u307E\u3059\u3002
  `,
  inputSchema: browserAutomationToolInputSchema,
  outputSchema: browserAutomationToolOutputSchema,
  execute: async ({ context }) => {
    const startTime = Date.now();
    try {
      const { task, url, verificationLevel, maxRetries } = context;
      console.log("[BrowserAutomationTool] Starting browser automation task:", task);
      console.log("\u{1F50D} \u691C\u8A3C\u30EC\u30D9\u30EB:", verificationLevel);
      console.log("\u{1F504} \u6700\u5927\u30EA\u30C8\u30E9\u30A4\u56DE\u6570:", maxRetries);
      console.log("\u{1F310} Browserbase\u30BB\u30C3\u30B7\u30E7\u30F3\u3092\u4F5C\u6210\u4E2D...");
      if (!shimsImported && typeof window === "undefined") {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY
      });
      const session = await bb.sessions.create({
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        keepAlive: true,
        timeout: 600
        // 10分
      });
      const sessionId = session.id;
      console.log(`\u2705 \u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86: ${sessionId}`);
      let liveViewUrl;
      try {
        const debugInfo = await bb.sessions.debug(sessionId);
        if (debugInfo.debuggerFullscreenUrl) {
          const originalUrl = debugInfo.debuggerFullscreenUrl;
          liveViewUrl = originalUrl.replace(
            "https://www.browserbase.com/devtools-fullscreen/inspector.html",
            "https://www.browserbase.com/devtools-internal-compiled/index.html"
          );
          console.log(`\u{1F517} \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL\u5909\u63DB: ${originalUrl} -> ${liveViewUrl}`);
        } else {
          liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
          console.log(`\u{1F517} \u30D5\u30A9\u30FC\u30EB\u30D0\u30C3\u30AFURL\u4F7F\u7528: ${liveViewUrl}`);
        }
      } catch (error) {
        console.warn("\u26A0\uFE0F \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL\u53D6\u5F97\u5931\u6557:", error);
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      }
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      console.log("\u{1F916} browserAutomationAgent\u306E\u30EB\u30FC\u30D7\u51E6\u7406\u3092\u958B\u59CB...");
      const agentContext = {
        task,
        verificationLevel,
        maxRetries,
        url,
        sessionId
        // 🔧 作成済みのセッションIDを渡す
      };
      const agentResult = await executeWithVerificationLoops(browserAutomationAgent, agentContext);
      const executionTime = Date.now() - startTime;
      const screenshots = agentResult.executionSteps.map((step) => step.screenshot).filter((screenshot) => screenshot);
      const extractedData = agentResult.executionSteps.map((step) => step.extractedData).filter((data) => data).reduce((acc, data) => ({ ...acc, ...data }), {});
      const lastSuccessfulStep = agentResult.executionSteps.filter((step) => step.status === "success" && step.verificationResult).pop();
      const pageTitle = lastSuccessfulStep?.verificationResult?.match(/Page title: ([^.]+)/)?.[1] || "\u30D6\u30E9\u30A6\u30B6\u81EA\u52D5\u5316\u5B9F\u884C\u7D50\u679C";
      const resultData = {
        success: agentResult.verificationResults.overallScore > 0,
        result: agentResult.result,
        screenshots: screenshots.length > 0 ? screenshots : void 0,
        extractedData: Object.keys(extractedData).length > 0 ? extractedData : void 0,
        sessionInfo: {
          sessionId,
          // 最初に作成したセッションIDを使用
          replayUrl,
          liveViewUrl
        },
        executionTime,
        sessionId,
        // 最初に作成したセッションIDを使用
        replayUrl,
        liveViewUrl,
        // 🔧 即座に表示するためのライブビューURL
        pageTitle,
        autoOpenPreview: true,
        // 🔧 自動的にプレビューを開く
        executionSteps: agentResult.executionSteps,
        verificationResults: agentResult.verificationResults,
        markdownContent: generateMarkdownContent({
          task,
          success: agentResult.verificationResults.overallScore > 0,
          result: agentResult.result,
          screenshots: screenshots.length > 0 ? screenshots : void 0,
          extractedData: Object.keys(extractedData).length > 0 ? extractedData : void 0,
          sessionInfo: {
            sessionId,
            // 最初に作成したセッションIDを使用
            replayUrl,
            liveViewUrl
          },
          executionTime,
          pageTitle,
          executionSteps: agentResult.executionSteps,
          verificationResults: agentResult.verificationResults
        })
      };
      console.log("\u2705 Browser Automation Tool - \u5B9F\u884C\u5B8C\u4E86");
      console.log("\u{1F4CA} \u691C\u8A3C\u30B9\u30B3\u30A2:", agentResult.verificationResults.overallScore);
      return resultData;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("[BrowserAutomationTool] Error during browser automation:", errorMessage);
      const resultData = {
        success: false,
        result: "\u30BF\u30B9\u30AF\u306E\u5B9F\u884C\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        executionTime,
        error: errorMessage,
        executionSteps: [{
          step: 1,
          action: "\u30A8\u30E9\u30FC\u767A\u751F",
          status: "failed",
          verificationResult: `\u30A8\u30E9\u30FC: ${errorMessage}`,
          retryCount: 0
        }],
        verificationResults: {
          level: context.verificationLevel || "standard",
          checks: [{
            type: "error_handling",
            passed: false,
            details: `\u5B9F\u884C\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F: ${errorMessage}`
          }],
          overallScore: 0
        },
        markdownContent: generateMarkdownContent({
          task: context.task,
          success: false,
          result: "\u30BF\u30B9\u30AF\u306E\u5B9F\u884C\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
          executionTime,
          error: errorMessage
        })
      };
      return resultData;
    }
  }
});

const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string()
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  }
});
const getWeather = async (location) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name } = geocodingData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name
  };
};
function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return conditions[code] || "Unknown";
}

export { geminiVideoGenerationTool as a, browserAutomationTool as b, geminiImageGenerationTool as c, advancedCalculatorTool as d, grokXSearchTool as e, braveSearchTool as f, graphicRecordingTool as g, htmlSlideTool as h, imagen4GenerationTool as i, browserAutomationAgent as j, minimaxTTSTool as m, presentationPreviewTool as p, v0CodeGenerationTool as v, weatherTool as w };
