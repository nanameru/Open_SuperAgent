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
  webSearchTool,
  geminiImageGenerationTool,
  geminiVideoGenerationTool,
  grokXSearchTool,
  imagen4GenerationTool,
  graphicRecordingTool,
  minimaxTTSTool,
  weatherTool,
  // Google Workspace tools
  googleSlidesCreationTool,
  googleSheetsCreationTool,
  googleDocsCreationTool,
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
    webSearchTool,
    geminiImageGenerationTool,
    geminiVideoGenerationTool,
    grokXSearchTool,
    imagen4GenerationTool,
    graphicRecordingTool,
    minimaxTTSTool,
    weatherTool,
    // Google Workspace tools
    googleSlidesCreationTool,
    googleSheetsCreationTool,
    googleDocsCreationTool,
    // Enhanced research tools removed for build stability
  } as any,
  workflows: {
    // Deep Research workflow removed
  },
  storage: new LibSQLStore({
    url: process.env.NODE_ENV === 'production' 
      ? "file:./memory.db"     // Vercel: /var/task/memory.db
      : "file:../memory.db",   // Local: プロジェクトルート/memory.db
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

