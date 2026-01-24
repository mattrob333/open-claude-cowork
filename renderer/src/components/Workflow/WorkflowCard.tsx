/**
 * WorkflowCard Component
 *
 * Displays a single workflow in the workflow panel.
 * Shows name, icon, description, and quick actions.
 */

import React from 'react';
import { Workflow } from '../../types/workflow';
import { ICONS } from '../../constants';

interface WorkflowCardProps {
  workflow: Workflow;
  isSelected?: boolean;
  onSelect?: (workflow: Workflow) => void;
  onRun?: (workflow: Workflow) => void;
  onEdit?: (workflow: Workflow) => void;
  onDelete?: (workflow: Workflow) => void;
  onFavorite?: (workflow: Workflow) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  isSelected = false,
  onSelect,
  onRun,
  onEdit,
  onDelete,
  onFavorite,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(workflow);
  };

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRun?.(workflow);
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite?.(workflow);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(workflow);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(workflow);
  };

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  };

  return (
    <div
      className={`workflow-card ${isSelected ? 'workflow-card--selected' : ''} ${
        workflow.status === 'draft' ? 'workflow-card--draft' : ''
      }`}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="workflow-card__header">
        <span className="workflow-card__icon">{workflow.icon}</span>
        <div className="workflow-card__title-row">
          <h4 className="workflow-card__name">{workflow.name}</h4>
          {workflow.isFavorite && (
            <span className="workflow-card__favorite-badge">⭐</span>
          )}
        </div>
      </div>

      {/* Description */}
      {workflow.description && (
        <p className="workflow-card__description">{workflow.description}</p>
      )}

      {/* Meta */}
      <div className="workflow-card__meta">
        <span className="workflow-card__runs">
          {workflow.runCount} runs
        </span>
        {workflow.lastRunAt && (
          <span className="workflow-card__last-run">
            Last: {getRelativeTime(workflow.lastRunAt)}
          </span>
        )}
        {workflow.status === 'draft' && (
          <span className="workflow-card__status-badge">Draft</span>
        )}
      </div>

      {/* Tags */}
      {workflow.tags && workflow.tags.length > 0 && (
        <div className="workflow-card__tags">
          {workflow.tags.slice(0, 3).map((tag, i) => (
            <span key={i} className="workflow-card__tag">
              {tag}
            </span>
          ))}
          {workflow.tags.length > 3 && (
            <span className="workflow-card__tag workflow-card__tag--more">
              +{workflow.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="workflow-card__actions">
        <button
          className="workflow-card__action workflow-card__action--primary"
          onClick={handleRun}
          title="Run workflow"
        >
          <ICONS.Play />
          <span>Run</span>
        </button>

        <div className="workflow-card__action-group">
          <button
            className={`workflow-card__action ${
              workflow.isFavorite ? 'workflow-card__action--active' : ''
            }`}
            onClick={handleFavorite}
            title={workflow.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {workflow.isFavorite ? '★' : '☆'}
          </button>

          <button
            className="workflow-card__action"
            onClick={handleEdit}
            title="Edit workflow"
          >
            <ICONS.Edit />
          </button>

          <button
            className="workflow-card__action workflow-card__action--danger"
            onClick={handleDelete}
            title="Delete workflow"
          >
            <ICONS.Trash />
          </button>
        </div>
      </div>

      {/* Steps preview */}
      {workflow.steps && workflow.steps.length > 0 && (
        <div className="workflow-card__steps-preview">
          <span className="workflow-card__steps-count">
            {workflow.steps.length} step{workflow.steps.length !== 1 ? 's' : ''}
          </span>
          <div className="workflow-card__steps-dots">
            {workflow.steps.slice(0, 5).map((_, i) => (
              <span key={i} className="workflow-card__step-dot" />
            ))}
            {workflow.steps.length > 5 && (
              <span className="workflow-card__step-dot workflow-card__step-dot--more">
                +{workflow.steps.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCard;
