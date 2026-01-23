# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Open Claude Cowork is an Electron desktop chat application that provides a unified interface for interacting with AI agents. It supports two provider backends: Claude Agent SDK and Opencode SDK, with tool integration via Composio.

## Commands

### Setup
```bash
./setup.sh              # Interactive setup: installs Composio CLI, configures API keys, installs deps
```

### Development
```bash
# Terminal 1 - Start the backend server (required first)
cd server && npm start

# Terminal 2 - Start the Electron app
npm start               # Production mode
npm run dev             # Development mode with hot reload
```

### Server only
```bash
npm run server          # Runs server from root directory
```

## Architecture

### Two-Process Structure
- **Electron Main** (`main.js`): Creates browser window, handles app lifecycle
- **Backend Server** (`server/server.js`): Express server on port 3001, handles all AI interactions

### Provider Abstraction
The system uses a provider pattern to support multiple AI backends with a unified interface:

```
server/providers/
├── base-provider.js      # Abstract base class defining the interface
├── claude-provider.js    # Claude Agent SDK implementation
├── opencode-provider.js  # Opencode SDK implementation
└── index.js              # Provider registry and factory
```

All providers implement the same `query()` async generator interface, yielding normalized chunks:
- `session_init` - New session started
- `text` - Streaming text content
- `tool_use` - Tool invocation with name/input
- `tool_result` - Tool execution result
- `done` - Stream completed

### Communication Flow
1. Renderer (`renderer/renderer.js`) calls `window.electronAPI.sendMessage()`
2. Preload bridge (`preload.js`) makes HTTP request to backend
3. Server creates Composio session, gets MCP URL
4. Server calls provider's `query()` generator
5. Response streams as SSE back to renderer

### Composio Integration
Composio provides tool access via MCP (Model Context Protocol):
- Session created per-user on first request
- MCP URL/headers passed to providers in `mcpServers` config
- For Opencode provider, MCP config is also written to `server/opencode.json`

### Frontend Structure
```
renderer/
├── index.html    # Main UI with home/chat views, provider/model selectors
├── style.css     # Claude-inspired styling
└── renderer.js   # UI logic, message handling, streaming display
```

## Key Configuration

### Environment Variables (`.env`)
```
ANTHROPIC_API_KEY=      # Required for Claude provider
COMPOSIO_API_KEY=       # Required for Composio tool integration
```

### API Endpoints
- `POST /api/chat` - Main chat endpoint, accepts: message, chatId, provider, model
- `GET /api/providers` - List available providers
- `GET /api/health` - Health check

### Default Allowed Tools
Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, TodoWrite

## Provider-Specific Notes

### Claude Provider
- Uses `@anthropic-ai/claude-agent-sdk`
- Session resumption via session_id
- Permission mode: bypassPermissions

### Opencode Provider
- Uses `@opencode-ai/sdk`
- Creates local server on port 4096 or connects to existing
- MCP config must be in `server/opencode.json`
- Default model: `opencode/big-pickle`
