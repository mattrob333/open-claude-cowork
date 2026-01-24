/**
 * WorkflowInfoModal Component
 *
 * Modal that displays detailed documentation for a saved workflow.
 * Shows tags, steps, tools, variables, and full documentation.
 */

import React from 'react';
import { Workflow } from '../../types/workflow';
import { ICONS } from '../../constants';

interface WorkflowInfoModalProps {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
  onRun: () => void;
}

const WorkflowInfoModal: React.FC<WorkflowInfoModalProps> = ({
  workflow,
  isOpen,
  onClose,
  onRun
}) => {
  if (!isOpen) return null;

  // Get unique tools from all steps
  const allTools = workflow.steps?.flatMap(step => step.tools || []) || [];
  const uniqueTools = [...new Set(allTools)];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-panel border border-border rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center text-3xl">
              {workflow.icon || '📋'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-primaryText">{workflow.name}</h2>
              <p className="text-sm text-secondaryText mt-0.5">{workflow.description || 'No description'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-secondaryText hover:text-primaryText hover:bg-hover rounded-xl transition-all"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Stats Row */}
          <div className="flex gap-4">
            <div className="flex-1 p-3 bg-card rounded-xl border border-border">
              <div className="text-xs text-secondaryText uppercase tracking-wider">Steps</div>
              <div className="text-2xl font-bold text-primaryText mt-1">{workflow.steps?.length || 0}</div>
            </div>
            <div className="flex-1 p-3 bg-card rounded-xl border border-border">
              <div className="text-xs text-secondaryText uppercase tracking-wider">Variables</div>
              <div className="text-2xl font-bold text-primaryText mt-1">{workflow.variables?.length || 0}</div>
            </div>
            <div className="flex-1 p-3 bg-card rounded-xl border border-border">
              <div className="text-xs text-secondaryText uppercase tracking-wider">Runs</div>
              <div className="text-2xl font-bold text-primaryText mt-1">{workflow.runCount || 0}</div>
            </div>
          </div>

          {/* Tags */}
          {workflow.tags && workflow.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {workflow.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {workflow.steps && workflow.steps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">Workflow Steps</h3>
              <div className="space-y-2">
                {workflow.steps.map((step, i) => (
                  <div key={step.id || i} className="flex gap-3 p-3 bg-card rounded-xl border border-border">
                    <div className="w-7 h-7 bg-accent/20 rounded-lg flex items-center justify-center text-accent text-sm font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primaryText">{step.name}</div>
                      {step.tools && step.tools.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {step.tools.map((tool, j) => (
                            <span key={j} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded">
                              {tool}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tools Used */}
          {uniqueTools.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">Tools Used</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueTools.map(tool => (
                  <span key={tool} className="px-3 py-1.5 bg-card border border-border rounded-lg text-sm text-primaryText">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Variables */}
          {workflow.variables && workflow.variables.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">Variables</h3>
              <div className="space-y-2">
                {workflow.variables.map(v => (
                  <div key={v.id || v.key} className="flex justify-between items-center p-3 bg-card rounded-xl border border-border">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-primaryText">{v.name}</span>
                      {v.required && (
                        <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded">
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <span className="text-secondaryText text-xs uppercase">{v.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Golden Instructions */}
          {workflow.goldenInstructions && (
            <div>
              <h3 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-3">Golden Instructions</h3>
              <div className="p-4 bg-card rounded-xl border border-border">
                <pre className="text-sm text-primaryText whitespace-pre-wrap font-sans">
                  {workflow.goldenInstructions}
                </pre>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="flex flex-wrap gap-4 text-xs text-secondaryText">
              {workflow.createdAt && (
                <div>Created: {new Date(workflow.createdAt).toLocaleDateString()}</div>
              )}
              {workflow.updatedAt && (
                <div>Updated: {new Date(workflow.updatedAt).toLocaleDateString()}</div>
              )}
              {workflow.lastRunAt && (
                <div>Last run: {new Date(workflow.lastRunAt).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex justify-end gap-3 shrink-0 bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-border rounded-xl hover:bg-hover transition-all text-sm font-medium text-secondaryText"
          >
            Close
          </button>
          <button
            onClick={() => { onRun(); onClose(); }}
            className="px-6 py-2.5 bg-accent rounded-xl hover:bg-accent/90 transition-all text-sm font-semibold text-canvas flex items-center gap-2"
          >
            <ICONS.Play />
            Run Workflow
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowInfoModal;
