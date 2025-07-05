import { MCPClient } from '@mastra/mcp';

export const mcp = new MCPClient({
  servers: {
    "chrome": {
      "command": "npx",
      "args": ["-y", "mcp-chrome-bridge"]
    }
  },
});