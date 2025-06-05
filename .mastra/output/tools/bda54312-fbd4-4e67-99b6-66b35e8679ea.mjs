import { tool, generateText } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';

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

export { htmlSlideTool };
//# sourceMappingURL=bda54312-fbd4-4e67-99b6-66b35e8679ea.mjs.map
