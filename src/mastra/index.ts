// @ts-nocheck
import { Mastra } from '@mastra/core';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';
import { weatherAgent, slideCreatorAgent, imageCreatorAgent } from './agents';
import { 
  queryPlanningAgent, 
  researchAnalysisAgent, 
  researchSynthesisAgent, 
  knowledgeGapAgent, 
  sourceValidationAgent 
} from './agents/researchAgent';
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
  weatherTool,
  // Enhanced research tools removed for build stability
} from './tools';
// Deep Research workflow import removed

// @ts-ignore - Type definition issue with tools property
export const mastra = new Mastra({
  agents: { 
    weatherAgent,
    slideCreatorAgent, 
    imageCreatorAgent,
    // Research agents
    queryPlanningAgent,
    researchAnalysisAgent,
    researchSynthesisAgent,
    knowledgeGapAgent,
    sourceValidationAgent,
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
    // Enhanced research tools removed for build stability
  } as any,
  workflows: {
    // Deep Research workflow removed
  },
  storage: new LibSQLStore({
    url: "file:../memory.db", // Always use local file for now, Supabase integration pending
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
  server: {
    timeout: 300000,
    port: 4111,
  },
});
