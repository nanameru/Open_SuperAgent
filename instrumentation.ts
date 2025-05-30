import {
  NodeSDK,
  ATTR_SERVICE_NAME,
  resourceFromAttributes,
} from "@mastra/core/telemetry/otel-vendor";

export function register() {
  // resourceFromAttributesを使用してリソースを作成
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: "ai-agent-presentation",
  });

  const sdk = new NodeSDK({
    resource: resource,
    // 他の設定は必要に応じて追加
  });

  sdk.start();
} 