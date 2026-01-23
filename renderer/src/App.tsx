import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentStudio from './components/AgentStudio';
import RunWorkflowModal from './components/RunWorkflowModal';
import WorkflowWizard from './components/WorkflowWizard';
import ErrorBoundary from './components/ErrorBoundary';
import ToolConnections from './components/ToolConnections';
import { Session, Message, Role, ToolLogEntry, KnowledgeAsset, ModelOption, WorkflowTemplate } from './types';
import { MODELS } from './constants';
import { streamChat } from './services/chatService';

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
  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Messages state (keyed by session ID)
  const [messagesBySession, setMessagesBySession] = useState<Record<string, Message[]>>({});

  // UI state
  const [isTyping, setIsTyping] = useState(false);
  const [currentModel, setCurrentModel] = useState<ModelOption>(MODELS[0]);
  const [toolLogs, setToolLogs] = useState<ToolLogEntry[]>([]);

  // Knowledge Base
  const [knowledgeAssets, setKnowledgeAssets] = useState<KnowledgeAsset[]>([]);

  // Workflow modals
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);

  // Tool connections modal
  const [showToolConnections, setShowToolConnections] = useState(false);

  // Get current session and messages
  const currentSession = sessions.find(s => s.id === activeSessionId);
  const currentMessages = activeSessionId ? (messagesBySession[activeSessionId] || []) : [];

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

  // Toggle knowledge asset
  const handleToggleAsset = useCallback((id: string) => {
    setKnowledgeAssets(prev =>
      prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a)
    );
  }, []);

  // Upload file to knowledge base
  const handleUploadFile = useCallback(async (file: File) => {
    const formatSize = (bytes: number): string => {
      if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      } else if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
      }
      return `${bytes} B`;
    };

    const getFileType = (name: string): string => {
      return name.split('.').pop()?.toLowerCase() || 'file';
    };

    const newAsset: KnowledgeAsset = {
      id: generateId(),
      name: file.name,
      type: getFileType(file.name),
      size: formatSize(file.size),
      isActive: true,
    };

    setKnowledgeAssets(prev => [...prev, newAsset]);
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

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      content: text,
      timestamp: Date.now()
    };

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: generateId(),
      role: Role.ASSISTANT,
      content: '',
      timestamp: Date.now()
    };

    setMessagesBySession(prev => ({
      ...prev,
      [sessionId!]: [...(prev[sessionId!] || []), userMessage, assistantMessage]
    }));

    setIsTyping(true);

    try {
      // Determine provider from model
      const provider = currentModel.provider.toLowerCase() === 'opencode' ? 'opencode' : 'claude';

      for await (const chunk of streamChat(text, sessionId!, provider, currentModel.id)) {
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
    }
  }, [activeSessionId, isTyping, currentModel, messagesBySession]);

  // Clear tool logs
  const handleClearLogs = useCallback(() => {
    setToolLogs([]);
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

  // Save workflow
  const handleSaveWorkflow = useCallback(() => {
    setShowWorkflowWizard(true);
  }, []);

  const handleSaveWorkflowComplete = useCallback((name: string) => {
    console.log('Saving workflow:', name);
    setShowWorkflowWizard(false);
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
      {/* Left Sidebar - Sessions & Knowledge Base */}
      <div className="w-72 shrink-0">
        <ErrorBoundary name="Sidebar">
          <Sidebar
            sessions={sessions}
            activeId={activeSessionId}
            onSelect={handleSelectSession}
            onCreate={handleCreateSession}
            assets={knowledgeAssets}
            onToggleAsset={handleToggleAsset}
            onUploadFile={handleUploadFile}
          />
        </ErrorBoundary>
      </div>

      {/* Main Chat Area */}
      <ErrorBoundary name="Chat">
        <ChatArea
          session={currentSession}
          messages={currentMessages}
          onSend={handleSend}
          isTyping={isTyping}
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          onSaveWorkflow={handleSaveWorkflow}
        />
      </ErrorBoundary>

      {/* Right Sidebar - Agent Studio */}
      {showWorkflowWizard ? (
        <div className="w-80 shrink-0">
          <ErrorBoundary name="WorkflowWizard">
            <WorkflowWizard
              onClose={() => setShowWorkflowWizard(false)}
              onSave={handleSaveWorkflowComplete}
            />
          </ErrorBoundary>
        </div>
      ) : (
        <div className="w-80 shrink-0">
          <ErrorBoundary name="AgentStudio">
            <AgentStudio
              toolLogs={toolLogs}
              onClear={handleClearLogs}
              onSelectWorkflow={handleSelectWorkflow}
              onOpenConnections={() => setShowToolConnections(true)}
            />
          </ErrorBoundary>
        </div>
      )}

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
    </div>
  );
}

export default App;
