# Open Claude Cowork

A modern desktop application for AI-powered workflow automation with multi-provider support and real-time tool execution visualization.

## Overview

Open Claude Cowork is an Electron-based chat application that provides a unified interface for interacting with AI agents. It features:

- **Multi-Provider Support**: Switch between Claude Agent SDK and Opencode SDK
- **Tool Integration**: 500+ app integrations via Composio MCP
- **Real-Time Execution Visualization**: Watch tools execute with branded icons and status tracking
- **Workflow Templates**: Save and reuse common automation patterns
- **Knowledge Base**: Attach documents to enhance AI context

## Features

### Multi-Provider Architecture
- **Claude Provider**: Uses Anthropic's Claude Agent SDK with session resumption
- **Opencode Provider**: Alternative backend with local server support
- Unified streaming interface across all providers

### Tool Execution Visualization
- Real-time progress tracking with **branded service logos** (Gmail, Slack, GitHub, etc.)
- 20+ service logos rendered as inline SVGs for offline support
- Smart tool name humanization (e.g., `mcp_composio_GMAIL_SEND` -> "Gmail Send")
- Visual state transitions: Running (animated pulse) -> Completed (green checkmark)
- Expandable details showing input/output

### Service Logo Integration
- **Execution Timeline**: Shows branded logos for each tool during execution
- **Saved Workflows**: Displays logos of services used by each workflow
- **Tool Connections**: Branded logos in the OAuth connection management modal
- Auto-detection of services from workflow prompts

### Composio Integration
- 500+ app connections (Gmail, Google Drive, Slack, GitHub, etc.)
- MCP (Model Context Protocol) for tool discovery
- OAuth authentication flows
- Per-session tool access

### Rich Chat Experience
- Markdown rendering with syntax highlighting
- Streaming responses
- Artifact support for code blocks and documents
- Session management with history

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- API Keys:
  - Anthropic API Key (for Claude provider)
  - Composio API Key (for tool integrations)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/open-claude-cowork.git
cd open-claude-cowork

# Run interactive setup
./setup.sh
```

The setup script will:
1. Install Composio CLI
2. Configure API keys
3. Install all dependencies
4. Set up OAuth connections

### Manual Installation

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install renderer dependencies
cd ../renderer && npm install

# Create .env file in server directory
# Add your API keys:
# ANTHROPIC_API_KEY=sk-ant-...
# COMPOSIO_API_KEY=...
```

### Running the Application

```bash
# Terminal 1: Start the backend server
cd server && npm start

# Terminal 2: Start the frontend (Vite dev server)
cd renderer && npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
open-claude-cowork/
├── main.js                 # Electron main process
├── preload.js              # Electron preload bridge
├── package.json            # Root package.json
│
├── server/                 # Backend server
│   ├── server.js           # Express server (port 3001)
│   ├── providers/          # AI provider implementations
│   │   ├── base-provider.js
│   │   ├── claude-provider.js
│   │   ├── opencode-provider.js
│   │   └── index.js
│   └── package.json
│
├── renderer/               # Frontend (React + Vite)
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── components/
│   │   │   ├── ChatArea.tsx      # Chat interface
│   │   │   ├── AgentStudio.tsx   # Workflows + Execution log
│   │   │   ├── Sidebar.tsx       # Sessions + Knowledge base
│   │   │   └── ...
│   │   ├── services/
│   │   │   └── chatService.ts    # API communication
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript definitions
│   │   └── styles/
│   │       └── globals.css       # Global styles
│   └── package.json
│
├── CLAUDE.md               # AI assistant guidance
├── ENGINEERING_LOG.md      # Development changelog
└── BUILD_PLAN.md           # Roadmap
```

## Architecture

### Communication Flow

```
┌──────────────┐    HTTP/SSE    ┌──────────────┐    SDK    ┌──────────────┐
│   Renderer   │ <------------> │    Server    │ <-------> │  AI Provider │
│   (React)    │                │  (Express)   │           │  (Claude/OC) │
└──────────────┘                └──────────────┘           └──────────────┘
                                       │
                                       │ MCP
                                       ▼
                                ┌──────────────┐
                                │   Composio   │
                                │   (Tools)    │
                                └──────────────┘
```

### Provider Interface

All providers implement the same async generator interface:

```typescript
interface Provider {
  query(options: QueryOptions): AsyncGenerator<StreamChunk>;
}

type StreamChunk =
  | { type: 'session_init'; session_id: string }
  | { type: 'text'; content: string }
  | { type: 'tool_use'; name: string; input: object; tool_use_id: string }
  | { type: 'tool_result'; result: any; tool_use_id: string }
  | { type: 'done' };
```

## Configuration

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
COMPOSIO_API_KEY=...

# Optional
PORT=3001
NODE_ENV=development
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Main chat endpoint (SSE stream) |
| `/api/providers` | GET | List available providers |
| `/api/health` | GET | Health check |

### Chat Request Body

```json
{
  "message": "Help me draft an email",
  "chatId": "session-123",
  "provider": "claude",
  "model": "claude-sonnet-4-20250514"
}
```

## Development

### Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express
- **Desktop**: Electron
- **AI**: Claude Agent SDK, Opencode SDK
- **Tools**: Composio MCP

### Scripts

```bash
# Development
cd renderer && npm run dev    # Start frontend with hot reload
cd server && npm start        # Start backend server

# Production
npm run build                 # Build for production
npm start                     # Run Electron app
```

### Adding a New Provider

1. Create `server/providers/your-provider.js`:

```javascript
import { BaseProvider } from './base-provider.js';

export class YourProvider extends BaseProvider {
  async *query({ message, chatId, model, mcpServers }) {
    // Yield chunks as described in the interface
    yield { type: 'text', content: 'Hello!' };
    yield { type: 'done' };
  }
}
```

2. Register in `server/providers/index.js`:

```javascript
import { YourProvider } from './your-provider.js';
registerProvider('your-provider', YourProvider);
```

## UI Components

### Execution Progress Panel

The right sidebar shows real-time tool execution with:

- **Smart Branding**: Recognizes tools and shows appropriate icons (Gmail, Docs, GitHub, etc.)
- **Timeline View**: Two-column grid with vertical connector line
- **Status Indicators**: Spinner for running, green checkmark for completed
- **Expandable Details**: Click to view input parameters and output

### Chat Area

- **Markdown Rendering**: Full GFM support with syntax highlighting
- **Streaming**: Real-time text streaming from AI
- **Artifacts**: Special rendering for code blocks and documents

## Troubleshooting

### Common Issues

**Server won't start**
- Check that port 3001 is available
- Verify API keys in `.env`
- Run `npm install` in server directory

**Tools not working**
- Run `composio whoami` to verify CLI auth
- Check Composio dashboard for connection status
- Re-run OAuth flow if needed

**Spinners stuck in "Running" state**
- This has been fixed with fail-safe sweep on stream end
- Ensure you're running the latest code

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) for Claude Agent SDK
- [Composio](https://composio.dev) for tool integrations
- [Electron](https://electronjs.org) for desktop framework
- [Vite](https://vitejs.dev) for blazing fast builds
