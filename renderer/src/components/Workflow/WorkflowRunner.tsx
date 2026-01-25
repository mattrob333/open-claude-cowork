/**
 * WorkflowRunner Component
 *
 * Modal dialog for running a workflow.
 * Handles variable collection, execution, and result display.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Workflow, WorkflowVariable, WorkflowRun } from '../../types/workflow';
import { ICONS } from '../../constants';
import { SERVER_URL } from '../../constants';
import WorkflowProgress from './WorkflowProgress';
import VariableForm from './VariableForm';

// ============================================================
// TYPES
// ============================================================

interface WorkflowRunnerProps {
  workflow: Workflow;
  onClose: () => void;
  onComplete?: (run: WorkflowRun) => void;
}

type RunnerPhase = 'variables' | 'executing' | 'complete' | 'error';

interface StepStatus {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: string;
  error?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const WorkflowRunner: React.FC<WorkflowRunnerProps> = ({
  workflow,
  onClose,
  onComplete,
}) => {
  // State
  const [phase, setPhase] = useState<RunnerPhase>('variables');
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [runId, setRunId] = useState<string | null>(null);

  // Initialize step statuses
  useEffect(() => {
    if (workflow.steps) {
      setStepStatuses(
        workflow.steps.map(step => ({
          stepId: step.id,
          status: 'pending',
        }))
      );
    }
  }, [workflow.steps]);

  // Skip variables phase if no variables
  useEffect(() => {
    if (
      phase === 'variables' &&
      (!workflow.variables || workflow.variables.length === 0)
    ) {
      handleStartExecution();
    }
  }, [phase, workflow.variables]);

  /**
   * Handle variable change
   */
  const handleVariableChange = useCallback(
    (key: string, value: unknown) => {
      setVariables(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  /**
   * Validate all required variables are filled
   */
  const validateVariables = useCallback((): boolean => {
    if (!workflow.variables) return true;

    for (const variable of workflow.variables) {
      if (variable.required && !variables[variable.key]) {
        return false;
      }
    }
    return true;
  }, [workflow.variables, variables]);

  /**
   * Start workflow execution
   */
  const handleStartExecution = useCallback(async () => {
    if (!validateVariables()) {
      setError('Please fill in all required variables');
      return;
    }

    setPhase('executing');
    setError(null);

    try {
      // Create EventSource for SSE streaming
      // Pass workflow object for localStorage-based workflows
      const params = new URLSearchParams({
        variables: JSON.stringify(variables),
        workflow: JSON.stringify(workflow),
      });

      const eventSource = new EventSource(
        `${SERVER_URL}/api/workflows/${workflow.id}/execute?${params.toString()}`
      );

      eventSource.onmessage = event => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'run_started':
              setRunId(data.runId);
              break;

            case 'step_started':
              setCurrentStepIndex(data.stepIndex);
              setStepStatuses(prev =>
                prev.map((s, i) =>
                  i === data.stepIndex ? { ...s, status: 'running' } : s
                )
              );
              break;

            case 'step_output':
              setStepStatuses(prev =>
                prev.map((s, i) =>
                  i === data.stepIndex
                    ? { ...s, output: (s.output || '') + data.content }
                    : s
                )
              );
              break;

            case 'step_completed':
              setStepStatuses(prev =>
                prev.map((s, i) =>
                  i === data.stepIndex
                    ? { ...s, status: 'completed', output: data.output }
                    : s
                )
              );
              break;

            case 'step_error':
              setStepStatuses(prev =>
                prev.map((s, i) =>
                  i === data.stepIndex
                    ? { ...s, status: 'error', error: data.error }
                    : s
                )
              );
              break;

            case 'checkpoint':
              // Pause for user approval
              // TODO: Show checkpoint UI
              break;

            case 'run_completed':
              setPhase('complete');
              setResult(data.result);
              eventSource.close();
              if (onComplete && data.run) {
                onComplete(data.run);
              }
              break;

            case 'run_error':
              setPhase('error');
              setError(data.error);
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE message:', err);
        }
      };

      eventSource.onerror = () => {
        setPhase('error');
        setError('Connection error during execution');
        eventSource.close();
      };
    } catch (err) {
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Execution failed');
    }
  }, [workflow.id, variables, validateVariables, onComplete]);

  /**
   * Handle close with confirmation
   */
  const handleClose = useCallback(() => {
    if (phase === 'executing') {
      if (!confirm('Workflow is still running. Are you sure you want to close?')) {
        return;
      }
    }
    onClose();
  }, [phase, onClose]);

  /**
   * Retry after error
   */
  const handleRetry = useCallback(() => {
    setPhase('variables');
    setError(null);
    setStepStatuses(
      workflow.steps?.map(step => ({
        stepId: step.id,
        status: 'pending',
      })) || []
    );
  }, [workflow.steps]);

  // Render based on phase
  const renderContent = () => {
    switch (phase) {
      case 'variables':
        return (
          <div className="workflow-runner__variables">
            <p className="workflow-runner__intro">
              Configure the inputs for this workflow:
            </p>
            <VariableForm
              variables={workflow.variables || []}
              values={variables}
              onChange={handleVariableChange}
            />
          </div>
        );

      case 'executing':
        return (
          <div className="workflow-runner__executing">
            <WorkflowProgress
              steps={workflow.steps || []}
              stepStatuses={stepStatuses}
              currentStepIndex={currentStepIndex}
            />
          </div>
        );

      case 'complete':
        return (
          <div className="workflow-runner__complete">
            <div className="workflow-runner__success-icon">
              <ICONS.Check />
            </div>
            <h3>Workflow Complete</h3>
            {result && (
              <div className="workflow-runner__result">
                <pre>{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="workflow-runner__error">
            <div className="workflow-runner__error-icon">
              <ICONS.AlertCircle />
            </div>
            <h3>Execution Failed</h3>
            <p>{error}</p>
          </div>
        );

      default:
        return null;
    }
  };

  // Render footer buttons based on phase
  const renderFooter = () => {
    switch (phase) {
      case 'variables':
        return (
          <>
            <button
              className="workflow-runner__btn workflow-runner__btn--secondary"
              onClick={handleClose}
            >
              Cancel
            </button>
            <button
              className="workflow-runner__btn workflow-runner__btn--primary"
              onClick={handleStartExecution}
              disabled={!validateVariables()}
            >
              <ICONS.Play />
              Run Workflow
            </button>
          </>
        );

      case 'executing':
        return (
          <button
            className="workflow-runner__btn workflow-runner__btn--secondary"
            onClick={handleClose}
          >
            Cancel
          </button>
        );

      case 'complete':
        return (
          <>
            <button
              className="workflow-runner__btn workflow-runner__btn--secondary"
              onClick={handleRetry}
            >
              Run Again
            </button>
            <button
              className="workflow-runner__btn workflow-runner__btn--primary"
              onClick={handleClose}
            >
              Done
            </button>
          </>
        );

      case 'error':
        return (
          <>
            <button
              className="workflow-runner__btn workflow-runner__btn--secondary"
              onClick={handleClose}
            >
              Close
            </button>
            <button
              className="workflow-runner__btn workflow-runner__btn--primary"
              onClick={handleRetry}
            >
              Retry
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="workflow-runner" onClick={handleClose}>
      <div
        className="workflow-runner__modal"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="workflow-runner__header">
          <span className="workflow-runner__icon">{workflow.icon}</span>
          <div className="workflow-runner__title-section">
            <h2 className="workflow-runner__title">{workflow.name}</h2>
            {workflow.description && (
              <p className="workflow-runner__description">
                {workflow.description}
              </p>
            )}
          </div>
          <button
            className="workflow-runner__close"
            onClick={handleClose}
            title="Close"
          >
            <ICONS.X />
          </button>
        </div>

        {/* Content */}
        <div className="workflow-runner__content">{renderContent()}</div>

        {/* Footer */}
        <div className="workflow-runner__footer">{renderFooter()}</div>
      </div>
    </div>
  );
};

export default WorkflowRunner;
