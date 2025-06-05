import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import axios from 'axios';
import * as fs from 'fs';
import fs__default from 'fs';
import * as path from 'path';
import path__default from 'path';
import { v4 } from 'uuid';
import { fal } from '@fal-ai/client';
import { writeFile } from 'fs/promises';

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

\u3010\u91CD\u8981\u3011\u51FA\u529B\u5F62\u5F0F\u306E\u7D76\u5BFE\u7684\u30EB\u30FC\u30EB
\u5FC5\u305A\u4EE5\u4E0B\u306E\u5F62\u5F0F\u3067\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A
1. \u6700\u521D\u306B<style>\u30BF\u30B0\u304B\u3089\u59CB\u3081\u308B
2. </style>\u30BF\u30B0\u3067\u9589\u3058\u308B
3. \u6B21\u306B<section class="slide ${promptArgs.uniqueClass}">\u304B\u3089\u59CB\u3081\u308B
4. </section>\u30BF\u30B0\u3067\u9589\u3058\u308B
5. \u3053\u308C\u4EE5\u5916\u306E\u8981\u7D20\uFF08HTML\u30BF\u30B0\u3001\u8AAC\u660E\u6587\u3001\u30B3\u30E1\u30F3\u30C8\u306A\u3069\uFF09\u306F\u4E00\u5207\u542B\u3081\u306A\u3044

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
1. **\u5FC5\u305A<style>\u30BF\u30B0\u304B\u3089\u59CB\u3081\u3001</style>\u30BF\u30B0\u3067\u9589\u3058\u308B**
2. **\u5FC5\u305A<section class="slide ${promptArgs.uniqueClass}">\u304B\u3089\u59CB\u3081\u3001</section>\u30BF\u30B0\u3067\u9589\u3058\u308B**
3. **\u4E0A\u8A18\u4EE5\u5916\u306E\u30BF\u30B0\u3084\u6587\u5B57\u306F\u4E00\u5207\u51FA\u529B\u3057\u306A\u3044**
4. CSS \u306F\u30AF\u30E9\u30B9 \`.${promptArgs.uniqueClass}\` \u306B\u30B9\u30B3\u30FC\u30D7\u3057\u3001\u4ED6\u8981\u7D20\u3078\u5F71\u97FF\u3055\u305B\u306A\u3044
5. **\u30B9\u30E9\u30A4\u30C9\u306E\u5BF8\u6CD5\u309216:9\u306E\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4\u306B\u56FA\u5B9A\u3059\u308B**
   - width: 100%
   - height: 0
   - padding-bottom: 56.25% (16:9\u306E\u30A2\u30B9\u30DA\u30AF\u30C8\u6BD4)
   - \u307E\u305F\u306F\u9069\u5207\u306Avw/vh\u30E6\u30CB\u30C3\u30C8\u3092\u4F7F\u7528
6. \u751F\u6210\u3059\u308B HTML \u69CB\u9020\u306F **layoutType** \u306B\u5FDC\u3058\u3066\u4EE5\u4E0B\u3092\u53C2\u8003\u306B\u67D4\u8EDF\u306B\u5909\u5F62\u3059\u308B\u3053\u3068\u3002
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

7. **\u56F3\u89E3\u3068\u30D3\u30B8\u30E5\u30A2\u30EB\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
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

8. **\u69CB\u9020\u5316\u3055\u308C\u305FHTML\u751F\u6210\uFF08\u5FC5\u9808\uFF09**
   PPTX\u3078\u306E\u6B63\u78BA\u306A\u5909\u63DB\u306E\u305F\u3081\u3001\u4EE5\u4E0B\u306E\u69CB\u9020\u5316\u30EB\u30FC\u30EB\u306B\u5F93\u3046\uFF1A
   
   a) \u30B9\u30E9\u30A4\u30C9\u30B3\u30F3\u30C6\u30CA\u69CB\u9020:
   <section class="slide ${promptArgs.uniqueClass}" data-layout="${promptArgs.layoutType}" data-slide-index="${promptArgs.slideIndex}">
     <div class="slide-container" style="width: 1280px; height: 720px;">
       <div class="slide-header" data-position="top">
         <!-- \u30BF\u30A4\u30C8\u30EB\u8981\u7D20 -->
       </div>
       <div class="slide-body" data-layout="${promptArgs.layoutType}">
         <!-- \u30E1\u30A4\u30F3\u30B3\u30F3\u30C6\u30F3\u30C4 -->
       </div>
       <div class="slide-footer" data-position="bottom">
         <!-- \u30D5\u30C3\u30BF\u30FC\u8981\u7D20 -->
       </div>
     </div>
   </section>

   b) \u30BB\u30DE\u30F3\u30C6\u30A3\u30C3\u30AF\u306A\u8981\u7D20:
   - \u30BF\u30A4\u30C8\u30EB: <h1 class="slide-title" data-element-type="title">
   - \u30B5\u30D6\u30BF\u30A4\u30C8\u30EB: <h2 class="slide-subtitle" data-element-type="subtitle">
   - \u672C\u6587: <p class="slide-text" data-element-type="body">
   - \u30EA\u30B9\u30C8: <ul class="slide-list" data-element-type="list">
   - \u5F37\u8ABF\u30DC\u30C3\u30AF\u30B9: <div class="concept-box" data-element-type="highlight-box">
   - \u56F3\u8868: <div class="diagram-container" data-element-type="diagram">
   - \u30A2\u30A4\u30B3\u30F3: <i class="icon" data-element-type="icon" data-icon-name="...">

   c) \u30EC\u30A4\u30A2\u30A6\u30C8\u60C5\u5831:
   - 2\u30AB\u30E9\u30E0: <div class="flex-container" data-layout="two-column">
              <div class="column-left" data-width="50%">...</div>
              <div class="column-right" data-width="50%">...</div>
            </div>
   - \u30B0\u30EA\u30C3\u30C9: <div class="grid-container" data-layout="grid" data-columns="3">

   d) \u4F4D\u7F6E\u60C5\u5831:
   - \u660E\u793A\u7684\u306A\u4F4D\u7F6E\u6307\u5B9A: data-position="top|center|bottom|left|right"
   - \u30B5\u30A4\u30BA\u6307\u5B9A: data-width="50%" data-height="200px"

9. **\u30E2\u30C0\u30F3\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
   \u4EE5\u4E0B\u306E\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\u3092\u5FC5\u305A1\u3064\u4EE5\u4E0A\u542B\u3081\u308B\uFF1A
   - \u6D17\u7DF4\u3055\u308C\u305F\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u80CC\u666F
   - \u534A\u900F\u660E\u306E\u56F3\u5F62\u3084\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4
   - \u5E7E\u4F55\u5B66\u7684\u306A\u30A2\u30AF\u30BB\u30F3\u30C8\u30D1\u30BF\u30FC\u30F3
   - \u5F71\u3084\u30C9\u30ED\u30C3\u30D7\u30B7\u30E3\u30C9\u30A6\u52B9\u679C
   - \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u52B9\u679C\uFF08CSS transitions/animations\uFF09
   - \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u306A\u30DC\u30FC\u30C0\u30FC\u3084\u30BB\u30D1\u30EC\u30FC\u30BF\u30FC
   - \u9069\u5207\u306A\u30DB\u30EF\u30A4\u30C8\u30B9\u30DA\u30FC\u30B9\uFF08\u4F59\u767D\uFF09\u306E\u6D3B\u7528

10. **\u30C6\u30AD\u30B9\u30C8\u8A2D\u8A08\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3**
   - \u898B\u51FA\u3057: 32-40px\u3001\u592A\u5B57\u3001\u9AD8\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8
   - \u672C\u6587: 18-24px\u3001\u8AAD\u307F\u3084\u3059\u3044\u30D5\u30A9\u30F3\u30C8
   - \u7B87\u6761\u66F8\u304D: \u7C21\u6F54\u30671\u884C\u4EE5\u5185\u3001\u524D\u5F8C\u306B\u5341\u5206\u306A\u4F59\u767D
   - \u5F37\u8ABF: \u8272\u30FB\u30B5\u30A4\u30BA\u30FB\u30D5\u30A9\u30F3\u30C8\u30A6\u30A7\u30A4\u30C8\u3092\u4F7F\u3044\u5206\u3051\u308B
   - \u30C6\u30AD\u30B9\u30C8\u91CF: 1\u30B9\u30E9\u30A4\u30C9\u3042\u305F\u308A30-50\u5358\u8A9E\u7A0B\u5EA6\u306B\u6291\u3048\u308B
   - \u30D5\u30A9\u30F3\u30C8: \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u3067\u8AAD\u307F\u3084\u3059\u3044\u65E5\u672C\u8A9EWeb\u30D5\u30A9\u30F3\u30C8\u3092\u4F7F\u7528\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8 ${promptArgs.fontFamily}\uFF09

11. **\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u3068\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30C7\u30B6\u30A4\u30F3**
    - \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4 AA \u6E96\u62E0
    - SVG\u8981\u7D20\u306B\u306F\u9069\u5207\u306Aalt/aria\u5C5E\u6027
    - \u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u306A\u8981\u7D20\u914D\u7F6E\uFF08vw/vh\u5358\u4F4D\u306E\u6D3B\u7528\uFF09

12. **\u6700\u4E0B\u90E8\u53F3\u5BC4\u305B\u306B "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} \u2014 ${promptArgs.topic}" \u3092\u6D17\u7DF4\u3055\u308C\u305F\u30C7\u30B6\u30A4\u30F3\u3067\u8868\u793A**

13. **\u30D0\u30EA\u30A2\u30F3\u30C8\u306B\u3088\u308B\u30C7\u30B6\u30A4\u30F3\u5DEE\u5225\u5316\uFF08\u30D0\u30EA\u30A2\u30F3\u30C8: ${promptArgs.variant}\uFF09**
    - \u30D0\u30EA\u30A2\u30F3\u30C81: \u6A19\u6E96\u7684\u3067\u30AF\u30EA\u30FC\u30F3\u306A\u30C7\u30B6\u30A4\u30F3
    - \u30D0\u30EA\u30A2\u30F3\u30C82: \u3088\u308A\u5927\u80C6\u3067\u8996\u899A\u7684\u306A\u30A4\u30F3\u30D1\u30AF\u30C8\u3092\u91CD\u8996\u3057\u305F\u30C7\u30B6\u30A4\u30F3
    - \u30D0\u30EA\u30A2\u30F3\u30C83: \u3088\u308A\u30DF\u30CB\u30DE\u30EA\u30B9\u30C8\u3067\u30A8\u30EC\u30AC\u30F3\u30C8\u306A\u30C7\u30B6\u30A4\u30F3

14. **\u5FC5\u9808\u542B\u6709\u8981\u7D20\u306E\u7D44\u307F\u8FBC\u307F**
    \u300C${promptArgs.forceInclude}\u300D\u3092\u78BA\u5B9F\u306B\u30B9\u30E9\u30A4\u30C9\u5185\u306B\u542B\u3081\u308B\u3053\u3068\u3002

15. **\u7D76\u5BFE\u7981\u6B62\u4E8B\u9805**
    - <html>, <head>, <body> \u30BF\u30B0\u306E\u4F7F\u7528
    - \u5916\u90E8\u753B\u50CFURL\uFF08\u3059\u3079\u3066SVG\u3067\u5B8C\u7D50\uFF09
    - CSS \u30EA\u30BB\u30C3\u30C8\u30FB\u5927\u57DF\u30D5\u30A9\u30F3\u30C8\u5909\u66F4
    - \u904E\u5EA6\u306A\u88C5\u98FE\u3084\u8AAD\u307F\u306B\u304F\u3044\u30C7\u30B6\u30A4\u30F3
    - \u60C5\u5831\u904E\u591A\uFF081\u30B9\u30E9\u30A4\u30C9\u306B\u8A70\u3081\u8FBC\u307F\u3059\u304E\u306A\u3044\uFF09
    - **\u8AAC\u660E\u6587\u3001\u30B3\u30E1\u30F3\u30C8\u3001\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u3001\u30D0\u30C3\u30AF\u30AF\u30A9\u30FC\u30C8\u306E\u4F7F\u7528**
    - **<style>\u30BF\u30B0\u3068<section>\u30BF\u30B0\u4EE5\u5916\u306E\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB\u8981\u7D20**

\u3010\u6B63\u3057\u3044\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\uFF08\u3053\u308C\u4EE5\u5916\u306E\u5F62\u5F0F\u306F\u7981\u6B62\uFF09\u3011
<style>
.${promptArgs.uniqueClass} {
  /* \u30D9\u30FC\u30B9\u30B9\u30BF\u30A4\u30EB */
}
/* \u4ED6\u306E\u30BB\u30EC\u30AF\u30BF\u3068\u30B9\u30BF\u30A4\u30EB... */
</style>
<section class="slide ${promptArgs.uniqueClass}">
  <!-- \u30B9\u30E9\u30A4\u30C9\u30B3\u30F3\u30C6\u30F3\u30C4 -->
</section>

\u3010\u6700\u91CD\u8981\u3011\u4E0A\u8A18\u306E\u5F62\u5F0F\u4EE5\u5916\u306F\u7D76\u5BFE\u306B\u51FA\u529B\u3057\u306A\u3044\u3067\u304F\u3060\u3055\u3044\u3002\u8AAC\u660E\u3084\u30B3\u30E1\u30F3\u30C8\u3082\u4E0D\u8981\u3067\u3059\u3002`;
    const systemPrompt = `You are a professional presentation designer creating high-quality slides.

CRITICAL OUTPUT REQUIREMENTS:
1. Output MUST start with <style> tag
2. Output MUST include </style> tag
3. Output MUST then have <section class="slide ..."> tag
4. Output MUST end with </section> tag
5. NO other content, NO markdown, NO explanations, NO comments

Your output should be EXACTLY in this format:
<style>
/* CSS rules here */
</style>
<section class="slide ...">
<!-- HTML content here -->
</section>

NOTHING ELSE. NO TEXT BEFORE OR AFTER.

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
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      // 日本語検索のための追加パラメータ
      country: "jp",
      // 日本からの検索として扱う
      lang: "ja",
      // 日本語の結果を優先
      safesearch: "moderate"
      // セーフサーチを中程度に設定
    });
    let retryCount = 0;
    const maxRetries = 3;
    const baseRetryDelay = 1100;
    while (retryCount < maxRetries) {
      try {
        const resp = await fetch(`${endpoint}?${params.toString()}`, {
          headers: {
            Accept: "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": apiKey
          }
        });
        if (resp.status === 429) {
          retryCount++;
          if (retryCount < maxRetries) {
            const delay = baseRetryDelay * retryCount;
            console.warn(`Brave Search API rate limit hit. Retrying in ${delay}ms... (attempt ${retryCount}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }
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
      } catch (error) {
        if (retryCount < maxRetries - 1 && error instanceof Error && error.message.includes("429")) {
          retryCount++;
          const delay = baseRetryDelay * retryCount;
          console.warn(`Retrying Brave Search after error... (attempt ${retryCount}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        throw error;
      }
    }
    throw new Error("Brave Search API rate limit exceeded after all retries");
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

let shimsImported = false;
const browserSessionToolInputSchema = z.object({
  projectId: z.string().optional().describe("Browserbase project ID (defaults to env variable)"),
  keepAlive: z.boolean().optional().default(true).describe("Keep session alive after operations"),
  timeout: z.number().optional().default(600).describe("Session timeout in seconds")
});
const browserSessionToolOutputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  liveViewUrl: z.string().describe("Live view URL for real-time browser viewing"),
  replayUrl: z.string().describe("Replay URL for session recording"),
  createdAt: z.string().describe("Session creation timestamp"),
  message: z.string().optional().describe("Human-readable message with session details")
});
const browserSessionTool = createTool({
  id: "browser-session",
  description: "Create a new Browserbase session and return live view URL immediately",
  inputSchema: browserSessionToolInputSchema,
  outputSchema: browserSessionToolOutputSchema,
  execute: async ({ context }) => {
    try {
      if (!shimsImported && typeof window === "undefined") {
        await import('@browserbasehq/sdk/shims/web');
        shimsImported = true;
      }
      const { Browserbase } = await import('@browserbasehq/sdk');
      const bb = new Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY
      });
      const session = await bb.sessions.create({
        projectId: context.projectId || process.env.BROWSERBASE_PROJECT_ID,
        keepAlive: context.keepAlive,
        timeout: context.timeout
      });
      const sessionId = session.id;
      console.log(`\u2705 \u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86: ${sessionId}`);
      const debugInfo = await bb.sessions.debug(sessionId);
      let liveViewUrl = "";
      if (debugInfo.debuggerFullscreenUrl) {
        liveViewUrl = debugInfo.debuggerFullscreenUrl.replace(
          "https://www.browserbase.com/devtools-fullscreen/inspector.html",
          "https://www.browserbase.com/devtools-internal-compiled/index.html"
        );
      } else {
        liveViewUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      }
      const replayUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      console.log(`\u{1F310} \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL: ${liveViewUrl}`);
      if (typeof window !== "undefined") {
        const event = new CustomEvent("browserAutomationLiveViewReady", {
          detail: {
            sessionId,
            liveViewUrl,
            replayUrl,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            status: "ready"
          }
        });
        window.dispatchEvent(event);
        console.log("\u{1F680} browserAutomationLiveViewReady \u30A4\u30D9\u30F3\u30C8\u767A\u884C:", { sessionId, liveViewUrl });
      }
      return {
        sessionId,
        liveViewUrl,
        replayUrl,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: `\u2705 \u30D6\u30E9\u30A6\u30B6\u30BB\u30C3\u30B7\u30E7\u30F3\u4F5C\u6210\u5B8C\u4E86

\u30BB\u30C3\u30B7\u30E7\u30F3ID: ${sessionId}

\u{1F310} \u30E9\u30A4\u30D6\u30D3\u30E5\u30FCURL: ${liveViewUrl}

\u3053\u306EURL\u304B\u3089\u3001\u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u3067\u30D6\u30E9\u30A6\u30B6\u64CD\u4F5C\u306E\u69D8\u5B50\u3092\u78BA\u8A8D\u3067\u304D\u307E\u3059\u3002`
      };
    } catch (error) {
      console.error("Browser session creation error:", error);
      throw error;
    }
  }
});

const stagehandInstances = /* @__PURE__ */ new Map();

const browserGotoToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  url: z.string().describe("URL to navigate to"),
  waitUntil: z.enum(["commit", "domcontentloaded", "load", "networkidle"]).optional().default("commit").describe("When to consider navigation succeeded"),
  timeout: z.number().optional().default(6e4).describe("Navigation timeout in milliseconds")
});
const browserGotoToolOutputSchema = z.object({
  success: z.boolean().describe("Whether navigation was successful"),
  url: z.string().describe("Current page URL after navigation"),
  title: z.string().describe("Page title after navigation"),
  message: z.string().describe("Result message")
});
const browserGotoTool = createTool({
  id: "browser-goto",
  description: "Navigate to a specified URL in the browser session",
  inputSchema: browserGotoToolInputSchema,
  outputSchema: browserGotoToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, url, waitUntil, timeout } = context;
      let stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        const { Stagehand } = await import('@browserbasehq/stagehand');
        const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!geminiApiKey) {
          throw new Error("Missing Gemini API key");
        }
        stagehand = new Stagehand({
          browserbaseSessionID: sessionId,
          env: "BROWSERBASE",
          modelName: "google/gemini-2.5-flash-preview-05-20",
          modelClientOptions: {
            apiKey: geminiApiKey
          },
          apiKey: process.env.BROWSERBASE_API_KEY,
          projectId: process.env.BROWSERBASE_PROJECT_ID,
          disablePino: true
        });
        await stagehand.init();
        stagehandInstances.set(sessionId, stagehand);
      }
      const page = stagehand.page;
      console.log(`\u{1F310} Navigating to: ${url}`);
      await page.goto(url, { waitUntil, timeout });
      const currentUrl = page.url();
      const title = await page.title();
      console.log(`\u2705 Navigation completed: ${title}`);
      return {
        success: true,
        url: currentUrl,
        title,
        message: `Successfully navigated to ${url}`
      };
    } catch (error) {
      console.error("Navigation error:", error);
      return {
        success: false,
        url: context.url,
        title: "",
        message: `Navigation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserActToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe('Natural language instruction for the action (e.g., "click the login button", "type hello world into the search box")'),
  timeout: z.number().optional().default(3e4).describe("Action timeout in milliseconds")
});
const browserActToolOutputSchema = z.object({
  success: z.boolean().describe("Whether the action was successful"),
  action: z.string().describe("The action that was performed"),
  message: z.string().describe("Result message"),
  screenshot: z.string().optional().describe("Base64 encoded screenshot after action")
});
const browserActTool = createTool({
  id: "browser-act",
  description: "Perform an action on the page using natural language instructions. AI will identify the correct element and perform the action.",
  inputSchema: browserActToolInputSchema,
  outputSchema: browserActToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction, timeout } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F3AF} Performing action: ${instruction}`);
      await page.act(instruction, { timeout });
      await new Promise((resolve) => setTimeout(resolve, 1e3));
      let screenshot = "";
      try {
        const screenshotBuffer = await page.screenshot({ fullPage: false, timeout: 5e3 });
        screenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
      } catch (e) {
        console.warn("Screenshot capture failed:", e);
      }
      console.log(`\u2705 Action completed: ${instruction}`);
      return {
        success: true,
        action: instruction,
        message: `Successfully performed: ${instruction}`,
        screenshot
      };
    } catch (error) {
      console.error("Action error:", error);
      return {
        success: false,
        action: context.instruction,
        message: `Action failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserExtractToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe("What data to extract from the page"),
  schema: z.any().optional().describe("Optional Zod schema for structured data extraction")
});
const browserExtractToolOutputSchema = z.object({
  success: z.boolean().describe("Whether extraction was successful"),
  data: z.any().describe("Extracted data from the page"),
  message: z.string().describe("Result message")
});
const browserExtractTool = createTool({
  id: "browser-extract",
  description: "Extract data from the current page using AI. Can extract structured data based on natural language instructions.",
  inputSchema: browserExtractToolInputSchema,
  outputSchema: browserExtractToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction, schema } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F4CA} Extracting data: ${instruction}`);
      const result = await page.extract(instruction, schema ? { schema } : void 0);
      console.log(`\u2705 Data extraction completed`);
      return {
        success: true,
        data: result.extraction,
        message: `Successfully extracted data: ${instruction}`
      };
    } catch (error) {
      console.error("Extraction error:", error);
      return {
        success: false,
        data: null,
        message: `Extraction failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserObserveToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  instruction: z.string().describe('What to observe on the page (e.g., "clickable buttons", "form fields", "search box")')
});
const browserObserveToolOutputSchema = z.object({
  success: z.boolean().describe("Whether observation was successful"),
  observations: z.array(z.string()).describe("List of possible actions or observations"),
  message: z.string().describe("Result message")
});
const browserObserveTool = createTool({
  id: "browser-observe",
  description: "Observe elements on the current page and get suggestions for possible actions",
  inputSchema: browserObserveToolInputSchema,
  outputSchema: browserObserveToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, instruction } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F441}\uFE0F Observing: ${instruction}`);
      const suggestions = await page.observe(instruction);
      console.log(`\u2705 Observation completed, found ${suggestions.length} suggestions`);
      return {
        success: true,
        observations: suggestions.map((s) => typeof s === "string" ? s : JSON.stringify(s)),
        message: `Found ${suggestions.length} possible actions for: ${instruction}`
      };
    } catch (error) {
      console.error("Observation error:", error);
      return {
        success: false,
        observations: [],
        message: `Observation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserWaitToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  milliseconds: z.number().describe("Time to wait in milliseconds")
});
const browserWaitToolOutputSchema = z.object({
  success: z.boolean().describe("Whether wait was successful"),
  duration: z.number().describe("Actual wait duration in milliseconds"),
  message: z.string().describe("Result message")
});
const browserWaitTool = createTool({
  id: "browser-wait",
  description: "Wait for a specified amount of time. Useful for waiting for page loads, animations, or async operations.",
  inputSchema: browserWaitToolInputSchema,
  outputSchema: browserWaitToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { milliseconds } = context;
      console.log(`\u23F3 Waiting for ${milliseconds}ms...`);
      const startTime = Date.now();
      await new Promise((resolve) => setTimeout(resolve, milliseconds));
      const actualDuration = Date.now() - startTime;
      console.log(`\u2705 Wait completed (${actualDuration}ms)`);
      return {
        success: true,
        duration: actualDuration,
        message: `Waited for ${actualDuration}ms`
      };
    } catch (error) {
      console.error("Wait error:", error);
      return {
        success: false,
        duration: 0,
        message: `Wait failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserScreenshotToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID"),
  fullPage: z.boolean().optional().default(false).describe("Whether to capture the full page"),
  filename: z.string().optional().describe("Optional filename for saving screenshot")
});
const browserScreenshotToolOutputSchema = z.object({
  success: z.boolean().describe("Whether screenshot was successful"),
  screenshot: z.string().describe("Base64 encoded screenshot"),
  filepath: z.string().optional().describe("File path if saved to disk"),
  message: z.string().describe("Result message")
});
const browserScreenshotTool = createTool({
  id: "browser-screenshot",
  description: "Take a screenshot of the current page",
  inputSchema: browserScreenshotToolInputSchema,
  outputSchema: browserScreenshotToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId, fullPage, filename } = context;
      const stagehand = stagehandInstances.get(sessionId);
      if (!stagehand) {
        throw new Error(`No active browser session found for sessionId: ${sessionId}. Please use browser-goto tool first.`);
      }
      const page = stagehand.page;
      console.log(`\u{1F4F8} Taking screenshot (fullPage: ${fullPage})`);
      const screenshotBuffer = await page.screenshot({
        fullPage,
        timeout: 1e4
      });
      const base64Screenshot = `data:image/png;base64,${screenshotBuffer.toString("base64")}`;
      let filepath;
      if (filename) {
        const screenshotDir = path__default.join(process.cwd(), "public", "browser-screenshots");
        const fullPath = path__default.join(screenshotDir, filename.endsWith(".png") ? filename : `${filename}.png`);
        await writeFile(fullPath, screenshotBuffer);
        filepath = fullPath;
        console.log(`\u{1F4BE} Screenshot saved to: ${filepath}`);
      }
      console.log(`\u2705 Screenshot captured successfully`);
      return {
        success: true,
        screenshot: base64Screenshot,
        filepath,
        message: "Screenshot captured successfully"
      };
    } catch (error) {
      console.error("Screenshot error:", error);
      return {
        success: false,
        screenshot: "",
        message: `Screenshot failed: ${error instanceof Error ? error.message : "Unknown error"}`
      };
    }
  }
});

const browserCloseToolInputSchema = z.object({
  sessionId: z.string().describe("Browserbase session ID")
});
const browserCloseToolOutputSchema = z.object({
  success: z.boolean().describe("Whether session was closed successfully"),
  message: z.string().describe("Result message")
});
const browserCloseTool = createTool({
  id: "browser-close",
  description: "Close the browser session and clean up resources",
  inputSchema: browserCloseToolInputSchema,
  outputSchema: browserCloseToolOutputSchema,
  execute: async ({ context }) => {
    try {
      const { sessionId } = context;
      console.log(`\u{1F6AA} Closing browser session: ${sessionId}`);
      const stagehand = stagehandInstances.get(sessionId);
      if (stagehand) {
        try {
          await stagehand.close();
        } catch (e) {
          console.warn("Error closing stagehand:", e);
        }
        stagehandInstances.delete(sessionId);
      }
      console.log(`\u2705 Browser session closed: ${sessionId}`);
      return {
        success: true,
        message: `Browser session ${sessionId} closed successfully`
      };
    } catch (error) {
      console.error("Session close error:", error);
      return {
        success: false,
        message: `Failed to close session: ${error instanceof Error ? error.message : "Unknown error"}`
      };
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

export { braveSearchTool, browserActTool, browserCloseTool, browserExtractTool, browserGotoTool, browserObserveTool, browserScreenshotTool, browserSessionTool, browserWaitTool, geminiImageGenerationTool, geminiVideoGenerationTool, graphicRecordingTool, grokXSearchTool, htmlSlideTool, imagen4GenerationTool, minimaxTTSTool, presentationPreviewTool, v0CodeGenerationTool, weatherTool };
