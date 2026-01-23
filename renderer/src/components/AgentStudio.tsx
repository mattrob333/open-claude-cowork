
import React, { useState } from 'react';
import { ToolLogEntry, WorkflowTemplate } from '../types';
import { ICONS } from '../constants';
import BrowserPreview, { BrowserPreviewCompact } from './BrowserPreview';

/**
 * Humanizes raw tool names for display
 * e.g., "mcp_composio_COMPOSIO_SEARCH_TOOLS" -> "Search Tools"
 */
function humanizeToolName(rawName: string): string {
  // Remove common prefixes (handles various formats)
  let name = rawName
    .replace(/^mcp_composio_/i, '')
    .replace(/^composio_/i, '')
    .replace(/^mcp_/i, '');

  // Remove COMPOSIO prefix if it appears at the start (after previous cleanup)
  name = name.replace(/^COMPOSIO_/i, '');

  // Replace underscores with spaces
  name = name.replace(/_/g, ' ');

  // Remove duplicate "Composio" words that might appear
  name = name.replace(/\bComposio\s+Composio\b/gi, 'Composio');
  name = name.replace(/\bComposio\s*/gi, '');

  // Trim any leading/trailing whitespace
  name = name.trim();

  // Convert to Title Case
  name = name
    .toLowerCase()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Truncate if too long (> 25 chars)
  if (name.length > 25) {
    name = name.substring(0, 22) + '...';
  }

  return name || rawName;
}

/**
 * Smart Tool Branding - Returns appropriate icon based on tool name
 */
function getToolIcon(toolName: string): React.ReactNode {
  const name = toolName.toLowerCase();

  // Gmail / Email
  if (name.includes('gmail') || name.includes('mail') || name.includes('email')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z" stroke="#EA4335" strokeWidth="1.5" fill="none"/>
        <path d="M22 6L12 13L2 6" stroke="#EA4335" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // Google Drive / Docs / Sheets
  if (name.includes('drive') || name.includes('docs') || name.includes('sheet') || name.includes('document')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M8 2L3 9H10L15 2H8Z" fill="#4285F4"/>
        <path d="M15 2L10 9H21L16 2H15Z" fill="#0F9D58"/>
        <path d="M3 9L8 22H19L14 9H3Z" fill="#FBBC05"/>
      </svg>
    );
  }

  // Google Search
  if (name.includes('search') || name.includes('google') || name.includes('web')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <circle cx="10.5" cy="10.5" r="6" stroke="#4285F4" strokeWidth="2" fill="none"/>
        <path d="M15 15L21 21" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    );
  }

  // GitHub
  if (name.includes('github') || name.includes('git')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.581 9.521 21.278 9.521 21.017C9.521 20.782 9.513 20.14 9.508 19.291C6.726 19.893 6.139 17.881 6.139 17.881C5.685 16.728 5.029 16.427 5.029 16.427C4.121 15.803 5.098 15.816 5.098 15.816C6.101 15.886 6.629 16.842 6.629 16.842C7.521 18.336 8.97 17.893 9.539 17.642C9.631 17.001 9.889 16.559 10.175 16.318C7.954 16.074 5.62 15.233 5.62 11.387C5.62 10.296 6.01 9.405 6.649 8.708C6.546 8.464 6.203 7.449 6.747 6.08C6.747 6.08 7.587 5.822 9.497 7.106C10.295 6.89 11.15 6.782 12 6.778C12.85 6.782 13.705 6.89 14.503 7.106C16.413 5.822 17.253 6.08 17.253 6.08C17.797 7.449 17.454 8.464 17.351 8.708C17.99 9.405 18.38 10.296 18.38 11.387C18.38 15.244 16.043 16.071 13.816 16.31C14.172 16.606 14.491 17.19 14.491 18.088C14.491 19.372 14.479 20.407 14.479 21.017C14.479 21.281 14.659 21.586 15.167 21.488C19.138 20.162 22 16.416 22 12C22 6.477 17.523 2 12 2Z" fill="#8B949E"/>
      </svg>
    );
  }

  // Slack
  if (name.includes('slack') || name.includes('message') || name.includes('chat')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M6 15C6 16.1 5.1 17 4 17C2.9 17 2 16.1 2 15C2 13.9 2.9 13 4 13H6V15Z" fill="#E01E5A"/>
        <path d="M7 15C7 13.9 7.9 13 9 13C10.1 13 11 13.9 11 15V20C11 21.1 10.1 22 9 22C7.9 22 7 21.1 7 20V15Z" fill="#E01E5A"/>
        <path d="M9 6C7.9 6 7 5.1 7 4C7 2.9 7.9 2 9 2C10.1 2 11 2.9 11 4V6H9Z" fill="#36C5F0"/>
        <path d="M9 7C10.1 7 11 7.9 11 9C11 10.1 10.1 11 9 11H4C2.9 11 2 10.1 2 9C2 7.9 2.9 7 4 7H9Z" fill="#36C5F0"/>
        <path d="M18 9C18 7.9 18.9 7 20 7C21.1 7 22 7.9 22 9C22 10.1 21.1 11 20 11H18V9Z" fill="#2EB67D"/>
        <path d="M17 9C17 10.1 16.1 11 15 11C13.9 11 13 10.1 13 9V4C13 2.9 13.9 2 15 2C16.1 2 17 2.9 17 4V9Z" fill="#2EB67D"/>
        <path d="M15 18C16.1 18 17 18.9 17 20C17 21.1 16.1 22 15 22C13.9 22 13 21.1 13 20V18H15Z" fill="#ECB22E"/>
        <path d="M15 17C13.9 17 13 16.1 13 15C13 13.9 13.9 13 15 13H20C21.1 13 22 13.9 22 15C22 16.1 21.1 17 20 17H15Z" fill="#ECB22E"/>
      </svg>
    );
  }

  // Firecrawl / Crawl / Scrape
  if (name.includes('firecrawl') || name.includes('crawl') || name.includes('scrape')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M12 2C8.5 2 6 5.5 6 9C6 11.5 7 13.5 8 15C9 16.5 10 18 10 20C10 21 10.5 22 12 22C13.5 22 14 21 14 20C14 18 15 16.5 16 15C17 13.5 18 11.5 18 9C18 5.5 15.5 2 12 2Z" stroke="#FF6B35" strokeWidth="1.5" fill="none"/>
        <path d="M12 6C10.5 6 9 7.5 9 9.5C9 11 10 12 11 13C11.5 13.5 12 14.5 12 15.5" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // Calendar / Schedule
  if (name.includes('calendar') || name.includes('schedule') || name.includes('event')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="1.5" fill="none"/>
        <path d="M3 10H21" stroke="#4285F4" strokeWidth="1.5"/>
        <path d="M8 2V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M16 2V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // Todo / Task
  if (name.includes('todo') || name.includes('task') || name.includes('list')) {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
        <path d="M9 11L12 14L22 4" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }

  // Default: Terminal/Command icon
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#888" strokeWidth="1.5" fill="none"/>
      <path d="M6 9L9 12L6 15" stroke="#888" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15H18" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/**
 * Spinner component for running state
 */
const Spinner: React.FC = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" fill="none"/>
    <path d="M12 2C6.477 2 2 6.477 2 12" stroke="#D97757" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

interface AgentStudioProps {
  toolLogs: ToolLogEntry[];
  onClear: () => void;
  onSelectWorkflow: (template: WorkflowTemplate) => void;
  onOpenConnections?: () => void;
}

const SAVED_WORKFLOWS: WorkflowTemplate[] = [
  { id: '1', name: 'LinkedIn Post', description: 'Generate high-engagement social copy.', icon: 'Wand' },
  { id: '2', name: 'SOP Generator', description: 'Standard Operating Procedure drafter.', icon: 'FileText' },
  { id: '3', name: 'Email Drafter', description: 'Professional correspondence assistant.', icon: 'Plus' },
  { id: '4', name: 'Code Review', description: 'Technical analysis and refactoring.', icon: 'Cpu' }
];

/**
 * Check if a tool result contains a browser screenshot
 */
function extractScreenshotData(log: ToolLogEntry): { base64?: string; url?: string; title?: string } | null {
  if (!log.result) return null;

  try {
    // Try to parse result if it's a string
    const result = typeof log.result === 'string' ? JSON.parse(log.result) : log.result;

    // Check if this is a screenshot result
    if (result.base64 && typeof result.base64 === 'string') {
      return {
        base64: result.base64,
        url: result.url,
        title: result.title
      };
    }
  } catch {
    // Not JSON or doesn't have screenshot data
  }

  return null;
}

const AgentStudio: React.FC<AgentStudioProps> = ({ toolLogs, onClear, onSelectWorkflow, onOpenConnections }) => {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [expandedScreenshot, setExpandedScreenshot] = useState<{
    base64: string;
    url?: string;
    title?: string;
  } | null>(null);

  return (
    <aside className="h-full bg-panel border-l border-border flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Zone A: Workflow Library (40%) */}
      <div className="flex-[4] flex flex-col overflow-hidden border-b border-border">
        <div className="h-[60px] flex items-center justify-between px-5 border-border border-b shrink-0">
          <span className="text-sm font-semibold tracking-wider text-primaryText uppercase opacity-70">Saved Workflows</span>
          <div className="flex items-center gap-2">
            {onOpenConnections && (
              <button
                onClick={onOpenConnections}
                className="text-secondaryText hover:text-accent transition-colors"
                title="Tool Connections"
              >
                <ICONS.Settings />
              </button>
            )}
            <button className="text-secondaryText hover:text-primaryText"><ICONS.Layout /></button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {SAVED_WORKFLOWS.map(wf => (
              <button 
                key={wf.id}
                onClick={() => onSelectWorkflow(wf)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border hover:border-accent hover:shadow-lg transition-all group active:scale-95"
              >
                <div className="text-accent opacity-60 group-hover:opacity-100 transition-all group-hover:scale-110">
                  {wf.icon === 'Wand' ? <ICONS.Wand /> : wf.icon === 'FileText' ? <ICONS.FileText /> : wf.icon === 'Cpu' ? <ICONS.Cpu /> : <ICONS.Tool />}
                </div>
                <span className="text-[11px] font-bold text-secondaryText group-hover:text-primaryText text-center leading-tight">
                  {wf.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone B: Live Trace (60%) */}
      <div className="flex-[6] flex flex-col overflow-hidden bg-[#1a1a1a]">
        <div className="h-[50px] flex items-center justify-between px-5 border-b border-white/5 shrink-0">
          <span className="text-[11px] font-bold uppercase text-secondaryText tracking-widest">Execution Progress</span>
          <button 
            onClick={onClear}
            className="p-1.5 text-secondaryText hover:text-primaryText transition-colors"
          >
            <ICONS.Trash />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 relative">
          {toolLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-20 gap-3">
              <ICONS.Activity />
              <span className="text-xs italic">System Idle</span>
            </div>
          ) : (
            <div className="flex flex-col">
              {toolLogs.map((log, index) => {
                const isLast = index === toolLogs.length - 1;
                const isRunning = log.status === 'running';

                return (
                  <div
                    key={log.id}
                    className="grid gap-3"
                    style={{ gridTemplateColumns: '24px 1fr' }}
                  >
                    {/* Column 1: Timeline Track */}
                    <div className="relative flex flex-col items-center">
                      {/* Tool Brand Icon / Spinner */}
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center z-10 transition-all duration-300 ${
                        isRunning
                          ? 'bg-accent/20 text-accent animate-pulse'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {isRunning ? (
                          <Spinner />
                        ) : (
                          <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>

                      {/* Vertical Connector Line - only if not last item */}
                      {!isLast && (
                        <div
                          className={`w-[2px] flex-1 min-h-[16px] transition-colors duration-300 ${
                            isRunning ? 'bg-accent/30' : 'bg-green-500/20'
                          }`}
                          style={{ marginTop: '4px' }}
                        />
                      )}
                    </div>

                    {/* Column 2: Content */}
                    <div
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className={`flex flex-col gap-0.5 cursor-pointer group pb-4 min-w-0 transition-opacity duration-300 ${
                        isRunning ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Header Row */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-1 min-w-0 text-[12px] font-semibold transition-colors truncate ${
                            isRunning
                              ? 'text-primaryText group-hover:text-accent'
                              : 'text-primaryText/80 group-hover:text-green-400'
                          }`}
                          title={log.name}
                        >
                          {humanizeToolName(log.name)}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isRunning ? (
                            <span className="text-[9px] font-bold text-accent uppercase tracking-wide animate-pulse">Running</span>
                          ) : (
                            <span className="text-[9px] font-medium text-green-400/70 uppercase tracking-wide">Done</span>
                          )}
                          <span className="text-[10px] text-white/30">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Subtext */}
                      <p className={`text-[10px] leading-relaxed transition-colors ${
                        isRunning ? 'text-accent/60' : 'text-[#555]'
                      }`}>
                        {isRunning ? 'Invoking engine...' : 'Completed'}
                      </p>

                      {/* Expanded Details */}
                      {expandedLog === log.id && (
                        <div className="mt-2 bg-black/40 border border-white/5 rounded-lg p-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Input</span>
                              <pre className="text-[10px] text-secondaryText font-mono whitespace-pre-wrap leading-tight break-all">
                                {JSON.stringify(log.args, null, 2)}
                              </pre>
                            </div>
                            {log.result && (() => {
                              const screenshot = extractScreenshotData(log);
                              if (screenshot?.base64) {
                                return (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-[9px] text-green-500/50 uppercase font-bold tracking-wider">Screenshot</span>
                                    <BrowserPreviewCompact
                                      imageData={screenshot.base64}
                                      url={screenshot.url}
                                      onClick={() => setExpandedScreenshot(screenshot)}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div className="flex flex-col gap-1">
                                  <span className="text-[9px] text-green-500/50 uppercase font-bold tracking-wider">Output</span>
                                  <pre className="text-[10px] text-green-400/80 font-mono whitespace-pre-wrap leading-tight break-all">
                                    {typeof log.result === 'string' ? log.result : JSON.stringify(log.result, null, 2)}
                                  </pre>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Full Screenshot Modal */}
      {expandedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/80 animate-in fade-in duration-200">
          <div className="max-w-4xl w-full max-h-full">
            <BrowserPreview
              imageData={expandedScreenshot.base64}
              url={expandedScreenshot.url}
              title={expandedScreenshot.title || 'Browser Screenshot'}
              onClose={() => setExpandedScreenshot(null)}
            />
          </div>
        </div>
      )}
    </aside>
  );
};

export default AgentStudio;
