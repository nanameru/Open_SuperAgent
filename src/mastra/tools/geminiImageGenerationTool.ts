import { tool } from 'ai';
import { z } from 'zod';
// OpenAI import and client removed

// export const openAIImageGenerationTool = tool({
export const geminiImageGenerationTool = tool({ // Renamed tool
  description: 'Generates images using Google\'s Gemini API based on a textual prompt. Returns images as base64 encoded data.', // Updated description
  parameters: z.object({
    prompt: z.string().describe('A detailed textual description of the desired image(s).'),
    // model, n, size, quality, style parameters removed as Gemini's basic image generation via this endpoint is simpler
  }),
  execute: async ({ prompt }) => {
    if (!prompt || prompt.trim() === '') {
      console.error('[GeminiImageTool] Prompt is undefined or empty.');
      return {
        images: [],
        message: 'Error: Prompt is required for image generation and cannot be empty.',
      };
    }

    let message = 'Image generation initiated with Gemini.';
    let generatedImages: Array<{ b64_json: string | undefined; revised_prompt?: string }> = []; // revised_prompt might not be available from Gemini in this basic call

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[GeminiImageTool] GEMINI_API_KEY is not set.');
      return {
        images: [],
        message: 'Error: GEMINI_API_KEY is not set in environment variables.',
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${apiKey}`;

    try {
      console.log(`[GeminiImageTool] Generating image with prompt: "${prompt}"`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {text: prompt}
            ]
          }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] } // Updated to include TEXT and IMAGE
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[GeminiImageTool] API Error: ${response.status} ${response.statusText}`, errorBody);
        message = `Error generating image from Gemini API: ${response.status} ${response.statusText}. ${errorBody}`;
        return {
          images: [],
          message,
        };
      }

      const responseData = await response.json();

      let foundImage = false;
      if (responseData.candidates && responseData.candidates.length > 0 &&
          responseData.candidates[0].content && responseData.candidates[0].content.parts) {
        
        for (const part of responseData.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
            const b64Data = part.inlineData.data;
            generatedImages.push({ b64_json: b64Data });
            message = `Successfully generated 1 image using Gemini.`;
            foundImage = true;
            break; // Assuming only one image is expected per candidate based on current setup
          }
        }
      }

      if (!foundImage) {
        console.warn('[GeminiImageTool] No image data found in Gemini API response (after iterating parts): shallower inspect: ', responseData?.candidates?.[0]?.content?.parts, 'deeper inspect: ', responseData);
        console.log('[GeminiImageTool] Full API Response Data:', JSON.stringify(responseData, null, 2));
        message = 'Image generation by Gemini completed, but no image data was returned or the response structure was unexpected (even after iterating parts).';
      }

    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));

      console.error('[GeminiImageTool] Error generating image with Gemini:', error);
      message = `Error during Gemini image generation: ${error.message || 'Unknown error'}`;
      generatedImages = []; // Ensure images array is empty on error
    }

    return {
      images: generatedImages,
      message: message,
    };
  },
}); 