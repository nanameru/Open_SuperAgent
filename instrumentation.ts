import {
  NodeSDK,
  ATTR_SERVICE_NAME,
  resourceFromAttributes,
} from "@mastra/core/telemetry/otel-vendor";

export function register() {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "ai-agent-presentation",
  });

  const sdk = new NodeSDK({
    resource: resource,
    // Other configurations can be added as needed
  });

  sdk.start();
} 