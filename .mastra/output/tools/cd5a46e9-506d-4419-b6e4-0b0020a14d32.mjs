import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
export { htmlSlideTool } from './bda54312-fbd4-4e67-99b6-66b35e8679ea.mjs';
export { braveSearchTool } from './eb1b1170-08d6-41ce-a5e1-3271de5a5d79.mjs';
export { geminiImageGenerationTool } from './fe0dafcf-0a67-4d6e-a2a3-dbe897170387.mjs';
export { presentationPreviewTool } from './fae41b45-90b9-492a-93c7-0567a9caa2a5.mjs';
export { geminiVideoGenerationTool } from './572d84fc-caea-4418-a4b9-5cdf521536e1.mjs';
export { grokXSearchTool } from './ebbb97d5-c5dc-4c9a-b6dd-e1098faef34d.mjs';
export { imagen4GenerationTool } from './18dbf69b-69d9-420b-81e7-33475fc19ffa.mjs';
export { v0CodeGenerationTool } from './682b06fb-a452-45fd-a008-50bc12b760e8.mjs';
export { graphicRecordingTool } from './06c1407c-4a15-4fa7-9be3-1ddd08b55728.mjs';
export { minimaxTTSTool } from './948e93db-05f1-413d-ad40-05a8b5e04b52.mjs';
export { browserSessionTool } from './155d013f-c02e-4d73-9741-f9333e0bf294.mjs';
export { browserGotoTool } from './293a9d03-f1f6-452a-9c48-261256da7715.mjs';
export { browserActTool } from './4e29e948-d7fd-4d94-b685-42056bb5cef4.mjs';
export { browserExtractTool } from './e2e63f88-9bf1-4b32-9c2e-507b826d8c43.mjs';
export { browserObserveTool } from './385e9d90-380c-42a5-9aa3-f5e20865f57d.mjs';
export { browserWaitTool } from './7fe6b591-66fb-4855-bf9c-d1e6d5b6bec4.mjs';
export { browserScreenshotTool } from './ff78c37d-66ab-44eb-9c1e-bbc952c57e9b.mjs';
export { browserCloseTool } from './9e3569bd-9b19-4175-8897-7d9090be0309.mjs';
import 'ai';
import '@ai-sdk/anthropic';
import 'axios';
import 'fs';
import 'path';
import 'uuid';
import '@fal-ai/client';
import './e34421b8-ddc2-48c1-85c7-7109191e75d8.mjs';
import 'fs/promises';

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

export { weatherTool };
//# sourceMappingURL=cd5a46e9-506d-4419-b6e4-0b0020a14d32.mjs.map
