import { MCPClient } from '@mastra/mcp';

/**
 * Chrome MCP Clientの設定と管理
 */
export class ChromeMCPClient {
  private client: MCPClient | null = null;
  private isConnected = false;

  /**
   * Chrome MCP Serverに接続
   */
  async connect(): Promise<boolean> {
    if (this.isConnected && this.client) {
      return true; // Already connected
    }

    try {
      console.log('🔄 Attempting to connect to Chrome MCP Server...');
      
      this.client = new MCPClient({
        servers: {
          "chrome": {
            "command": "npx",
            "args": ["-y", "mcp-chrome-bridge"]
          }
        },
      });

      // 短いタイムアウトで接続テスト
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 5000); // 5秒タイムアウト
      });

      const tools = await Promise.race([
        this.client.getTools(),
        timeoutPromise
      ]) as Record<string, any>;

      this.isConnected = Object.keys(tools).length > 0;
      
      if (this.isConnected) {
        console.log(`✅ Chrome MCP connected with ${Object.keys(tools).length} tools`);
        return true;
      } else {
        console.log('⚠️ Chrome MCP connected but no tools available');
        return false;
      }
    } catch (error: any) {
      console.log('❌ Chrome MCP connection failed:', error?.message || 'Unknown error');
      console.log('💡 Chrome extension may not be installed or connected');
      this.isConnected = false;
      this.client = null;
      return false;
    }
  }

  /**
   * 利用可能なツールを取得
   */
  async getTools(): Promise<Record<string, any>> {
    if (!this.client || !this.isConnected) {
      throw new Error('Chrome MCP not connected. Please connect first.');
    }
    return await this.client.getTools();
  }

  /**
   * 接続状況を確認
   */
  get connected(): boolean {
    return this.isConnected;
  }

  /**
   * 接続を切断
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
      } catch (error) {
        console.log('Chrome MCP disconnect warning:', error);
      }
      this.client = null;
      this.isConnected = false;
      console.log('Chrome MCP disconnected');
    }
  }
}

// シングルトンインスタンス
export const chromeMCPClient = new ChromeMCPClient();