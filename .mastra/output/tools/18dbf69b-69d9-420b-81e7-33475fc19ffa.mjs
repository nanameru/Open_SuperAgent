import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import path__default from 'path';
import fs__default from 'fs';
import { v4 } from 'uuid';
import { fal } from '@fal-ai/client';

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

export { imagen4GenerationTool };
//# sourceMappingURL=18dbf69b-69d9-420b-81e7-33475fc19ffa.mjs.map
