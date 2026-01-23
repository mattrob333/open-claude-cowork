# Implementation Plan

## Status: IN PROGRESS

**Architecture:** Self-hosted web application (migrated from Electron)
**Deployment Target:** Railway, Fly.io, or Docker

### Legend
- [ ] Not started
- [~] In progress
- [x] Complete

---

## ✅ Completed Work (Jan 22, 2026)

- [x] **UI: Tool name humanizer**
  - File: `renderer/src/components/AgentStudio.tsx`
  - Added `humanizeToolName()` function

- [x] **UI: Markdown rendering**
  - File: `renderer/src/components/ChatArea.tsx`
  - Integrated `marked` library

- [x] **UI: Timeline grid layout**
  - File: `renderer/src/components/AgentStudio.tsx`
  - Two-column CSS grid

- [x] **UI: Smart tool branding**
  - File: `renderer/src/components/AgentStudio.tsx`
  - Added `getToolIcon()` with brand icons

- [x] **UI: Zombie spinner fix**
  - Files: `renderer/src/App.tsx`, `renderer/src/types/index.ts`
  - Added `toolUseId`, fail-safe sweep in finally block

---

## Phase 0: Security Fixes (BLOCKING)

> Must complete before other work proceeds.

- [x] **0.1: Fix XSS in Markdown Rendering**
  - Spec Ref: Build Plan → Phase 0 → 0.1
  - File: `renderer/src/components/ChatArea.tsx` (lines 116-121)
  - Action: Install DOMPurify, wrap `marked.parse()` output
  - Test: Send `<script>alert('xss')</script>`, verify stripped
  - Commit: `fix: sanitize markdown output with DOMPurify`

- [x] **0.2: Add Input Validation**
  - Spec Ref: Build Plan → Phase 0 → 0.2
  - Files:
    - Create: `server/middleware/validation.js`
    - Modify: `server/server.js` (add body limits, validation middleware)
  - Test: Send 10MB message → expect 413; send invalid chatId → expect 400
  - Commit: `fix: add input validation and request limits`

- [ ] **0.3: Add CORS Restrictions**
  - Spec Ref: Build Plan → Phase 0 → 0.3
  - File: `server/server.js` (line 57)
  - Action: Replace `cors()` with origin whitelist
  - Test: Request from unknown origin → CORS error
  - Commit: `fix: restrict CORS to known origins`

---

## Phase 1: Core Stability

- [ ] **1.1: React Error Boundaries**
  - Spec Ref: Build Plan → Phase 1 → 1.1
  - Create: `renderer/src/components/ErrorBoundary.tsx`
  - Modify: `renderer/src/App.tsx` (wrap ChatArea, AgentStudio, Sidebar)
  - Test: Throw error in component → fallback renders
  - Commit: `feat: add error boundaries for graceful failure`

- [ ] **1.2: Structured Logging**
  - Spec Ref: Build Plan → Phase 1 → 1.2
  - Create: `server/lib/logger.js`
  - Modify: `server/server.js` (replace console.log/error)
  - Test: Requests show requestId, duration in logs
  - Commit: `feat: add structured logging with pino`

- [ ] **1.3: Session Cleanup**
  - Spec Ref: Build Plan → Phase 1 → 1.3
  - File: `server/server.js`
  - Action: Add TTL tracking, cleanup interval
  - Modify: `renderer/src/App.tsx` (cap toolLogs at 100)
  - Test: Session expires after 24h unused
  - Commit: `feat: add session cleanup and memory management`

- [ ] **1.4: Graceful Shutdown**
  - Spec Ref: Build Plan → Phase 1 → 1.4
  - File: `server/server.js` (lines 364-370)
  - Action: Replace SIGINT handler with full cleanup
  - Test: SIGINT → sessions cleaned, providers cleaned, exit 0
  - Commit: `feat: implement graceful shutdown`

- [ ] **1.5: Complete Type Definitions**
  - Spec Ref: Build Plan → Phase 1 → 1.5
  - File: `renderer/src/types/index.ts`
  - Action: Add StreamChunk, Chat, ToolCall, Document types
  - Test: No TypeScript errors, no `any` types
  - Commit: `feat: complete TypeScript definitions`

---

## Phase 2: Feature Completion

- [ ] **2.1: Knowledge Base Upload**
  - Spec Ref: Build Plan → Phase 2 → 2.1
  - File: `renderer/src/components/Sidebar.tsx`
  - Action: Add drag-drop zone, file validation, progress indicator
  - Test: Upload PDF → appears in list
  - Commit: `feat: add knowledge base file upload`

- [ ] **2.2: Workflow System**
  - Spec Ref: Build Plan → Phase 2 → 2.2
  - Create: `renderer/src/components/WorkflowWizard.tsx`
  - Create: `server/routes/workflows.js`
  - Test: Create workflow → save → run with variables
  - Commit: `feat: implement workflow system`

- [ ] **2.3: Tool Connection Management**
  - Spec Ref: Build Plan → Phase 2 → 2.3
  - Action: Panel showing OAuth apps, status, reconnect flow
  - Test: View connections → reconnect expired
  - Commit: `feat: add tool connection management UI`

---

## Phase 2.5: Docling Sidecar

- [ ] **2.5.1: Docling FastAPI Service**
  - Spec Ref: Build Plan → Phase 2.5 → Epic 1
  - Create: `sidecar/docling_service/main.py`
  - Create: `sidecar/docling_service/requirements.txt`
  - Test: `/health` returns 200; `/parse/sync` parses PDF
  - Commit: `feat: add Docling sidecar service`

- [ ] **2.5.2: Node.js Docling Client**
  - Spec Ref: Build Plan → Phase 2.5 → Epic 2
  - Create: `server/lib/docling-client.js`
  - Test: Circuit breaker opens after 5 failures
  - Commit: `feat: add resilient Docling client`

- [ ] **2.5.3: Sidecar Process Manager**
  - Spec Ref: Build Plan → Phase 2.5 → Epic 3
  - Create: `server/lib/sidecar-manager.js`
  - Test: Sidecar auto-restarts on crash
  - Commit: `feat: add sidecar lifecycle management`

- [ ] **2.5.4: Document Routes**
  - Spec Ref: Build Plan → Phase 2.5 → Epic 4
  - Create: `server/routes/documents.js`
  - Test: POST upload → GET list → GET single
  - Commit: `feat: add document upload API`

- [ ] **2.5.5: Supabase Schema**
  - Spec Ref: Build Plan → Phase 2.5 → Epic 5
  - Create: `scripts/setup_supabase.sql`
  - Test: Tables created, RLS policies applied
  - Commit: `feat: add Supabase document schema`

---

## Phase 2.6: Agent Browser

- [ ] **2.6.1: Browser CLI Wrapper**
  - Spec Ref: Build Plan → Phase 2.6 → Epic 1
  - Create: `server/lib/agent-browser.js`
  - Test: `navigate`, `click`, `screenshot` work
  - Commit: `feat: add agent-browser wrapper`

- [ ] **2.6.2: Browser Tools for Claude**
  - Spec Ref: Build Plan → Phase 2.6 → Epic 2
  - Modify: `server/providers/claude-provider.js`
  - Create: `server/lib/tool-executor.js`
  - Test: Claude can navigate and screenshot
  - Commit: `feat: add browser tools to Claude provider`

- [ ] **2.6.3: Browser Preview Component**
  - Spec Ref: Build Plan → Phase 2.6 → Epic 3
  - Create: `renderer/src/components/BrowserPreview.tsx`
  - Modify: `renderer/src/components/AgentStudio.tsx`
  - Test: Screenshots render with browser chrome
  - Commit: `feat: add browser screenshot preview`

---

## Phase 2.7: Enterprise Connectors

- [ ] **2.7.1: Database Schema**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 1
  - Modify: `scripts/setup_supabase.sql`
  - Test: source_files, processing_queue tables exist
  - Commit: `feat: add enterprise connector schema`

- [ ] **2.7.2: SharePoint Connector**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 2
  - Create: `server/lib/connectors/sharepoint.js`
  - Test: List and download files via Composio
  - Commit: `feat: add SharePoint connector`

- [ ] **2.7.3: Google Drive Connector**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 3
  - Create: `server/lib/connectors/google-drive.js`
  - Test: List files, export Google Docs
  - Commit: `feat: add Google Drive connector`

- [ ] **2.7.4: Sync Service**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 4
  - Create: `server/lib/sync-service.js`
  - Test: Sync detects new/changed files
  - Commit: `feat: add document sync service`

- [ ] **2.7.5: Sync API Routes**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 5
  - Create: `server/routes/sources.js`
  - Test: CRUD sources, trigger sync
  - Commit: `feat: add sync management API`

- [ ] **2.7.6: Sync Dashboard UI**
  - Spec Ref: Build Plan → Phase 2.7 → Epic 6
  - Create: `renderer/src/components/SyncDashboard.tsx`
  - Test: View sources, trigger sync, see queue
  - Commit: `feat: add sync dashboard component`

---

## Phase 5: Deployment Infrastructure

> Replaces Electron desktop build with self-hosted web deployment.

- [ ] **5.1: Dockerfile**
  - Create: `Dockerfile`
  - Multi-stage build: Node for server, static files for frontend
  - Test: `docker build` succeeds, container runs
  - Commit: `feat: add production Dockerfile`

- [ ] **5.2: Docker Compose**
  - Create: `docker-compose.yml`
  - Services: app, docling-sidecar, (optional) postgres
  - Test: `docker-compose up` brings up full stack
  - Commit: `feat: add docker-compose for full stack`

- [ ] **5.3: Static File Serving**
  - Modify: `server/server.js`
  - Action: Serve `renderer/dist` in production mode
  - Test: Production build serves frontend from Express
  - Commit: `feat: serve static frontend from Express in production`

- [ ] **5.4: Environment Configuration**
  - Create: `.env.example`
  - Create: `server/lib/config.js` (validated env loading)
  - Test: Missing required vars throws clear error
  - Commit: `feat: add environment configuration management`

- [ ] **5.5: Health Check Endpoint**
  - Modify: `server/server.js`
  - Action: Expand `/api/health` with service checks
  - Test: Returns degraded status if Docling down
  - Commit: `feat: add comprehensive health checks`

- [ ] **5.6: Railway/Fly.io Config**
  - Create: `fly.toml` or `railway.json`
  - Action: Configure auto-deploy, health checks, scaling
  - Test: Deploy succeeds on platform
  - Commit: `feat: add cloud deployment config`

---

## Phase 6-7: Future Work

See Build Plan for details on:
- Phase 6: Testing & Documentation
- Phase 7: Production Readiness (rate limiting, monitoring, etc.)

Note: Desktop/Electron features removed — this is now a web-first application.

---

## Notes

- Each task references the Build Plan section with exact code snippets
- Follow existing patterns in the codebase
- Run tests before committing
- Update this file as tasks complete