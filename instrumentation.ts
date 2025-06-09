import { promises as fs } from 'fs';
import path from 'path';
import {
  NodeSDK,
  ATTR_SERVICE_NAME,
  resourceFromAttributes,
} from "@mastra/core/telemetry/otel-vendor";

async function cleanupAgentDirectory() {
  const directory = path.join(process.cwd(), 'public', 'slidecreatorAgent');
  try {
    // Check if the directory exists
    await fs.access(directory);

    // Read all files and subdirectories
    const files = await fs.readdir(directory);
    for (const file of files) {
      const filePath = path.join(directory, file);
      // Remove each file/directory recursively
      await fs.rm(filePath, { recursive: true, force: true });
    }
    console.log(`Successfully cleaned up ${directory}`);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Directory doesn't exist, which is fine.
      console.log(`Directory not found, skipping cleanup: ${directory}`);
    } else {
      // Other errors
      console.error(`Error cleaning up agent directory: ${error.message}`);
    }
  }
}

export async function register() {
  // Clean up the directory on startup
  await cleanupAgentDirectory();

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