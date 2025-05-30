import { Mastra } from "@mastra/core";

export const mastra = new Mastra({
  // テレメトリ設定
  telemetry: {
    serviceName: "ai-agent-presentation",
    enabled: true,
  },
}); 