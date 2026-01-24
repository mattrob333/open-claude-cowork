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

### 1.2 Knowledge Base Modal
- [ ] **Add click handler to Knowledge Base icon**
  - File: `renderer/src/components/Sidebar.tsx` (Knowledge Base section)
  - Icon should open modal on click
  
- [ ] **Create KnowledgeBaseModal component**
  - File: `renderer/src/components/KnowledgeBaseModal.tsx` (create)
  - Display all documents in a table format
  - Columns: Name, Type, Size, Date Added, Actions
  - Actions: View, Delete
  - Search/filter capability
  - Upload button at top
  
- [ ] **Fetch all documents from backend**
  - File: `server/routes/knowledge.js` (check existing)
  - GET /api/knowledge - return all documents with metadata

### 1.3 Chat Input Height Reset Fix
- [ ] **Fix textarea auto-resize behavior**
  - File: `renderer/src/components/ChatInput.tsx` or `InputArea.tsx`
  - Current bug: textarea stays expanded after submit
  - Fix: Reset height to initial value (e.g., 44px or 1 row) after message sent
  - Implementation:
    ```tsx
    const handleSubmit = () => {
      // ... send message
      textareaRef.current.style.height = 'auto'; // or initial height
      setMessage('');
    };
    ```
  - Use controlled height with useEffect on message change

---

## Phase 2: Mobile Responsive Design

### 2.1 Responsive Layout Foundation
- [ ] **Add Tailwind breakpoint utilities**
  - File: `renderer/tailwind.config.js`
  - Ensure breakpoints: sm (640), md (768), lg (1024), xl (1280)
  
- [ ] **Create mobile layout wrapper**
  - File: `renderer/src/components/Layout.tsx` or `App.tsx`
  - Desktop: Three-panel layout (sidebar | chat | right panel)
  - Tablet: Two-panel (collapsible sidebar | chat+right)
  - Mobile: Single panel with bottom nav

### 2.2 Mobile Navigation
- [ ] **Create BottomNavigation component**
  - File: `renderer/src/components/mobile/BottomNavigation.tsx` (create)
  - Icons: Chat, Workflows, Knowledge, Settings
  - Fixed to bottom, safe area padding
  - Only visible on mobile (< 768px)
  
- [ ] **Add mobile header**
  - File: `renderer/src/components/mobile/MobileHeader.tsx` (create)
  - Hamburger menu to open sidebar
  - Title in center
  - Action buttons on right

### 2.3 Responsive Sidebar
- [ ] **Make left sidebar collapsible/drawer on mobile**
  - File: `renderer/src/components/Sidebar.tsx`
  - Desktop: Always visible
  - Mobile: Slide-in drawer from left
  - Backdrop overlay when open
  
- [ ] **Make right panel collapsible/drawer**
  - File: `renderer/src/components/RightPanel.tsx` or `WorkflowPanel.tsx`
  - Desktop: Always visible (or toggleable)
  - Mobile: Slide-in drawer from right or bottom sheet

### 2.4 Responsive Chat Area
- [ ] **Optimize chat for mobile**
  - File: `renderer/src/components/ChatArea.tsx`
  - Full width on mobile
  - Proper padding for safe areas
  - Input fixed to bottom with keyboard handling
  
- [ ] **Touch-friendly message actions**
  - File: `renderer/src/components/Message.tsx`
  - Larger tap targets (min 44px)
  - Swipe actions optional

### 2.5 Mobile Styles
- [ ] **Add responsive CSS**
  - File: `renderer/src/styles/mobile.css` (create)
  - Media queries for all breakpoints
  - Touch-specific hover states
  - Safe area insets

---

## Phase 3: Rich Text Editor & Canvas Drawer

### 3.1 TipTap Editor Setup
- [ ] **Install TipTap dependencies**
  - Run in /renderer:
    ```bash
    npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link @tiptap/extension-image @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-underline
    ```

- [ ] **Create RichTextEditor component**
  - File: `renderer/src/components/editor/RichTextEditor.tsx` (create)
  - Toolbar: Bold, Italic, Underline, Strike, Link, Lists, Headings
  - Support for images
  - HTML output mode for emails

### 3.2 Canvas/Artifact Drawer
- [ ] **Create CanvasDrawer component**
  - File: `renderer/src/components/CanvasDrawer.tsx` (create)
  - Slides in from right (like Claude artifacts)
  - Contains RichTextEditor
  - Header with title, close button
  - Footer with Save, Copy, Export buttons
  
- [ ] **Integrate with chat flow**
  - File: `renderer/src/components/ChatArea.tsx`
  - When agent generates document, open drawer
  - Stream content into editor
  - Allow user edits

### 3.3 Email Template System
- [ ] **Create EmailTemplateEditor component**
  - File: `renderer/src/components/editor/EmailTemplateEditor.tsx` (create)
  - Extends RichTextEditor with email-specific features
  - Subject line input
  - Preview mode (HTML rendered)
  - Variable placeholders: {{name}}, {{company}}
  
- [ ] **Create EmailTemplate type and storage**
  - File: `renderer/src/types/email.ts` (create)
  - File: `server/routes/email-templates.js` (create)
  - CRUD for templates
  - Database table for templates

- [ ] **Email template selector**
  - File: `renderer/src/components/email/TemplateSelector.tsx` (create)
  - Dropdown to pick saved template
  - Preview before use
  - Edit/duplicate options

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
