import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { LibSQLStore } from '@mastra/libsql';

import { weatherAgent, slideCreatorAgent, imageCreatorAgent } from './agents';
// import { htmlSlideTool } from './tools'; // This import is no longer needed if tools are not registered directly

export const mastra = new Mastra({
  agents: { 
    weatherAgent, 
    slideCreatorAgent,
    imageCreatorAgent
  },
  // Removed the tools property here
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: "file:../memory.db",
  }),
  logger: createLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
