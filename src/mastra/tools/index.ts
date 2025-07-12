import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

// Import all tools to make them available in this module's scope
import { htmlSlideTool } from './htmlSlideTool';
import { webSearchTool } from './webSearchTool';
import { braveImageSearchTool } from './braveImageSearchTool';
import { geminiImageGenerationTool } from './geminiImageGenerationTool';
import { presentationPreviewTool } from './presentationPreviewTool';
import { geminiVideoGenerationTool } from './geminiVideoGenerationTool';
import { grokXSearchTool } from './grokXSearchTool';
import { imagen4GenerationTool } from './imagen4GenerationTool';
import { graphicRecordingTool } from './graphicRecordingTool';
import { minimaxTTSTool } from './minimaxTTSTool';
import { browserSessionTool } from './browserSessionTool';
import { browserGotoTool } from './browserGotoTool';
import { browserActTool } from './browserActTool';
import { browserExtractTool } from './browserExtractTool';
import { browserObserveTool } from './browserObserveTool';
import { browserWaitTool } from './browserWaitTool';
import { browserScreenshotTool } from './browserScreenshotTool';
import { browserCloseTool } from './browserCloseTool';
import { browserCaptchaDetectTool } from './browserCaptchaDetectTool';
import { claudeAnalysisTool } from './claudeAnalysisTool';
import { claudeFileTool } from './claudeFileTool';
import { claudeAutoEditTool } from './claudeAutoEditTool';
import { claudeCodeSDKTool } from './claudeCodeSDKTool';
import { githubListIssuesTool } from './githubListIssuesTool';
import { fileAppendTool } from './fileAppendTool';
// Enhanced browser tools
import { browserContextCreateTool } from './browserContextCreateTool';
import { browserContextUseTool } from './browserContextUseTool';
import { browserSessionQueryTool } from './browserSessionQueryTool';
import { browserDownloadTool } from './browserDownloadTool';
import { browserUploadTool } from './browserUploadTool';
// Enhanced research tools (removed for build stability)
// Visual editing tools
import { visualSlideEditorTool } from './visualSlideEditorTool';
// Google Workspace tools
import { googleSlidesCreationTool } from './googleSlidesCreationTool';
import { googleSheetsCreationTool } from './googleSheetsCreationTool';
import { googleDocsCreationTool } from './googleDocsCreationTool';
import { googleApiTestTool } from './googleApiTestTool';

// Define the list of all tools
export const allTools = [
  weatherTool,
  htmlSlideTool,
  webSearchTool,
  braveImageSearchTool,
  geminiImageGenerationTool,
  presentationPreviewTool,
  geminiVideoGenerationTool,
  grokXSearchTool,
  imagen4GenerationTool,
  graphicRecordingTool,
  minimaxTTSTool,
  browserSessionTool,
  browserGotoTool,
  browserActTool,
  browserExtractTool,
  browserObserveTool,
  browserWaitTool,
  browserScreenshotTool,
  browserCloseTool,
  browserCaptchaDetectTool,
  // Enhanced browser tools
  browserContextCreateTool,
  browserContextUseTool,
  browserSessionQueryTool,
  browserDownloadTool,
  browserUploadTool,
  claudeAnalysisTool,
  claudeFileTool,
  claudeAutoEditTool,
  claudeCodeSDKTool,
  githubListIssuesTool,
  fileAppendTool,
  // Enhanced research tools (removed for build stability)
  // Visual editing tools
  visualSlideEditorTool,
  // Google Workspace tools
  googleSlidesCreationTool,
  googleSheetsCreationTool,
  googleDocsCreationTool,
  googleApiTestTool,
];

// Define the list of all tool names, handling both .name and .id properties
export const allToolNames = allTools.map((t: any) => t.name || t.id);

// Export all the tools to make them available to other modules
export {
  htmlSlideTool,
  webSearchTool,
  braveImageSearchTool,
  geminiImageGenerationTool,
  presentationPreviewTool,
  geminiVideoGenerationTool,
  grokXSearchTool,
  imagen4GenerationTool,
  graphicRecordingTool,
  minimaxTTSTool,
  browserSessionTool,
  browserGotoTool,
  browserActTool,
  browserExtractTool,
  browserObserveTool,
  browserWaitTool,
  browserScreenshotTool,
  browserCloseTool,
  browserCaptchaDetectTool,
  // Enhanced browser tools
  browserContextCreateTool,
  browserContextUseTool,
  browserSessionQueryTool,
  browserDownloadTool,
  browserUploadTool,
  claudeAnalysisTool,
  claudeFileTool,
  claudeAutoEditTool,
  claudeCodeSDKTool,
  githubListIssuesTool,
  fileAppendTool,
  // Enhanced research tools (removed for build stability)
  // Visual editing tools
  visualSlideEditorTool,
  // Google Workspace tools
  googleSlidesCreationTool,
  googleSheetsCreationTool,
  googleDocsCreationTool,
  googleApiTestTool,
};
