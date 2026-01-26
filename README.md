# Get Shit Done Bot

> "GET SHIT **DONE.**" - The AI Agent That Takes Action.

A modern web application for AI-powered task automation with multi-provider support and real-time tool execution visualization.

## Overview

Get Shit Done Bot is a React-based chat application that provides a unified interface for interacting with AI agents. It features:

- **Multi-Provider Support**: Switch between Claude Agent SDK and Opencode SDK
- **Tool Integration**: 500+ app integrations via Composio MCP (Gmail, Slack, GitHub, etc.)
- **GitHub Integration**: Create repos, push files, create PRs - all from natural language
- **Real-Time Execution Visualization**: Watch tools execute with branded icons and status tracking
- **Workflow Templates**: Save and reuse common automation patterns
- **Knowledge Base**: Persistent document storage with chunk-based context injection
- **Ephemeral Context**: Drag-drop files for immediate chat context (no persistence)

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

### GitHub Integration
Once connected via Composio OAuth, you can:
- **Create repositories**: "Create a new repo called my-awesome-app"
- **Push files**: "Add a README.md and package.json to the repo"
- **Create branches**: "Create a feature branch for the login system"
- **Create pull requests**: "Open a PR from feature/login to main"
- **Manage issues**: "Create an issue about the API rate limiting bug"

Example workflow:
```
User: "I have an idea for a todo app. Create a new GitHub repo,
       set up the file structure for a React app, and push it."

Claude: [Creates repo via GITHUB_CREATE_REPOSITORY]
        [Generates file structure]
        [Pushes files via GITHUB_PUSH_FILES]
        "Done! Your repo is ready at github.com/you/todo-app"
```

### Document Context System
Two ways to provide document context to the AI:

**Knowledge Base (Persistent)**
- Upload documents via drag-drop in the sidebar
- Documents are processed by Docling and stored in Supabase
- Toggle documents on/off to include in chat context
- Persists across sessions

**Ephemeral Context (Session-only)**
- Drag-drop files directly into the chat input area
- Appears as chips above the input field
- Included in current chat only
- Discarded when session ends

### Rich Chat Experience
- Markdown rendering with syntax highlighting
- Streaming responses
- Artifact support for code blocks and documents
- Session management with history

### Flexible UI
- **Resizable Sidebars**: Drag the edges to resize left and right panels
- **Grouped Model Selector**: Models organized by provider (Claude, Opencode)
- **Dark Theme**: Optimized for extended use

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

### Connecting GitHub (and other services)

1. Start the application
2. Click the gear icon in the right sidebar to open "Tool Connections"
3. Click "Connect" next to GitHub
4. Complete the OAuth flow in the browser popup
5. Once connected, you can ask the AI to create repos, push code, etc.

Or via CLI:
```bash
composio add github
```

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
