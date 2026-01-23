
import React, { useState } from 'react';
import { ToolLogEntry, WorkflowTemplate } from '../types';
import { ICONS } from '../constants';
import BrowserPreview, { BrowserPreviewCompact } from './BrowserPreview';
import { ToolTimelineIcon } from './ToolTimelineIcon';
import { WorkflowServiceLogosCompact } from './WorkflowServiceLogos';

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
                {/* Service logos if available */}
                {wf.usedServices && wf.usedServices.length > 0 && (
                  <WorkflowServiceLogosCompact
                    services={wf.usedServices}
                    maxVisible={3}
                    size={14}
                    className="mt-1"
                  />
                )}
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
                      {/* Tool Brand Icon with Status */}
                      <ToolTimelineIcon
                        toolName={log.name}
                        status={log.status}
                        size={24}
                      />

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
