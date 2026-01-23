import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import AgentStudio from './components/AgentStudio';
import RunWorkflowModal from './components/RunWorkflowModal';
import WorkflowWizard from './components/WorkflowWizard';
import ErrorBoundary from './components/ErrorBoundary';
import { Session, Message, Role, ToolLogEntry, KnowledgeAsset, ModelOption, WorkflowTemplate } from './types';
import { MODELS, SERVER_URL } from './constants';
import { streamChat } from './services/chatService';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
  const [knowledgeAssets, setKnowledgeAssets] = useState<KnowledgeAsset[]>([
    { id: '1', name: 'SOP - Marketing.pdf', type: 'pdf', size: '2.4 MB', isActive: true },
    { id: '2', name: 'Database_Config.json', type: 'json', size: '156 KB', isActive: false },
    { id: '3', name: 'Gemini_Onboarding.docx', type: 'docx', size: '890 KB', isActive: false },
  ]);

  // Workflow modals
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [showWorkflowWizard, setShowWorkflowWizard] = useState(false);

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
          setToolLogs(prev => [...prev, toolLog]);
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
      // If the agent has finished, tools are by definition finished running
      setToolLogs(prev => {
        const hasRunning = prev.some(t => t.status === 'running');
        if (!hasRunning) return prev;

        // Force-complete all running items
        return prev.map(tool =>
          tool.status === 'running'
            ? { ...tool, status: 'done' as const, result: tool.result || 'Completed' }
            : tool
        );
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
    </div>
  );
}

export default App;
