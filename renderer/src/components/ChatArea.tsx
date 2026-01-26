
import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Session, Message, Role, ModelOption, EphemeralDocument } from '../types';
import { MODELS, ICONS } from '../constants';
import ContextChips, { ContextChipsHandle } from './ContextChips';
import {
  GoldenInstructionsArtifact,
  VariablesArtifact,
  OutputConfigArtifact
} from './WorkflowCaptureArtifacts';
import WorkflowApprovalCard from './WorkflowApprovalCard';
import WorkflowSuggestion from './Workflow/WorkflowSuggestion';
import UserProfileMenu from './UserProfileMenu';

// Types for workflow data extracted from AI responses
interface WorkflowApprovalData {
  name: string;
  icon: string;
  description: string;
  steps: { name: string; description: string; tools: string[] }[];
  tools: string[];
  goldenInstructions: string;
}

interface WorkflowSuggestionData {
  suggestedName: string;
  icon: string;
}

// Helper to extract workflow JSON blocks from message content
function extractWorkflowBlocks(content: string): {
  cleanContent: string;
  workflowApproval: WorkflowApprovalData | null;
  workflowSuggestion: WorkflowSuggestionData | null;
} {
  let cleanContent = content;
  let workflowApproval: WorkflowApprovalData | null = null;
  let workflowSuggestion: WorkflowSuggestionData | null = null;

  // Extract workflow_approval block
  const approvalMatch = content.match(/```json:workflow_approval\n([\s\S]*?)\n```/);
  if (approvalMatch) {
    try {
      workflowApproval = JSON.parse(approvalMatch[1]);
      cleanContent = cleanContent.replace(approvalMatch[0], '').trim();
    } catch (e) {
      console.error('Failed to parse workflow_approval:', e);
    }
  }

  // Extract workflow_suggestion block
  const suggestionMatch = content.match(/```json:workflow_suggestion\n([\s\S]*?)\n```/);
  if (suggestionMatch) {
    try {
      workflowSuggestion = JSON.parse(suggestionMatch[1]);
      cleanContent = cleanContent.replace(suggestionMatch[0], '').trim();
    } catch (e) {
      console.error('Failed to parse workflow_suggestion:', e);
    }
  }

  return { cleanContent, workflowApproval, workflowSuggestion };
}

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface ChatAreaProps {
  session?: Session;
  messages: Message[];
  onSend: (text: string) => void;
  isTyping: boolean;
  currentModel: ModelOption;
  onModelChange: (model: ModelOption) => void;
  onSaveWorkflow: () => void;
  // Ephemeral context props
  ephemeralDocs: EphemeralDocument[];
  onAddEphemeralDoc: (doc: EphemeralDocument) => void;
  onRemoveEphemeralDoc: (id: string) => void;
  onToggleEphemeralDoc: (id: string) => void;
  // Workflow capture A2UI event handlers
  onWorkflowCaptureApprove?: (messageId: string, step: 'golden' | 'variables' | 'output') => void;
  onWorkflowCaptureEdit?: (messageId: string, step: 'golden' | 'variables' | 'output') => void;
  onWorkflowCaptureSave?: (messageId: string) => void;
  // Auth
  onOpenAuth?: () => void;
  // Personal context
  onOpenContextFile?: () => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  session,
  messages,
  onSend,
  isTyping,
  currentModel,
  onModelChange,
  onSaveWorkflow,
  ephemeralDocs,
  onAddEphemeralDoc,
  onRemoveEphemeralDoc,
  onToggleEphemeralDoc,
  onWorkflowCaptureApprove,
  onWorkflowCaptureEdit,
  onWorkflowCaptureSave,
  onOpenAuth,
  onOpenContextFile
}) => {
  const [inputText, setInputText] = useState('');
  const [showModels, setShowModels] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>('');
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextChipsRef = useRef<ContextChipsHandle>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Close model dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModels(false);
      }
    };

    if (showModels) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showModels]);

  const handleStartEdit = (msgId: string, content: string) => {
    setEditingId(msgId);
    setEditContent(content);
  };

  const handleSaveEdit = (msgId: string) => {
    setEditedMessages(prev => ({ ...prev, [msgId]: editContent }));
    setEditingId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const getMessageContent = (msg: Message) => {
    return editedMessages[msg.id] || msg.content;
  };

  const handleCopy = async (content: string, msgId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim() && !isTyping) {
      onSend(inputText);
      setInputText('');
      // Reset textarea height after submit
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg: Message) => {
    // Render A2UI workflow capture artifacts
    if (msg.isA2UI && msg.a2uiType && msg.a2uiData) {
      const handleApprove = () => {
        const step = msg.a2uiType === 'workflow_capture_golden' ? 'golden'
          : msg.a2uiType === 'workflow_capture_variables' ? 'variables'
          : 'output';
        onWorkflowCaptureApprove?.(msg.id, step);
      };

      const handleEdit = () => {
        const step = msg.a2uiType === 'workflow_capture_golden' ? 'golden'
          : msg.a2uiType === 'workflow_capture_variables' ? 'variables'
          : 'output';
        onWorkflowCaptureEdit?.(msg.id, step);
      };

      const handleSave = () => {
        onWorkflowCaptureSave?.(msg.id);
      };

      return (
        <div key={msg.id} className="w-full flex flex-col gap-2">
          {msg.a2uiType === 'workflow_capture_golden' && (
            <GoldenInstructionsArtifact
              data={msg.a2uiData}
              onApprove={handleApprove}
              onEdit={handleEdit}
            />
          )}
          {msg.a2uiType === 'workflow_capture_variables' && (
            <VariablesArtifact
              data={msg.a2uiData}
              onApprove={handleApprove}
              onEdit={handleEdit}
            />
          )}
          {msg.a2uiType === 'workflow_capture_output' && (
            <OutputConfigArtifact
              data={msg.a2uiData}
              onSave={handleSave}
              onEdit={handleEdit}
            />
          )}
          {msg.a2uiType === 'workflow_capture_preview' && msg.a2uiData.workflowPreview && (
            <WorkflowApprovalCard
              messageId={msg.id}
              workflowData={{
                name: msg.a2uiData.workflowPreview.name || msg.a2uiData.suggestedName || 'New Workflow',
                description: msg.a2uiData.workflowPreview.description || msg.a2uiData.suggestedDescription || '',
                icon: msg.a2uiData.workflowPreview.icon || msg.a2uiData.suggestedIcon || '📋',
                goldenInstructions: msg.a2uiData.goldenInstructions,
                steps: msg.a2uiData.steps,
                variables: msg.a2uiData.variables,
                tags: []
              }}
              onApprove={() => console.log('Workflow approved')}
              onModify={handleEdit}
              onDeny={() => console.log('Workflow denied')}
            />
          )}
        </div>
      );
    }

    if (msg.isArtifact && msg.artifactMetadata) {
      const content = getMessageContent(msg);
      const isEditing = editingId === msg.id;

      // Determine if this is markdown that should be rendered
      const isMarkdown = msg.artifactMetadata.type === 'markdown' ||
        msg.artifactMetadata.title?.endsWith('.md');

      const renderArtifactContent = () => {
        if (isEditing) {
          return (
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-full min-h-[300px] bg-transparent text-[13px] text-secondaryText font-mono leading-relaxed resize-none outline-none"
              autoFocus
            />
          );
        }

        if (isMarkdown) {
          const htmlContent = DOMPurify.sanitize(marked.parse(content) as string);
          return (
            <div
              className="prose prose-invert prose-sm max-w-none text-secondaryText"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          );
        }
        return (
          <pre className="text-[13px] text-secondaryText font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {content}
          </pre>
        );
      };

      return (
        <div key={msg.id} className="w-full flex flex-col gap-2">
          {/* Artifact Card Container - 60% width like Google AI Studio */}
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl w-[60%] min-w-[400px] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-white/[0.03] px-5 py-3 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                  <ICONS.FileText />
                </div>
                <span className="text-sm font-semibold text-white tracking-tight">{msg.artifactMetadata.title}</span>
              </div>
              <button
                className="p-2 hover:bg-white/10 rounded-lg transition-all text-white/40 hover:text-white"
                onClick={() => handleCopy(content, msg.id)}
                title="Copy to clipboard"
              >
                {copiedId === msg.id ? (
                  <span className="text-green-400"><ICONS.CheckCircle /></span>
                ) : (
                  <ICONS.Copy />
                )}
              </button>
            </div>

            {/* Body */}
            <div className="p-5 max-h-[400px] overflow-y-auto bg-[#161616]">
              {renderArtifactContent()}
            </div>

            {/* Footer */}
            <div className="bg-white/[0.02] px-5 py-3 border-t border-white/5 flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => handleSaveEdit(msg.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-[11px] font-semibold text-green-400 hover:text-green-300 transition-all"
                  >
                    <ICONS.CheckCircle />
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/60 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleStartEdit(msg.id, content)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/60 hover:text-white transition-all"
                  >
                    <ICONS.Edit />
                    Edit
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-white/60 hover:text-white transition-all"
                    onClick={() => handleDownload(content, msg.artifactMetadata?.title || 'download.txt')}
                  >
                    <ICONS.Download />
                    Download
                  </button>
                  <button 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 hover:bg-accent/30 text-[11px] font-semibold text-accent hover:text-accent transition-all ml-auto"
                    onClick={() => onSend('__QUICK_ACTION_EXTRACT__')}
                  >
                    <ICONS.Wand />
                    Save as Quick Action
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Render markdown for assistant messages
    const renderContent = () => {
      if (!msg.content) {
        return (
          <div className="flex gap-1 py-1">
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        );
      }

      if (msg.role === Role.ASSISTANT) {
        // Extract workflow blocks from content
        const { cleanContent, workflowApproval, workflowSuggestion } = extractWorkflowBlocks(msg.content);

        const htmlContent = DOMPurify.sanitize(marked.parse(cleanContent) as string);

        return (
          <>
            <div
              className="markdown-content"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            {/* Render workflow approval card if present */}
            {workflowApproval && (
              <WorkflowApprovalCard
                messageId={msg.id}
                workflowData={{
                  name: workflowApproval.name,
                  description: workflowApproval.description,
                  icon: workflowApproval.icon,
                  goldenInstructions: workflowApproval.goldenInstructions,
                  steps: workflowApproval.steps,
                  tags: workflowApproval.tools
                }}
              />
            )}

            {/* Render workflow suggestion if present */}
            {workflowSuggestion && (
              <WorkflowSuggestion
                suggestedName={workflowSuggestion.suggestedName}
                icon={workflowSuggestion.icon}
                onSave={() => {
                  // Trigger quick action extraction
                  onSend('__QUICK_ACTION_EXTRACT__');
                }}
              />
            )}
          </>
        );
      }

      return msg.content;
    };

    return (
      <div
        key={msg.id}
        className={`max-w-[85%] leading-relaxed text-[15px] ${msg.role === Role.USER
          ? 'self-end bg-card border border-border px-6 py-4 rounded-[24px] rounded-br-[4px] shadow-sm font-medium'
          : 'self-start w-full border-l border-white/5 pl-8 text-primaryText/90'}`}
      >
        {renderContent()}
      </div>
    );
  };

  return (
    <main className="flex-1 bg-panel border-border flex flex-col relative overflow-hidden">
      {/* Header - Hidden on mobile (MobileHeader handles it) */}
      <div className="hidden md:flex h-[60px] items-center justify-between px-8 border-border border-b shrink-0 bg-panel/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-primaryText truncate max-w-[200px]">
              {session?.title || "New Session"}
            </span>
            <span className="text-[10px] text-accent font-bold uppercase tracking-widest opacity-80">
              {currentModel.name}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Save Quick Action Button - triggers AI workflow extraction */}
          <button
            onClick={() => {
              // Send a hidden system message to trigger AI workflow extraction
              onSend('__QUICK_ACTION_EXTRACT__');
            }}
            disabled={messages.length < 2 || isTyping}
            className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full text-[11px] font-bold text-accent hover:bg-accent hover:text-canvas transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save this conversation as a reusable Quick Action"
          >
            <ICONS.Wand />
            <span className="hidden sm:inline">Save as Quick Action</span>
          </button>

          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1.5 bg-card border border-border px-4 py-1.5 rounded-full text-xs text-primaryText hover:border-accent transition-all"
            >
              <ICONS.Cpu />
              <span>{currentModel.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showModels ? 'rotate-180' : ''}`}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            {showModels && (
              <div className="absolute right-0 mt-3 w-64 bg-card border border-border rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[60] p-1.5 overflow-hidden max-h-[400px] overflow-y-auto">
                {/* Claude Models */}
                <div className="text-[10px] uppercase text-secondaryText px-4 py-2 font-bold tracking-widest border-b border-white/5 mb-1">Claude</div>
                {MODELS.filter(m => m.provider === 'Claude').map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onModelChange(m); setShowModels(false); }}
                    className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-all flex items-center justify-between ${currentModel.id === m.id ? 'text-accent bg-accent/10 font-bold' : 'text-primaryText hover:bg-hover'}`}
                  >
                    <span>{m.name}</span>
                    {currentModel.id === m.id && <ICONS.CheckCircle />}
                  </button>
                ))}

                {/* Opencode Models */}
                <div className="text-[10px] uppercase text-secondaryText px-4 py-2 font-bold tracking-widest border-b border-white/5 mt-2 mb-1">Opencode</div>
                {MODELS.filter(m => m.provider === 'Opencode').map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onModelChange(m); setShowModels(false); }}
                    className={`w-full text-left px-4 py-2 text-sm rounded-xl transition-all flex items-center justify-between ${currentModel.id === m.id ? 'text-accent bg-accent/10 font-bold' : 'text-primaryText hover:bg-hover'}`}
                  >
                    <span>{m.name}</span>
                    {currentModel.id === m.id && <ICONS.CheckCircle />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <UserProfileMenu
            onOpenAuth={onOpenAuth}
            onOpenContextFile={onOpenContextFile}
          />
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-12 flex flex-col gap-6 md:gap-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {/* Stacked Vertical Logo */}
            <div className="flex flex-col gap-3 md:gap-4">
              {/* GET */}
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-accent rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-10 md:h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-primaryText">GET</span>
              </div>
              {/* SHIT */}
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-accent rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-10 md:h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-4xl md:text-6xl font-bold tracking-tight text-primaryText">SHIT</span>
              </div>
              {/* DONE. */}
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-accent rounded-lg flex items-center justify-center">
                  <svg className="w-7 h-7 md:w-10 md:h-10 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-4xl md:text-6xl font-bold tracking-tight">
                  <span className="text-primaryText">DONE</span>
                  <span className="text-accent">.</span>
                </span>
              </div>
            </div>
            <p className="text-secondaryText max-w-xs md:max-w-sm text-xs md:text-sm leading-relaxed opacity-60 px-4 mt-8">
              Your AI workspace. Ask anything.
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isTyping && messages[messages.length-1]?.role === Role.USER && (
           <div className="self-start pl-8 flex items-center gap-3">
             <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
             <span className="text-[13px] font-bold text-accent uppercase tracking-widest animate-pulse">Processing Execution Trace</span>
           </div>
        )}
      </div>

      {/* Floating Input Area - with safe area padding for mobile */}
      <div className="px-3 md:px-10 pb-8 md:pb-10 pt-2 md:pt-4 bg-gradient-to-t from-panel via-panel to-transparent" style={{ paddingBottom: 'max(4.5rem, calc(env(safe-area-inset-bottom, 0px) + 4rem))' }}>
        <div className="max-w-4xl mx-auto">
          {/* Context Chips - Ephemeral Documents (only shows when there are documents) */}
          <ContextChips
            ref={contextChipsRef}
            documents={ephemeralDocs}
            onAdd={onAddEphemeralDoc}
            onRemove={onRemoveEphemeralDoc}
            onToggle={onToggleEphemeralDoc}
            disabled={isTyping}
          />

          {/* Input Box */}
          <div className="bg-card border border-border rounded-[32px] p-2.5 flex items-end gap-3 shadow-2xl focus-within:border-accent transition-all ring-accent/0 focus-within:ring-4 ring-offset-panel ring-offset-0 transition-all duration-300">
          <button
            onClick={() => contextChipsRef.current?.triggerFileSelect()}
            className="p-3 text-secondaryText hover:text-primaryText hover:bg-hover rounded-full transition-all"
            title="Add file to context"
          >
            <ICONS.Plus />
          </button>
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 bg-transparent border-none text-primaryText py-3 outline-none resize-none max-h-48 text-[15px] placeholder-secondaryText"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className={`w-11 h-11 flex items-center justify-center rounded-full transition-all shrink-0 ${inputText.trim() && !isTyping ? 'bg-accent text-canvas hover:scale-105 shadow-[0_0_20px_rgba(217,119,87,0.4)]' : 'bg-hover text-secondaryText'}`}
          >
            <ICONS.ArrowUp />
          </button>
          </div>
        </div>
        <div className="hidden md:block text-center text-[10px] text-secondaryText mt-4 uppercase tracking-[0.2em] opacity-40 font-bold">
          Omni-Channel Agent Engine • Ready for Tasking
        </div>
      </div>
    </main>
  );
};

export default ChatArea;
