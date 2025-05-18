import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { tool, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { evaluate } from 'mathjs';

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
      diagramType: "none",
      // Default diagram type (can be 'bar', 'pie', 'flow')
      extras: "",
      // Default additional elements (e.g., 'quote,table')
      uniqueClass: uniqueSlideClass
    };
    const systemPrompt = `\u3042\u306A\u305F\u306F\u300C\u65E5\u672C\u8A9E\u30D7\u30EC\u30BC\u30F3\u8CC7\u6599\u306E\u30CF\u30A4\u30A8\u30F3\u30C9 HTML/CSS \u30C7\u30B6\u30A4\u30CA\u30FC\u300D\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u5165\u529B\u30D1\u30E9\u30E1\u30FC\u30BF\u3092\u53C2\u7167\u3057\u3001\u6307\u793A\u306B\u53B3\u5BC6\u306B\u5F93\u3044\u306A\u304C\u3089\u3082\u3001\u72B6\u6CC1\u306B\u5FDC\u3058\u305F\u6700\u9069\u306A\u30B9\u30E9\u30A4\u30C9\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u5165\u529B\u30D1\u30E9\u30E1\u30FC\u30BF\u3011 \u203B{ ... } \u306F\u547C\u3073\u51FA\u3057\u5074\u3067\u7F6E\u63DB
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

\u3010\u51FA\u529B\u8981\u4EF6\u3011
1. **<style>** \u30D6\u30ED\u30C3\u30AF\u3068 **<section class="slide ...">...</section>** \u306E\u307F\u8FD4\u3059\u3002
2. CSS \u306F\u30AF\u30E9\u30B9 \`.${promptArgs.uniqueClass}\` \u306B\u30B9\u30B3\u30FC\u30D7\u3057\u3001\u4ED6\u8981\u7D20\u3078\u5F71\u97FF\u3055\u305B\u306A\u3044\u3002
3. \u672A\u6307\u5B9A\u30D1\u30E9\u30E1\u30FC\u30BF\u306F\u30C7\u30D5\u30A9\u30EB\u30C8\u5024\u3092\u63A1\u7528\u3002
4. \u751F\u6210\u3059\u308B HTML \u69CB\u9020\u306F **layoutType** ('${promptArgs.layoutType}') \u306B\u5FDC\u3058\u3066\u4EE5\u4E0B\u3092\u53C2\u8003\u306B\u67D4\u8EDF\u306B\u5909\u5F62\u3059\u308B\u3053\u3068\u3002
   - 'default'      : \u898B\u51FA\u3057 + \u6BB5\u843D + \u56F3\u89E3 + \u7B87\u6761\u66F8\u304D
   - 'image-left'   : \u5DE6\u306B\u56F3\u89E3 / \u53F3\u306B\u672C\u6587
   - 'image-right'  : \u53F3\u306B\u56F3\u89E3 / \u5DE6\u306B\u672C\u6587
   - 'full-graphic' : \u56F3\u89E3\u3084\u30D2\u30FC\u30ED\u30FC\u30A4\u30E1\u30FC\u30B8\u3092\u80CC\u666F\u5168\u9762\u306B\u6577\u304D\u672C\u6587\u3092\u91CD\u306D\u308B
5. \u56F3\u89E3\u3092\u751F\u6210\u3059\u308B\u5834\u5408\u306F **diagramType** ('${promptArgs.diagramType}') \u306B\u5408\u308F\u305B\u3066 inline SVG \u3067\u63CF\u753B\u3057\u3001\u65E5\u672C\u8A9E\u30E9\u30D9\u30EB\u3092\u4ED8\u3051\u308B\u3002
6. \u8FFD\u52A0\u8981\u7D20 **extras** ('${promptArgs.extras}') \u304C\u542B\u307E\u308C\u308B\u5834\u5408\u306F\u3001\u8A72\u5F53\u8981\u7D20\u3092 HTML \u5185\u3067\u751F\u6210\u3059\u308B\u3002
   - quote       \u2192 <blockquote>
   - code-block  \u2192 <pre><code>
   - table       \u2192 <table> \uFF082\u301C3 \u5217\u30013\u301C4 \u884C\u306E\u30B5\u30F3\u30D7\u30EB\u3067\u53EF\uFF09
7. \u898B\u51FA\u3057\u30FB\u672C\u6587\u30FB\u56F3\u89E3\u30FB\u8FFD\u52A0\u8981\u7D20\u306E\u9806\u5E8F\u306F\u3001**layoutType** \u3068 UX \u3092\u8003\u616E\u3057\u3066\u6700\u9069\u5316\u305B\u3088\u3002
8. **\u65E5\u672C\u8A9E Web \u30D5\u30A9\u30F3\u30C8**\u3092\u5FC5\u305A\u6307\u5B9A\uFF08\u30C7\u30D5\u30A9\u30EB\u30C8 ${promptArgs.fontFamily}\uFF09\u3002
9. \u30A2\u30AF\u30BB\u30B7\u30D3\u30EA\u30C6\u30A3\u91CD\u8996: \u30B3\u30F3\u30C8\u30E9\u30B9\u30C8\u6BD4 AA \u6E96\u62E0\u3001alt \u3084 aria-label \u3092\u9069\u5B9C\u4ED8\u4E0E\u3002
10. **\u7981\u6B62\u4E8B\u9805**
    - <html>, <head>, <body> \u3092\u542B\u3081\u306A\u3044
    - \u5916\u90E8\u753B\u50CF URL \u3092\u4F7F\u7528\u3057\u306A\u3044\uFF08\u3059\u3079\u3066 SVG \u3067\u5B8C\u7D50\uFF09
    - CSS \u30EA\u30BB\u30C3\u30C8\u30FB\u5927\u57DF\u30D5\u30A9\u30F3\u30C8\u5909\u66F4\u3092\u884C\u308F\u306A\u3044
11. \u6700\u4E0B\u90E8\u53F3\u5BC4\u305B\u306B "Slide ${promptArgs.slideIndex}/${promptArgs.totalSlides} \u2014 ${promptArgs.topic}" \u3092 0.8rem \u3067\u8584\u304F\u8868\u793A\u3002
12. **\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u4F8B**
    \`\`\`
    <style>
    /* \u30B9\u30B3\u30FC\u30D7\u3055\u308C\u305F CSS */
    </style>
    <section class="slide ${promptArgs.uniqueClass}">
      <!-- \u30B3\u30F3\u30C6\u30F3\u30C4 -->
    </section>
    \`\`\`

\u3010\u601D\u8003\u30D7\u30ED\u30BB\u30B9 (LLM \u5185\u90E8)\u3011
- \u5165\u529B\u5024\u3092\u8A55\u4FA1\u3057\u3001\u5FC5\u8981\u306A\u30C7\u30D5\u30A9\u30EB\u30C8\u3092\u88DC\u5B8C\u3002
- layoutType\u30FBdiagramType\u30FBextras \u306E\u7D44\u5408\u305B\u304B\u3089\u6700\u9069\u306A DOM \u69CB\u9020\u3092\u6C7A\u5B9A\u3002
- \u30B3\u30F3\u30C6\u30F3\u30C4\u3068\u30B9\u30BF\u30A4\u30EB\u304C\u30D0\u30E9\u30F3\u30B9\u3088\u304F\u914D\u7F6E\u3055\u308C\u308B\u3088\u3046\u306B\u8ABF\u6574\u3002
- SVG \u56F3\u89E3\u306F simple \u304B\u3064\u8996\u8A8D\u6027\u3092\u91CD\u8996\u3057\u3001\u69CB\u9020\u7684\u306B\u6B63\u3057\u3044\u8981\u7D20\u3067\u30DE\u30FC\u30AF\u30A2\u30C3\u30D7\u3002

\u3053\u306E\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u5F93\u3044\u3001\u30CF\u30A4\u30AF\u30AA\u30EA\u30C6\u30A3\u304B\u3064\u72B6\u6CC1\u306B\u5408\u308F\u305B\u305F\u67D4\u8EDF\u306A\u30B9\u30E9\u30A4\u30C9\u3092\u51FA\u529B\u305B\u3088\u3002`;
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

const geminiImageGenerationTool = tool({
  // Renamed tool
  description: "Generates images using Google's Gemini API based on a textual prompt. Returns images as base64 encoded data.",
  // Updated description
  parameters: z.object({
    prompt: z.string().describe("A detailed textual description of the desired image(s).")
    // model, n, size, quality, style parameters removed as Gemini's basic image generation via this endpoint is simpler
  }),
  execute: async ({ prompt }) => {
    if (!prompt || prompt.trim() === "") {
      console.error("[GeminiImageTool] Prompt is undefined or empty.");
      return {
        images: [],
        message: "Error: Prompt is required for image generation and cannot be empty."
      };
    }
    let message = "Image generation initiated with Gemini.";
    let generatedImages = [];
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("[GeminiImageTool] GEMINI_API_KEY is not set.");
      return {
        images: [],
        message: "Error: GEMINI_API_KEY is not set in environment variables."
      };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;
    try {
      console.log(`[GeminiImageTool] Generating image with prompt: "${prompt}"`);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt }
            ]
          }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
          // Updated to include TEXT and IMAGE
        })
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[GeminiImageTool] API Error: ${response.status} ${response.statusText}`, errorBody);
        message = `Error generating image from Gemini API: ${response.status} ${response.statusText}. ${errorBody}`;
        return {
          images: [],
          message
        };
      }
      const responseData = await response.json();
      let foundImage = false;
      if (responseData.candidates && responseData.candidates.length > 0 && responseData.candidates[0].content && responseData.candidates[0].content.parts) {
        for (const part of responseData.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const b64Data = part.inlineData.data;
            generatedImages.push({ b64_json: b64Data });
            message = `Successfully generated 1 image using Gemini.`;
            foundImage = true;
            break;
          }
        }
      }
      if (!foundImage) {
        console.warn("[GeminiImageTool] No image data found in Gemini API response (after iterating parts): shallower inspect: ", responseData?.candidates?.[0]?.content?.parts, "deeper inspect: ", responseData);
        console.log("[GeminiImageTool] Full API Response Data:", JSON.stringify(responseData, null, 2));
        message = "Image generation by Gemini completed, but no image data was returned or the response structure was unexpected (even after iterating parts).";
      }
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error("[GeminiImageTool] Error generating image with Gemini:", error);
      message = `Error during Gemini image generation: ${error.message || "Unknown error"}`;
      generatedImages = [];
    }
    return {
      images: generatedImages,
      message
    };
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

export { advancedCalculatorTool, braveSearchTool, geminiImageGenerationTool, htmlSlideTool, weatherTool };
