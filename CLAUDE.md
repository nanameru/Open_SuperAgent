# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
**重要**: 以下の2つのサーバーを別々のターミナルで起動する必要があります：

#### Terminal 1: Mastraサーバー（MCP統合に必須）
```bash
# Mastra development server (ポート4111で起動)
npm run dev:mastra
# または
mastra dev
```

#### Terminal 2: Next.jsアプリケーションサーバー
```bash
# Start the development server (uses Turbopack)
npm run dev
```

#### その他のコマンド
```bash
# Build Mastra agents
mastra build
```

### Build & Production
```bash
# Build the application
npm build

# Start production server
npm start

# Run linting
npm run lint
```

### Common Port Issues
If you encounter `EADDRINUSE` errors:
```bash
# Find process using port (e.g., 4114)
lsof -i :4114 | grep LISTEN | cat

# Kill the process (replace PID)
kill -9 <PID>

# Restart Mastra
mastra dev
```

## High-Level Architecture

### Technology Stack
- **Frontend**: Next.js 15 (App Router), React 19, TailwindCSS, shadcn/ui
- **Backend**: Mastra agent framework
- **AI Services**: OpenAI GPT-4.1, Anthropic Claude, Google Gemini, X.AI Grok
- **Database**: LibSQL (SQLite) for Mastra memory storage
- **Deployment**: Optimized for Vercel

### Core Agent System
The application uses Mastra's agent framework with three main agents:
1. **slideCreatorAgent (Open-SuperAgent)**: The primary agent with access to all tools
2. **imageCreatorAgent**: Specialized for image generation tasks
3. **weatherAgent**: Basic weather information agent

### Tool Ecosystem
Tools are modular and located in `src/mastra/tools/`:
- **Presentation Tools**: `htmlSlideTool` (12 layouts, 11 diagram types), `presentationPreviewTool`
- **Media Generation**: Gemini/Imagen4 for images, Gemini for video, MiniMax for TTS
- **Browser Automation**: Complete Browserbase integration with stealth mode and CAPTCHA solving
- **Search**: Brave Search API, Grok X search
- **Code Generation**: V0 code generation tool
- **MCP Tools**: Dynamic integration with Model Context Protocol servers

### API Routes Structure
All API endpoints are in `app/api/`:
- `/chat`: Main chat endpoint with streaming support
- `/slide-creator/chat`: Specialized presentation chat interface
- `/export-pptx*`: Four different PPTX export methods
- `/media/*`: Image, video, and music generation endpoints

### Mastra Integration Points
1. **Configuration**: `mastra.config.ts` and `src/mastra/index.ts`
2. **Memory**: Conversation history stored in `.mastra/memory.db`
3. **Telemetry**: Enabled for monitoring agent executions
4. **Server**: Runs on port 4111 with 120-second timeout

### Environment Variables Required
The application requires multiple API keys:
```bash
# Core AI Services
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY

# Specialized Services
BROWSERBASE_API_KEY
BROWSERBASE_PROJECT_ID
XAI_API_KEY
BRAVE_API_KEY
V0_API_KEY
FAL_KEY
NUTRIENT_API_KEY
MINIMAX_API_KEY
MINIMAX_GROUP_ID

# MCP Services (Optional)
GITHUB_TOKEN        # For GitHub MCP server
TAVILY_API_KEY      # For web search MCP server
```

### PPTX Export Methods
1. **Basic**: Image-based export using html2canvas
2. **Advanced**: HTML parsing with direct PPTX generation
3. **Hybrid**: Combines both approaches
4. **Nutrient API**: Professional-grade conversion (recommended)

### License Structure
- **Project Code**: MIT License with Commercial Use Restrictions
- **Mastra Framework**: Elastic License 2.0 (ELv2)
- Commercial use restricted to AI Freak Summit/AIで遊ぼう community members

## Development Workflow

### Quick Start
1. **Terminal 1**: `npm run dev:mastra` (Mastraサーバー起動)
2. **Terminal 2**: `npm run dev` (Next.jsアプリ起動)
3. **Chrome MCP** (オプション): Chrome拡張機能をインストールして「Connect」をクリック

### Adding New Tools
1. Create tool file in `src/mastra/tools/`
2. Export from `src/mastra/tools/index.ts`
3. Register in `src/mastra/index.ts`
4. Add to relevant agents in `src/mastra/agents/`

### MCP (Model Context Protocol) Integration

The application now supports MCP servers for extended capabilities:

#### Available MCP Servers
1. **Filesystem Server**: File operations in the current directory
2. **GitHub Server**: Repository operations (requires GITHUB_TOKEN)
3. **Sequential Thinking**: Complex reasoning tasks
4. **Memory Server**: Persistent storage capabilities
5. **Web Search**: Tavily search integration (requires TAVILY_API_KEY)
6. **Chrome MCP Server**: Control your Chrome browser with AI - 20+ tools for automation, screenshots, network monitoring, and more

#### Configuration
MCP servers are configured in `src/mastra/config/mcp.config.ts`. The system automatically:
- Detects available API keys from environment variables
- Initializes only the servers with valid credentials
- Dynamically adds MCP tools to the slideCreatorAgent

#### Adding New MCP Servers
To add a new MCP server:
1. Add the server configuration to `mcpServerConfigs` in `mcp.config.ts`
2. Include any required environment variables
3. The tools will be automatically available to agents

Example:
```typescript
newServer: process.env.NEW_API_KEY ? {
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-new'],
  env: {
    ...process.env,
    NEW_API_KEY: process.env.NEW_API_KEY,
  },
} : undefined,
```

#### Chrome MCP Server Setup

Chrome MCP Server allows AI agents to control your actual Chrome browser, maintaining login states and user settings.

##### Prerequisites
1. Chrome/Chromium browser
2. Node.js 18+

##### Installation Steps

1. **Install Chrome Extension**
   - Download from [GitHub Releases](https://github.com/hangwin/mcp-chrome/releases)
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the downloaded extension folder
   - **重要**: Click the extension icon and then "Connect" - これによりポート12306でサーバーが起動します

2. **Install mcp-chrome-bridge**
   ```bash
   npm install -g mcp-chrome-bridge
   # or with pnpm
   pnpm install -g mcp-chrome-bridge
   ```

3. **Configure Connection Type**
   Set in your `.env` file:
   ```bash
   # Use streamableHttp (recommended)
   CHROME_MCP_CONNECTION_TYPE=streamableHttp
   
   # Or use stdio (requires path configuration)
   CHROME_MCP_CONNECTION_TYPE=stdio
   MCP_CHROME_BRIDGE_PATH=/path/to/mcp-chrome-bridge/dist/mcp/mcp-server-stdio.js
   ```

4. **Verify Chrome MCP Server is Running**
   ```bash
   # Check if Chrome MCP Server is listening on port 12306
   lsof -i :12306
   ```

##### Troubleshooting Chrome MCP Server

**よくある問題と解決方法：**

1. **Connection Refused エラー**
   ```bash
   # 症状: MCP error -32000: Connection closed
   # 解決: Chrome拡張機能で「Connect」ボタンをクリック
   ```

2. **Extension Not Found**
   ```bash
   # 症状: Chrome拡張機能が見つからない
   # 解決手順:
   1. Chrome拡張機能を再インストール
   2. Developer modeが有効になっているか確認
   3. 拡張機能の権限を確認
   ```

3. **Port Already in Use**
   ```bash
   # 症状: ポート12306が使用中
   # 確認: lsof -i :12306
   # 解決: 使用中のプロセスを終了してから再接続
   ```

4. **mcp-chrome-bridge Not Found**
   ```bash
   # 症状: mcp-chrome-bridge command not found
   # 解決:
   npm install -g mcp-chrome-bridge
   # または権限の修正:
   mcp-chrome-bridge fix-permissions
   ```

5. **Agent が既存ツールを使用してしまう**
   ```bash
   # 症状: 「Chrome MCPを使って」と指示してもBrowserbaseツールが実行される
   # 原因: Chrome MCP Serverが接続されていない
   # 解決: 上記1-4の手順で接続を確認
   ```

**接続状況の確認方法：**
```bash
# Chrome MCP Serverの動作確認
lsof -i :12306

# Mastraログでの確認
# ログに「✅ Chrome MCP Server is available」が表示されるか確認
```

##### Available Chrome Tools
- **Browser Management**: Tab control, navigation, session management
- **Screenshots**: Full page or element-specific captures
- **Network Monitoring**: Intercept and analyze network requests
- **Content Analysis**: AI-powered text extraction and semantic search
- **Interaction**: Click, type, and automate browser actions
- **Data Management**: Bookmarks, history, and local storage access

##### Usage Examples
- Take screenshots of specific elements
- Automate form filling with existing login states
- Monitor API calls and responses
- Extract and analyze webpage content
- Control browser tabs programmatically

### Testing Presentations
1. Use the `/tools` page for interactive testing
2. Check browser console for streaming events
3. Preview slides with the presentation preview panel
4. Export to PPTX using the Nutrient method for best results

### Browser Automation Features

#### Available Tools
- `browserSessionTool`: Create sessions with stealth mode and CAPTCHA settings
- `browserGotoTool`: Navigate to URLs
- `browserActTool`: Perform AI-driven actions (click, type, etc.)
- `browserExtractTool`: Extract structured data from pages
- `browserObserveTool`: Observe page elements and suggest actions
- `browserScreenshotTool`: Capture page screenshots
- `browserWaitTool`: Wait for specified durations
- `browserWaitForCaptchaTool`: Monitor and wait for CAPTCHA solving
- `browserCloseTool`: Close browser sessions

#### Stealth Mode & CAPTCHA Features
The browser automation system includes stealth capabilities:

**Basic Stealth Mode** (included by default):
- Automatic browser fingerprint randomization
- Random viewport generation
- Visual CAPTCHA solving

**Custom CAPTCHA Support**:
```json
{
  "browserSettings": {
    "captchaImageSelector": "#captcha-image",
    "captchaInputSelector": "#captcha-input"
  }
}
```

#### Usage Examples

**Creating a session with CAPTCHA solving**:
```javascript
// Basic stealth with CAPTCHA solving (enabled by default)
const session = await browserSessionTool({
  browserSettings: {
    solveCaptchas: true
  },
  proxies: true
});

// Custom CAPTCHA selectors
const customSession = await browserSessionTool({
  browserSettings: {
    solveCaptchas: true,
    captchaImageSelector: "#custom-captcha-image",
    captchaInputSelector: "#custom-captcha-input"
  },
  proxies: true
});
```

**Monitoring CAPTCHA solving**:
```javascript
// Wait for CAPTCHA to be solved automatically
const result = await browserWaitForCaptchaTool({
  sessionId: "session-id",
  timeout: 30000
});
```

#### Best Practices
- Always enable proxies (`proxies: true`) for better success rates
- CAPTCHA solving can take up to 30 seconds
- Basic stealth mode is automatically enabled for all sessions
- Avoid automating Google services (blocked by policy)
- Use `webSearchTool` or `grokXSearchTool` instead of Google Search
- Browser sessions provide live view URLs for debugging