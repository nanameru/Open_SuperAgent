# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
# Start the development server (uses Turbopack)
npm run dev

# Start Mastra development server (REQUIRED - run in separate terminal)
mastra dev

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
- **Browser Automation**: Complete Browserbase integration for web automation
- **Search**: Brave Search API, Grok X search
- **Code Generation**: V0 code generation tool

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

### Adding New Tools
1. Create tool file in `src/mastra/tools/`
2. Export from `src/mastra/tools/index.ts`
3. Register in `src/mastra/index.ts`
4. Add to relevant agents in `src/mastra/agents/`

### Testing Presentations
1. Use the `/tools` page for interactive testing
2. Check browser console for streaming events
3. Preview slides with the presentation preview panel
4. Export to PPTX using the Nutrient method for best results

### Browser Automation Notes
- Avoid automating Google services (blocked by policy)
- Use `braveSearchTool` or `grokXSearchTool` instead of Google Search
- Browser sessions provide live view URLs for debugging