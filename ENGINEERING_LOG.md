# Engineering Log - Open Claude Cowork

## Session: January 24, 2026

### Overview
Implemented a simple user-facing onboarding wizard, removed the complex workflow-based onboarding system, and cleaned up the repository.

---

## Changes Made

### 1. New Onboarding Modal Component

**Files Created:**
- `renderer/src/components/OnboardingModal.tsx`

**Description:**
Created a simple 3-step onboarding wizard for new users:

1. **Welcome Screen** - Greeting with explanation of Claude Agent SDK + Composio capabilities
2. **Tool Selection** - Checkboxes for Gmail, Calendar, GitHub, Slack, Notion, Linear, Google Drive, Google Sheets
3. **Connection Links** - Clickable links to Composio OAuth for each selected tool

**Features:**
- Clean modal UI with solid dark background (`#1a1a1a`)
- Progress through steps with Back/Continue buttons
- Skip option to bypass onboarding
- LocalStorage flags: `onboarding_completed`, `selected_tools`
- Fetches auth URLs from backend `/api/composio/auth-url` endpoint

---

### 2. Composio Auth URL Endpoint

**Files Modified:**
- `server/server.js`

**Description:**
Added `POST /api/composio/auth-url` endpoint that returns Composio OAuth URLs for specified apps. Currently returns direct Composio app URLs; can be enhanced to use Composio SDK for proper OAuth flow.

---

### 3. Removed "Start Here" Workflow

**Files Modified:**
- `renderer/src/lib/workflowStorage.ts`
- `renderer/src/App.tsx`

**Problem:** The workflow-based onboarding showed internal AI thought streaming, which was confusing for end users.

**Solution:**
- Disabled `seedDefaultWorkflows()` function - now removes any existing "Start Here" workflow
- Replaced with simple `OnboardingModal` component
- App.tsx now shows OnboardingModal on first run based on localStorage flag

---

### 4. Repository Cleanup

**Files Removed from root:**
- `auditcheck.md`, `bugfix.md`, `current_task.md` - temporary work documents
- `implementation.md`, `lookup.md` - duplicate spec files
- `RALPH_README.md`, `ralph_loop_package.zip`, `run_loop.sh` - unused Ralph loop files
- `README1.md` - duplicate README

**Files Kept:**
- `CLAUDE.md` - AI assistant context file
- `workflow_system_spec.md` - detailed workflow specification

---

## Session: January 22, 2026

### Overview
Major UI/UX improvements to the Execution Progress sidebar and Chat Area components.

---

## Changes Made

### 1. Execution Log UI & Data Formatting

**Files Modified:**
- `renderer/src/components/AgentStudio.tsx`

**Problem:** Tool names in the Execution Progress sidebar were raw system strings (e.g., `mcp_composio_COMPOSIO_SEARCH_TOOLS`) that overflowed the container.

**Solution:**

#### A. Tool Name Humanizer Function
```typescript
function humanizeToolName(rawName: string): string
```
- Removes prefixes: `mcp_composio_`, `composio_`, `mcp_`, `COMPOSIO_`
- Replaces underscores with spaces
- Converts to Title Case
- Truncates names > 25 characters with `...`
- Example: `mcp_composio_COMPOSIO_SEARCH_TOOLS` → `Search Tools`

#### B. CSS Overflow & Layout Fixes
- Flexbox row with `align-items: center`
- Text span: `flex: 1`, `min-width: 0` for proper truncation
- Applied `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`
- Container padding: `p-4 pr-2`

#### C. Tooltips
- Added `title={log.name}` attribute to show full raw name on hover

#### D. Visual Cleanup
- Increased vertical spacing between items (`gap-4`, `mb-2`)
- Sub-text: `text-[11px] text-[#888]` for smaller, darker gray text

---

### 2. Markdown Rendering in Chat

**Files Modified:**
- `renderer/src/components/ChatArea.tsx`

**Problem:** Assistant messages displayed raw markdown syntax instead of rendered rich text.

**Solution:**
- Imported `marked` library (already in dependencies)
- Configured with GitHub Flavored Markdown (`gfm: true`, `breaks: true`)
- Assistant messages now render through `marked.parse()`
- Output uses existing `.markdown-content` CSS class from `globals.css`

---

### 3. Timeline Layout Refactor (Two-Column Grid)

**Files Modified:**
- `renderer/src/components/AgentStudio.tsx`

**Problem:** Vertical timeline line overlapped text; spinners were misaligned.

**Solution:**

#### A. Two-Column CSS Grid
```css
grid-template-columns: 24px 1fr;
gap: 12px;
```
- **Column 1 (Timeline Track):** Fixed 24px width, contains icon/spinner and vertical connector line
- **Column 2 (Content):** Flex-grow, contains step name and subtext

#### B. Spinner & Icon Alignment
- Spinners and icons centered in timeline track with `flex items-center justify-center`
- Running state: animated spinner
- Completed state: brand-specific icon or green checkmark

#### C. Vertical Connector Line
- 2px solid #333 line
- Only renders between items (not after last item)
- Color changes based on state (accent for running, green for completed)

---

### 4. Smart Tool Branding (Dynamic Icons)

**Files Modified:**
- `renderer/src/components/AgentStudio.tsx`

**Problem:** Generic bullets instead of recognizable brand icons.

**Solution:**

Created `getToolIcon(toolName)` function with string matching:

| Pattern | Icon |
|---------|------|
| gmail, mail, email | Red Gmail envelope |
| drive, docs, sheet, document | Google Drive tri-color |
| search, google, web | Blue search magnifier |
| github, git | GitHub octocat |
| slack, message, chat | Slack multi-color |
| firecrawl, crawl, scrape | Orange flame |
| calendar, schedule, event | Blue calendar |
| todo, task, list | Green checkbox |
| Default | Gray terminal icon |

All icons are inline SVGs (no external assets required).

---

### 5. Zombie Spinner Fix (State Synchronization)

**Files Modified:**
- `renderer/src/App.tsx`
- `renderer/src/types/index.ts`
- `renderer/src/components/AgentStudio.tsx`

**Problem:** Tool steps remained in "RUNNING" state after stream ended.

**Solution:**

#### A. Types Update
Added `toolUseId?: string` to `ToolLogEntry` for proper tool matching.

#### B. Improved tool_result Handling
```typescript
// Match by tool_use_id first
let matchIndex = updated.findIndex(t => t.toolUseId === resultToolUseId);
// Fallback: find first running item
if (matchIndex === -1) {
  matchIndex = updated.findIndex(t => t.status === 'running');
}
// Last resort: update last item
if (matchIndex === -1 && updated.length > 0) {
  matchIndex = updated.length - 1;
}
```

#### C. Fail-Safe Sweep
In the `finally` block when stream ends:
```typescript
// Force-complete all running items
setToolLogs(prev => prev.map(tool =>
  tool.status === 'running'
    ? { ...tool, status: 'done' as const, result: tool.result || 'Completed' }
    : tool
));
```

#### D. Visual State Transitions

| State | Icon | Background | Text | Animation |
|-------|------|------------|------|-----------|
| Running | Spinner | `bg-accent/20` | Full opacity | `animate-pulse` |
| Done | Green checkmark | `bg-green-500/10` | 80% opacity | None |

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `renderer/src/components/AgentStudio.tsx` | Humanizer, timeline grid, brand icons, visual states |
| `renderer/src/components/ChatArea.tsx` | Markdown rendering |
| `renderer/src/App.tsx` | Tool result matching, fail-safe sweep |
| `renderer/src/types/index.ts` | Added `toolUseId` field |

---

## Testing Notes

- All changes tested in browser at `http://localhost:5173/`
- Hot reload working correctly
- Visual states transition properly from running → completed
- No zombie spinners after stream completion
- Markdown renders correctly for assistant messages
- Tool names display cleanly with proper truncation

---

## Known Issues / Future Work

1. ~~Brand icons could be expanded to cover more services~~ ✅ DONE (Session Jan 23)
2. Consider adding error state handling in timeline
3. Expanded details panel could show more metadata
4. ~~Consider adding animation on state transition~~ ✅ DONE (Session Jan 23)

---

## Session: January 23, 2026

### Overview
Implemented comprehensive Tool Logos system with branded service icons throughout the application.

---

## Changes Made

### 1. Tool Logos Implementation

**Problem:** Generic bullet/spinner icons in Execution Timeline made it hard to identify which service was being used. Workflow cards had no visual indication of services they use.

**Solution:** Created a complete logo system with 20+ branded service SVGs.

---

### 2. Asset & Build Configuration

**Files Created/Modified:**
- `renderer/vite.config.ts` - Added vite-plugin-svgr configuration

**Dependencies Added:**
```bash
cd renderer && npm install vite-plugin-svgr --save-dev
```

**Logo Assets Created:**
```
renderer/src/assets/logos/services/
├── gmail.svg
├── slack.svg
├── github.svg
├── gitlab.svg
├── google-drive.svg
├── google-docs.svg
├── google-sheets.svg
├── google-calendar.svg
├── notion.svg
├── trello.svg
├── asana.svg
├── jira.svg
├── discord.svg
├── microsoft-teams.svg
├── linkedin.svg
├── twitter.svg
├── salesforce.svg
├── hubspot.svg
├── fireflies.svg
├── otter.svg
├── firecrawl.svg
└── default.svg
```

---

### 3. Utility Functions

**File Created:** `renderer/src/utils/serviceExtractor.ts`

```typescript
// Extract service from MCP tool name
// e.g., "mcp_composio_GMAIL_SEND_EMAIL" → "GMAIL"
export function extractServiceFromToolName(toolName: string): string | null

// Normalize service name for logo lookup
// e.g., "GOOGLE_DRIVE" → "google-drive"
export function normalizeServiceName(service: string): string

// Extract services mentioned in workflow prompts
// Scans for keywords like "gmail", "slack", etc.
export function extractServicesFromPrompt(systemPrompt: string): string[]
```

**File Created:** `renderer/src/assets/logos/serviceMapping.ts`

- Maps service name aliases to logo keys
- Handles variations (e.g., 'mail' → 'gmail', 'docs' → 'google-docs')
- Provides `getLogoKey()` function for consistent lookups

---

### 4. Logo Components

**File Created:** `renderer/src/components/ServiceLogo.tsx`

Main logo component using inline SVG React components:

```typescript
// Primary component - renders logo by service name
export const ServiceLogo: React.FC<ServiceLogoProps>

// Convenience component - extracts service from tool name
export const ServiceLogoFromTool: React.FC<ServiceLogoFromToolProps>
```

**Key Design Decision:** Used inline SVG components instead of file imports (`?react` suffix) because:
- Works without dev server restart
- Guaranteed to work in all bundler configurations
- Better tree-shaking potential
- ~20KB total for all logos (acceptable)

**File Created:** `renderer/src/components/ToolTimelineIcon.tsx`

Timeline icon with status states:

```typescript
export const ToolTimelineIcon: React.FC<{
  toolName: string;
  status: 'running' | 'done' | 'error';
  size?: number;
}>
```

| State | Visual Treatment |
|-------|------------------|
| Running | Animated pulse ring around logo |
| Done | Green checkmark badge overlay |
| Error | Red indicator (future) |

**File Created:** `renderer/src/components/WorkflowServiceLogos.tsx`

```typescript
// Standard stacked display
export const WorkflowServiceLogos: React.FC<WorkflowServiceLogosProps>

// Compact version for cards
export const WorkflowServiceLogosCompact: React.FC<WorkflowServiceLogosProps>

// Inline row display
export const WorkflowServiceLogosInline: React.FC<{services: string[]}>
```

Features:
- Shows up to `maxVisible` logos (default 3)
- "+N" overflow indicator for additional services
- Tooltips showing full service names

---

### 5. Type Updates

**File Modified:** `renderer/src/types/index.ts`

```typescript
export interface WorkflowTemplate {
  // ... existing fields
  usedServices?: string[];  // NEW: Services used by workflow
}

// Added alias for backwards compatibility
export type Workflow = WorkflowTemplate;
```

---

### 6. Integration Points

**File Modified:** `renderer/src/components/AgentStudio.tsx`

- Removed old `getToolIcon()` function and inline `Spinner` component
- Replaced with `ToolTimelineIcon` component
- Added `WorkflowServiceLogosCompact` to workflow cards

**File Modified:** `renderer/src/components/WorkflowWizard.tsx`

- Auto-detects services from system prompt on save
- Stores `usedServices` array with workflow
- Shows "Detected Services" preview in Step 3

**File Modified:** `renderer/src/components/ToolConnections.tsx`

- Updated to use `ServiceLogo` component
- Mock data updated with proper service keys

**File Modified:** `server/routes/workflows.js`

- Accepts `usedServices` field in POST/PUT requests
- Stores with workflow data

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `renderer/vite.config.ts` | Added svgr plugin |
| `renderer/src/types/index.ts` | Added `usedServices`, `Workflow` alias |
| `renderer/src/components/AgentStudio.tsx` | Replaced icons with ToolTimelineIcon |
| `renderer/src/components/WorkflowWizard.tsx` | Service detection, preview |
| `renderer/src/components/ToolConnections.tsx` | ServiceLogo integration |
| `renderer/src/services/chatService.ts` | Include usedServices in save |
| `server/routes/workflows.js` | Accept/store usedServices |

## New Files Created

| File | Purpose |
|------|---------|
| `renderer/src/assets/logos/services/*.svg` | 22 service logo SVGs |
| `renderer/src/assets/logos/serviceMapping.ts` | Service name → logo key mapping |
| `renderer/src/utils/serviceExtractor.ts` | Extract services from tool names/prompts |
| `renderer/src/components/ServiceLogo.tsx` | Main logo component (inline SVGs) |
| `renderer/src/components/ToolTimelineIcon.tsx` | Timeline icon with status states |
| `renderer/src/components/WorkflowServiceLogos.tsx` | Stacked logo displays |

---

## Testing Notes

- Build verified: `npx vite build` succeeds
- Visual verification via browser extension screenshot
- Logo colors render correctly on dark background
- Status animations work (pulse for running, checkmark for done)
- Service detection correctly identifies Gmail, Slack, etc. in prompts

---

## Services Supported

**Communication:** Gmail, Slack, Discord, Microsoft Teams
**Productivity:** Google Drive, Google Docs, Google Sheets, Notion, Trello, Asana, Jira
**Development:** GitHub, GitLab
**AI/Transcription:** Fireflies, Otter, Firecrawl
**CRM:** Salesforce, HubSpot
**Social:** LinkedIn, Twitter/X
**Calendar:** Google Calendar
**Default:** Generic tool icon for unknown services

---

## Session: January 23, 2026 (Evening)

### Overview
Implemented Document Handling Architecture (persistent Knowledge Base + ephemeral session context), UI improvements (resizable sidebars, grouped model selector), and verified GitHub integration via Composio.

---

## Changes Made

### 1. Document Context Injection (Persistent Knowledge Base)

**Problem:** Knowledge Base toggle had no effect on chat behavior - documents weren't being injected into context.

**Solution:**

#### A. Updated Chat Service
**File Modified:** `renderer/src/services/chatService.ts`

```typescript
export interface ChatOptions {
  documentIds?: string[];      // Persistent KB document IDs
  ephemeralContext?: string;   // Session-only context
}

export async function* streamChat(
  message: string,
  chatId: string,
  provider: string,
  model: string | null,
  options?: ChatOptions
): AsyncGenerator<StreamChunk>
```

#### B. Backend Document Fetching
**File Modified:** `server/lib/supabase.js`

```javascript
// Fetch chunks for multiple documents with pagination
export async function fetchChunksForDocuments(documentIds, options = {})

// Get document metadata for formatting
export async function getDocumentsByIds(documentIds)
```

#### C. Context Building
**File Modified:** `server/server.js`

```javascript
async function buildDocumentContext(documentIds, ephemeralContext) {
  // Combines persistent KB chunks with ephemeral context
  // Returns formatted <context><document>...</document></context>
}
```

---

### 2. Ephemeral Session Context (Pattern B)

**Problem:** Users couldn't quickly add files to chat context without cluttering the Knowledge Base.

**Solution:**

#### A. File Extraction Utility
**File Created:** `renderer/src/utils/fileExtractor.ts`

- **Client-side extraction:** txt, md, json, csv
- **Server-side extraction:** pdf, docx (via Docling)
- Validates file type and size (5MB max for ephemeral)

#### B. ContextChips Component
**File Created:** `renderer/src/components/ContextChips.tsx`

- Displays ephemeral docs as pills above chat input
- Drag-and-drop file support
- Click to toggle active/inactive
- "X" to remove from context
- Uses `forwardRef` to expose `triggerFileSelect()` method

#### C. Server Extraction Endpoint
**File Modified:** `server/routes/documents.js`

```javascript
// POST /api/documents/extract
// Parses file with Docling but doesn't persist to Supabase
router.post('/extract', upload.single('file'), async (req, res) => {
  const result = await doclingClient.parseSync(buffer, originalname, {
    skipStorage: true
  });
  res.json({ content: fullText, metadata: {...} });
});
```

#### D. Type Definition
**File Modified:** `renderer/src/types/index.ts`

```typescript
export interface EphemeralDocument {
  id: string;
  name: string;
  type: string;
  content: string;
  isActive: boolean;
  addedAt: number;
  expiresAt?: number;
}
```

---

### 3. Resizable Sidebar Handles

**Problem:** Fixed sidebar widths weren't optimal for all screen sizes.

**Solution:**

#### A. ResizeHandle Component
**File Created:** `renderer/src/components/ResizeHandle.tsx`

```typescript
interface ResizeHandleProps {
  onResize: (delta: number) => void;
  position: 'left' | 'right';
}
```

- 4px wide draggable handle
- Cursor changes to `col-resize` on hover
- Visual feedback during drag (bg-accent)
- Inverts delta for right sidebar (drag left = increase width)

#### B. App Integration
**File Modified:** `renderer/src/App.tsx`

```typescript
// State
const [leftSidebarWidth, setLeftSidebarWidth] = useState(288);
const [rightSidebarWidth, setRightSidebarWidth] = useState(320);

// Constraints
const LEFT_SIDEBAR_MIN = 220;
const LEFT_SIDEBAR_MAX = 500;
const RIGHT_SIDEBAR_MIN = 280;
const RIGHT_SIDEBAR_MAX = 600;
```

---

### 4. Model Selector Grouped by Provider

**Problem:** Flat list of models made it hard to identify which provider a model belonged to.

**Solution:**

#### A. Updated MODELS Constant
**File Modified:** `renderer/src/constants/index.tsx`

```typescript
export const MODELS: ModelOption[] = [
  // Claude Provider
  { id: 'claude-sonnet-4-5-20250514', name: 'Sonnet 4.5', provider: 'Claude' },
  { id: 'claude-opus-4-5-20250514', name: 'Opus 4.5', provider: 'Claude' },
  { id: 'claude-haiku-4-5-20250514', name: 'Haiku 4.5', provider: 'Claude' },
  // Opencode Provider
  { id: 'opencode/big-pickle', name: 'Big Pickle', provider: 'Opencode' },
  // ... more models
];
```

#### B. Grouped Dropdown
**File Modified:** `renderer/src/components/ChatArea.tsx`

- Dropdown shows "CLAUDE" and "OPENCODE" section headers
- Checkmark indicator on selected model
- Click-outside handler to close dropdown

---

### 5. Dropdown Click-Outside Fix

**Problem:** Model selector dropdown didn't close when clicking outside.

**Solution:**

**File Modified:** `renderer/src/components/ChatArea.tsx`

```typescript
const modelDropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)) {
      setShowModels(false);
    }
  };

  if (showModels) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showModels]);
```

---

### 6. GitHub Integration via Composio

**Verification:** GitHub tools are available through Composio MCP when user connects their GitHub account.

**Available Actions:**
- `GITHUB_CREATE_REPOSITORY` - Create new repos
- `GITHUB_PUSH_FILES` - Push files to repos
- `GITHUB_CREATE_PULL_REQUEST` - Create PRs
- `GITHUB_CREATE_ISSUE` - Create issues
- And many more via Composio's GitHub integration

**How It Works:**
1. User connects GitHub via Composio OAuth (Tool Connections modal)
2. Composio provides MCP endpoint with GitHub tools
3. Claude Agent SDK calls tools via MCP
4. User can ask: "Create a new repo called my-app and add a README"

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `renderer/src/services/chatService.ts` | Added ChatOptions, documentIds, ephemeralContext |
| `renderer/src/App.tsx` | Ephemeral state, sidebar widths, resize handlers |
| `renderer/src/components/ChatArea.tsx` | Grouped model selector, click-outside handler |
| `renderer/src/components/ContextChips.tsx` | **NEW** - Ephemeral context UI |
| `renderer/src/components/ResizeHandle.tsx` | **NEW** - Draggable resize handles |
| `renderer/src/utils/fileExtractor.ts` | **NEW** - Client/server file extraction |
| `renderer/src/types/index.ts` | Added EphemeralDocument type |
| `renderer/src/constants/index.tsx` | Updated MODELS with more options |
| `server/server.js` | buildDocumentContext(), context injection |
| `server/lib/supabase.js` | fetchChunksForDocuments(), getDocumentsByIds() |
| `server/routes/documents.js` | /extract endpoint for ephemeral files |

---

## Testing Notes

- Document context injection verified: KB toggle now affects chat
- Ephemeral context: Drag-drop files appear as chips, content injected
- Resizable sidebars: Drag handles work with proper constraints
- Model selector: Groups display correctly, closes on outside click
- GitHub via Composio: Tool connections UI shows GitHub, tools available via MCP

---

## Architecture: Document Context Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  Sidebar                    │  Chat Area                        │
│  ┌─────────────────────┐   │  ┌─────────────────────────────┐  │
│  │ Knowledge Base      │   │  │ Messages                    │  │
│  │ (Persistent)        │   │  └─────────────────────────────┘  │
│  │ [✓] report.pdf      │   │  ┌─────────────────────────────┐  │
│  │ [ ] old-notes.md    │   │  │ Context Chips (Ephemeral)   │  │
│  └─────────────────────┘   │  │ [📄 temp.txt ×] [📄 mtg.md ×]│  │
│                             │  └─────────────────────────────┘  │
│                             │  ┌─────────────────────────────┐  │
│                             │  │ [+] [Input...      ] [Send] │  │
│                             │  └─────────────────────────────┘  │
└─────────────────────────────┴───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  POST /api/chat                                                  │
│  ├─ documentIds: [id1, id2] → Fetch chunks from Supabase        │
│  ├─ ephemeralContext: "..." → Already extracted, just use it    │
│  └─ Combine into context → Send to LLM provider                 │
└─────────────────────────────────────────────────────────────────┘
```
