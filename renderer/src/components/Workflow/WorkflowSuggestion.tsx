/**
 * WorkflowSuggestion Component
 *
 * Small prompt shown at the end of AI responses suggesting to save as workflow.
 * Appears when AI detects a multi-step task that could be reusable.
 */

import React from 'react';
import { ICONS } from '../../constants';

interface WorkflowSuggestionProps {
  suggestedName: string;
  icon: string;
  onSave: () => void;
}

export const WorkflowSuggestion: React.FC<WorkflowSuggestionProps> = ({
  suggestedName,
  icon,
  onSave
}) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 my-4 max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 text-secondaryText text-sm mb-3">
        <span className="text-accent"><ICONS.Lightbulb /></span>
        <span>Save this as a reusable workflow?</span>
      </div>

      <button
        onClick={onSave}
        className="w-full px-4 py-2.5 bg-white/5 border border-border rounded-lg text-sm hover:bg-hover hover:border-accent/50 transition-all flex items-center justify-center gap-2 group"
      >
        <span className="text-lg">{icon}</span>
        <span className="text-primaryText group-hover:text-accent transition-colors">
          Save as "{suggestedName}" Workflow
        </span>
      </button>
    </div>
  );
};

export default WorkflowSuggestion;
