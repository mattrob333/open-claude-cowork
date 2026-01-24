/**
 * WorkflowProgress Component
 *
 * Displays the progress of a workflow execution with step-by-step status.
 */

import React from 'react';
import { WorkflowStep } from '../../types/workflow';
import { ICONS } from '../../constants';

// ============================================================
// TYPES
// ============================================================

interface StepStatus {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
  error?: string;
}

interface WorkflowProgressProps {
  steps: WorkflowStep[];
  stepStatuses: StepStatus[];
  currentStepIndex: number;
  className?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  steps,
  stepStatuses,
  currentStepIndex,
  className = '',
}) => {
  const getStepStatus = (stepId: string): StepStatus | undefined => {
    return stepStatuses.find(s => s.stepId === stepId);
  };

  const renderStepIndicator = (index: number, status: StepStatus | undefined) => {
    if (!status) {
      return <span>{index + 1}</span>;
    }

    switch (status.status) {
      case 'completed':
        return <ICONS.Check />;
      case 'error':
        return <ICONS.X />;
      case 'running':
        return (
          <span className="spinning">
            <ICONS.Loader />
          </span>
        );
      default:
        return <span>{index + 1}</span>;
    }
  };

  const getStatusLabel = (status: StepStatus | undefined): string => {
    if (!status) return 'Pending';

    switch (status.status) {
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Failed';
      case 'running':
        return 'Running...';
      default:
        return 'Pending';
    }
  };

  return (
    <div className={`workflow-progress ${className}`}>
      {steps.map((step, index) => {
        const status = getStepStatus(step.id);
        const statusClass = status ? `workflow-progress__step--${status.status}` : '';
        const isActive = index === currentStepIndex && status?.status === 'running';

        return (
          <div
            key={step.id}
            className={`workflow-progress__step ${statusClass} ${
              isActive ? 'workflow-progress__step--active' : ''
            }`}
          >
            {/* Step indicator */}
            <div className="workflow-progress__step-indicator">
              {renderStepIndicator(index, status)}
            </div>

            {/* Step content */}
            <div className="workflow-progress__step-content">
              <h4 className="workflow-progress__step-name">{step.name}</h4>
              <span className="workflow-progress__step-status">
                {getStatusLabel(status)}
              </span>

              {/* Show output for completed steps */}
              {status?.output && status.status === 'completed' && (
                <div className="workflow-progress__step-output">
                  {status.output.length > 200
                    ? `${status.output.substring(0, 200)}...`
                    : status.output}
                </div>
              )}

              {/* Show streaming output for running steps */}
              {status?.output && status.status === 'running' && (
                <div className="workflow-progress__step-output workflow-progress__step-output--streaming">
                  {status.output}
                  <span className="workflow-progress__cursor">|</span>
                </div>
              )}

              {/* Show error for failed steps */}
              {status?.error && (
                <div className="workflow-progress__step-error">
                  {status.error}
                </div>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={`workflow-progress__connector ${
                  status?.status === 'completed'
                    ? 'workflow-progress__connector--completed'
                    : ''
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WorkflowProgress;
