import { tool } from 'ai';
import { z } from 'zod';

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

export { presentationPreviewTool };
//# sourceMappingURL=fae41b45-90b9-492a-93c7-0567a9caa2a5.mjs.map
