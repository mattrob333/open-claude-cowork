# Build Plan - Open Claude Cowork

## Version: 2.0 (Revised January 23, 2026)
## Status: Alpha → Production-Ready Roadmap

This document provides unambiguous specifications for building Open Claude Cowork to enterprise-grade quality. Each task includes acceptance criteria, file paths, and verification steps.

---

## Table of Contents

1. [Phase 0: Security Fixes (IMMEDIATE)](#phase-0-security-fixes-immediate)
2. [Phase 1: Core Stability (HIGH)](#phase-1-core-stability-high)
3. [Phase 2: Feature Completion (HIGH)](#phase-2-feature-completion-high)
4. [Phase 2.5: Document Pipeline - Docling Sidecar](#phase-25-document-pipeline---docling-sidecar)
5. [Phase 2.6: Agent Browser Integration](#phase-26-agent-browser-integration)
6. [Phase 2.7: Enterprise Document Connectors](#phase-27-enterprise-document-connectors-composio-based)
7. [Phase 3: UI Polish (MEDIUM)](#phase-3-ui-polish-medium)
8. [Phase 4: Performance (MEDIUM)](#phase-4-performance-medium)
9. [Phase 5: Desktop Integration (LOW)](#phase-5-desktop-integration-low)
10. [Phase 6: Testing & Documentation (MEDIUM)](#phase-6-testing--documentation-medium)
11. [Phase 7: Production Readiness (HIGH)](#phase-7-production-readiness-high)

---

## Phase 0: Security Fixes (IMMEDIATE)

> **BLOCKING**: These must be completed before any other work proceeds.

### 0.1 Fix XSS Vulnerability in Markdown Rendering

**Problem**: `ChatArea.tsx` uses `dangerouslySetInnerHTML` with unsanitized markdown output. Malicious AI responses or injected content could execute arbitrary JavaScript.

**File**: `renderer/src/components/ChatArea.tsx`

**Current Code (lines 116-121)**:
```typescript
const htmlContent = marked.parse(msg.content) as string;
return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
```

**Required Changes**:

1. Install DOMPurify:
   ```bash
   cd renderer && npm install dompurify @types/dompurify
   ```

2. Update `ChatArea.tsx`:
   ```typescript
   import DOMPurify from 'dompurify';

   // Configure DOMPurify
   const purifyConfig = {
     ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li',
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'blockquote', 'table',
                    'thead', 'tbody', 'tr', 'th', 'td', 'img', 'span', 'div'],
     ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'target', 'rel'],
     ALLOW_DATA_ATTR: false
   };

   // In render function
   const htmlContent = marked.parse(msg.content) as string;
   const sanitizedHtml = DOMPurify.sanitize(htmlContent, purifyConfig);
   return <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
   ```

**Verification**:
- Send message containing `<script>alert('xss')</script>`
- Verify script tag is stripped, no alert appears
- Send message with `<img src=x onerror="alert('xss')">`
- Verify onerror is stripped

**Acceptance Criteria**:
- [ ] DOMPurify installed and imported
- [ ] All `dangerouslySetInnerHTML` usage sanitized
- [ ] XSS test cases pass
- [ ] Markdown still renders correctly (bold, code, links work)

---

### 0.2 Add Input Validation and Request Limits

**Problem**: Server accepts any input without validation. DoS and injection attacks possible.

**File**: `server/server.js`

**Required Changes**:

1. Install validation library:
   ```bash
   cd server && npm install express-validator
   ```

2. Add body parser limits (add after line 15):
   ```javascript
   app.use(express.json({ limit: '1mb' }));
   app.use(express.urlencoded({ extended: true, limit: '1mb' }));
   ```

3. Create validation middleware `server/middleware/validation.js`:
   ```javascript
   import { body, header, validationResult } from 'express-validator';

   export const chatValidation = [
     body('message')
       .isString()
       .isLength({ min: 1, max: 100000 })
       .withMessage('Message must be 1-100000 characters'),
     body('chatId')
       .optional()
       .isUUID()
       .withMessage('chatId must be valid UUID'),
     body('provider')
       .optional()
       .isIn(['claude', 'opencode'])
       .withMessage('Invalid provider'),
     body('model')
       .optional()
       .isString()
       .isLength({ max: 100 })
   ];

   export const validateRequest = (req, res, next) => {
     const errors = validationResult(req);
     if (!errors.isEmpty()) {
       return res.status(400).json({
         error: 'Validation failed',
         details: errors.array()
       });
     }
     next();
   };
   ```

4. Apply to `/api/chat` endpoint (server.js line 78):
   ```javascript
   import { chatValidation, validateRequest } from './middleware/validation.js';

   app.post('/api/chat', chatValidation, validateRequest, async (req, res) => {
     // existing handler
   });
   ```

5. Sanitize workflow variables (server.js line 272-274):
   ```javascript
   // BEFORE (vulnerable):
   prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);

   // AFTER (safe):
   const sanitizedValue = value.replace(/[<>'"&]/g, '');
   prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), sanitizedValue);
   ```

**Verification**:
- Send 10MB message → Expect 413 Payload Too Large
- Send message with chatId="not-a-uuid" → Expect 400 with validation error
- Send workflow with `{{var}}` = `<script>alert(1)</script>` → Verify sanitized

**Acceptance Criteria**:
- [ ] Body size limited to 1MB
- [ ] Message length validated (1-100000 chars)
- [ ] chatId validated as UUID when provided
- [ ] Provider validated against allowed list
- [ ] Workflow variables sanitized

---

### 0.3 Add CORS Restrictions

**Problem**: Server allows all origins. Should restrict to known frontends.

**File**: `server/server.js`

**Current Code (line 57)**:
```javascript
app.use(cors());
```

**Required Changes**:
```javascript
const allowedOrigins = [
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',  // Production build
  'file://'                 // Electron file protocol
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Electron, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true
}));
```

**Acceptance Criteria**:
- [ ] Localhost:5173 requests succeed
- [ ] Unknown origin requests rejected with CORS error
- [ ] Electron app requests work (no origin header)

---

## Phase 1: Core Stability (HIGH)

### 1.1 React Error Boundaries

**Problem**: No error boundaries. Single component error crashes entire app.

**Files to Create**:

1. `renderer/src/components/ErrorBoundary.tsx`:
   ```typescript
   import React, { Component, ErrorInfo, ReactNode } from 'react';

   interface Props {
     children: ReactNode;
     fallback?: ReactNode;
     onError?: (error: Error, errorInfo: ErrorInfo) => void;
   }

   interface State {
     hasError: boolean;
     error: Error | null;
   }

   export class ErrorBoundary extends Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false, error: null };
     }

     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('[ErrorBoundary]', error, errorInfo);
       this.props.onError?.(error, errorInfo);
       // TODO: Send to error tracking service (Sentry)
     }

     handleRetry = () => {
       this.setState({ hasError: false, error: null });
     };

     render() {
       if (this.state.hasError) {
         return this.props.fallback || (
           <div className="flex flex-col items-center justify-center p-8 bg-red-900/20 rounded-lg">
             <h2 className="text-lg font-bold text-red-400 mb-2">Something went wrong</h2>
             <p className="text-sm text-gray-400 mb-4">
               {this.state.error?.message || 'An unexpected error occurred'}
             </p>
             <button
               onClick={this.handleRetry}
               className="px-4 py-2 bg-accent text-white rounded hover:bg-accent/80"
             >
               Try Again
             </button>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

2. Wrap components in `App.tsx`:
   ```typescript
   import { ErrorBoundary } from './components/ErrorBoundary';

   // Wrap each major section
   <ErrorBoundary>
     <ChatArea ... />
   </ErrorBoundary>

   <ErrorBoundary>
     <AgentStudio ... />
   </ErrorBoundary>

   <ErrorBoundary>
     <Sidebar ... />
   </ErrorBoundary>
   ```

**Acceptance Criteria**:
- [ ] ErrorBoundary component created
- [ ] Wrapped around ChatArea, AgentStudio, Sidebar
- [ ] Fallback UI renders on error
- [ ] "Try Again" button resets error state
- [ ] Errors logged to console with stack trace

---

### 1.2 Structured Logging

**Problem**: Console.log only. No log levels, correlation IDs, or structured format.

**Files to Create**:

1. Install pino:
   ```bash
   cd server && npm install pino pino-pretty
   ```

2. `server/lib/logger.js`:
   ```javascript
   import pino from 'pino';

   const isProduction = process.env.NODE_ENV === 'production';

   export const logger = pino({
     level: process.env.LOG_LEVEL || 'info',
     transport: isProduction ? undefined : {
       target: 'pino-pretty',
       options: { colorize: true }
     },
     base: {
       service: 'open-claude-cowork',
       version: process.env.npm_package_version
     }
   });

   // Request logger middleware
   export const requestLogger = (req, res, next) => {
     const requestId = req.headers['x-request-id'] || crypto.randomUUID();
     req.requestId = requestId;
     res.setHeader('X-Request-ID', requestId);

     const startTime = Date.now();

     res.on('finish', () => {
       logger.info({
         requestId,
         method: req.method,
         url: req.url,
         status: res.statusCode,
         duration: Date.now() - startTime
       }, 'request completed');
     });

     next();
   };

   export default logger;
   ```

3. Update `server/server.js`:
   ```javascript
   import logger, { requestLogger } from './lib/logger.js';

   // Replace all console.log/error with:
   logger.info({ key: 'value' }, 'message');
   logger.error({ error: err.message }, 'operation failed');

   // Add middleware after cors()
   app.use(requestLogger);
   ```

**Acceptance Criteria**:
- [ ] pino logger installed and configured
- [ ] All console.log replaced with logger.info/debug
- [ ] All console.error replaced with logger.error
- [ ] Request IDs added to all requests
- [ ] Request duration logged

---

### 1.3 Session Cleanup and Memory Management

**Problem**: Sessions stored in memory indefinitely. Memory leak in long-running deployments.

**File**: `server/server.js`

**Required Changes**:

1. Add session TTL tracking:
   ```javascript
   const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

   // Change Map structure
   const composioSessions = new Map(); // { session, mcpUrl, headers, createdAt, lastUsed }

   // Update session creation (line ~112)
   composioSessions.set(userId, {
     session,
     mcpUrl,
     headers,
     createdAt: Date.now(),
     lastUsed: Date.now()
   });

   // Update session access
   const sessionData = composioSessions.get(userId);
   sessionData.lastUsed = Date.now();
   ```

2. Add cleanup interval:
   ```javascript
   // Run every hour
   setInterval(() => {
     const now = Date.now();
     for (const [userId, sessionData] of composioSessions) {
       if (now - sessionData.lastUsed > SESSION_TTL_MS) {
         logger.info({ userId }, 'Cleaning up expired session');
         composioSessions.delete(userId);
       }
     }
   }, 60 * 60 * 1000);
   ```

3. Add tool log limits in `renderer/src/App.tsx`:
   ```typescript
   const MAX_TOOL_LOGS = 100;

   // In tool_use handler
   setToolLogs(prev => {
     const updated = [...prev, toolLog];
     return updated.slice(-MAX_TOOL_LOGS); // Keep last 100
   });
   ```

**Acceptance Criteria**:
- [ ] Sessions have createdAt and lastUsed timestamps
- [ ] Cleanup runs hourly
- [ ] Sessions older than 24h (unused) are removed
- [ ] Tool logs capped at 100 per session

---

### 1.4 Graceful Shutdown

**Problem**: SIGINT handler doesn't cleanup resources properly.

**File**: `server/server.js`

**Replace lines 364-370 with**:
```javascript
const gracefulShutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received');

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    // Cleanup Composio sessions
    for (const [userId, sessionData] of composioSessions) {
      try {
        // If Composio has cleanup method, call it
        logger.info({ userId }, 'Cleaning up session');
      } catch (err) {
        logger.error({ userId, error: err.message }, 'Session cleanup failed');
      }
    }
    composioSessions.clear();

    // Cleanup providers
    try {
      const { cleanup } = await import('./providers/index.js');
      await cleanup();
    } catch (err) {
      logger.error({ error: err.message }, 'Provider cleanup failed');
    }

    // Stop Docling sidecar if running
    try {
      const { stopSidecar } = await import('./lib/sidecar-manager.js');
      stopSidecar();
    } catch (err) {
      // Sidecar may not be initialized
    }

    logger.info('Shutdown complete');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
```

**Acceptance Criteria**:
- [ ] SIGINT and SIGTERM handled
- [ ] Sessions cleaned up on shutdown
- [ ] Providers cleaned up on shutdown
- [ ] Force exit after 30s timeout
- [ ] All cleanup logged

---

### 1.5 Complete Type Definitions

**Problem**: Types file missing StreamChunk, Chat, ToolCall types. Uses `any` throughout.

**File**: `renderer/src/types/index.ts`

**Replace entire file with**:
```typescript
// ============ Enums ============

export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ToolStatus = 'running' | 'done' | 'error';

// ============ Core Types ============

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isArtifact?: boolean;
  artifactMetadata?: {
    type: string;
    title: string;
  };
  editedAt?: number;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  type: 'image' | 'document' | 'code';
  url: string;
  size: number;
}

export interface Session {
  id: string;
  title: string;
  lastActive: number;
  createdAt?: number;
  archivedAt?: number;
  tags?: string[];
}

export interface Chat {
  id: string;
  session: Session;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// ============ Tool Types ============

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  status: ToolStatus;
  result?: unknown;
  error?: string;
  duration?: number;
}

export interface ToolLogEntry {
  id: string;
  toolUseId?: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: ToolStatus;
  timestamp: number;
  duration?: number;
  error?: string;
}

// ============ Stream Types ============

export type StreamChunk =
  | { type: 'session_init'; session_id: string }
  | { type: 'text'; content: string }
  | { type: 'tool_use'; id?: string; tool_use_id?: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; id?: string; tool_use_id?: string; result: unknown; content?: unknown }
  | { type: 'error'; message: string; code?: string }
  | { type: 'done' };

// ============ Model & Provider Types ============

export interface ModelOption {
  id: string;
  name: string;
  provider: 'Claude' | 'Opencode';
  contextWindow?: number;
  maxTokens?: number;
}

export interface Provider {
  id: string;
  name: string;
  models: ModelOption[];
  status: 'available' | 'unavailable' | 'error';
}

// ============ Knowledge Base Types ============

export interface KnowledgeAsset {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'json' | 'md';
  size?: string;
  isActive: boolean;
}

export interface Document {
  id: string;
  userId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  publicUrl: string;
  storagePath: string;
  parsedMarkdown?: string;
  pageChunks?: PageChunk[];
  totalPages?: number;
  wordCount?: number;
  processingStatus: ProcessingStatus;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageChunk {
  page: number;
  content: string;
  tables?: TableData[];
  images?: ImageData[];
  headings?: string[];
}

export interface TableData {
  rows: string[][];
  headers?: string[];
}

export interface ImageData {
  src: string;
  alt?: string;
  caption?: string;
}

// ============ Workflow Types ============

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  systemPrompt?: string;
  variables?: WorkflowVariable[];
  createdAt?: number;
  updatedAt?: number;
}

export interface WorkflowVariable {
  name: string;
  type: 'text' | 'select' | 'number' | 'boolean';
  label: string;
  placeholder?: string;
  options?: string[]; // For select type
  default?: string | number | boolean;
  required?: boolean;
}

export interface Workflow {
  id: string;
  templateId: string;
  variables: Record<string, string | number | boolean>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
}

// ============ API Types ============

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  providers: string[];
  services?: {
    docling?: { status: string; latency?: number };
    supabase?: { status: string };
  };
}
```

**Acceptance Criteria**:
- [ ] All types defined with no `any`
- [ ] StreamChunk is discriminated union
- [ ] Document and PageChunk types defined
- [ ] All types exported
- [ ] No TypeScript errors in consuming files

---

## Phase 2: Feature Completion (HIGH)

### 2.1 Knowledge Base Upload

**Files to Modify**: `renderer/src/components/Sidebar.tsx`

**Implementation**:
1. Add drag-and-drop zone
2. File type validation (PDF, DOCX, TXT, JSON, MD)
3. Upload progress indicator
4. Error handling with user feedback

**Acceptance Criteria**:
- [ ] Drag-and-drop zone in Knowledge Base section
- [ ] Click to upload with file picker
- [ ] Progress bar during upload
- [ ] File appears in list after upload
- [ ] Error toast on failure

---

### 2.2 Workflow System

**Files**: `renderer/src/components/WorkflowWizard.tsx`, `server/routes/workflows.js`

**Acceptance Criteria**:
- [ ] Create workflow from conversation
- [ ] Define variables with types
- [ ] Save to localStorage
- [ ] Export/import as JSON
- [ ] Run workflow with variable substitution

---

### 2.3 Tool Connection Management

**Acceptance Criteria**:
- [ ] Panel showing connected OAuth apps
- [ ] Status indicators (connected/expired/error)
- [ ] Reconnect button for expired tokens
- [ ] Add new connection flow

---

## Phase 2.5: Document Pipeline - Docling Sidecar

> **IMPORTANT**: This replaces the MCP-based approach. We use a REST sidecar for reliability.

### Architecture Overview

```
Express Backend (3001) --HTTP--> Docling Sidecar (8765) --lib--> docling
        |                              |
        |                         FastAPI + uvicorn
        |                         (bundled executable)
        v
   Supabase Storage + DB
```

### Epic 1: Docling Sidecar Service (Python)

**File**: `sidecar/docling_service/main.py`

```python
"""
Docling REST Service - Wraps docling library in FastAPI for reliable document parsing.
Run with: uvicorn main:app --host 127.0.0.1 --port 8765
"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from docling.document_converter import DocumentConverter
import tempfile
import httpx
import uuid
import os
from typing import Optional, Dict, Any, List
from enum import Enum

app = FastAPI(title="Docling Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory job store
jobs: Dict[str, Dict[str, Any]] = {}

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class ParseRequest(BaseModel):
    file_url: str
    document_id: str
    options: Optional[Dict] = None

class PageChunk(BaseModel):
    page: int
    content: str
    tables: List[Dict] = []
    images: List[Dict] = []
    headings: List[str] = []

class ParseResult(BaseModel):
    markdown: str
    page_chunks: List[PageChunk]
    total_pages: int
    word_count: int

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "docling"}

@app.post("/parse/sync")
async def parse_document_sync(request: ParseRequest) -> Dict[str, Any]:
    """Synchronous parsing - blocks until complete"""
    try:
        result = await do_parse(request.file_url)
        return {"status": "completed", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/parse")
async def parse_document_async(request: ParseRequest, background_tasks: BackgroundTasks):
    """Queue document for async parsing"""
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": JobStatus.PENDING,
        "document_id": request.document_id,
        "result": None,
        "error": None
    }
    background_tasks.add_task(process_document, job_id, request)
    return {"job_id": job_id, "status": "pending"}

@app.get("/parse/{job_id}")
async def get_job_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

async def process_document(job_id: str, request: ParseRequest):
    jobs[job_id]["status"] = JobStatus.PROCESSING
    try:
        result = await do_parse(request.file_url)
        jobs[job_id]["status"] = JobStatus.COMPLETED
        jobs[job_id]["result"] = result
    except Exception as e:
        jobs[job_id]["status"] = JobStatus.FAILED
        jobs[job_id]["error"] = str(e)

async def do_parse(file_url: str) -> Dict[str, Any]:
    """Core parsing logic using Docling"""
    # Download file
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(file_url)
        response.raise_for_status()

    # Determine file extension from URL
    ext = ".pdf" if ".pdf" in file_url.lower() else ".docx"

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(response.content)
        tmp_path = tmp.name

    try:
        converter = DocumentConverter()
        result = converter.convert(tmp_path)
        doc = result.document

        # Extract page-level content
        page_chunks = []
        markdown_parts = []

        # Docling provides structured document access
        full_markdown = doc.export_to_markdown()

        # Split by page markers if available, otherwise treat as single page
        page_texts = full_markdown.split("\n---\n") if "\n---\n" in full_markdown else [full_markdown]

        for page_no, page_text in enumerate(page_texts, start=1):
            page_chunks.append({
                "page": page_no,
                "content": page_text.strip(),
                "tables": [],
                "images": [],
                "headings": []
            })

        return {
            "markdown": full_markdown,
            "page_chunks": page_chunks,
            "total_pages": len(page_chunks),
            "word_count": len(full_markdown.split())
        }
    finally:
        os.unlink(tmp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)
```

**File**: `sidecar/docling_service/requirements.txt`
```
docling>=2.0.0
fastapi>=0.100.0
uvicorn>=0.23.0
httpx>=0.24.0
pydantic>=2.0.0
```

**Acceptance Criteria**:
- [ ] FastAPI service runs on port 8765
- [ ] `/health` returns 200 with status
- [ ] `/parse/sync` accepts URL and returns parsed content
- [ ] `/parse` queues async job and returns job_id
- [ ] `/parse/{job_id}` returns job status
- [ ] PDF and DOCX files parse successfully
- [ ] Page-level content extracted

---

### Epic 2: Node.js Docling Client with Resilience

**File**: `server/lib/docling-client.js`

```javascript
/**
 * Resilient Docling client with circuit breaker and retry logic
 */

const DOCLING_URL = process.env.DOCLING_URL || 'http://127.0.0.1:8765';

// Circuit breaker state
const circuitBreaker = {
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  failures: 0,
  lastFailure: null,
  threshold: 5,
  resetTimeout: 30000
};

function getBackoffDelay(attempt, baseMs = 1000) {
  const exponential = Math.pow(2, attempt) * baseMs;
  const jitter = Math.random() * 1000;
  return Math.min(exponential + jitter, 30000);
}

function shouldAllowRequest() {
  if (circuitBreaker.state === 'CLOSED') return true;
  if (circuitBreaker.state === 'OPEN') {
    if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTimeout) {
      circuitBreaker.state = 'HALF_OPEN';
      return true;
    }
    return false;
  }
  return true;
}

function recordResult(success) {
  if (success) {
    circuitBreaker.failures = 0;
    circuitBreaker.state = 'CLOSED';
  } else {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    if (circuitBreaker.failures >= circuitBreaker.threshold) {
      circuitBreaker.state = 'OPEN';
    }
  }
}

export async function checkHealth() {
  try {
    const response = await fetch(`${DOCLING_URL}/health`, {
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function parseDocument(fileUrl, documentId, options = {}) {
  const maxRetries = options.maxRetries || 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (!shouldAllowRequest()) {
      throw new Error('Docling service unavailable (circuit open)');
    }

    try {
      const response = await fetch(`${DOCLING_URL}/parse/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: fileUrl,
          document_id: documentId,
          options: options.parseOptions
        }),
        signal: AbortSignal.timeout(options.timeout || 180000)
      });

      if (!response.ok) {
        throw new Error(`Docling returned ${response.status}`);
      }

      const result = await response.json();
      recordResult(true);
      return result.result;

    } catch (error) {
      recordResult(false);

      if (attempt < maxRetries - 1) {
        const delay = getBackoffDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Docling parsing failed after ${maxRetries} attempts`);
}

export function getCircuitStatus() {
  return { ...circuitBreaker };
}
```

**Acceptance Criteria**:
- [ ] Circuit breaker opens after 5 consecutive failures
- [ ] Circuit resets after 30 seconds
- [ ] Exponential backoff with jitter between retries
- [ ] Max 3 retry attempts
- [ ] Timeout configurable (default 3 minutes)

---

### Epic 3: Sidecar Process Manager

**File**: `server/lib/sidecar-manager.js`

```javascript
/**
 * Manages Docling sidecar process lifecycle
 */
import { spawn } from 'child_process';
import path from 'path';
import { checkHealth } from './docling-client.js';
import logger from './logger.js';

let sidecarProcess = null;
let healthCheckInterval = null;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;

export async function startSidecar() {
  if (sidecarProcess) {
    logger.info('Sidecar already running');
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  return new Promise((resolve, reject) => {
    if (isProduction) {
      // Use bundled executable
      const exePath = getSidecarPath();
      sidecarProcess = spawn(exePath, [], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });
    } else {
      // Development: run Python directly
      sidecarProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8765'], {
        cwd: path.join(process.cwd(), 'sidecar', 'docling_service'),
        stdio: ['ignore', 'pipe', 'pipe']
      });
    }

    sidecarProcess.stdout.on('data', (data) => {
      logger.debug({ output: data.toString().trim() }, 'Sidecar stdout');
    });

    sidecarProcess.stderr.on('data', (data) => {
      logger.warn({ output: data.toString().trim() }, 'Sidecar stderr');
    });

    sidecarProcess.on('error', (error) => {
      logger.error({ error: error.message }, 'Sidecar process error');
      handleExit();
    });

    sidecarProcess.on('exit', (code, signal) => {
      logger.info({ code, signal }, 'Sidecar exited');
      sidecarProcess = null;
      handleExit();
    });

    waitForHealth(15000)
      .then(() => {
        logger.info('Sidecar started successfully');
        restartAttempts = 0;
        startHealthMonitor();
        resolve();
      })
      .catch(reject);
  });
}

function getSidecarPath() {
  const platform = process.platform;
  const basePath = path.join(process.cwd(), 'sidecar', 'dist');

  if (platform === 'win32') return path.join(basePath, 'docling_service.exe');
  return path.join(basePath, 'docling_service');
}

async function waitForHealth(timeoutMs) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await checkHealth()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Sidecar failed to become healthy');
}

function startHealthMonitor() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(async () => {
    if (sidecarProcess && !(await checkHealth())) {
      logger.warn('Sidecar health check failed');
      stopSidecar();
      handleExit();
    }
  }, 30000);
}

function handleExit() {
  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    logger.error('Max restart attempts reached');
    return;
  }
  restartAttempts++;
  const delay = Math.pow(2, restartAttempts) * 1000;
  logger.info({ delay, attempt: restartAttempts }, 'Scheduling sidecar restart');
  setTimeout(() => startSidecar().catch(logger.error), delay);
}

export function stopSidecar() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
  if (sidecarProcess) {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', sidecarProcess.pid.toString(), '/f', '/t']);
    } else {
      sidecarProcess.kill('SIGTERM');
    }
    sidecarProcess = null;
  }
}

export function getSidecarStatus() {
  return {
    running: sidecarProcess !== null,
    pid: sidecarProcess?.pid,
    restartAttempts
  };
}
```

**Acceptance Criteria**:
- [ ] Sidecar starts on server startup
- [ ] Health monitored every 30 seconds
- [ ] Auto-restart with exponential backoff
- [ ] Max 5 restart attempts
- [ ] Cross-platform process termination

---

### Epic 4: Document Routes

**File**: `server/routes/documents.js`

```javascript
import express from 'express';
import multer from 'multer';
import { parseDocument } from '../lib/docling-client.js';
import { createClient } from '@supabase/supabase-js';
import logger from '../lib/logger.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json',
      'text/markdown'
    ];
    cb(null, allowed.includes(file.mimetype));
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  const { file } = req;
  const userId = req.headers['x-user-id'] || 'default';

  if (!file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  try {
    const storagePath = `${userId}/${Date.now()}-${file.originalname}`;

    const { error: storageError } = await supabase.storage
      .from('knowledge_base')
      .upload(storagePath, file.buffer, { contentType: file.mimetype });

    if (storageError) throw storageError;

    const { data: urlData } = supabase.storage
      .from('knowledge_base')
      .getPublicUrl(storagePath);

    const { data: doc, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        filename: file.originalname,
        file_type: file.mimetype,
        file_size: file.size,
        public_url: urlData.publicUrl,
        storage_path: storagePath,
        processing_status: 'processing'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Process async
    processDocumentAsync(doc.id, urlData.publicUrl);

    res.json({ success: true, document: doc });

  } catch (error) {
    logger.error({ error: error.message }, 'Upload failed');
    res.status(500).json({ error: error.message });
  }
});

async function processDocumentAsync(documentId, fileUrl) {
  try {
    const result = await parseDocument(fileUrl, documentId, {
      maxRetries: 3,
      timeout: 180000
    });

    await supabase
      .from('documents')
      .update({
        parsed_markdown: result.markdown,
        page_chunks: result.page_chunks,
        total_pages: result.total_pages,
        word_count: result.word_count,
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId);

  } catch (error) {
    logger.error({ documentId, error: error.message }, 'Processing failed');
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        processing_error: error.message
      })
      .eq('id', documentId);
  }
}

router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  const { data, error } = await supabase
    .from('documents')
    .select('id, filename, file_type, file_size, processing_status, total_pages, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Document not found' });
  res.json(data);
});

router.get('/:id/status', async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('id, processing_status, processing_error, total_pages')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Document not found' });
  res.json(data);
});

export default router;
```

**Acceptance Criteria**:
- [ ] POST `/api/documents/upload` accepts file
- [ ] File stored in Supabase Storage
- [ ] Document record created with 'processing' status
- [ ] Docling processes file asynchronously
- [ ] Status updates to 'completed' or 'failed'
- [ ] GET `/api/documents` lists user's documents
- [ ] GET `/api/documents/:id` returns full document
- [ ] GET `/api/documents/:id/status` returns processing status

---

### Epic 5: Supabase Setup

**File**: `scripts/setup_supabase.sql`

```sql
-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge_base', 'knowledge_base', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge_base');

CREATE POLICY IF NOT EXISTS "Allow public reads"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'knowledge_base');

-- Documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  public_url TEXT,
  storage_path TEXT,
  parsed_markdown TEXT,
  parsed_html TEXT,
  page_chunks JSONB DEFAULT '[]'::jsonb,
  total_pages INTEGER,
  word_count INTEGER,
  processing_status TEXT DEFAULT 'pending',
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(processing_status);

-- Full-text search
ALTER TABLE documents ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(parsed_markdown, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_documents_fts ON documents USING GIN(fts);
```

**Environment Variables** (add to `.env`):
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DOCLING_URL=http://127.0.0.1:8765
```

---

## Phase 2.6: Agent Browser Integration

> **Purpose**: Enable agents to interact with web pages using the Vercel Labs Agent Browser CLI.

### Overview

Agent Browser is a Rust CLI (with Node.js fallback) that provides 60+ commands for browser automation. It enables agents to:
- Navigate websites
- Click, type, scroll
- Extract content and screenshots
- Manage cookies and authentication
- Handle dialogs and tabs

**Repository**: https://github.com/vercel-labs/agent-browser

### Epic 1: Agent Browser Installation & Setup

**Task 1.1: Add to project dependencies**

**File**: `package.json` (root)
```json
{
  "dependencies": {
    "agent-browser": "^1.0.0"
  },
  "scripts": {
    "postinstall": "agent-browser install"
  }
}
```

**Task 1.2: Create browser service wrapper**

**File**: `server/lib/agent-browser.js`

```javascript
/**
 * Agent Browser wrapper for tool integration
 */
import { spawn } from 'child_process';
import logger from './logger.js';

const DEFAULT_SESSION = 'claude-cowork';
const COMMAND_TIMEOUT = 30000;

/**
 * Execute an Agent Browser command
 */
export async function executeCommand(command, args = [], options = {}) {
  const session = options.session || DEFAULT_SESSION;
  const timeout = options.timeout || COMMAND_TIMEOUT;

  return new Promise((resolve, reject) => {
    const fullArgs = ['--session', session, command, ...args];

    logger.debug({ command, args: fullArgs }, 'Executing agent-browser command');

    const proc = spawn('agent-browser', fullArgs, {
      timeout,
      env: {
        ...process.env,
        AGENT_BROWSER_SESSION: session
      }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output: stdout.trim() });
      } else {
        reject(new Error(`Command failed: ${stderr || stdout}`));
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * High-level browser actions for agent tools
 */
export const browserActions = {
  async navigate(url, options = {}) {
    return executeCommand('goto', [url], options);
  },

  async click(selector, options = {}) {
    return executeCommand('click', [selector], options);
  },

  async type(selector, text, options = {}) {
    return executeCommand('fill', [selector, text], options);
  },

  async screenshot(options = {}) {
    const result = await executeCommand('screenshot', [], options);
    return result.output; // Base64 PNG
  },

  async getSnapshot(options = {}) {
    const args = ['-c']; // Compact mode
    if (options.interactive) args.push('-i');
    return executeCommand('snapshot', args, options);
  },

  async getText(selector, options = {}) {
    return executeCommand('text', [selector], options);
  },

  async waitForElement(selector, options = {}) {
    return executeCommand('wait-for', [selector], options);
  },

  async getPageContent(options = {}) {
    return executeCommand('content', [], options);
  },

  async scroll(direction, amount = 3, options = {}) {
    return executeCommand('scroll', [direction, String(amount)], options);
  }
};

/**
 * Session management
 */
export async function createSession(name) {
  // Sessions are created implicitly, just verify browser is available
  return executeCommand('goto', ['about:blank'], { session: name });
}

export async function closeSession(name) {
  return executeCommand('close', [], { session: name });
}

/**
 * Check if agent-browser is available
 */
export async function checkAvailability() {
  try {
    await executeCommand('--version', [], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
```

**Acceptance Criteria**:
- [ ] agent-browser installed via npm
- [ ] Chromium downloaded via postinstall
- [ ] Wrapper handles session management
- [ ] Commands timeout after 30 seconds
- [ ] Errors logged with context

---

### Epic 2: Agent Browser as Claude Tool

**File**: `server/providers/claude-provider.js` (update ALLOWED_TOOLS)

Add browser tools to the allowed tools list:

```javascript
const BROWSER_TOOLS = [
  {
    name: 'browser_navigate',
    description: 'Navigate to a URL in the browser',
    input_schema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' }
      },
      required: ['url']
    }
  },
  {
    name: 'browser_click',
    description: 'Click an element on the page. Use snapshot first to find element references.',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector or element reference (e.g., "ref:1")' }
      },
      required: ['selector']
    }
  },
  {
    name: 'browser_type',
    description: 'Type text into an input field',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector for the input field' },
        text: { type: 'string', description: 'Text to type' }
      },
      required: ['selector', 'text']
    }
  },
  {
    name: 'browser_snapshot',
    description: 'Get accessibility tree of the current page. Returns element references for interaction.',
    input_schema: {
      type: 'object',
      properties: {
        interactive_only: { type: 'boolean', description: 'Only return interactive elements' }
      }
    }
  },
  {
    name: 'browser_screenshot',
    description: 'Take a screenshot of the current page',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'browser_scroll',
    description: 'Scroll the page',
    input_schema: {
      type: 'object',
      properties: {
        direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] },
        amount: { type: 'number', description: 'Scroll amount (default: 3)' }
      },
      required: ['direction']
    }
  },
  {
    name: 'browser_get_text',
    description: 'Get text content of an element',
    input_schema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' }
      },
      required: ['selector']
    }
  }
];
```

**File**: `server/lib/tool-executor.js` (create new)

```javascript
/**
 * Execute browser tools and return results
 */
import { browserActions } from './agent-browser.js';
import logger from './logger.js';

export async function executeBrowserTool(toolName, input, sessionId) {
  logger.info({ toolName, input, sessionId }, 'Executing browser tool');

  const options = { session: `session-${sessionId}` };

  try {
    switch (toolName) {
      case 'browser_navigate':
        return await browserActions.navigate(input.url, options);

      case 'browser_click':
        return await browserActions.click(input.selector, options);

      case 'browser_type':
        return await browserActions.type(input.selector, input.text, options);

      case 'browser_snapshot':
        return await browserActions.getSnapshot({
          ...options,
          interactive: input.interactive_only
        });

      case 'browser_screenshot':
        const base64 = await browserActions.screenshot(options);
        return { type: 'image', data: base64 };

      case 'browser_scroll':
        return await browserActions.scroll(input.direction, input.amount || 3, options);

      case 'browser_get_text':
        return await browserActions.getText(input.selector, options);

      default:
        throw new Error(`Unknown browser tool: ${toolName}`);
    }
  } catch (error) {
    logger.error({ toolName, error: error.message }, 'Browser tool failed');
    return { error: error.message };
  }
}
```

**Acceptance Criteria**:
- [ ] 7 browser tools defined with schemas
- [ ] Tools registered with Claude provider
- [ ] Tool executor handles all browser commands
- [ ] Sessions isolated per chat session
- [ ] Screenshots returned as base64

---

### Epic 3: Browser Tool UI Integration

**File**: `renderer/src/components/AgentStudio.tsx`

Add browser icons to `getToolIcon()`:

```typescript
// Add to getToolIcon function
if (/browser|navigate|click|screenshot|snapshot/i.test(toolName)) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  );
}
```

**File**: `renderer/src/components/BrowserPreview.tsx` (create new)

```typescript
/**
 * Component to display browser screenshots in chat
 */
import React from 'react';

interface BrowserPreviewProps {
  screenshot: string; // Base64 PNG
  url?: string;
  onClose?: () => void;
}

export const BrowserPreview: React.FC<BrowserPreviewProps> = ({
  screenshot,
  url,
  onClose
}) => {
  return (
    <div className="relative rounded-lg overflow-hidden border border-border">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-3 py-2 bg-panel border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        {url && (
          <div className="flex-1 text-xs text-secondaryText truncate px-2 py-1 bg-canvas rounded">
            {url}
          </div>
        )}
        {onClose && (
          <button onClick={onClose} className="text-secondaryText hover:text-white">
            ×
          </button>
        )}
      </div>

      {/* Screenshot */}
      <img
        src={`data:image/png;base64,${screenshot}`}
        alt="Browser screenshot"
        className="w-full"
      />
    </div>
  );
};
```

**Acceptance Criteria**:
- [ ] Browser tools show globe icon in execution log
- [ ] Screenshots render in chat with browser chrome
- [ ] URL displayed in preview header
- [ ] Preview can be dismissed

---

### Epic 4: Browser Session Cleanup

**File**: `server/server.js`

Add to graceful shutdown:
```javascript
// In gracefulShutdown function
try {
  const { closeSession } = await import('./lib/agent-browser.js');
  for (const [userId] of composioSessions) {
    await closeSession(`session-${userId}`);
  }
} catch (err) {
  logger.warn({ error: err.message }, 'Browser session cleanup failed');
}
```

**Acceptance Criteria**:
- [ ] Browser sessions closed on server shutdown
- [ ] Sessions closed when chat session ends
- [ ] No orphaned browser processes

---

## Phase 2.7: Enterprise Document Connectors (Composio-Based)

> **Purpose**: Enable automated document ingestion from SharePoint and Google Drive using Composio's existing integrations. Documents are synced, processed via Docling, and stored in Supabase as a homogeneous format (Markdown/JSON).

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   SharePoint    │     │  Google Drive   │     │  Manual Upload  │
│  (via Composio) │     │ (via Composio)  │     │    (Direct)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   SYNC SERVICE         │
                    │   (Node.js)            │
                    │                        │
                    │ • Source registration  │
                    │ • File discovery       │
                    │ • Change detection     │
                    │ • Download orchestration│
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   PROCESSING QUEUE     │
                    │   (In-Memory + SQLite) │
                    │                        │
                    │ • FIFO processing      │
                    │ • Retry on failure     │
                    │ • Status tracking      │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   DOCLING SIDECAR      │
                    │                        │
                    │ Supported Formats:     │
                    │ • PDF, DOCX, PPTX      │
                    │ • XLSX, HTML, CSV      │
                    │ • Images (OCR)         │
                    │ • Audio (ASR)          │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   SUPABASE             │
                    │                        │
                    │ • Raw files (Storage)  │
                    │ • Parsed content (DB)  │
                    │ • Source tracking (DB) │
                    │ • Sync state (DB)      │
                    └────────────────────────┘

Output Format (Homogeneous):
┌─────────────────────────────────────────┐
│  Every document becomes:                │
│  • parsed_markdown: Full text content   │
│  • page_chunks: [{page, content, ...}]  │
│  • metadata: {source, format, ...}      │
│  • content_hash: For deduplication      │
└─────────────────────────────────────────┘
```

---

### Epic 1: Database Schema for Multi-Source Documents

**File**: `scripts/setup_supabase.sql` (append to existing)

```sql
-- ============================================================
-- ENTERPRISE DOCUMENT SOURCES
-- ============================================================

-- Document sources (SharePoint sites, Drive folders, etc.)
CREATE TABLE IF NOT EXISTS document_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('sharepoint', 'google_drive', 'manual')),
  source_name TEXT NOT NULL,

  -- Connection details (OAuth tokens stored securely)
  connection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- For SharePoint: { site_id, drive_id, folder_path }
  -- For Google Drive: { folder_id, shared_drive_id }

  -- Sync configuration
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  file_types_filter TEXT[] DEFAULT ARRAY['pdf', 'docx', 'pptx', 'xlsx', 'html', 'csv'],

  -- Status tracking
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending',
  last_sync_error TEXT,
  files_synced_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track individual files from external sources
CREATE TABLE IF NOT EXISTS source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES document_sources(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Remote file identifiers
  remote_file_id TEXT NOT NULL,
  remote_path TEXT,
  remote_name TEXT NOT NULL,
  remote_mime_type TEXT,
  remote_size INTEGER,
  remote_modified_at TIMESTAMPTZ,

  -- Sync state
  content_hash TEXT, -- SHA-256 for deduplication and change detection
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'downloading', 'processing', 'synced', 'error', 'skipped')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source_id, remote_file_id)
);

-- Processing queue (lightweight, for hundreds of documents)
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file_id UUID REFERENCES source_files(id) ON DELETE CASCADE,

  job_type TEXT NOT NULL CHECK (job_type IN ('download', 'parse', 'reparse')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),

  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,

  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate jobs
  UNIQUE(source_file_id, job_type, status) WHERE status IN ('queued', 'processing')
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sources_user ON document_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_type ON document_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_source_files_status ON source_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_source_files_hash ON source_files(content_hash);
CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status, priority);

-- Add source tracking to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_file_id UUID REFERENCES source_files(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS original_format TEXT;
```

**Acceptance Criteria**:
- [ ] document_sources table created
- [ ] source_files table created
- [ ] processing_queue table created
- [ ] documents table extended with source tracking
- [ ] All indexes created

---

### Epic 2: Composio SharePoint Integration

**Prerequisites**: User must connect SharePoint via Composio OAuth flow.

**File**: `server/lib/connectors/sharepoint.js`

```javascript
/**
 * SharePoint connector using Composio tools
 */
import logger from '../logger.js';

export class SharePointConnector {
  constructor(composioClient, mcpServers) {
    this.composio = composioClient;
    this.mcpServers = mcpServers;
  }

  /**
   * List all files in a SharePoint site/folder
   */
  async listFiles(siteId, folderId = null, options = {}) {
    const { fileTypes = ['pdf', 'docx', 'pptx', 'xlsx'] } = options;

    try {
      // Use Composio's Microsoft 365 / SharePoint tools
      const result = await this.composio.executeAction({
        action: 'SHAREPOINT_LIST_FILES',
        params: {
          site_id: siteId,
          folder_id: folderId,
          file_types: fileTypes.join(',')
        },
        connectedAccountId: options.accountId
      });

      return result.files.map(file => ({
        remoteId: file.id,
        name: file.name,
        path: file.path,
        mimeType: file.mimeType,
        size: file.size,
        modifiedAt: new Date(file.lastModifiedDateTime),
        downloadUrl: file.downloadUrl
      }));
    } catch (error) {
      logger.error({ error: error.message, siteId }, 'SharePoint list files failed');
      throw error;
    }
  }

  /**
   * Download a file from SharePoint
   */
  async downloadFile(fileId, accountId) {
    try {
      const result = await this.composio.executeAction({
        action: 'SHAREPOINT_DOWNLOAD_FILE',
        params: { file_id: fileId },
        connectedAccountId: accountId
      });

      return {
        buffer: Buffer.from(result.content, 'base64'),
        contentType: result.contentType,
        filename: result.filename
      };
    } catch (error) {
      logger.error({ error: error.message, fileId }, 'SharePoint download failed');
      throw error;
    }
  }

  /**
   * Get file metadata for change detection
   */
  async getFileMetadata(fileId, accountId) {
    try {
      const result = await this.composio.executeAction({
        action: 'SHAREPOINT_GET_FILE_METADATA',
        params: { file_id: fileId },
        connectedAccountId: accountId
      });

      return {
        remoteId: result.id,
        name: result.name,
        modifiedAt: new Date(result.lastModifiedDateTime),
        eTag: result.eTag,
        size: result.size
      };
    } catch (error) {
      logger.error({ error: error.message, fileId }, 'SharePoint metadata failed');
      throw error;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] SharePointConnector class created
- [ ] listFiles() returns normalized file list
- [ ] downloadFile() returns file buffer
- [ ] getFileMetadata() for change detection
- [ ] Error handling with logging

---

### Epic 3: Composio Google Drive Integration

**File**: `server/lib/connectors/google-drive.js`

```javascript
/**
 * Google Drive connector using Composio tools
 */
import logger from '../logger.js';

export class GoogleDriveConnector {
  constructor(composioClient) {
    this.composio = composioClient;
  }

  /**
   * List files in a Google Drive folder
   */
  async listFiles(folderId = 'root', options = {}) {
    const { fileTypes = ['pdf', 'docx', 'pptx', 'xlsx'], includeSharedDrives = false } = options;

    try {
      // Build MIME type query for Google Drive
      const mimeTypes = this.getMimeTypes(fileTypes);

      const result = await this.composio.executeAction({
        action: 'GOOGLEDRIVE_LIST_FILES',
        params: {
          folder_id: folderId,
          mime_types: mimeTypes,
          include_shared_drives: includeSharedDrives
        },
        connectedAccountId: options.accountId
      });

      return result.files.map(file => ({
        remoteId: file.id,
        name: file.name,
        path: file.path || `/${file.name}`,
        mimeType: file.mimeType,
        size: parseInt(file.size) || 0,
        modifiedAt: new Date(file.modifiedTime),
        isGoogleDoc: file.mimeType.startsWith('application/vnd.google-apps')
      }));
    } catch (error) {
      logger.error({ error: error.message, folderId }, 'Google Drive list failed');
      throw error;
    }
  }

  /**
   * Download a file from Google Drive
   * Handles export for Google Docs formats
   */
  async downloadFile(fileId, mimeType, accountId) {
    try {
      // Google Docs need to be exported
      const isGoogleDoc = mimeType.startsWith('application/vnd.google-apps');
      const exportFormat = isGoogleDoc ? this.getExportFormat(mimeType) : null;

      const result = await this.composio.executeAction({
        action: isGoogleDoc ? 'GOOGLEDRIVE_EXPORT_FILE' : 'GOOGLEDRIVE_DOWNLOAD_FILE',
        params: {
          file_id: fileId,
          export_mime_type: exportFormat
        },
        connectedAccountId: accountId
      });

      return {
        buffer: Buffer.from(result.content, 'base64'),
        contentType: exportFormat || mimeType,
        filename: result.filename
      };
    } catch (error) {
      logger.error({ error: error.message, fileId }, 'Google Drive download failed');
      throw error;
    }
  }

  /**
   * Map file extensions to MIME types for Drive query
   */
  getMimeTypes(fileTypes) {
    const mimeMap = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      html: 'text/html',
      csv: 'text/csv',
      // Google native formats (will be exported)
      gdoc: 'application/vnd.google-apps.document',
      gsheet: 'application/vnd.google-apps.spreadsheet',
      gslides: 'application/vnd.google-apps.presentation'
    };

    return fileTypes.map(t => mimeMap[t]).filter(Boolean);
  }

  /**
   * Get export format for Google Docs
   */
  getExportFormat(googleMimeType) {
    const exportMap = {
      'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    };
    return exportMap[googleMimeType] || 'application/pdf';
  }
}
```

**Acceptance Criteria**:
- [ ] GoogleDriveConnector class created
- [ ] listFiles() returns normalized file list
- [ ] downloadFile() handles both regular and Google Docs formats
- [ ] Google Docs exported to Office formats for Docling
- [ ] Error handling with logging

---

### Epic 4: Sync Service

**File**: `server/lib/sync-service.js`

```javascript
/**
 * Document sync service - orchestrates file discovery and processing
 */
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { SharePointConnector } from './connectors/sharepoint.js';
import { GoogleDriveConnector } from './connectors/google-drive.js';
import { parseDocument } from './docling-client.js';
import logger from './logger.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export class SyncService {
  constructor(composioClient) {
    this.sharepoint = new SharePointConnector(composioClient);
    this.googleDrive = new GoogleDriveConnector(composioClient);
    this.isRunning = false;
  }

  /**
   * Sync all enabled sources for a user
   */
  async syncAllSources(userId) {
    const { data: sources, error } = await supabase
      .from('document_sources')
      .select('*')
      .eq('user_id', userId)
      .eq('sync_enabled', true);

    if (error) throw error;

    const results = [];
    for (const source of sources) {
      try {
        const result = await this.syncSource(source);
        results.push({ sourceId: source.id, ...result });
      } catch (err) {
        logger.error({ sourceId: source.id, error: err.message }, 'Source sync failed');
        results.push({ sourceId: source.id, error: err.message });
      }
    }

    return results;
  }

  /**
   * Sync a single document source
   */
  async syncSource(source) {
    logger.info({ sourceId: source.id, type: source.source_type }, 'Starting source sync');

    await supabase
      .from('document_sources')
      .update({ last_sync_status: 'syncing' })
      .eq('id', source.id);

    try {
      // Get files from remote source
      const remoteFiles = await this.listRemoteFiles(source);
      logger.info({ sourceId: source.id, fileCount: remoteFiles.length }, 'Found remote files');

      // Get existing tracked files
      const { data: existingFiles } = await supabase
        .from('source_files')
        .select('remote_file_id, content_hash, remote_modified_at')
        .eq('source_id', source.id);

      const existingMap = new Map(
        existingFiles?.map(f => [f.remote_file_id, f]) || []
      );

      // Determine what's new or changed
      let newFiles = 0;
      let changedFiles = 0;
      let skippedFiles = 0;

      for (const file of remoteFiles) {
        const existing = existingMap.get(file.remoteId);

        if (!existing) {
          // New file
          await this.trackAndQueueFile(source.id, file);
          newFiles++;
        } else if (new Date(file.modifiedAt) > new Date(existing.remote_modified_at)) {
          // Changed file
          await this.updateAndQueueFile(source.id, file, existing);
          changedFiles++;
        } else {
          skippedFiles++;
        }
      }

      // Update source status
      await supabase
        .from('document_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
          files_synced_count: newFiles + changedFiles
        })
        .eq('id', source.id);

      return { newFiles, changedFiles, skippedFiles };

    } catch (error) {
      await supabase
        .from('document_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'error',
          last_sync_error: error.message
        })
        .eq('id', source.id);

      throw error;
    }
  }

  /**
   * List files from remote source based on type
   */
  async listRemoteFiles(source) {
    const config = source.connection_config;
    const options = {
      accountId: config.composio_account_id,
      fileTypes: source.file_types_filter
    };

    switch (source.source_type) {
      case 'sharepoint':
        return this.sharepoint.listFiles(config.site_id, config.folder_id, options);
      case 'google_drive':
        return this.googleDrive.listFiles(config.folder_id, options);
      default:
        throw new Error(`Unknown source type: ${source.source_type}`);
    }
  }

  /**
   * Track a new file and queue for processing
   */
  async trackAndQueueFile(sourceId, file) {
    const { data: sourceFile } = await supabase
      .from('source_files')
      .insert({
        source_id: sourceId,
        remote_file_id: file.remoteId,
        remote_path: file.path,
        remote_name: file.name,
        remote_mime_type: file.mimeType,
        remote_size: file.size,
        remote_modified_at: file.modifiedAt.toISOString(),
        sync_status: 'pending'
      })
      .select()
      .single();

    // Queue for download and processing
    await supabase
      .from('processing_queue')
      .insert({
        source_file_id: sourceFile.id,
        job_type: 'download',
        priority: 5
      });

    return sourceFile;
  }

  /**
   * Update existing file and queue for reprocessing
   */
  async updateAndQueueFile(sourceId, file, existing) {
    await supabase
      .from('source_files')
      .update({
        remote_modified_at: file.modifiedAt.toISOString(),
        remote_size: file.size,
        sync_status: 'pending'
      })
      .eq('source_id', sourceId)
      .eq('remote_file_id', file.remoteId);

    // Find source_file record
    const { data: sourceFile } = await supabase
      .from('source_files')
      .select('id')
      .eq('source_id', sourceId)
      .eq('remote_file_id', file.remoteId)
      .single();

    // Queue for reprocessing
    await supabase
      .from('processing_queue')
      .insert({
        source_file_id: sourceFile.id,
        job_type: 'download',
        priority: 5
      });
  }

  /**
   * Process queued jobs
   */
  async processQueue(limit = 10) {
    // Get next batch of jobs
    const { data: jobs } = await supabase
      .from('processing_queue')
      .select(`
        *,
        source_files (
          *,
          document_sources (*)
        )
      `)
      .eq('status', 'queued')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(limit);

    if (!jobs?.length) {
      return { processed: 0 };
    }

    let processed = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        await this.processJob(job);
        processed++;
      } catch (error) {
        logger.error({ jobId: job.id, error: error.message }, 'Job processing failed');
        failed++;
      }
    }

    return { processed, failed };
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    const sourceFile = job.source_files;
    const source = sourceFile.document_sources;

    // Mark job as processing
    await supabase
      .from('processing_queue')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', job.id);

    try {
      if (job.job_type === 'download') {
        // Download file from source
        const fileData = await this.downloadFromSource(source, sourceFile);

        // Calculate content hash
        const contentHash = createHash('sha256').update(fileData.buffer).digest('hex');

        // Check if content actually changed
        if (sourceFile.content_hash === contentHash) {
          logger.info({ fileId: sourceFile.id }, 'Content unchanged, skipping');
          await this.completeJob(job.id, 'skipped');
          return;
        }

        // Upload to Supabase storage
        const storagePath = `${source.user_id}/${source.id}/${Date.now()}-${fileData.filename}`;
        await supabase.storage
          .from('knowledge_base')
          .upload(storagePath, fileData.buffer, {
            contentType: fileData.contentType
          });

        const { data: urlData } = supabase.storage
          .from('knowledge_base')
          .getPublicUrl(storagePath);

        // Update source_file with hash
        await supabase
          .from('source_files')
          .update({
            content_hash: contentHash,
            sync_status: 'processing'
          })
          .eq('id', sourceFile.id);

        // Queue parsing job
        await supabase
          .from('processing_queue')
          .insert({
            source_file_id: sourceFile.id,
            job_type: 'parse',
            priority: job.priority
          });

        // Store temporary URL for parsing
        await supabase
          .from('source_files')
          .update({ temp_storage_url: urlData.publicUrl })
          .eq('id', sourceFile.id);

        await this.completeJob(job.id, 'completed');

      } else if (job.job_type === 'parse') {
        // Get the file URL
        const { data: sf } = await supabase
          .from('source_files')
          .select('temp_storage_url')
          .eq('id', sourceFile.id)
          .single();

        // Parse with Docling
        const parsed = await parseDocument(sf.temp_storage_url, sourceFile.id, {
          maxRetries: 3,
          timeout: 180000
        });

        // Create or update document record
        const docData = {
          user_id: source.user_id,
          filename: sourceFile.remote_name,
          file_type: sourceFile.remote_mime_type,
          file_size: sourceFile.remote_size,
          source_type: source.source_type,
          source_file_id: sourceFile.id,
          content_hash: sourceFile.content_hash,
          original_format: sourceFile.remote_mime_type,
          parsed_markdown: parsed.markdown,
          page_chunks: parsed.page_chunks,
          total_pages: parsed.total_pages,
          word_count: parsed.word_count,
          processing_status: 'completed'
        };

        if (sourceFile.document_id) {
          // Update existing
          await supabase
            .from('documents')
            .update(docData)
            .eq('id', sourceFile.document_id);
        } else {
          // Create new
          const { data: doc } = await supabase
            .from('documents')
            .insert(docData)
            .select()
            .single();

          // Link to source_file
          await supabase
            .from('source_files')
            .update({
              document_id: doc.id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', sourceFile.id);
        }

        await this.completeJob(job.id, 'completed');
      }

    } catch (error) {
      await this.failJob(job.id, error.message);
      throw error;
    }
  }

  /**
   * Download file based on source type
   */
  async downloadFromSource(source, sourceFile) {
    const config = source.connection_config;

    switch (source.source_type) {
      case 'sharepoint':
        return this.sharepoint.downloadFile(
          sourceFile.remote_file_id,
          config.composio_account_id
        );
      case 'google_drive':
        return this.googleDrive.downloadFile(
          sourceFile.remote_file_id,
          sourceFile.remote_mime_type,
          config.composio_account_id
        );
      default:
        throw new Error(`Unknown source type: ${source.source_type}`);
    }
  }

  async completeJob(jobId, status) {
    await supabase
      .from('processing_queue')
      .update({
        status: status,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }

  async failJob(jobId, errorMessage) {
    const { data: job } = await supabase
      .from('processing_queue')
      .select('attempts, max_attempts')
      .eq('id', jobId)
      .single();

    const newAttempts = (job?.attempts || 0) + 1;
    const isFinalFailure = newAttempts >= (job?.max_attempts || 3);

    await supabase
      .from('processing_queue')
      .update({
        status: isFinalFailure ? 'failed' : 'queued',
        attempts: newAttempts,
        error_message: errorMessage,
        completed_at: isFinalFailure ? new Date().toISOString() : null
      })
      .eq('id', jobId);
  }
}
```

**Acceptance Criteria**:
- [ ] SyncService orchestrates multi-source sync
- [ ] Change detection via modification time
- [ ] Content hashing for deduplication
- [ ] Queue-based processing with retry
- [ ] Creates/updates documents in unified format

---

### Epic 5: Sync API Routes

**File**: `server/routes/sources.js`

```javascript
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { SyncService } from '../lib/sync-service.js';
import logger from '../lib/logger.js';

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let syncService = null;

// Initialize with Composio client
export function initSyncRoutes(composioClient) {
  syncService = new SyncService(composioClient);
}

/**
 * GET /api/sources - List document sources
 */
router.get('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';

  const { data, error } = await supabase
    .from('document_sources')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/sources - Add a new document source
 */
router.post('/', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';
  const { source_type, source_name, connection_config, file_types_filter } = req.body;

  if (!['sharepoint', 'google_drive'].includes(source_type)) {
    return res.status(400).json({ error: 'Invalid source type' });
  }

  const { data, error } = await supabase
    .from('document_sources')
    .insert({
      user_id: userId,
      source_type,
      source_name,
      connection_config,
      file_types_filter: file_types_filter || ['pdf', 'docx', 'pptx', 'xlsx']
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/sources/:id/sync - Trigger sync for a source
 */
router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: source } = await supabase
      .from('document_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (!source) {
      return res.status(404).json({ error: 'Source not found' });
    }

    // Start sync (non-blocking)
    syncService.syncSource(source)
      .then(result => logger.info({ sourceId: id, result }, 'Sync completed'))
      .catch(err => logger.error({ sourceId: id, error: err.message }, 'Sync failed'));

    res.json({ message: 'Sync started', sourceId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sources/sync-all - Sync all sources for user
 */
router.post('/sync-all', async (req, res) => {
  const userId = req.headers['x-user-id'] || 'default';

  try {
    // Start sync (non-blocking)
    syncService.syncAllSources(userId)
      .then(results => logger.info({ userId, results }, 'All sources synced'))
      .catch(err => logger.error({ userId, error: err.message }, 'Sync all failed'));

    res.json({ message: 'Sync started for all sources' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sources/:id/files - List files from a source
 */
router.get('/:id/files', async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('source_files')
    .select(`
      *,
      documents (id, filename, processing_status, total_pages)
    `)
    .eq('source_id', id)
    .order('remote_modified_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/queue/status - Get processing queue status
 */
router.get('/queue/status', async (req, res) => {
  const { data, error } = await supabase
    .from('processing_queue')
    .select('status')
    .then(result => {
      if (result.error) return result;

      const counts = result.data.reduce((acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {});

      return { data: counts, error: null };
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/queue/process - Process pending jobs
 */
router.post('/queue/process', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  try {
    const result = await syncService.processQueue(limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

**Acceptance Criteria**:
- [ ] GET /api/sources - List sources
- [ ] POST /api/sources - Add source
- [ ] POST /api/sources/:id/sync - Trigger sync
- [ ] POST /api/sources/sync-all - Sync all
- [ ] GET /api/sources/:id/files - List synced files
- [ ] GET /api/queue/status - Queue status
- [ ] POST /api/queue/process - Process queue

---

### Epic 6: Sync Dashboard UI

**File**: `renderer/src/components/SyncDashboard.tsx`

```typescript
/**
 * Dashboard for managing document sources and sync status
 */
import React, { useState, useEffect } from 'react';

interface DocumentSource {
  id: string;
  source_type: 'sharepoint' | 'google_drive';
  source_name: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  last_sync_status: string;
  files_synced_count: number;
}

interface QueueStatus {
  queued?: number;
  processing?: number;
  completed?: number;
  failed?: number;
}

export const SyncDashboard: React.FC = () => {
  const [sources, setSources] = useState<DocumentSource[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({});
  const [syncing, setSyncing] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSources();
    loadQueueStatus();
    const interval = setInterval(loadQueueStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSources = async () => {
    const res = await fetch('/api/sources');
    const data = await res.json();
    setSources(data);
  };

  const loadQueueStatus = async () => {
    const res = await fetch('/api/sources/queue/status');
    const data = await res.json();
    setQueueStatus(data);
  };

  const triggerSync = async (sourceId: string) => {
    setSyncing(prev => new Set([...prev, sourceId]));
    await fetch(`/api/sources/${sourceId}/sync`, { method: 'POST' });
    setTimeout(() => {
      setSyncing(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
      loadSources();
    }, 3000);
  };

  const getSourceIcon = (type: string) => {
    if (type === 'sharepoint') {
      return <SharePointIcon className="w-5 h-5" />;
    }
    return <GoogleDriveIcon className="w-5 h-5" />;
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-bold">Document Sources</h2>

      {/* Queue Status */}
      <div className="flex gap-4 p-3 bg-panel rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">{queueStatus.queued || 0}</div>
          <div className="text-xs text-secondaryText">Queued</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">{queueStatus.processing || 0}</div>
          <div className="text-xs text-secondaryText">Processing</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">{queueStatus.completed || 0}</div>
          <div className="text-xs text-secondaryText">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{queueStatus.failed || 0}</div>
          <div className="text-xs text-secondaryText">Failed</div>
        </div>
      </div>

      {/* Sources List */}
      <div className="space-y-3">
        {sources.map(source => (
          <div key={source.id} className="flex items-center gap-3 p-3 bg-panel rounded-lg">
            {getSourceIcon(source.source_type)}

            <div className="flex-1">
              <div className="font-medium">{source.source_name}</div>
              <div className="text-xs text-secondaryText">
                {source.last_sync_at
                  ? `Last synced: ${new Date(source.last_sync_at).toLocaleString()}`
                  : 'Never synced'}
                {' • '}
                {source.files_synced_count} files
              </div>
            </div>

            <div className={`px-2 py-1 rounded text-xs ${
              source.last_sync_status === 'success' ? 'bg-green-500/20 text-green-400' :
              source.last_sync_status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {source.last_sync_status || 'pending'}
            </div>

            <button
              onClick={() => triggerSync(source.id)}
              disabled={syncing.has(source.id)}
              className="px-3 py-1 bg-accent text-white rounded hover:bg-accent/80 disabled:opacity-50"
            >
              {syncing.has(source.id) ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        ))}
      </div>

      {/* Add Source Button */}
      <button className="w-full py-2 border border-dashed border-border rounded-lg text-secondaryText hover:border-accent hover:text-accent">
        + Add Document Source
      </button>
    </div>
  );
};

const SharePointIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#038387"/>
    <path d="M8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" fill="white"/>
  </svg>
);

const GoogleDriveIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path d="M8.5 3L3 14h5l5.5-11z" fill="#4285F4"/>
    <path d="M15.5 3L10 14h5l5.5-11z" fill="#FBBC04"/>
    <path d="M3 14l5.5 7h11L14 14z" fill="#34A853"/>
  </svg>
);
```

**Acceptance Criteria**:
- [ ] Shows list of connected sources
- [ ] Displays sync status per source
- [ ] Queue status with counts
- [ ] Trigger sync button per source
- [ ] Add source flow (SharePoint/Google Drive)

---

### Epic 7: Scheduled Sync (Background Processing)

**File**: `server/lib/sync-scheduler.js`

```javascript
/**
 * Background scheduler for automatic document syncing
 */
import logger from './logger.js';

let syncService = null;
let schedulerInterval = null;

export function startScheduler(service, intervalMs = 60000) {
  syncService = service;

  // Process queue every minute
  schedulerInterval = setInterval(async () => {
    try {
      const result = await syncService.processQueue(5);
      if (result.processed > 0) {
        logger.info({ result }, 'Scheduler processed queue');
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Scheduler queue processing failed');
    }
  }, intervalMs);

  logger.info({ intervalMs }, 'Sync scheduler started');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('Sync scheduler stopped');
  }
}
```

**Acceptance Criteria**:
- [ ] Processes queue every minute
- [ ] Logs processing results
- [ ] Graceful start/stop

---

## Phase 3: UI Polish (MEDIUM)

### 3.1 Chat Improvements

| Task | File | Description |
|------|------|-------------|
| Code block copy | `ChatArea.tsx` | Add copy button to code blocks |
| Syntax highlighting | `ChatArea.tsx` | Use highlight.js for code |
| Message actions | `ChatArea.tsx` | Copy, retry, delete buttons |
| Image display | `ChatArea.tsx` | Render image attachments and screenshots |
| Typing indicator | `ChatArea.tsx` | Show "thinking..." animation |
| Message search | `Sidebar.tsx` | Search across sessions |

### 3.2 Execution Log Enhancements

| Task | File | Description |
|------|------|-------------|
| Tool duration | `AgentStudio.tsx` | Show elapsed time |
| Size display | `AgentStudio.tsx` | Show input/output sizes |
| Full response modal | `AgentStudio.tsx` | Expand truncated results |
| Status filter | `AgentStudio.tsx` | Filter by running/done/error |
| Export logs | `AgentStudio.tsx` | Download as JSON |

### 3.3 Responsive Design

- [ ] Collapsible sidebars
- [ ] Mobile breakpoints
- [ ] Touch interactions
- [ ] Keyboard navigation

### 3.4 Theming

- [ ] Light/dark toggle
- [ ] Custom accent color
- [ ] Font size control
- [ ] Preferences persistence

---

## Phase 4: Performance (MEDIUM)

### 4.1 Optimization

- [ ] Virtual scrolling for chat (react-window)
- [ ] Lazy load execution log details
- [ ] Debounce state updates (lodash.debounce)
- [ ] Memoize expensive computations (useMemo)
- [ ] Code splitting (React.lazy)

### 4.2 Caching

- [ ] Cache tool responses (LRU cache)
- [ ] Service worker for offline assets
- [ ] Response caching for identical queries

---

## Phase 5: Desktop Integration (LOW)

### 5.1 Electron Features

- [ ] System tray with quick actions
- [ ] Global keyboard shortcuts
- [ ] Native notifications
- [ ] Auto-update mechanism
- [ ] Deep linking

### 5.2 File System

- [ ] Save artifacts to disk
- [ ] Open files with default apps
- [ ] Drag files into chat

---

## Phase 6: Testing & Documentation (MEDIUM)

### 6.1 Testing

| Type | Framework | Coverage Target |
|------|-----------|-----------------|
| Unit | Vitest | 80% for utilities |
| Component | React Testing Library | Core components |
| Integration | Supertest | All API endpoints |
| E2E | Playwright | Critical paths |

### 6.2 Documentation

- [ ] API docs (OpenAPI/Swagger)
- [ ] Component storybook
- [ ] User guide
- [ ] Video tutorials
- [ ] Contribution guide

---

## Phase 7: Production Readiness (HIGH)

### 7.1 Security

- [ ] API key audit (no secrets in code)
- [ ] Rate limiting (express-rate-limit)
- [ ] Request validation (completed in Phase 0)
- [ ] Secure WebSocket
- [ ] CSP headers

### 7.2 Build & Deploy

- [ ] Production build optimization
- [ ] Code signing certificates
- [ ] Auto-update server
- [ ] GitHub Actions workflow
- [ ] Win/Mac/Linux installers

### 7.3 Monitoring

- [ ] Error tracking (Sentry)
- [ ] Usage analytics (opt-in)
- [ ] Performance monitoring

---

## File Structure Summary

```
open-claude-cowork/
├── server/
│   ├── server.js                    # MODIFY: Add validation, logging, shutdown
│   ├── lib/
│   │   ├── logger.js                # NEW: Structured logging
│   │   ├── docling-client.js        # NEW: HTTP client with circuit breaker
│   │   ├── sidecar-manager.js       # NEW: Process lifecycle
│   │   ├── supabase.js              # NEW: Supabase client
│   │   ├── agent-browser.js         # NEW: Browser CLI wrapper
│   │   ├── tool-executor.js         # NEW: Tool execution
│   │   ├── sync-service.js          # NEW: Multi-source sync orchestration
│   │   ├── sync-scheduler.js        # NEW: Background sync scheduler
│   │   └── connectors/
│   │       ├── sharepoint.js        # NEW: SharePoint via Composio
│   │       └── google-drive.js      # NEW: Google Drive via Composio
│   ├── middleware/
│   │   └── validation.js            # NEW: Input validation
│   ├── routes/
│   │   ├── documents.js             # NEW: Document upload/fetch
│   │   └── sources.js               # NEW: Source management & sync
│   └── providers/
│       └── claude-provider.js       # MODIFY: Add browser tools
│
├── sidecar/
│   ├── docling_service/
│   │   ├── main.py                  # NEW: FastAPI service
│   │   └── requirements.txt         # NEW: Python deps
│   ├── build.py                     # NEW: PyInstaller script
│   └── dist/                        # Platform executables
│
├── renderer/src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx        # NEW: Error handling
│   │   ├── ChatArea.tsx             # MODIFY: DOMPurify
│   │   ├── AgentStudio.tsx          # MODIFY: Browser icons
│   │   ├── DocumentViewer.tsx       # NEW: Document preview
│   │   ├── BrowserPreview.tsx       # NEW: Screenshot display
│   │   └── SyncDashboard.tsx        # NEW: Source sync management
│   └── types/
│       └── index.ts                 # MODIFY: Complete types
│
├── scripts/
│   └── setup_supabase.sql           # NEW: Database schema (expanded)
│
└── .env                             # Add Supabase + Docling vars
```

---

## Environment Variables

```env
# Existing
ANTHROPIC_API_KEY=sk-ant-...
COMPOSIO_API_KEY=...

# New - Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# New - Docling
DOCLING_URL=http://127.0.0.1:8765

# New - Logging
LOG_LEVEL=info
NODE_ENV=development
```

---

## Milestone Targets

| Milestone | Phases | Key Deliverables |
|-----------|--------|------------------|
| **M0: Security** | Phase 0 | XSS fix, validation, CORS |
| **M1: Stable** | Phase 1 | Error boundaries, logging, cleanup |
| **M2: Core Features** | Phase 2 + 2.5 | Knowledge base, Docling sidecar |
| **M3: Automation** | Phase 2.6 + 2.7 | Agent Browser, SharePoint/Drive sync |
| **M4: Polish** | Phase 3 + 4 | UI improvements, performance |
| **M5: Release** | Phase 5 + 6 + 7 | Desktop features, testing, production |

### Enterprise Document Pipeline Summary

The complete pipeline supports:

| Source | Connector | Formats | Output |
|--------|-----------|---------|--------|
| SharePoint | Composio Microsoft 365 | PDF, DOCX, PPTX, XLSX, HTML | Markdown + JSON |
| Google Drive | Composio Google Drive | PDF, DOCX, PPTX, XLSX, Google Docs | Markdown + JSON |
| Manual Upload | Direct HTTP | All Docling formats | Markdown + JSON |

**Processing Flow:**
1. Source discovery (list files from SharePoint/Drive)
2. Change detection (compare modified dates, content hashes)
3. Download new/changed files
4. Process via Docling sidecar
5. Store in Supabase (raw + parsed)
6. Make available to AI with page-level citations

---

*Last Updated: January 23, 2026*
*Version: 2.0*
