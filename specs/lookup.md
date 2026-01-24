# Context Lookup Table

This file assists the search tool in linking concepts to code locations.

## Feature → File Mapping

| Feature Concept | Keywords & Synonyms | Related Files |
|-----------------|---------------------|---------------|
| Chat Sessions | notebooks, conversations, threads, history | `renderer/src/components/Sidebar.tsx`, `renderer/src/components/NotebookList.tsx` |
| Session Rename | edit title, rename chat, change name | `renderer/src/components/Sidebar.tsx`, `server/routes/sessions.js` |
| Knowledge Base | documents, uploads, files, PDFs, context | `renderer/src/components/Sidebar.tsx`, `server/routes/knowledge.js`, `server/services/docling.js` |
| Chat Input | textarea, message input, compose, text area | `renderer/src/components/ChatInput.tsx`, `renderer/src/components/InputArea.tsx` |
| Chat Messages | bubbles, conversation, history, assistant | `renderer/src/components/ChatArea.tsx`, `renderer/src/components/Message.tsx` |
| Right Sidebar | workflow panel, tools panel, right panel | `renderer/src/components/RightPanel.tsx`, `renderer/src/components/WorkflowPanel.tsx` |
| Left Sidebar | navigation, notebooks, sessions | `renderer/src/components/Sidebar.tsx` |
| Mobile | responsive, breakpoints, touch, phone | `renderer/src/styles/`, `renderer/tailwind.config.js` |
| Modals | dialog, popup, overlay | `renderer/src/components/*Modal.tsx` |
| Dropdowns | menu, select, options, three dots | Standard pattern needed |
| Rich Text | editor, WYSIWYG, formatting, TipTap | `renderer/src/components/editor/` |
| Email | templates, HTML email, Resend | `server/services/email.js`, `server/routes/email-templates.js` |
| Workflows | automation, saved workflows, execution | `renderer/src/components/Workflow/`, `server/services/workflow-*.js` |
| A2UI | streaming UI, components, surfaces | `renderer/src/components/A2UI/` |
| Canvas | artifacts, drawer, side panel | `renderer/src/components/CanvasDrawer.tsx` |
| Provider | Claude, OpenRouter, Anthropic, LLM | `server/providers/`, `server/services/provider-service.js` |
| Tools | Composio, integrations, actions | `server/services/composio.js`, `server/routes/tools.js` |

## Component Patterns

| Pattern | Implementation Reference |
|---------|-------------------------|
| Modal with form | Look for existing `*Modal.tsx` components |
| Dropdown menu | May need to create, use Headless UI or Radix |
| Slide-in drawer | Check for existing drawer or create new |
| Responsive grid | Tailwind grid classes, check Layout components |
| Form validation | Check existing forms for pattern |
| API calls | Check hooks like `useChat.ts` for fetch patterns |
| State management | React context or useState in parent |

## Styling Patterns

| Pattern | Location |
|---------|----------|
| Dark theme variables | `renderer/src/styles/globals.css` or `index.css` |
| Tailwind config | `renderer/tailwind.config.js` |
| Component-specific | Inline Tailwind classes or CSS modules |
| Animations | Tailwind animate classes or custom CSS |

## Backend Patterns

| Pattern | Reference |
|---------|-----------|
| Route structure | `server/routes/*.js` - follow existing patterns |
| Service layer | `server/services/*.js` - business logic here |
| Database queries | Supabase client in services |
| Error handling | Try/catch with logger, return { error } |
| Validation | express-validator middleware |

## Key Dependencies

| Package | Purpose |
|---------|---------|
| @tiptap/* | Rich text editor |
| @supabase/supabase-js | Database client |
| @anthropic-ai/sdk | Claude API |
| composio-core | Tool integrations |
| express | Backend framework |
| react | Frontend framework |
| tailwindcss | Styling |
| lucide-react | Icons |

## Mobile Breakpoints

```
< 640px   : Mobile (sm)
640-768px : Large mobile / small tablet
768-1024px: Tablet (md)
1024-1280px: Small desktop (lg)
> 1280px  : Desktop (xl)
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Textarea not resizing | Use controlled height with useEffect |
| Modal not closing | Check event propagation, add backdrop click |
| Mobile layout broken | Check flex/grid containers, use responsive classes |
| API 404 | Verify route is registered in server/index.js |
| Component not rendering | Check import, verify props, check conditional render |
