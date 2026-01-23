import { useState } from 'react';
import { ToolCall } from '../types';

interface ToolsSidebarProps {
  toolCalls: ToolCall[];
  isCollapsed: boolean;
  onToggle: () => void;
}

interface ToolCallItemProps {
  toolCall: ToolCall;
}

function ToolCallItem({ toolCall }: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`w-6 h-6 rounded flex items-center justify-center ${
          toolCall.status === 'running' ? 'bg-yellow-500/20 text-yellow-500' :
          toolCall.status === 'success' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        }`}>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-primaryText truncate">{toolCall.name}</div>
          <div className="text-xs text-secondaryText">
            {toolCall.status === 'running' ? 'Running...' : 'Completed'}
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-secondaryText transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="p-3 border-t border-border">
          <div className="mb-3">
            <div className="text-xs text-secondaryText uppercase tracking-wide mb-1.5">Input</div>
            <pre className="bg-black/30 p-2.5 rounded-md text-xs overflow-x-auto text-[#ccc] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>

          {toolCall.result !== undefined && (
            <div>
              <div className="text-xs text-secondaryText uppercase tracking-wide mb-1.5">Output</div>
              <pre className="bg-black/30 p-2.5 rounded-md text-xs overflow-x-auto text-[#ccc] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                {typeof toolCall.result === 'object'
                  ? JSON.stringify(toolCall.result, null, 2).substring(0, 2000)
                  : String(toolCall.result).substring(0, 2000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ToolsSidebar({ toolCalls, isCollapsed, onToggle }: ToolsSidebarProps) {
  return (
    <>
      <aside
        className={`flex flex-col bg-panel border-l border-border transition-all duration-200 ${
          isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="text-sm font-medium text-primaryText">Tool Calls</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondaryText">{toolCalls.length} calls</span>
            <button
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-hover transition-colors"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4 text-secondaryText" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tool calls list */}
        <div className="flex-1 overflow-y-auto p-3">
          {toolCalls.length === 0 ? (
            <div className="text-center text-secondaryText text-sm py-8">
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
              <p>No tool calls yet</p>
              <p className="text-xs mt-1">Tool executions will appear here</p>
            </div>
          ) : (
            toolCalls.map(tc => <ToolCallItem key={tc.id} toolCall={tc} />)
          )}
        </div>
      </aside>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="fixed right-0 top-1/2 -translate-y-1/2 p-1.5 bg-panel border border-border border-r-0 rounded-l-lg hover:bg-hover transition-colors z-10"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4 text-secondaryText" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
    </>
  );
}
