# Start Here Onboarding Workflow Specification

## Overview

A delightful, conversational onboarding experience that guides new users through:
1. Connecting their daily tools via Composio
2. Creating their personal context file
3. Understanding what they can do with the app

## Design Decisions

### Tool Priority (in display order)

| Category | Tools |
|----------|-------|
| **Communication** | Gmail, Slack |
| **Productivity** | Notion, Google Calendar, SharePoint |
| **Research** | Firecrawl, Exa Search |
| **Development** | GitHub |
| **Documents** | Google Sheets, Google Slides |
| **Meetings** | Fireflies Note Taker |
| **CRM** | Zoho CRM, HubSpot, Salesforce, Pipedrive |

### Personal Context Storage

**Option C: Supabase as Source of Truth + Local Cache**

- Primary storage: Supabase `user_profiles.personal_context` column
- Local cache: localStorage for offline/fast access
- Sync: On login, fetch from Supabase → cache locally
- On save: Write to Supabase → update local cache
- Auto-inject into every conversation as system context

### Skip Behavior

**Stay Pinned Until Completed**

- "Start Here" workflow remains at top of WorkflowPanel
- Shows visual indicator (e.g., "Setup incomplete")
- Once completed, moves to regular position or hides
- Store completion status in localStorage + Supabase

---

## Implementation Status

### ✅ Completed

1. **A2UI Onboarding Components** (`renderer/src/components/A2UI/onboarding/`)
   - `WelcomeHero.tsx` - Welcome screen with features preview
   - `ToolGrid.tsx` - Visual grid of tools to connect
   - `ConnectionProgress.tsx` - Live OAuth connection status
   - `PersonalContextForm.tsx` - Gather user role, tasks, preferences
   - `OnboardingComplete.tsx` - Summary and suggested actions
   - `index.ts` - Exports

2. **CSS Styles** (`renderer/src/styles/onboarding.css`)
   - Full styling for all onboarding components
   - Matches app's dark theme with coral accent

3. **Component Registration** (`renderer/src/components/A2UI/componentCatalog.tsx`)
   - All 5 onboarding components registered

4. **Default Workflow Seeding** (`renderer/src/lib/workflowStorage.ts`)
   - `seedDefaultWorkflows()` function
   - `START_HERE_WORKFLOW` definition with full steps
   - `isOnboardingComplete()` and `markOnboardingComplete()` helpers

5. **Backend Route** (`server/routes/personal-context.js`)
   - `GET /api/user/personal-context` - Fetch context
   - `PUT /api/user/personal-context` - Save context
   - `POST /api/user/personal-context/onboarding-complete` - Mark complete

6. **Personal Context Modal** (`renderer/src/components/PersonalContextModal.tsx`)
   - Full modal for viewing/editing personal context
   - Syncs with Supabase and caches locally

7. **Wiring**
   - `App.tsx` - Seeds workflows on mount, renders PersonalContextModal
   - `ChatArea.tsx` - Passes `onOpenContextFile` to UserProfileMenu
   - `server/server.js` - Mounts personal-context router

---

## Files Created/Modified

### New Files
```
renderer/src/components/A2UI/onboarding/
  ├── WelcomeHero.tsx
  ├── ToolGrid.tsx
  ├── ConnectionProgress.tsx
  ├── PersonalContextForm.tsx
  ├── OnboardingComplete.tsx
  └── index.ts

renderer/src/styles/onboarding.css
renderer/src/components/PersonalContextModal.tsx
server/routes/personal-context.js
specs/onboarding-workflow.md
```

### Modified Files
```
renderer/src/components/A2UI/componentCatalog.tsx  (register components)
renderer/src/lib/workflowStorage.ts                (seeding + helpers)
renderer/src/main.tsx                              (import CSS)
renderer/src/App.tsx                               (seed + modal)
renderer/src/components/ChatArea.tsx               (pass callback)
server/server.js                                   (mount route)
```

---

## Remaining Work

### Agent Behavior
The agent needs to be instructed to use these A2UI components when the Start Here workflow is run. The golden instructions are included in the workflow definition, but the agent's system prompt may need updates to recognize and render these components.

### Composio OAuth Flow
The actual OAuth connection flow needs to be wired:
- Query Composio for available apps
- Trigger OAuth for selected apps
- Update connection status in real-time

### Database Migration
Add columns to Supabase `user_profiles` table:
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  personal_context JSONB DEFAULT NULL;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  onboarding_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS
  connected_tools TEXT[] DEFAULT '{}';
```

---

## Testing

1. Clear localStorage: `localStorage.clear()`
2. Refresh app
3. "🚀 Start Here" workflow should appear pinned in WorkflowPanel
4. Click "Personal Context File" in user menu → modal opens
5. Fill in context → saves to localStorage (and Supabase if configured)
