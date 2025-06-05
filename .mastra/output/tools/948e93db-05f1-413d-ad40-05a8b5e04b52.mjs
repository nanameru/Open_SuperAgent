import { z } from 'zod';
import { createTool } from '@mastra/core/tools';
import fs__default from 'fs';
import path__default from 'path';

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

export { minimaxTTSTool };
//# sourceMappingURL=948e93db-05f1-413d-ad40-05a8b5e04b52.mjs.map
