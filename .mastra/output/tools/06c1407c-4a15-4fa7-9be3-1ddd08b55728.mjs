import { tool, generateText } from 'ai';
import { z } from 'zod';
import { anthropic } from '@ai-sdk/anthropic';

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

export { graphicRecordingTool };
//# sourceMappingURL=06c1407c-4a15-4fa7-9be3-1ddd08b55728.mjs.map
