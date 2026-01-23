# Engineering Log - Open Claude Cowork

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
