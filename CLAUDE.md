# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

---

## Project Overview

Open Claude Cowork is a **self-hosted web application** that provides a unified interface for interacting with AI agents. It supports multiple provider backends (Claude Agent SDK, Opencode SDK) with tool integration via Composio, and includes a knowledge base system with document processing via Docling.

**Deployment Target:** Self-hosted on Railway, Fly.io, or similar platforms.

**Current Status:** Alpha — Migrating from Electron to web-first architecture.

---

## Quick Reference

### Commands

```bash
# Setup
./setup.sh                    # Interactive setup: Composio CLI, API keys, deps

# Development (two terminals)
cd server && npm start        # Terminal 1: Backend server (port 3001)
cd renderer && npm run dev    # Terminal 2: Vite dev server (port 5173)

# Production build
cd renderer && npm run build  # Build static frontend
npm run start:prod            # Run production server serving static files

# Docker (recommended for deployment)
docker build -t open-claude-cowork .
docker run -p 3001:3001 --env-file .env open-claude-cowork
```

### Environment Variables (`.env`)

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
COMPOSIO_API_KEY=...

# Future (Phase 2.5+)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
DOCLING_URL=http://127.0.0.1:8765
LOG_LEVEL=info
```

---

## Architecture

### Process Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT                              │
│              (Railway / Fly.io / Docker)                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Express Server    │         │   Static Frontend   │
│   (server.js)       │◀───────▶│   (Vite React)      │
│   Port 3001         │   API   │   Served from /dist │
│                     │         │   or CDN            │
└─────────────────────┘         └─────────────────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌────────┐  ┌──────────┐
│ Claude │  │ Opencode │
│Provider│  │ Provider │
└────────┘  └──────────┘
    │
    ▼
┌──────────┐     ┌──────────┐
│ Composio │     │ Docling  │
│   MCP    │     │ Sidecar  │
└──────────┘     └──────────┘
```

### Key Directories

```
open-claude-cowork/
├── server/
│   ├── server.js              # Express backend, SSE streaming
│   ├── lib/                   # Utilities (logger, docling-client, etc.)
│   ├── routes/                # API route handlers
│   └── providers/
│       ├── base-provider.js   # Abstract interface
│       ├── claude-provider.js # Claude Agent SDK
│       ├── opencode-provider.js
│       └── index.js           # Provider registry
│
├── renderer/src/
│   ├── App.tsx                # Main React app
│   ├── assets/logos/          # Service logo SVGs and mapping
│   ├── utils/serviceExtractor.ts  # Extract services from tool names
│   ├── components/
│   │   ├── ChatArea.tsx       # Message display, markdown rendering
│   │   ├── AgentStudio.tsx    # Execution log, tool timeline
│   │   ├── ServiceLogo.tsx    # Branded service logos (20+ services)
│   │   ├── ToolTimelineIcon.tsx   # Timeline icon with status states
│   │   ├── WorkflowServiceLogos.tsx  # Stacked logos for workflows
│   │   └── Sidebar.tsx        # Sessions, knowledge base
│   └── types/index.ts         # TypeScript definitions
│
├── sidecar/                   # Docling Python service
│   └── docling_service/
│
├── Dockerfile                 # Production container
├── docker-compose.yml         # Full stack with Docling
└── specs/                     # Ralph specifications
```

### Provider Interface

All providers implement async generator `query()` yielding normalized chunks:

| Chunk Type | Purpose |
|------------|---------|
| `session_init` | New session started |
| `text` | Streaming text content |
| `tool_use` | Tool invocation with name/input |
| `tool_result` | Tool execution result |
| `done` | Stream completed |

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat` | POST | Main chat (message, chatId, provider, model) |
| `/api/providers` | GET | List available providers |
| `/api/health` | GET | Health check |

---

## Build Status

### ✅ Phase 0: Security - COMPLETE

| Task | File | Status |
|------|------|--------|
| XSS fix with DOMPurify | `ChatArea.tsx` | ✅ |
| Input validation | `server/middleware/validation.js` | ✅ |
| CORS restrictions | `server/server.js` | ✅ |

### ✅ Phase 1: Core Stability - COMPLETE

| Task | Status |
|------|--------|
| Error boundaries | ✅ `ErrorBoundary.tsx` |
| Structured logging (pino) | ✅ `lib/logger.js` |
| Session cleanup | ✅ TTL tracking |
| Graceful shutdown | ✅ SIGINT/SIGTERM handlers |
| Complete type definitions | ✅ `types/index.ts` |

### ✅ Phase 2: Feature Completion - COMPLETE

| Task | Status |
|------|--------|
| Knowledge base upload | ✅ Drag-drop in Sidebar |
| Workflow system | ✅ WorkflowWizard, routes |
| Tool connection management | ✅ ToolConnections modal |
| Tool logos & branding | ✅ ServiceLogo, 20+ service SVGs |

### ✅ Phase 2.5: Docling Sidecar - COMPLETE

| Task | Status |
|------|--------|
| Python FastAPI service | ✅ `sidecar/docling_service/` |
| Node.js client with circuit breaker | ✅ `lib/docling-client.js` |
| Sidecar process manager | ✅ `lib/sidecar-manager.js` |
| Document routes | ✅ `routes/documents.js` |
| Supabase schema | ✅ `scripts/setup_supabase.sql` |

### ✅ Phase 2.6: Agent Browser - COMPLETE

| Task | Status |
|------|--------|
| Browser CLI wrapper | ✅ `lib/agent-browser.js` |
| Browser tools for Claude | ✅ `lib/tool-executor.js` |
| Browser preview component | ✅ `BrowserPreview.tsx` |

### ✅ Phase 2.7: Enterprise Connectors - COMPLETE

| Task | Status |
|------|--------|
| SharePoint connector | ✅ `lib/connectors/sharepoint.js` |
| Google Drive connector | ✅ `lib/connectors/google-drive.js` |
| Sync service | ✅ `lib/sync-service.js` |
| Sync dashboard UI | ✅ `SyncDashboard.tsx` |

### ✅ Phase 5: Deployment Infrastructure - COMPLETE

| Task | Status |
|------|--------|
| Dockerfile | ✅ Multi-stage build |
| docker-compose.yml | ✅ Full stack + simple variants |
| Railway/Fly.io config | ✅ `fly.toml`, `railway.json`, `Procfile` |
| Environment management | ✅ `.env.example`, `lib/config.js` |
| Health checks | ✅ Comprehensive `/api/health` |

### 🟡 Phase 6-7: Future Work

| Phase | Description |
|-------|-------------|
| Phase 6 | Testing & Documentation |
| Phase 7 | Production Readiness (rate limiting, monitoring, etc.)

---

## Ralph Loop System

Ralph is a methodology for autonomous, loop-based code generation. Use it to grind through the remaining build tasks.

### Directory Structure

```
.ralph/
├── prompts/
│   └── current_task.md      # Active instruction for current loop
├── scripts/
│   └── run_loop.sh          # Bash execution harness
└── state/
    └── status.txt           # Loop state tracking

specs/
├── README.md                # Master spec (the Pin)
├── lookup.md                # Search optimization table
└── implementation.md        # Checklist with file linkage
```

### Bootstrap Ralph

```bash
# Create structure
mkdir -p .ralph/{prompts,scripts,state} specs

# Or ask Claude Code:
# "Read CLAUDE.md and bootstrap Ralph for this repo"
```

### The Pin (Specification)

**Never write specs by hand. Generate through interview.**

1. Study the codebase first
2. Interview about features (data models, edge cases, integration points)
3. Write `specs/README.md` as master spec
4. Create `specs/lookup.md` for search optimization
5. Create `specs/implementation.md` as checklist with file linkage

### Running a Loop

**Attended (Recommended for first runs):**

```bash
# In Claude Code, give single-objective tasks:
"Read specs/README.md and specs/implementation.md.
Execute ONLY task 0.1 (XSS fix). Follow existing patterns.
Write tests. Run them. If pass, commit and mark [x].
Stop when this single task is done."

# After completion, /clear or restart Claude Code
# Then give the next task
```

**Unattended (After trust is established):**

```bash
# Run the loop script
./.ralph/scripts/run_loop.sh
```

### Loop Prompt Template

Create `.ralph/prompts/current_task.md`:

```markdown
# OBJECTIVE: [Copy from specs/implementation.md]

## Context (Read First)
1. **Pin:** `specs/README.md`
2. **Lookup:** `specs/lookup.md`
3. **Plan:** `specs/implementation.md` — Current task only

## Constraints
1. Follow existing patterns. Do not invent.
2. Write tests first or alongside.
3. Run test command specified in task.
4. On pass: commit, update implementation.md to [x], write "TASK_COMPLETE" to state
5. On fail: analyze, fix, retry

## Exit Condition
Task checkbox marked [x] AND tests pass.
```

### Back-Pressure Protocol

If the loop produces garbage:

1. **STOP** immediately (Ctrl+C)
2. **Do NOT argue** in the chat
3. **EDIT** the spec or prompt to add constraints
4. **RESTART** with fresh context

Common fixes:
- Add more explicit file references
- Tighten acceptance criteria
- Add negative constraints ("Do NOT...")
- Improve lookup table for better search

### Key Principles

> "The prompt is your steering wheel. The code is just the exhaust."

> "Specs are the anchor. Without them, you drift into invention."

> "Less context = less sliding = less degradation."

---

## Suggested Next Steps

### Option A: Start with Security (Recommended)

Phase 0 is marked BLOCKING. Bootstrap Ralph and run through:

1. Task 0.1: XSS fix with DOMPurify
2. Task 0.2: Input validation
3. Task 0.3: CORS restrictions

### Option B: Continue UI Polish

If you want visible progress first, continue from Engineering Log:
- Code block copy buttons
- Syntax highlighting
- Message actions (copy, retry, delete)

### Bootstrap Command

Tell Claude Code:

```
Read CLAUDE.md completely. The build plan is in the project files.
Bootstrap Ralph for this repo. We're starting with Phase 0 security fixes.
Interview me briefly, then generate the specs.
```

---

## Provider-Specific Notes

### Claude Provider
- Uses `@anthropic-ai/claude-agent-sdk`
- Session resumption via session_id
- Permission mode: bypassPermissions

### Opencode Provider
- Uses `@opencode-ai/sdk`
- Creates local server on port 4096
- MCP config in `server/opencode.json`
- Default model: `opencode/big-pickle`

### Default Allowed Tools

Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch, TodoWrite

---

## Deployment Notes

### Self-Hosted Requirements

- Node.js 18+ for Express server
- Python 3.10+ for Docling sidecar (optional, for document processing)
- PostgreSQL via Supabase (for persistence)
- Reverse proxy (nginx/Caddy) for production

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...
COMPOSIO_API_KEY=...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=...
DOCLING_URL=http://localhost:8765
CORS_ORIGINS=https://your-domain.com
```

### Docker Deployment

```bash
# Build and run
docker-compose up -d

# Or single container (without Docling)
docker build -t open-claude-cowork .
docker run -p 3001:3001 --env-file .env open-claude-cowork
```

---

## References

- **Build Plan:** `Build Plan - Open Claude Cowork` (in project docs)
- **Engineering Log:** `Engineering Log - Open Claude Cowork` (in project docs)
- **Ralph Methodology:** See Ralph Loops documentation

---

*Last Updated: January 23, 2026 (Tool Logos feature added)*