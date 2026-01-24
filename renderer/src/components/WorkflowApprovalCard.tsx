/**
 * WorkflowApprovalCard Component
 *
 * Interactive card shown in chat for workflow approval.
 * Displays workflow preview with Approve/Modify/Deny buttons.
 */

import React, { useState } from 'react';
import { ICONS } from '../constants';
import { Workflow, WorkflowStep, WorkflowVariable } from '../types/workflow';
import { saveWorkflow } from '../lib/workflowStorage';

interface WorkflowApprovalCardProps {
  messageId: string;
  workflowData: {
    name: string;
    description: string;
    icon: string;
    goldenInstructions?: string;
    steps?: { name: string; description: string; tools: string[] }[];
    variables?: { key: string; name: string; type: string; required: boolean; description?: string }[];
    outputStyle?: string;
    tags?: string[];
  };
  onApprove?: () => void;
  onModify?: () => void;
  onDeny?: () => void;
}

const WorkflowApprovalCard: React.FC<WorkflowApprovalCardProps> = ({
  messageId,
  workflowData,
  onApprove,
  onModify,
  onDeny
}) => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [isSaving, setIsSaving] = useState(false);

  const handleApprove = async () => {
    if (isSaving || status !== 'pending') return;
    setIsSaving(true);

    try {
      // Transform the data into a Workflow object
      const workflow: Workflow = {
        id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: workflowData.name,
        description: workflowData.description,
        icon: workflowData.icon || '📋',
        status: 'active',
        goldenInstructions: workflowData.goldenInstructions,
        steps: workflowData.steps?.map((step, i) => ({
          id: `step_${i}`,
          name: step.name,
          description: step.description,
          tools: step.tools
        })) as WorkflowStep[] || [],
        variables: workflowData.variables?.map((v, i) => ({
          id: `var_${i}`,
          key: v.key,
          name: v.name,
          type: v.type as 'string' | 'number' | 'boolean' | 'select' | 'multiline',
          required: v.required,
          description: v.description
        })) as WorkflowVariable[] || [],
        tags: workflowData.tags || [],
        runCount: 0,
        isFavorite: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save to localStorage (this dispatches 'workflow-created' event)
      saveWorkflow(workflow);

      setStatus('approved');
      onApprove?.();
    } catch (error) {
      console.error('Error saving workflow:', error);
      setIsSaving(false);
    }
  };

  const handleModify = () => {
    onModify?.();
  };

  const handleDeny = () => {
    setStatus('denied');
    onDeny?.();
  };

  if (status === 'approved') {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 my-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400">
            <ICONS.Check />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-400">Workflow Saved!</h4>
            <p className="text-xs text-green-400/80">
              "{workflowData.name}" has been added to your workflows
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 my-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400">
            <ICONS.X />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-red-400">Workflow Discarded</h4>
            <p className="text-xs text-red-400/80">
              The workflow was not saved
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-border rounded-2xl overflow-hidden my-3 shadow-lg">
      {/* Header */}
      <div className="p-4 bg-accent/5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center text-2xl">
            {workflowData.icon || '📋'}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primaryText">{workflowData.name}</h3>
            <p className="text-sm text-secondaryText">{workflowData.description}</p>
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="flex gap-4">
          <div className="flex-1 bg-card rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-accent">{workflowData.steps?.length || 0}</div>
            <div className="text-xs text-secondaryText">Steps</div>
          </div>
          <div className="flex-1 bg-card rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-purple-400">{workflowData.variables?.length || 0}</div>
            <div className="text-xs text-secondaryText">Variables</div>
          </div>
          <div className="flex-1 bg-card rounded-lg p-3 border border-border">
            <div className="text-2xl font-bold text-blue-400">{workflowData.tags?.length || 0}</div>
            <div className="text-xs text-secondaryText">Tags</div>
          </div>
        </div>

        {/* Steps Preview */}
        {workflowData.steps && workflowData.steps.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">Steps</h4>
            <div className="space-y-2">
              {workflowData.steps.slice(0, 3).map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-5 h-5 bg-accent/20 rounded text-accent text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <span className="text-primaryText">{step.name}</span>
                </div>
              ))}
              {workflowData.steps.length > 3 && (
                <div className="text-xs text-secondaryText pl-7">
                  +{workflowData.steps.length - 3} more steps
                </div>
              )}
            </div>
          </div>
        )}

        {/* Variables Preview */}
        {workflowData.variables && workflowData.variables.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-secondaryText uppercase tracking-wider mb-2">Variables</h4>
            <div className="flex flex-wrap gap-2">
              {workflowData.variables.map((v, i) => (
                <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-mono">
                  {v.name}
                  {v.required && <span className="text-red-400 ml-1">*</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 bg-white/[0.02] border-t border-border flex gap-3">
        <button
          onClick={handleDeny}
          className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all text-sm font-medium"
        >
          Discard
        </button>
        <div className="flex-1" />
        <button
          onClick={handleModify}
          className="px-4 py-2 border border-border text-secondaryText hover:text-primaryText hover:bg-hover rounded-lg transition-all text-sm font-medium"
        >
          Modify
        </button>
        <button
          onClick={handleApprove}
          disabled={isSaving}
          className="px-6 py-2 bg-accent hover:bg-accent/90 text-canvas rounded-lg transition-all text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <ICONS.Loader />
              Saving...
            </>
          ) : (
            <>
              <ICONS.Check />
              Save Workflow
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WorkflowApprovalCard;
