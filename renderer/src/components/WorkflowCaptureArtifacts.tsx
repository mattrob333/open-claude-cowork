/**
 * Workflow Capture Artifacts
 *
 * A2UI-style components that appear in chat during workflow capture flow.
 * These allow the user to review and approve each step of workflow creation.
 */

import React from 'react';
import { WorkflowCaptureData } from '../types';
import { ICONS } from '../constants';

// ============================================================
// GOLDEN INSTRUCTIONS ARTIFACT
// ============================================================

interface GoldenInstructionsArtifactProps {
  data: WorkflowCaptureData;
  onApprove: () => void;
  onEdit: () => void;
}

export const GoldenInstructionsArtifact: React.FC<GoldenInstructionsArtifactProps> = ({
  data,
  onApprove,
  onEdit
}) => {
  return (
    <div className="bg-[#1e1e1e] border border-accent/30 rounded-2xl overflow-hidden shadow-2xl w-[70%] min-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="bg-accent/10 px-5 py-4 flex items-center gap-3 border-b border-accent/20">
        <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center text-2xl">
          {data.suggestedIcon || '📋'}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{data.suggestedName || 'Extracted Workflow'}</h3>
          <p className="text-xs text-accent font-medium uppercase tracking-wider">Step 1 of 3: Review Golden Instructions</p>
        </div>
      </div>

      {/* Description */}
      {data.suggestedDescription && (
        <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
          <p className="text-sm text-white/80">{data.suggestedDescription}</p>
        </div>
      )}

      {/* Steps */}
      <div className="p-5 space-y-4 max-h-[300px] overflow-y-auto">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Workflow Steps
        </div>
        {data.steps?.map((step, index) => (
          <div key={index} className="flex gap-3 p-3 bg-white/[0.03] rounded-xl">
            <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center text-accent text-sm font-bold shrink-0">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white">{step.name}</div>
              <div className="text-xs text-white/60 mt-0.5">{step.description}</div>
              {step.tools.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {step.tools.map((tool, i) => (
                    <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] font-medium rounded-full">
                      {tool}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Runtime */}
      {data.estimatedRuntime && (
        <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex items-center gap-2">
          <ICONS.Clock />
          <span className="text-xs text-white/60">Estimated runtime: {data.estimatedRuntime}</span>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-end gap-3">
        <button
          onClick={onEdit}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white/70 hover:text-white transition-all flex items-center gap-2"
        >
          <ICONS.Edit />
          Edit
        </button>
        <button
          onClick={onApprove}
          className="px-6 py-2 rounded-lg bg-accent hover:bg-accent/90 text-sm font-semibold text-canvas transition-all flex items-center gap-2"
        >
          <ICONS.CheckCircle />
          Looks Good
        </button>
      </div>
    </div>
  );
};

// ============================================================
// VARIABLES ARTIFACT
// ============================================================

interface VariablesArtifactProps {
  data: WorkflowCaptureData;
  onApprove: () => void;
  onEdit: () => void;
}

export const VariablesArtifact: React.FC<VariablesArtifactProps> = ({
  data,
  onApprove,
  onEdit
}) => {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝';
      case 'textarea': return '📄';
      case 'select': return '📋';
      case 'multi_select': return '☑️';
      case 'boolean': return '✅';
      case 'number': return '🔢';
      case 'email': return '📧';
      case 'url': return '🔗';
      default: return '📝';
    }
  };

  return (
    <div className="bg-[#1e1e1e] border border-blue-500/30 rounded-2xl overflow-hidden shadow-2xl w-[70%] min-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="bg-blue-500/10 px-5 py-4 flex items-center gap-3 border-b border-blue-500/20">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
          <ICONS.Sliders />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Variables Identified</h3>
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wider">Step 2 of 3: Review Variables</p>
        </div>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
          {data.variables?.length || 0} variables
        </span>
      </div>

      {/* Variables List */}
      <div className="p-5 space-y-3 max-h-[350px] overflow-y-auto">
        {data.variables?.map((variable, index) => (
          <div key={index} className="p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{getTypeIcon(variable.type)}</span>
                <div>
                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                    {variable.name}
                    {variable.required && (
                      <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[9px] font-bold rounded">
                        REQUIRED
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50 font-mono">{variable.key}</div>
                </div>
              </div>
              <span className="px-2 py-1 bg-white/5 text-white/60 text-[10px] font-medium rounded uppercase">
                {variable.type}
              </span>
            </div>

            {variable.exampleValue && (
              <div className="mt-3 text-xs text-white/40">
                Example: <span className="text-white/60 font-mono">"{variable.exampleValue}"</span>
              </div>
            )}

            {variable.usedInSteps.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
                Used in:
                {variable.usedInSteps.map((step, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-accent/10 text-accent rounded">
                    {step}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

        {(!data.variables || data.variables.length === 0) && (
          <div className="py-8 text-center text-white/40">
            <ICONS.Info />
            <p className="mt-2 text-sm">No variables identified in this workflow.</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-end gap-3">
        <button
          onClick={onEdit}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white/70 hover:text-white transition-all flex items-center gap-2"
        >
          <ICONS.Edit />
          Edit Variables
        </button>
        <button
          onClick={onApprove}
          className="px-6 py-2 rounded-lg bg-blue-500 hover:bg-blue-500/90 text-sm font-semibold text-white transition-all flex items-center gap-2"
        >
          <ICONS.CheckCircle />
          Looks Good
        </button>
      </div>
    </div>
  );
};

// ============================================================
// OUTPUT CONFIG ARTIFACT
// ============================================================

interface OutputConfigArtifactProps {
  data: WorkflowCaptureData;
  onSave: () => void;
  onEdit: () => void;
}

export const OutputConfigArtifact: React.FC<OutputConfigArtifactProps> = ({
  data,
  onSave,
  onEdit
}) => {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'copy': return <ICONS.Copy />;
      case 'email': return <ICONS.Mail />;
      case 'download': return <ICONS.Download />;
      default: return <ICONS.ExternalLink />;
    }
  };

  return (
    <div className="bg-[#1e1e1e] border border-green-500/30 rounded-2xl overflow-hidden shadow-2xl w-[70%] min-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header */}
      <div className="bg-green-500/10 px-5 py-4 flex items-center gap-3 border-b border-green-500/20">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
          <ICONS.FileText />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">Output Configuration</h3>
          <p className="text-xs text-green-400 font-medium uppercase tracking-wider">Step 3 of 3: Configure Output</p>
        </div>
      </div>

      {/* Output Style */}
      <div className="p-5 border-b border-white/5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Output Style
        </div>
        <div className="flex gap-3">
          {['summary_card', 'detailed_report', 'minimal'].map((style) => (
            <div
              key={style}
              className={`flex-1 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                data.outputStyle === style
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-white/10 bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="text-sm font-medium text-white capitalize">
                {style.replace('_', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Actions */}
      <div className="p-5">
        <div className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
          Available Actions
        </div>
        <div className="flex flex-wrap gap-2">
          {data.suggestedActions?.map((action, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] rounded-xl border border-white/10"
            >
              <span className="text-white/60">{getActionIcon(action.type)}</span>
              <span className="text-sm text-white">{action.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Summary */}
      {data.workflowPreview && (
        <div className="mx-5 mb-5 p-4 bg-accent/5 rounded-xl border border-accent/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{data.workflowPreview.icon || data.suggestedIcon}</span>
            <div>
              <div className="text-sm font-bold text-white">{data.workflowPreview.name}</div>
              <div className="text-xs text-white/60">
                {data.workflowPreview.stepCount} steps • {data.workflowPreview.variableCount} variables
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 bg-white/[0.03] border-t border-white/5 flex items-center justify-between">
        <button
          onClick={onEdit}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white/70 hover:text-white transition-all flex items-center gap-2"
        >
          <ICONS.Edit />
          Edit Configuration
        </button>
        <button
          onClick={onSave}
          className="px-8 py-2.5 rounded-lg bg-green-500 hover:bg-green-500/90 text-sm font-bold text-white transition-all flex items-center gap-2 shadow-lg shadow-green-500/20"
        >
          <ICONS.Save />
          Save Workflow
        </button>
      </div>
    </div>
  );
};

// ============================================================
// EXPORT ALL
// ============================================================

export default {
  GoldenInstructionsArtifact,
  VariablesArtifact,
  OutputConfigArtifact
};
