
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Session, Message, Role, ModelOption } from '../types';
import { MODELS, ICONS } from '../constants';

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
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  session, 
  messages, 
  onSend, 
  isTyping, 
  currentModel, 
  onModelChange,
  onSaveWorkflow
}) => {
  const [inputText, setInputText] = useState('');
  const [showModels, setShowModels] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (inputText.trim() && !isTyping) {
      onSend(inputText);
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (msg: Message) => {
    if (msg.isArtifact && msg.artifactMetadata) {
      return (
        <div key={msg.id} className="w-full flex flex-col gap-2">
          {/* Artifact Card Container */}
          <div className="bg-[#2a2a2a] border border-border rounded-xl overflow-hidden shadow-xl max-w-[90%] self-start animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="text-accent"><ICONS.FileText /></div>
                <span className="text-xs font-bold text-primaryText mono">{msg.artifactMetadata.title}</span>
              </div>
              <button 
                className="p-1 hover:bg-white/10 rounded transition-colors text-secondaryText hover:text-primaryText"
                onClick={() => navigator.clipboard.writeText(msg.content)}
              >
                <ICONS.Copy />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-4 overflow-x-auto">
              <pre className="text-xs text-secondaryText font-medium mono whitespace-pre-wrap leading-relaxed">
                {msg.content}
              </pre>
            </div>

            {/* Footer */}
            <div className="bg-white/[0.02] px-4 py-2 border-t border-white/5 flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-secondaryText hover:text-accent transition-colors">
                <ICONS.Edit />
                Edit
              </button>
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-secondaryText hover:text-accent transition-colors">
                <ICONS.Download />
                Download
              </button>
              <button className="flex items-center gap-1.5 text-[10px] font-bold text-secondaryText hover:text-accent transition-colors ml-auto">
                <ICONS.Tool />
                Send to Studio
              </button>
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
        const htmlContent = DOMPurify.sanitize(marked.parse(msg.content) as string);
        return (
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
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
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-8 border-border border-b shrink-0 bg-panel/80 backdrop-blur-md z-20">
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
          {/* Save Workflow Button */}
          <button 
            onClick={onSaveWorkflow}
            className="flex items-center gap-2 bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full text-[11px] font-bold text-accent hover:bg-accent hover:text-canvas transition-all group"
            title="Convert current chat logic into a Saved Workflow"
          >
            <ICONS.Wand />
            <span className="hidden sm:inline">Save as Workflow</span>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowModels(!showModels)}
              className="flex items-center gap-1.5 bg-card border border-border px-4 py-1.5 rounded-full text-xs text-primaryText hover:border-accent transition-all"
            >
              <ICONS.Cpu />
              <span>Model Selector</span>
            </button>

            {showModels && (
              <div className="absolute right-0 mt-3 w-56 bg-card border border-border rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-[60] p-1.5 overflow-hidden">
                <div className="text-[10px] uppercase text-secondaryText px-4 py-3 font-bold tracking-widest border-b border-white/5 mb-1">Select Core Engine</div>
                {MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onModelChange(m); setShowModels(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all ${currentModel.id === m.id ? 'text-accent bg-accent/10 font-bold' : 'text-primaryText hover:bg-hover'}`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-12 flex flex-col gap-10">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
            <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center text-accent mb-6">
              <ICONS.Activity />
            </div>
            <h1 className="text-3xl font-bold mb-3 tracking-tight">Hyper Gemini Agent</h1>
            <p className="text-secondaryText max-w-sm text-sm leading-relaxed opacity-60">
              High-performance research workspace. Upload docs to knowledge base or trigger workflows from the studio.
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

      {/* Floating Input Area */}
      <div className="px-10 pb-10 pt-4 bg-gradient-to-t from-panel via-panel to-transparent">
        <div className="max-w-4xl mx-auto bg-card border border-border rounded-[32px] p-2.5 flex items-end gap-3 shadow-2xl focus-within:border-accent transition-all ring-accent/0 focus-within:ring-4 ring-offset-panel ring-offset-0 transition-all duration-300">
          <button className="p-3 text-secondaryText hover:text-primaryText hover:bg-hover rounded-full transition-all">
            <ICONS.Paperclip />
          </button>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your workflow or ask a question..."
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
        <div className="text-center text-[10px] text-secondaryText mt-4 uppercase tracking-[0.2em] opacity-40 font-bold">
          Omni-Channel Agent Engine • Ready for Tasking
        </div>
      </div>
    </main>
  );
};

export default ChatArea;
