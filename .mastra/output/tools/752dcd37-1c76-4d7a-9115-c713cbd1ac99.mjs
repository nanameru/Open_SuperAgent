import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { evaluate } from 'mathjs';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';

const htmlSlideTool = tool({
  description: 'Generates the HTML content for a single slide section (within <section class="slide"></section>) using an LLM. It takes a general topic and a specific outline point for this particular slide.',
  parameters: z.object({
    topic: z.string().describe("The main topic or subject of the overall presentation."),
    outline: z.string().optional().describe("The specific theme, topic, or key points for THIS slide."),
    slideCount: z.number().default(1).describe("The number of slides to generate with this call. Expected to be 1 by the calling agent.")
  }),
  execute: async ({ topic, outline, slideCount }) => {
    const uniqueSlideClass = `slide-${Math.random().toString(36).substring(7)}`;
    const promptArgs = {
      topic,
      outline: outline || topic,
      // If outline is not provided, use the main topic.
      slideIndex: "current",
      // Placeholder, as this is not passed to the tool currently
      totalSlides: "N",
      // Placeholder, as this is not passed to the tool currently
      primaryColor: "#0056B1",
      // Default primary color
      accentColor: "#FFB400",
      // Default accent color
      bgColor: "#F5F7FA",
      // Default background color
      fontFamily: "'Noto Sans JP', 'Hiragino Sans', sans-serif",
      // Default font family
      layoutType: "default",
      // Default layout type
      diagramType: "auto",
      // Changed from 'none' to 'auto' to enable diagrams by default
      extras: "modern-design",
      // Added modern-design by default
      uniqueClass: uniqueSlideClass
    };
    const systemPrompt = `\u3042\u306A\u305F\u306F\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u306A\u300C\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u30C7\u30B6\u30A4\u30CA\u30FC\u300D\u3067\u3059\u3002
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

\u3010\u6700\u512A\u5148\u4E8B\u9805\u3011
1. **\u30D7\u30ED\u54C1\u8CEA\u306E\u30B9\u30E9\u30A4\u30C9\u30C7\u30B6\u30A4\u30F3** - \u30A2\u30C3\u30D7\u30EB\u3084\u30B0\u30FC\u30B0\u30EB\u306E\u30D7\u30EC\u30BC\u30F3\u306B\u5339\u6575\u3059\u308B\u7F8E\u3057\u3055\u3092\u76EE\u6307\u3059
2. **\u8996\u899A\u7684\u60C5\u5831\u4F1D\u9054** - \u6587\u5B57\u3060\u3051\u3067\u306A\u304F\u3001\u56F3\u89E3\u30FB\u30A2\u30A4\u30B3\u30F3\u30FB\u8996\u899A\u8981\u7D20\u3092\u5FC5\u305A\u542B\u3081\u308B
3. **\u4E00\u76EE\u3067\u7406\u89E3\u3067\u304D\u308B\u69CB\u6210** - \u60C5\u5831\u306F\u968E\u5C64\u5316\u3057\u3001\u8996\u7DDA\u306E\u6D41\u308C\u3092\u610F\u8B58\u3057\u305F\u30EC\u30A4\u30A2\u30A6\u30C8

\u3010\u51FA\u529B\u8981\u4EF6\u3011
1. **<style>** \u30D6\u30ED\u30C3\u30AF\u3068 **<section class="slide ...">...</section>** \u306E\u307F\u8FD4\u3059\u3002
2. CSS \u306F\u30AF\u30E9\u30B9 \`.${promptArgs.uniqueClass}\` \u306B\u30B9\u30B3\u30FC\u30D7\u3057\u3001\u4ED6\u8981\u7D20\u3078\u5F71\u97FF\u3055\u305B\u306A\u3044\u3002
3. \u672A\u6307\u5B9A\u30D1\u30E9\u30E1\u30FC\u30BF\u306F\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u3092\u63A1\u7528\u3002
4. \u751F\u6210\u3059\u308B HTML \u69CB\u9020\u306F **layoutType** \u306B\u5FDC\u3058\u3066\u4EE5\u4E0B\u3092\u53C2\u8003\u306B\u67D4\u8EDF\u306B\u5909\u5F62\u3059\u308B\u3053\u3068\u3002
   - 'default'      : \u5927\u304D\u306A\u898B\u51FA\u3057 + \u7C21\u6F54\u306A\u672C\u6587 + \u8996\u899A\u7684\u56F3\u89E3 + \u7B87\u6761\u66F8\u304D\uFF083\u9805\u76EE\u7A0B\u5EA6\uFF09
   - 'image-left'   : \u5DE6\u5074\u306B\u56F3\u89E3\u30FB\u30A4\u30E9\u30B9\u30C8 / \u53F3\u5074\u306B\u7C21\u6F54\u306A\u672C\u6587\u3068\u30DD\u30A4\u30F3\u30C8
   - 'image-right'  : \u53F3\u5074\u306B\u56F3\u89E3\u30FB\u30A4\u30E9\u30B9\u30C8 / \u5DE6\u5074\u306B\u7C21\u6F54\u306A\u672C\u6587\u3068\u30DD\u30A4\u30F3\u30C8
   - 'full-graphic' : \u80CC\u666F\u5168\u4F53\u306B\u56F3\u89E3\u30FB\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u30FB\u30D1\u30BF\u30FC\u30F3\u3092\u914D\u7F6E\u3001\u305D\u306E\u4E0A\u306B\u91CD\u8981\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u914D\u7F6E
   - 'quote'        : \u5F15\u7528\u3092\u4E2D\u592E\u306B\u5927\u304D\u304F\u914D\u7F6E\u3001\u5F15\u7528\u8005\u60C5\u5831\u306F\u53F3\u4E0B\u306B\u5C0F\u3055\u304F
   - 'comparison'   : \u5DE6\u53F3\u307E\u305F\u306F\u4E0A\u4E0B\u3067\u9805\u76EE\u3092\u6BD4\u8F03\u3059\u308B2\u30AB\u30E9\u30E0\u30EC\u30A4\u30A2\u30A6\u30C8
   - 'timeline'     : \u6C34\u5E73\u307E\u305F\u306F\u5782\u76F4\u306E\u30BF\u30A4\u30E0\u30E9\u30A4\u30F3\u56F3\u89E3\u3092\u4E2D\u5FC3\u306B\u914D\u7F6E
   - 'list'         : \u7B87\u6761\u66F8\u304D\u3092\u4E2D\u5FC3\u3068\u3057\u305F\u30B7\u30F3\u30D7\u30EB\u306A\u69CB\u6210\uFF08\u6700\u59275-6\u9805\u76EE\uFF09

5. **\u56F3\u89E3\u3068\u30D3\u30B8\u30E5\u30A2\u30EB\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
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

6. **\u30E2\u30C0\u30F3\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\uFF08\u5FC5\u9808\uFF09**
   \u4EE5\u4E0B\u306E\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\u3092\u5FC5\u305A1\u3064\u4EE5\u4E0A\u542B\u3081\u308B\uFF1A
   - \u6D17\u7DF4\u3055\u308C\u305F\u30B0\u30E9\u30C7\u30FC\u30B7\u30E7\u30F3\u80CC\u666F
   - \u534A\u900F\u660E\u306E\u56F3\u5F62\u3084\u30AA\u30FC\u30D0\u30FC\u30EC\u30A4
   - \u5E7E\u4F55\u5B66\u7684\u306A\u30A2\u30AF\u30BB\u30F3\u30C8\u30D1\u30BF\u30FC\u30F3
   - \u5F71\u3084\u30C9\u30ED\u30C3\u30D7\u30B7\u30E3\u30C9\u30A6\u52B9\u679C
   - \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u52B9\u679C\uFF08CSS transitions/animations\uFF09
   - \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u306A\u30DC\u30FC\u30C0\u30FC\u3084\u30BB\u30D1\u30EC\u30FC\u30BF\u30FC
   - \u9069\u5207\u306A\u30DB\u30EF\u30A4\u30C8\u30B9\u30DA\u30FC\u30B9\uFF08\u4F59\u767D\uFF09\u306E\u6D3B\u7528

7. **\u30C6\u30AD\u30B9\u30C8\u8A2D\u8A08\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3**
   - \u898B\u51FA\u3057: 32-40px\u3001\u592A\u5B57\u3001\u9AD8\u30B3\u30F3\u30C8\u30E9\u30B9\u30C8
   - \u672C\u6587: 18-24px\u3001\u8AAD\u307F\u3084\u3059\u3044\u30D5\u30A9\u30F3\u30C8
   - \u7B87\u6761\u66F8\u304D: \u7C21\u6F54\u30671\u884C\u4EE5\u5185\u3001\u524D\u5F8C\u306B\u5341\u5206\u306A\u4F59\u767D
   - \u5F37\u8ABF: \u8272\u30FB\u30B5\u30A4\u30BA\u30FB\u30D5\u30A9\u30F3\u30C8\u30A6\u30A7\u30A4\u30C8\u3092\u4F7F\u3044\u5206\u3051\u308B
   - \u30C6\u30AD\u30B9\u30C8\u91CF: 1\u30B9\u30E9\u30A4\u30C9\u3042\u305F\u308A30-50\u5358\u8A9E\u7A0B\u5EA6\u306B\u6291\u3048\u308B
   - \u30D5\u30A9\u30F3\u30C8: \u30B9\u30BF\u30A4\u30EA\u30C3\u30B7\u30E5\u3067\u8AAD\u307F\u3084\u3059\u3044\u65E5\u672C\u8A9EWeb\u30D5\u30A9\u30F3\u30C8\u3092\u4F7F\u7528\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8 ${promptArgs.fontFamily}\uFF09

8. **\u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u3068\u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u30C7\u30B6\u30A4\u30F3**
   - \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4 AA \u6E96\u62E0
   - SVG\u8981\u7D20\u306B\u306F\u9069\u5207\u306Aalt/aria\u5C5E\u6027
   - \u30EC\u30B9\u30DD\u30F3\u30B7\u30D6\u306A\u8981\u7D20\u914D\u7F6E\uFF08vw/vh\u5358\u4F4D\u306E\u6D3B\u7528\uFF09

9. **\u6700\u4E0B\u90E8\u53F3\u5BC4\u305B\u306B "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} \u2014 ${promptArgs.topic}" \u3092\u6D17\u7DF4\u3055\u308C\u305F\u30C7\u30B6\u30A4\u30F3\u3067\u8868\u793A**

10. **\u7981\u6B62\u4E8B\u9805**
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
5. \u30E2\u30C0\u30F3\u3067\u5C02\u9580\u7684\u306A\u30C7\u30B6\u30A4\u30F3\u8981\u7D20\u3092\u9069\u7528
6. \u5168\u4F53\u306E\u30D0\u30E9\u30F3\u30B9\u3068\u8996\u7DDA\u306E\u6D41\u308C\u3092\u6700\u7D42\u8ABF\u6574

\u3053\u306E\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u5F93\u3044\u3001\u30D7\u30ED\u30D5\u30A7\u30C3\u30B7\u30E7\u30CA\u30EB\u3067\u8AAC\u5F97\u529B\u306E\u3042\u308B\u30B9\u30E9\u30A4\u30C9\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002`;
    let slideHtmlAndCss = '<style>.error-slide { background: #ffe0e0; color: red; }</style><section class="slide error-slide"><h1>Error</h1><p>Could not generate slide content and CSS.</p></section>';
    let message = `Failed to generate slide for topic "${topic}" and outline "${outline || "N/A"}".`;
    try {
      const { text: generatedHtml } = await generateText({
        model: anthropic("claude-3-7-sonnet-20250219"),
        // Use Anthropic model
        prompt: systemPrompt
        // The detailed instructions form the system prompt
      });
      if (generatedHtml && generatedHtml.trim().startsWith("<style>") && generatedHtml.trim().includes("</style>") && generatedHtml.trim().includes('<section class="slide')) {
        slideHtmlAndCss = generatedHtml.trim();
        message = `Successfully generated HTML and CSS for the slide focusing on "${outline || topic}".`;
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
      message
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
  )
});
const geminiImageGenerationToolOutputSchema = z.object({
  images: z.array(
    z.object({
      url: z.string().describe("URL of the generated image."),
      b64Json: z.string().describe("Base64 encoded image data.")
    })
  ),
  error: z.string().optional().describe("Error message if generation failed.")
});
const geminiImageGenerationTool = createTool({
  id: "gemini-image-generation",
  description: "Generates an image based on a textual prompt using Google Gemini (Imagen 3). Returns a URL to the generated image.",
  inputSchema: geminiImageGenerationToolInputSchema,
  outputSchema: geminiImageGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const { prompt, numberOfImages, aspectRatio, negativePrompt, seed, personGeneration } = context;
    console.log("[GeminiImageTool] Received input:");
    console.log(`[GeminiImageTool] Prompt length: ${prompt?.length || 0}`);
    console.log(`[GeminiImageTool] Negative Prompt length: ${negativePrompt?.length || 0}`);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { images: [], error: "GEMINI_API_KEY is not set." };
    }
    const imagesDir = path.join(process.cwd(), "public", "generated-images");
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const requestBody = {
      instances: [{
        prompt,
        ...negativePrompt && { negative_prompt: negativePrompt }
      }],
      parameters: {
        sampleCount: numberOfImages || 1,
        ...aspectRatio && { aspectRatio },
        ...typeof seed === "number" && { seed },
        ...personGeneration && { personGeneration }
      }
    };
    console.log("[GeminiImageTool] Calling Imagen 3 API...");
    console.log("[GeminiImageTool] Endpoint:", imagenApiUrl);
    console.log(
      "[GeminiImageTool] Request Body:",
      JSON.stringify(requestBody, null, 2)
    );
    try {
      const primaryResponse = await axios.post(imagenApiUrl, requestBody, {
        headers: { "Content-Type": "application/json" }
      });
      console.log(
        "[GeminiImageTool] Imagen 3 API Response Status:",
        primaryResponse.status
      );
      const images = [];
      if (primaryResponse.data && primaryResponse.data.predictions && Array.isArray(primaryResponse.data.predictions)) {
        for (const prediction of primaryResponse.data.predictions) {
          if (prediction.bytesBase64Encoded) {
            const base64Data = prediction.bytesBase64Encoded;
            const imageName = `img_${v4()}.png`;
            const imagePath = path.join(imagesDir, imageName);
            fs.writeFileSync(imagePath, Buffer.from(base64Data, "base64"));
            const imageUrl = `/generated-images/${imageName}`;
            images.push({ url: imageUrl, b64Json: base64Data });
          }
        }
      } else {
        console.error(
          "[GeminiImageTool] Unexpected response structure from Imagen 3:",
          primaryResponse.data
        );
        return {
          images: [],
          error: "Unexpected response structure from Imagen 3 API."
        };
      }
      if (images.length > 0) {
        return { images };
      } else {
        return {
          images: [],
          error: "No images generated or image data missing in response."
        };
      }
    } catch (error) {
      console.error(
        "[GeminiImageTool] Error during Imagen 3 image generation:",
        error.response?.data || error.message
      );
      return {
        images: [],
        error: `Error during Imagen 3 generation: ${error.response?.data?.error?.message || error.message}`
      };
    }
  }
});

const presentationPreviewTool = tool({
  description: "\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u30B9\u30E9\u30A4\u30C9\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u3059\u308B\u30C4\u30FC\u30EB\u3002\u30B9\u30E9\u30A4\u30C9\u306EHTML\u30B3\u30F3\u30C6\u30F3\u30C4\u3092\u53D7\u3051\u53D6\u308A\u3001\u30D7\u30EC\u30D3\u30E5\u30FC\u8868\u793A\u3057\u307E\u3059\u3002",
  parameters: z.object({
    htmlContent: z.string().describe("\u30B9\u30E9\u30A4\u30C9\u306EHTML\u30B3\u30F3\u30C6\u30F3\u30C4\u3002"),
    title: z.string().optional().describe("\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u306E\u30BF\u30A4\u30C8\u30EB\u3002"),
    autoOpen: z.boolean().optional().default(true).describe("\u30D7\u30EC\u30D3\u30E5\u30FC\u30D1\u30CD\u30EB\u3092\u81EA\u52D5\u7684\u306B\u958B\u304F\u304B\u3069\u3046\u304B\u3002")
  }),
  execute: async ({ htmlContent, title, autoOpen }) => {
    return {
      success: true,
      message: `\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3\u300C${title || "\u7121\u984C\u306E\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3"}\u300D\u306E\u30D7\u30EC\u30D3\u30E5\u30FC\u3092\u8868\u793A\u3057\u307E\u3059\u3002`,
      htmlContent,
      title: title || "\u7121\u984C\u306E\u30D7\u30EC\u30BC\u30F3\u30C6\u30FC\u30B7\u30E7\u30F3",
      autoOpen: autoOpen ?? true
    };
  }
});

const geminiVideoGenerationToolInputSchema = z.object({
  prompt: z.string().describe("A detailed textual description of the desired video."),
  image: z.string().optional().describe("Optional base64 encoded image to use as input for video generation."),
  mimeType: z.enum(["image/jpeg", "image/png"]).optional().describe("MIME type of the input image (required if image is provided)."),
  numberOfVideos: z.number().optional().default(1).describe("Number of videos to generate (1-2). Default is 1."),
  durationSeconds: z.number().optional().default(5).describe("Duration of videos in seconds (5-8). Default is 5."),
  aspectRatio: z.string().optional().default("16:9").describe("Aspect ratio of the videos ('16:9' or '9:16'). Default is '16:9'."),
  negativePrompt: z.string().optional().describe("Text that describes what you want to discourage the model from generating."),
  personGeneration: z.enum(["dont_allow", "allow_adult"]).optional().default("allow_adult").describe("Controls whether people or face generation is allowed."),
  enhancePrompt: z.boolean().optional().default(true).describe("Whether to use Gemini to enhance prompts. Default is true."),
  seed: z.number().optional().describe("A seed for deterministic generation (0-4294967295).")
});
const geminiVideoGenerationToolOutputSchema = z.object({
  videos: z.array(
    z.object({
      url: z.string().optional().describe("URL of the generated video."),
      b64Json: z.string().optional().describe("Base64 encoded video data."),
      revised_prompt: z.string().optional().describe("Revised prompt used for generation.")
    })
  ),
  operationId: z.string().nullable().optional().describe("Operation ID for checking status of long-running operation."),
  error: z.string().optional().describe("Error message if generation failed.")
});
const geminiVideoGenerationTool = createTool({
  id: "gemini-video-generation",
  description: "Generates videos using Google's Veo API based on a textual prompt or image. Returns videos as base64 encoded data.",
  inputSchema: geminiVideoGenerationToolInputSchema,
  outputSchema: geminiVideoGenerationToolOutputSchema,
  execute: async ({ context }) => {
    const {
      prompt,
      image,
      mimeType,
      numberOfVideos = 1,
      durationSeconds = 5,
      aspectRatio = "16:9",
      negativePrompt,
      personGeneration = "allow_adult",
      enhancePrompt = true,
      seed
    } = context;
    console.log("[GeminiVideoTool] Received input:");
    console.log(`[GeminiVideoTool] Prompt: ${prompt}`);
    console.log(`[GeminiVideoTool] Has Image: ${!!image}`);
    if (!prompt && !image) {
      console.error("[GeminiVideoTool] Either prompt or image is required.");
      return {
        videos: [],
        operationId: null,
        error: "Either a text prompt or an image input is required for video generation."
      };
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[GeminiVideoTool] GEMINI_API_KEY is not set.");
      return {
        videos: [],
        operationId: null,
        error: "GEMINI_API_KEY is not set in environment variables."
      };
    }
    const videosDir = path.join(process.cwd(), "public", "generated-videos");
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-2.0-generate-001:predictLongRunning?key=${apiKey}`;
    try {
      const requestBody = {
        instances: [
          {
            prompt
          }
        ],
        parameters: {
          sampleCount: Math.min(Math.max(numberOfVideos, 1), 2),
          // 1から2の間に制限
          durationSeconds: Math.min(Math.max(durationSeconds, 5), 8),
          // 5から8の間に制限
          enhancePrompt,
          aspectRatio,
          personGeneration
        }
      };
      if (image && mimeType) {
        requestBody.instances[0].image = {
          bytesBase64Encoded: image,
          mimeType
        };
      }
      if (negativePrompt) {
        requestBody.parameters.negativePrompt = negativePrompt;
      }
      if (typeof seed === "number") {
        requestBody.parameters.seed = seed;
      }
      console.log("[GeminiVideoTool] Calling Veo API...");
      console.log("[GeminiVideoTool] Endpoint:", apiUrl);
      console.log("[GeminiVideoTool] Request Body:", JSON.stringify(requestBody, null, 2));
      const response = await axios.post(apiUrl, requestBody, {
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("[GeminiVideoTool] Veo API Response Status:", response.status);
      if (response.data && response.data.name) {
        const operationId = response.data.name;
        console.log(`[GeminiVideoTool] Video generation started. Operation ID: ${operationId}`);
        return {
          videos: [],
          operationId
        };
      } else {
        console.warn("[GeminiVideoTool] Unexpected API response format:", response.data);
        return {
          videos: [],
          operationId: null,
          error: "Unexpected response format from Veo API."
        };
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      console.error("[GeminiVideoTool] Error during Veo video generation:", errorMessage);
      return {
        videos: [],
        operationId: null,
        error: `Error during Veo video generation: ${errorMessage}`
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

export { advancedCalculatorTool, braveSearchTool, geminiImageGenerationTool, geminiVideoGenerationTool, htmlSlideTool, presentationPreviewTool, weatherTool };
