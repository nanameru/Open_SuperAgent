import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

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

export { v0CodeGenerationTool };
//# sourceMappingURL=682b06fb-a452-45fd-a008-50bc12b760e8.mjs.map
