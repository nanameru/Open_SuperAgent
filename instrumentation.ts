export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { promises: fs } = await import('fs');
    const path = await import('path');
    const { NodeSDK, ATTR_SERVICE_NAME, resourceFromAttributes } = await import(
      '@mastra/core/telemetry/otel-vendor'
    );

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
} 