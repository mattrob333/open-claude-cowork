import { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentStudio from './components/AgentStudio';
import RunWorkflowModal from './components/RunWorkflowModal';
import WorkflowWizard from './components/WorkflowWizard';
import ErrorBoundary from './components/ErrorBoundary';
import ToolConnections from './components/ToolConnections';
import DocumentPreview from './components/DocumentPreview';
import KnowledgeBaseModal from './components/KnowledgeBaseModal';
import ResizeHandle from './components/ResizeHandle';
import { MobileHeader } from './components/mobile';
import { Session, Message, Role, ToolLogEntry, KnowledgeAsset, ModelOption, WorkflowTemplate, EphemeralDocument } from './types';
import { MODELS } from './constants';
import { streamChat, uploadDocument, getDocuments, getDocumentUrl, ChatOptions, generateSessionTitle } from './services/chatService';
import AuthModal from './components/AuthModal';
import PersonalContextModal from './components/PersonalContextModal';
import OnboardingModal from './components/OnboardingModal';
import { useAuth } from './contexts/AuthContext';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Artifact detection patterns
interface DetectedArtifact {
  isArtifact: boolean;
  title: string;
  type: string;
  language?: string;
  content: string;
}

function detectArtifact(content: string): DetectedArtifact | null {
  const extMap: Record<string, string> = {
    typescript: 'script.ts', tsx: 'component.tsx', javascript: 'script.js', jsx: 'component.jsx',
    python: 'script.py', rust: 'main.rs', go: 'main.go', java: 'Main.java',
    html: 'index.html', css: 'styles.css', json: 'data.json', yaml: 'config.yaml',
    markdown: 'document.md', md: 'document.md', sql: 'query.sql', bash: 'script.sh', sh: 'script.sh'
  };

  // Pattern 1: Find ANY code block in the content (with language specifier)
  const codeBlockPattern = /```(\w+)\n([\s\S]*?)```/;
  const codeBlockMatch = content.match(codeBlockPattern);

  if (codeBlockMatch) {
    const lang = codeBlockMatch[1];
    const code = codeBlockMatch[2].trim();
    const codeLines = code.split('\n').length;

    // Only treat as artifact if it's substantial code (>5 lines)
    if (codeLines > 5) {
      return {
        isArtifact: true,
        title: extMap[lang] || `output.${lang}`,
        type: 'code',
        language: lang,
        content: code
      };
    }
  }

  // Pattern 2: Code block with explicit filename (```language:filename.ext)
  const codeBlockWithFilename = /```(\w+)[:\s]+([\w.-]+)\n([\s\S]*?)```/;
  const matchWithFilename = content.match(codeBlockWithFilename);
  if (matchWithFilename) {
    return {
      isArtifact: true,
      title: matchWithFilename[2],
      type: 'code',
      language: matchWithFilename[1],
      content: matchWithFilename[3].trim()
    };
  }

  // Pattern 3: Markdown document (starts with # heading and has substantial content)
  const markdownDoc = /^#\s+(.+)\n\n([\s\S]{100,})$/;
  const matchMd = content.trim().match(markdownDoc);
  if (matchMd) {
    const title = matchMd[1].trim();
    const hasStructure = content.includes('\n\n') && (content.includes('- ') || content.includes('1. ') || content.split('\n\n').length > 2);
    if (hasStructure) {
      return {
        isArtifact: true,
        title: `${title.toLowerCase().replace(/\s+/g, '_').slice(0, 30)}.md`,
        type: 'markdown',
        content: content.trim()
      };
    }
  }

  return null;
}

function App() {
  // Auth state
  const { user } = useAuth();

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Messages state (keyed by session ID)
  const [messagesBySession, setMessagesBySession] = useState<Record<string, Message[]>>({});

  // UI state
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelOption>(MODELS[0]);
  const [toolLogs, setToolLogs] = useState<ToolLogEntry[]>([]);

  // Sidebar widths (resizable) - defaulting to max width
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(500); // Default: max width
  const [rightSidebarWidth, setRightSidebarWidth] = useState(600); // Default: max width

  // Sidebar constraints
  const LEFT_SIDEBAR_MIN = 220;
  const LEFT_SIDEBAR_MAX = 500;
  const RIGHT_SIDEBAR_MIN = 280;
  const RIGHT_SIDEBAR_MAX = 600;

  // Knowledge Base (Persistent)
  const [knowledgeAssets, setKnowledgeAssets] = useState<KnowledgeAsset[]>([]);

  // Ephemeral Documents (Session Context)
  const [ephemeralDocs, setEphemeralDocs] = useState<EphemeralDocument[]>([]);

  // Workflow modals
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);

  // Workflow capture state (for A2UI flow)
  const [workflowCaptureState, setWorkflowCaptureState] = useState<{
    step: 'idle' | 'golden' | 'variables' | 'output' | 'saving';
    data: {
      name?: string;
      description?: string;
      icon?: string;
      goldenInstructions?: string;
      steps?: { name: string; description: string; tools: string[] }[];
      variables?: unknown[];
      outputStyle?: string;
      actions?: unknown[];
    };
  }>({ step: 'idle', data: {} });

  // Tool connections modal
  const [showToolConnections, setShowToolConnections] = useState(false);

  // Knowledge base modal
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);

  // Auth modal
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Personal context modal
  const [showPersonalContext, setShowPersonalContext] = useState(false);

  // Onboarding modal
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  const [showLeftDrawer, setShowLeftDrawer] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(false);

  // Skills state
  const [activeSkillIds, setActiveSkillIds] = useState<string[]>([]);

  // Document preview
  const [previewDocument, setPreviewDocument] = useState<{
    asset: KnowledgeAsset;
    url: string | null;
    isLoading: boolean;
  } | null>(null);

  // Get current session and messages
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSessionId ? (messagesBySession[activeSessionId] || []) : [];

  // Load sessions and messages from localStorage on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem('chat_sessions');
      const savedMessages = localStorage.getItem('chat_messages');
      const savedActiveSessionId = localStorage.getItem('active_session_id');
      
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
      if (savedMessages) {
        setMessagesBySession(JSON.parse(savedMessages));
      }
      if (savedActiveSessionId) {
        setActiveSessionId(savedActiveSessionId);
      }
    } catch (err) {
      console.error('Error loading sessions from localStorage:', err);
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    } catch (err) {
      console.error('Error saving sessions to localStorage:', err);
    }
  }, [sessions]);

  // Save messages to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('chat_messages', JSON.stringify(messagesBySession));
    } catch (err) {
      console.error('Error saving messages to localStorage:', err);
    }
  }, [messagesBySession]);

  // Save active session ID to localStorage when it changes
  useEffect(() => {
    try {
      if (activeSessionId) {
        localStorage.setItem('active_session_id', activeSessionId);
      } else {
        localStorage.removeItem('active_session_id');
      }
    } catch (err) {
      console.error('Error saving active session ID to localStorage:', err);
    }
  }, [activeSessionId]);

  // Show onboarding on first run and clean up old Start Here workflow
  useEffect(() => {
    // Import and run cleanup of old Start Here workflow
    import('./lib/workflowStorage').then(({ seedDefaultWorkflows }) => {
      seedDefaultWorkflows(); // This now removes the Start Here workflow if it exists
    });
    
    // Show onboarding modal if not completed
    const onboardingComplete = localStorage.getItem('onboarding_completed');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, []);

  // Load documents from backend on mount
  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const response = await getDocuments({ status: 'ready' });
        const formatSize = (bytes: number): string => {
          if (bytes >= 1024 * 1024) {
            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
          } else if (bytes >= 1024) {
            return `${(bytes / 1024).toFixed(0)} KB`;
          }
          return `${bytes} B`;
        };

        const assets: KnowledgeAsset[] = response.documents.map(doc => ({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          size: formatSize(doc.size),
          isActive: true,
        }));

        setKnowledgeAssets(assets);
      } catch (err) {
        console.error('Error loading documents:', err);
      }
    };

    loadDocuments();
  }, []);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close drawers when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setShowLeftDrawer(false);
      setShowRightDrawer(false);
    }
  }, [isMobile]);

  // Create new session
  const handleCreateSession = useCallback(() => {
    const newSession: Session = {
      id: generateId(),
      title: 'New Session',
      lastActive: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessagesBySession(prev => ({ ...prev, [newSession.id]: [] }));
    setToolLogs([]);
  }, []);

  // Select session
  const handleSelectSession = useCallback((id: string) => {
    setActiveSessionId(id);
    setToolLogs([]);
  }, []);

  // Rename session
  const handleRenameSession = useCallback((id: string, newTitle: string) => {
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, title: newTitle } : s
    ));
  }, []);

  // Delete session
  const handleDeleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
    }
    setMessagesBySession(prev => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  }, [activeSessionId]);

  // Toggle knowledge asset
  const handleToggleAsset = useCallback((id: string) => {
    setKnowledgeAssets(prev =>
      prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a)
    );
  }, []);

  // Delete knowledge asset
  const handleDeleteAsset = useCallback(async (id: string) => {
    try {
      const { deleteDocument } = await import('./services/chatService');
      await deleteDocument(id);
      setKnowledgeAssets(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  }, []);

  // Ephemeral document handlers
  const handleAddEphemeralDoc = useCallback((doc: EphemeralDocument) => {
    setEphemeralDocs(prev => [...prev, doc]);
  }, []);

  const handleRemoveEphemeralDoc = useCallback((id: string) => {
    setEphemeralDocs(prev => prev.filter(d => d.id !== id));
  }, []);

  const handleToggleEphemeralDoc = useCallback((id: string) => {
    setEphemeralDocs(prev =>
      prev.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d)
    );
  }, []);

  // Sidebar resize handlers
  const handleLeftSidebarResize = useCallback((delta: number) => {
    setLeftSidebarWidth(prev => {
      const newWidth = prev + delta;
      return Math.min(LEFT_SIDEBAR_MAX, Math.max(LEFT_SIDEBAR_MIN, newWidth));
    });
  }, []);

  const handleRightSidebarResize = useCallback((delta: number) => {
    setRightSidebarWidth(prev => {
      const newWidth = prev + delta;
      return Math.min(RIGHT_SIDEBAR_MAX, Math.max(RIGHT_SIDEBAR_MIN, newWidth));
    });
  }, []);

  // Upload file to knowledge base via backend API
  const handleUploadFile = useCallback(async (file: File) => {
    const formatSize = (bytes: number): string => {
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      } else if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
      }
      return `${bytes} B`;
    };

    try {
      // Upload to backend (which handles Supabase storage + database)
      // Pass user ID if authenticated, otherwise use default
      const doc = await uploadDocument(file, user?.id);

      const newAsset: KnowledgeAsset = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        size: formatSize(doc.size),
        isActive: true,
      };

      setKnowledgeAssets(prev => [...prev, newAsset]);
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error; // Re-throw to let Sidebar show error state
    }
  }, []);

  // Send message
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;

    // Create session if none exists
    let sessionId = activeSessionId;
    if (!sessionId) {
      const newSession: Session = {
        id: generateId(),
        title: text.length > 30 ? text.substring(0, 30) + '...' : text,
        lastActive: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      sessionId = newSession.id;
      setMessagesBySession(prev => ({ ...prev, [sessionId!]: [] }));
    } else {
      // Update session title if it's first message
      const msgs = messagesBySession[sessionId] || [];
      if (msgs.length === 0) {
        setSessions(prev => prev.map(s =>
          s.id === sessionId ? { ...s, title: text.length > 30 ? text.substring(0, 30) + '...' : text } : s
        ));
      }
    }

    // Check if this is a hidden system trigger (don't show in chat)
    const isHiddenTrigger = text === '__QUICK_ACTION_EXTRACT__';

    // Add user message (skip if hidden trigger)
    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      content: isHiddenTrigger ? '' : text,
      timestamp: Date.now()
    };

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: generateId(),
      role: Role.ASSISTANT,
      content: '',
      timestamp: Date.now()
    };

    // Only add user message if not a hidden trigger
    setMessagesBySession(prev => ({
      ...prev,
      [sessionId!]: isHiddenTrigger 
        ? [...(prev[sessionId!] || []), assistantMessage]
        : [...(prev[sessionId!] || []), userMessage, assistantMessage]
    }));

    setIsTyping(true);

    try {
      // Determine provider from model
      const provider = currentModel.provider.toLowerCase() === 'opencode' ? 'opencode' : 'claude';

      // Get active document IDs from Knowledge Base (persistent)
      const activeDocumentIds = knowledgeAssets
        .filter(asset => asset.isActive)
        .map(asset => asset.id);

      // Build ephemeral context from active session documents
      const activeEphemeralDocs = ephemeralDocs.filter(d => d.isActive);
      const ephemeralContext = activeEphemeralDocs.length > 0
        ? activeEphemeralDocs
            .map(d => `<document name="${d.name}">\n${d.content}\n</document>`)
            .join('\n\n')
        : undefined;

      const chatOptions: ChatOptions = {};
      if (activeDocumentIds.length > 0) {
        chatOptions.documentIds = activeDocumentIds;
      }
      if (ephemeralContext) {
        chatOptions.ephemeralContext = ephemeralContext;
      }
      if (activeSkillIds.length > 0) {
        chatOptions.activeSkillIds = activeSkillIds;
      }
      // Load personal context from localStorage
      const personalContext = localStorage.getItem('personal_context');
      if (personalContext) {
        chatOptions.personalContext = personalContext;
      }

      for await (const chunk of streamChat(text, sessionId!, provider, currentModel.id, chatOptions)) {
        if (chunk.type === 'text' && chunk.content) {
          setMessagesBySession(prev => {
            const msgs = prev[sessionId!] || [];
            const lastMsg = msgs[msgs.length - 1];
            if (lastMsg && lastMsg.role === Role.ASSISTANT) {
              return {
                ...prev,
                [sessionId!]: [
                  ...msgs.slice(0, -1),
                  { ...lastMsg, content: lastMsg.content + chunk.content }
                ]
              };
            }
            return prev;
          });
        } else if (chunk.type === 'tool_use' && chunk.name) {
          const toolLog: ToolLogEntry = {
            id: generateId(),
            toolUseId: chunk.tool_use_id || chunk.id, // Store tool_use_id for matching
            name: chunk.name,
            args: chunk.input || {},
            status: 'running',
            timestamp: Date.now()
          };
          // Cap tool logs at 100 to prevent memory issues
          setToolLogs(prev => {
            const updated = [...prev, toolLog];
            return updated.length > 100 ? updated.slice(-100) : updated;
          });
        } else if (chunk.type === 'tool_result') {
          // Handle tool_result - match by tool_use_id or update first running item
          setToolLogs(prev => {
            const updated = [...prev];
            const resultToolUseId = chunk.tool_use_id || chunk.id;
            const resultContent = typeof chunk.result === 'string'
              ? chunk.result.substring(0, 500)
              : JSON.stringify(chunk.result || chunk.content || '').substring(0, 500);

            // Try to find matching tool by tool_use_id
            let matchIndex = -1;
            if (resultToolUseId) {
              matchIndex = updated.findIndex(t => t.toolUseId === resultToolUseId);
            }

            // Fallback: find first running item if no ID match
            if (matchIndex === -1) {
              matchIndex = updated.findIndex(t => t.status === 'running');
            }

            // Last resort: update the last item
            if (matchIndex === -1 && updated.length > 0) {
              matchIndex = updated.length - 1;
            }

            if (matchIndex !== -1) {
              updated[matchIndex] = {
                ...updated[matchIndex],
                status: 'done',
                result: resultContent
              };
            }

            return updated;
          });
        } else if (chunk.type === 'skills_active') {
          // Skills were matched and activated for this message
          // The chunk contains the matched skills, we can optionally update UI
          console.log('Skills active:', chunk.skills);
        }
      }
    } catch (error) {
      console.error('Error streaming:', error);
      setMessagesBySession(prev => {
        const msgs = prev[sessionId!] || [];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === Role.ASSISTANT) {
          return {
            ...prev,
            [sessionId!]: [
              ...msgs.slice(0, -1),
              { ...lastMsg, content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }
            ]
          };
        }
        return prev;
      });
    } finally {
      setIsTyping(false);

      // FAIL-SAFE SWEEP: Force all "running" tools to "done" when stream ends
      setToolLogs(prev => {
        const hasRunning = prev.some(t => t.status === 'running');
        if (!hasRunning) return prev;
        return prev.map(tool =>
          tool.status === 'running'
            ? { ...tool, status: 'done' as const, result: tool.result || 'Completed' }
            : tool
        );
      });

      // ARTIFACT DETECTION: Check if the final message contains an artifact
      setMessagesBySession(prev => {
        const msgs = prev[sessionId!] || [];
        const lastMsg = msgs[msgs.length - 1];
        if (!lastMsg || lastMsg.role !== Role.ASSISTANT || !lastMsg.content) {
          return prev;
        }

        const artifact = detectArtifact(lastMsg.content);
        if (artifact) {
          // Check if there's text before the artifact (preamble)
          const codeBlockStart = lastMsg.content.indexOf('```');
          const hasPreabmle = codeBlockStart > 20; // More than just whitespace before code

          if (hasPreabmle) {
            // Split into preamble message and artifact message
            const preambleText = lastMsg.content.substring(0, codeBlockStart).trim();
            const preambleMsg: Message = {
              ...lastMsg,
              id: lastMsg.id,
              content: preambleText
            };
            const artifactMsg: Message = {
              id: generateId(),
              role: Role.ASSISTANT,
              content: artifact.content,
              timestamp: Date.now(),
              isArtifact: true,
              artifactMetadata: {
                title: artifact.title,
                type: artifact.type,
                language: artifact.language
              }
            };
            return {
              ...prev,
              [sessionId!]: [...msgs.slice(0, -1), preambleMsg, artifactMsg]
            };
          } else {
            // Just mark the whole message as an artifact
            return {
              ...prev,
              [sessionId!]: [
                ...msgs.slice(0, -1),
                {
                  ...lastMsg,
                  content: artifact.content,
                  isArtifact: true,
                  artifactMetadata: {
                    title: artifact.title,
                    type: artifact.type,
                    language: artifact.language
                  }
                }
              ]
            };
          }
        }

        return prev;
      });

      // Generate AI title for new sessions (only on first message)
      const currentMsgs = messagesBySession[sessionId!] || [];
      if (currentMsgs.length <= 2 && !isHiddenTrigger) {
        // This is the first exchange - generate a proper title
        const userMsg = currentMsgs.find(m => m.role === Role.USER)?.content || text;
        const assistantMsg = currentMsgs.find(m => m.role === Role.ASSISTANT)?.content || '';
        
        if (userMsg && assistantMsg) {
          generateSessionTitle(userMsg, assistantMsg).then(title => {
            setSessions(prev => prev.map(s =>
              s.id === sessionId ? { ...s, title } : s
            ));
          });
        }
      }
    }
  }, [activeSessionId, isTyping, currentModel, messagesBySession, knowledgeAssets, ephemeralDocs, activeSkillIds]);

  // Clear tool logs
  const handleClearLogs = useCallback(() => {
    setToolLogs([]);
  }, []);

  // Toggle skill active state
  const handleToggleSkill = useCallback((skillId: string) => {
    setActiveSkillIds(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  }, []);

  // Activate a skill (toggle on if not already active)
  const handleActivateSkill = useCallback((skillId: string) => {
    setActiveSkillIds(prev =>
      prev.includes(skillId) ? prev : [...prev, skillId]
    );
  }, []);

  // Handle workflow selection
  const handleSelectWorkflow = useCallback((template: WorkflowTemplate) => {
    setSelectedWorkflow(template);
  }, []);

  // Run workflow
  const handleRunWorkflow = useCallback((data: { topic: string; tone: string; instructions: string }) => {
    if (!selectedWorkflow) return;

    const prompt = `[Workflow: ${selectedWorkflow.name}]\nTopic: ${data.topic}\nTone: ${data.tone}\nInstructions: ${data.instructions}`;
    handleSend(prompt);
    setSelectedWorkflow(null);
  }, [selectedWorkflow, handleSend]);

  // Save workflow - extracts conversation and opens wizard
  const handleSaveWorkflow = useCallback(() => {
    setShowWorkflowWizard(true);
  }, []);

  // Get conversation content for workflow wizard
  const getConversationAsPrompt = useCallback(() => {
    if (!activeSessionId) return '';
    const msgs = messagesBySession[activeSessionId] || [];
    // Format conversation as a prompt template
    const formatted = msgs.map(m => {
      if (m.role === Role.USER) {
        return `User: ${m.content}`;
      } else {
        return `Assistant: ${m.content}`;
      }
    }).join('\n\n');
    return `Based on this conversation, perform the following task:\n\n${formatted}`;
  }, [activeSessionId, messagesBySession]);

  const handleSaveWorkflowComplete = useCallback((name: string) => {
    console.log('Workflow saved:', name);
    setShowWorkflowWizard(false);
    // The workflow is now saved to localStorage and will appear in the sidebar
    // via the 'workflow-created' event listener in WorkflowPanel
  }, []);

  // Workflow capture A2UI handlers
  const handleWorkflowCaptureApprove = useCallback((messageId: string, step: 'golden' | 'variables' | 'output') => {
    console.log('Workflow capture approve:', step, messageId);

    if (step === 'golden') {
      // Move to variables step - send message to agent to show variables artifact
      handleSend('[WORKFLOW_CAPTURE_CONTINUE] The golden instructions look good. Now show me the variables you identified.');
      setWorkflowCaptureState(prev => ({ ...prev, step: 'variables' }));
    } else if (step === 'variables') {
      // Move to output config step
      handleSend('[WORKFLOW_CAPTURE_CONTINUE] The variables look good. Now show me the output configuration options.');
      setWorkflowCaptureState(prev => ({ ...prev, step: 'output' }));
    }
  }, [handleSend]);

  const handleWorkflowCaptureEdit = useCallback((messageId: string, step: 'golden' | 'variables' | 'output') => {
    console.log('Workflow capture edit:', step, messageId);
    // For now, just tell the agent to regenerate
    handleSend(`[WORKFLOW_CAPTURE_EDIT] Please regenerate the ${step} section with modifications.`);
  }, [handleSend]);

  const handleWorkflowCaptureSave = useCallback(async (messageId: string) => {
    console.log('Workflow capture save:', messageId);
    setWorkflowCaptureState(prev => ({ ...prev, step: 'saving' }));

    // Tell the agent to save the workflow
    handleSend('[WORKFLOW_CAPTURE_SAVE] Please save this workflow now.');

    // Reset state after a delay
    setTimeout(() => {
      setWorkflowCaptureState({ step: 'idle', data: {} });
    }, 2000);
  }, [handleSend]);

  // View document in preview modal
  const handleViewDocument = useCallback(async (asset: KnowledgeAsset) => {
    setPreviewDocument({ asset, url: null, isLoading: true });

    try {
      // Get signed URL from backend API
      const { url } = await getDocumentUrl(asset.id);
      setPreviewDocument(prev => prev ? { ...prev, url, isLoading: false } : null);
    } catch (err) {
      console.error('Error loading document:', err);
      setPreviewDocument(prev => prev ? { ...prev, isLoading: false } : null);
    }
  }, []);

  // Close document preview
  const handleCloseDocumentPreview = useCallback(() => {
    setPreviewDocument(null);
  }, []);

  // Handle document download
  const handleDownloadDocument = useCallback(() => {
    if (previewDocument?.url) {
      window.open(previewDocument.url, '_blank');
    }
  }, [previewDocument]);

  // Handle ESC key to close document preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && previewDocument) {
        setPreviewDocument(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDocument]);

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          title={currentSession?.title || 'New Session'}
          subtitle={currentModel.name}
          onMenuClick={() => setShowLeftDrawer(true)}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onOpenWorkflows={() => setShowRightDrawer(true)}
          onOpenKnowledge={() => setShowKnowledgeBase(true)}
          onOpenSettings={() => setShowToolConnections(true)}
        />
      )}

      {/* Mobile Left Drawer Backdrop */}
      {isMobile && (
        <div
          className={`mobile-backdrop ${showLeftDrawer ? 'mobile-backdrop-visible' : 'mobile-backdrop-hidden'}`}
          onClick={() => setShowLeftDrawer(false)}
        />
      )}

      {/* Left Sidebar - Sessions & Knowledge Base */}
      <div
        className={`${isMobile
          ? `mobile-drawer-left ${showLeftDrawer ? 'mobile-drawer-left-open' : 'mobile-drawer-left-closed'}`
          : 'shrink-0 overflow-hidden hidden md:block'}`}
        style={!isMobile ? { width: leftSidebarWidth } : undefined}
      >
        <ErrorBoundary name="Sidebar">
          <Sidebar
            sessions={sessions}
            activeId={activeSessionId}
            onSelect={(id) => {
              handleSelectSession(id);
              if (isMobile) setShowLeftDrawer(false);
            }}
            onCreate={() => {
              handleCreateSession();
              if (isMobile) setShowLeftDrawer(false);
            }}
            onRenameSession={handleRenameSession}
            onDeleteSession={handleDeleteSession}
            assets={knowledgeAssets}
            onToggleAsset={handleToggleAsset}
            onDeleteAsset={handleDeleteAsset}
            onUploadFile={handleUploadFile}
            onViewDocument={handleViewDocument}
            onOpenKnowledgeBase={() => {
              setShowKnowledgeBase(true);
              if (isMobile) setShowLeftDrawer(false);
            }}
          />
        </ErrorBoundary>
      </div>

      {/* Left Resize Handle - Desktop only */}
      {!isMobile && <ResizeHandle onResize={handleLeftSidebarResize} position="left" />}

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${isMobile ? 'pt-14' : ''}`}>
        <ErrorBoundary name="Chat">
          <ChatArea
            session={currentSession}
            messages={currentMessages}
            onSend={handleSend}
            isTyping={isTyping}
            currentModel={currentModel}
            onModelChange={setCurrentModel}
            onSaveWorkflow={handleSaveWorkflow}
            ephemeralDocs={ephemeralDocs}
            onAddEphemeralDoc={handleAddEphemeralDoc}
            onRemoveEphemeralDoc={handleRemoveEphemeralDoc}
            onToggleEphemeralDoc={handleToggleEphemeralDoc}
            onWorkflowCaptureApprove={handleWorkflowCaptureApprove}
            onWorkflowCaptureEdit={handleWorkflowCaptureEdit}
            onWorkflowCaptureSave={handleWorkflowCaptureSave}
            onOpenAuth={() => setShowAuthModal(true)}
            onOpenContextFile={() => setShowPersonalContext(true)}
          />
        </ErrorBoundary>
      </div>

      {/* Right Resize Handle - Desktop only */}
      {!isMobile && <ResizeHandle onResize={handleRightSidebarResize} position="right" />}

      {/* Mobile Right Drawer Backdrop */}
      {isMobile && (
        <div
          className={`mobile-backdrop ${showRightDrawer ? 'mobile-backdrop-visible' : 'mobile-backdrop-hidden'}`}
          onClick={() => setShowRightDrawer(false)}
        />
      )}

      {/* Right Sidebar - Agent Studio */}
      {showWorkflowWizard ? (
        <div
          className={`${isMobile
            ? `mobile-drawer-right ${showRightDrawer ? 'mobile-drawer-right-open' : 'mobile-drawer-right-closed'}`
            : 'shrink-0 overflow-hidden hidden md:block'}`}
          style={!isMobile ? { width: rightSidebarWidth } : undefined}
        >
          <ErrorBoundary name="WorkflowWizard">
            <WorkflowWizard
              onClose={() => {
                setShowWorkflowWizard(false);
                if (isMobile) setShowRightDrawer(false);
              }}
              onSave={handleSaveWorkflowComplete}
              initialPrompt={getConversationAsPrompt()}
            />
          </ErrorBoundary>
        </div>
      ) : (
        <div
          className={`${isMobile
            ? `mobile-drawer-right ${showRightDrawer ? 'mobile-drawer-right-open' : 'mobile-drawer-right-closed'}`
            : 'shrink-0 overflow-hidden hidden md:block'}`}
          style={!isMobile ? { width: rightSidebarWidth } : undefined}
        >
          <ErrorBoundary name="AgentStudio">
            <AgentStudio
              toolLogs={toolLogs}
              onClear={handleClearLogs}
              onOpenConnections={() => setShowToolConnections(true)}
              activeSkillIds={activeSkillIds}
              onToggleSkill={handleToggleSkill}
              onActivateSkill={handleActivateSkill}
            />
          </ErrorBoundary>
        </div>
      )}

      {/* Mobile Bottom Navigation - REMOVED, now in header lightning bolt menu */}

      {/* Run Workflow Modal */}
      {selectedWorkflow && (
        <RunWorkflowModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onRun={handleRunWorkflow}
        />
      )}

      {/* Tool Connections Modal */}
      <ToolConnections
        isOpen={showToolConnections}
        onClose={() => setShowToolConnections(false)}
      />

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={showKnowledgeBase}
        onClose={() => setShowKnowledgeBase(false)}
        onUploadClick={() => {
          // Focus the file input in the sidebar
          const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.click();
        }}
      />

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          name={previewDocument.asset.name}
          type={previewDocument.asset.type}
          url={previewDocument.url || undefined}
          size={previewDocument.asset.size ? parseInt(previewDocument.asset.size) : undefined}
          isLoading={previewDocument.isLoading}
          onClose={handleCloseDocumentPreview}
          onDownload={previewDocument.url ? handleDownloadDocument : undefined}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Personal Context Modal */}
      <PersonalContextModal
        isOpen={showPersonalContext}
        onClose={() => setShowPersonalContext(false)}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}

export default App;
