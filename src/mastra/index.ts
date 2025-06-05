// @ts-nocheck
import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';
import { weatherAgent, slideCreatorAgent, imageCreatorAgent } from './agents';
import { 
  htmlSlideTool, 
  presentationPreviewTool,
  braveSearchTool,
  geminiImageGenerationTool,
  geminiVideoGenerationTool,
  grokXSearchTool,
  imagen4GenerationTool,
  v0CodeGenerationTool,
  graphicRecordingTool,
  minimaxTTSTool,
  weatherTool
} from './tools';
import { deepResearchWorkflow } from './workflows';

// @ts-ignore - Type definition issue with tools property
export const mastra = new Mastra({
  agents: { 
    weatherAgent,
    slideCreatorAgent, 
    imageCreatorAgent,
  },
  tools: { 
    htmlSlideTool, 
    presentationPreviewTool,
    braveSearchTool,
    geminiImageGenerationTool,
    geminiVideoGenerationTool,
    grokXSearchTool,
    imagen4GenerationTool,
    v0CodeGenerationTool,
    graphicRecordingTool,
    minimaxTTSTool,
    weatherTool,
  } as any,
  workflows: {
    'deep-research': deepResearchWorkflow,
  },
  storage: new LibSQLStore({
    url: "file:../memory.db",
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    timeout: 120000,
    port: 4111,
  },
});
