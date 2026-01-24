# Implementation Plan

## Current Status: PHASE 1 - UI Fixes & Mobile

---

## Phase 1: UI Fixes & Polishing

### 1.1 Chat Session Rename ✅
- [x] **Add three-dot menu to chat sessions in sidebar**
  - File: `renderer/src/components/Sidebar.tsx`
  - Added MoreVertical icon and dropdown menu with "Rename", "Delete" options

- [x] **Implement rename modal/inline edit**
  - Implemented inline editing in Sidebar.tsx
  - Press Enter to save, Escape to cancel

- [x] **Add handlers for session rename/delete**
  - Added onRenameSession and onDeleteSession handlers in App.tsx
  - Sessions are client-side state, no backend API needed

### 1.2 Knowledge Base Modal ✅
- [x] **Add click handler to Knowledge Base icon**
  - File: `renderer/src/components/Sidebar.tsx`
  - Header text and Database icon both open modal

- [x] **Create KnowledgeBaseModal component**
  - File: `renderer/src/components/KnowledgeBaseModal.tsx`
  - Table with: Name, Type, Size, Date Added, Status, Actions
  - Actions: View, Delete
  - Search/filter input
  - Upload button that triggers sidebar file input

- [x] **Fetch all documents from backend**
  - Uses existing `getDocuments()` from chatService.ts
  - Uses existing `deleteDocument()` for delete functionality

### 1.3 Chat Input Height Reset Fix ✅
- [x] **Fix textarea auto-resize behavior**
  - File: `renderer/src/components/ChatArea.tsx`
  - Added textareaRef to track the textarea element
  - Reset `style.height = 'auto'` in handleSend after message submission

---

## Phase 2: Mobile Responsive Design ✅

### 2.1 Responsive Layout Foundation ✅
- [x] **Add Tailwind breakpoint utilities**
  - Using default Tailwind breakpoints (md: 768px)

- [x] **Create mobile layout wrapper**
  - Updated App.tsx with isMobile detection
  - Desktop: Three-panel layout
  - Mobile: Single panel with drawers

### 2.2 Mobile Navigation ✅
- [x] **Create BottomNavigation component**
  - File: `renderer/src/components/mobile/BottomNavigation.tsx`
  - Icons: Chat, Workflows, Knowledge, Settings

- [x] **Add mobile header**
  - File: `renderer/src/components/mobile/MobileHeader.tsx`
  - Hamburger menu, title, right action button

### 2.3 Responsive Sidebar ✅
- [x] **Make left sidebar collapsible/drawer on mobile**
  - Slide-in drawer with backdrop overlay

- [x] **Make right panel collapsible/drawer**
  - Slide-in drawer from right

### 2.4 Responsive Chat Area ✅
- [x] **Optimize chat for mobile**
  - Full width with padding for mobile header/nav

- [x] **Touch-friendly message actions**
  - CSS targets 44px minimum tap targets

### 2.5 Mobile Styles ✅
- [x] **Add responsive CSS**
  - File: `renderer/src/styles/mobile.css`
  - Drawer animations, safe areas, touch targets

---

## Phase 3: Rich Text Editor & Canvas Drawer ✅

### 3.1 TipTap Editor Setup ✅
- [x] **Install TipTap dependencies**
  - Installed: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-placeholder, @tiptap/extension-link, @tiptap/extension-underline

- [x] **Create RichTextEditor component**
  - File: `renderer/src/components/editor/RichTextEditor.tsx`
  - Toolbar: Bold, Italic, Underline, Strike, Link, Lists, Headings, Quote, Code

### 3.2 Canvas/Artifact Drawer ✅
- [x] **Create CanvasDrawer component**
  - File: `renderer/src/components/CanvasDrawer.tsx`
  - Slide-in from right with backdrop
  - Save, Copy, Export (HTML/Text) functionality

- [ ] **Integrate with chat flow** (DEFERRED)
  - Can be added when artifact streaming is implemented

### 3.3 Email Template System (DEFERRED)
- [ ] EmailTemplateEditor - Can be built on RichTextEditor later
- [ ] Email type and storage - Future enhancement
- [ ] Template selector - Future enhancement

---

## Phase 4: Workflow System (from workflow_system_spec.md)

### 4.1 Foundation
- [ ] **Create workflow types**
  - File: `renderer/src/types/workflow.ts`
  - Copy types from workflow_system_spec.md Section 3

- [ ] **Create A2UI types**
  - File: `renderer/src/types/a2ui.ts`
  - Copy from workflow_system_spec.md Appendix

- [ ] **Setup database schema**
  - File: `scripts/setup_workflows.sql`
  - Copy from workflow_system_spec.md Section 9
  - Run migration

- [ ] **Create workflow service**
  - File: `server/services/workflow-service.js`
  - Copy from workflow_system_spec.md Section 8.1

- [ ] **Create workflow API routes**
  - File: `server/routes/workflows.js`
  - Copy from workflow_system_spec.md Section 10

### 4.2 A2UI Renderer
- [ ] **Build A2UI renderer component**
  - File: `renderer/src/components/A2UI/A2UIRenderer.tsx`
  - Copy from workflow_system_spec.md Section 6.1

- [ ] **Build component catalog**
  - File: `renderer/src/components/A2UI/componentCatalog.tsx`
  - Copy from workflow_system_spec.md Section 6.2

- [ ] **Add A2UI styles**
  - File: `renderer/src/styles/a2ui.css`
  - Copy from workflow_system_spec.md Section 6.3

### 4.3 Workflow Capture
- [ ] **Add "Save as Workflow" to chat header**
  - File: `renderer/src/components/ChatHeader.tsx`
  - Button triggers workflow extraction

- [ ] **Create workflow capture hook**
  - File: `renderer/src/hooks/useWorkflowCapture.ts`

### 4.4 Workflow Panel & Execution
- [ ] **Build WorkflowPanel component**
  - File: `renderer/src/components/Workflow/WorkflowPanel.tsx`
  - Copy from workflow_system_spec.md Section 7.1

- [ ] **Build WorkflowRunner modal**
  - File: `renderer/src/components/Workflow/WorkflowRunner.tsx`

- [ ] **Create workflow executor**
  - File: `server/services/workflow-executor.js`
  - Copy from workflow_system_spec.md Section 8.2

---

## Phase 5: Testing & Polish

### 5.1 Testing
- [ ] **Add component tests for new components**
- [ ] **Add API tests for new endpoints**
- [ ] **Manual mobile testing on real devices**

### 5.2 Performance
- [ ] **Lazy load heavy components (editor, workflow)**
- [ ] **Optimize re-renders with React.memo**
- [ ] **Add loading skeletons**

### 5.3 Accessibility
- [ ] **Add ARIA labels**
- [ ] **Keyboard navigation**
- [ ] **Focus management for modals**

---

## File Reference Quick Links

| Feature | Primary Files |
|---------|---------------|
| Chat Sessions | `renderer/src/components/Sidebar.tsx`, `server/routes/sessions.js` |
| Knowledge Base | `renderer/src/components/KnowledgeBaseModal.tsx`, `server/routes/knowledge.js` |
| Chat Input | `renderer/src/components/ChatInput.tsx` |
| Mobile Layout | `renderer/src/components/Layout.tsx`, `renderer/src/components/mobile/*` |
| Rich Text Editor | `renderer/src/components/editor/RichTextEditor.tsx` |
| Canvas Drawer | `renderer/src/components/CanvasDrawer.tsx` |
| Email Templates | `renderer/src/components/editor/EmailTemplateEditor.tsx`, `server/routes/email-templates.js` |
| Workflows | `renderer/src/components/Workflow/*`, `server/services/workflow-service.js` |
| A2UI | `renderer/src/components/A2UI/*` |

---

## Execution Notes

- Work through phases in order
- Complete all tasks in a phase before moving to next
- Run tests after each feature
- Commit after each completed task
- If stuck on a task for more than 3 attempts, skip and note in comments
