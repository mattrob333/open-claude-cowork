/**
 * Workflow Executor Service
 *
 * Executes saved workflows step by step, streaming progress via SSE.
 * Handles variable substitution, checkpoints, and error recovery.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { generateExecutionPrompt } from '../prompts/workflow-extraction.js';
import workflowService from './workflow-service.js';
import logger from '../lib/logger.js';

// Note: Using Claude Agent SDK's query function for execution

// ============================================================
// TYPES (JSDoc for TypeScript-like documentation)
// ============================================================

/**
 * @typedef {Object} ExecutionContext
 * @property {string} workflowId
 * @property {string} runId
 * @property {Object} workflow
 * @property {Object} variables
 * @property {number} currentStepIndex
 * @property {Array} stepOutputs
 * @property {boolean} isPaused
 * @property {boolean} isCancelled
 */

/**
 * @typedef {Object} SSEWriter
 * @property {function(string, Object): void} write
 * @property {function(): void} close
 */

// ============================================================
// EXECUTOR CLASS
// ============================================================

class WorkflowExecutor {
  constructor() {
    this.activeExecutions = new Map();
  }

  /**
   * Execute a workflow with streaming progress
   * @param {string} workflowId - ID of the workflow to execute
   * @param {Object} variables - Variable values provided by user
   * @param {SSEWriter} sseWriter - SSE response writer
   * @returns {Promise<void>}
   */
  async execute(workflowId, variables, sseWriter, clientWorkflow = null) {
    const log = logger.workflow.child({ workflowId });

    try {
      // Get workflow - use clientWorkflow if provided (for localStorage-based workflows)
      let workflow = clientWorkflow;
      if (!workflow) {
        workflow = await workflowService.getWorkflow(workflowId);
      }
      if (!workflow) {
        sseWriter.write('run_error', { error: 'Workflow not found' });
        sseWriter.close();
        return;
      }

      // Create run record (workflowId, variables, userId)
      // Note: userId is optional in executor since workflow already validated
      const run = await workflowService.createRun(workflowId, variables, 'executor');
      const runId = run.id;

      // Update status to running
      await workflowService.updateRun(runId, {
        status: 'running',
        startedAt: new Date().toISOString(),
      });

      // Initialize execution context
      const context = {
        workflowId,
        runId,
        workflow,
        variables,
        currentStepIndex: 0,
        stepOutputs: [],
        isPaused: false,
        isCancelled: false,
      };

      this.activeExecutions.set(runId, context);

      // Send run started event
      sseWriter.write('run_started', { runId, workflowId });

      log.info({ runId }, 'Starting workflow execution');

      // Execute steps
      const steps = workflow.steps || [];
      for (let i = 0; i < steps.length; i++) {
        if (context.isCancelled) {
          log.info({ runId }, 'Workflow cancelled');
          break;
        }

        context.currentStepIndex = i;
        const step = steps[i];

        // Send step started event
        sseWriter.write('step_started', {
          stepIndex: i,
          stepId: step.id,
          stepName: step.name,
        });

        log.info({ runId, stepIndex: i, stepName: step.name }, 'Executing step');

        try {
          // Execute the step
          const output = await this.executeStep(
            step,
            context,
            (chunk) => {
              sseWriter.write('step_output', {
                stepIndex: i,
                content: chunk,
              });
            }
          );

          context.stepOutputs.push(output);

          // Send step completed event
          sseWriter.write('step_completed', {
            stepIndex: i,
            stepId: step.id,
            output: output,
          });

          log.info({ runId, stepIndex: i }, 'Step completed');

          // Handle checkpoint if enabled
          if (step.uiConfig?.checkpoint?.enabled) {
            context.isPaused = true;
            sseWriter.write('checkpoint', {
              stepIndex: i,
              message: step.uiConfig.checkpoint.message || 'Review before continuing',
            });

            // Wait for resume (in real implementation, this would be a Promise)
            // For now, we auto-continue after sending the checkpoint event
            context.isPaused = false;
          }
        } catch (stepError) {
          log.error({ runId, stepIndex: i, error: stepError.message }, 'Step failed');

          sseWriter.write('step_error', {
            stepIndex: i,
            stepId: step.id,
            error: stepError.message,
          });

          // If step has error handling config, try to recover
          if (step.uiConfig?.errorHandling === 'continue') {
            context.stepOutputs.push({ error: stepError.message });
            continue;
          }

          // Otherwise, fail the run
          await workflowService.updateRun(runId, {
            status: 'failed',
            completedAt: new Date().toISOString(),
            error: stepError.message,
          });

          sseWriter.write('run_error', { error: stepError.message });
          sseWriter.close();
          this.activeExecutions.delete(runId);
          return;
        }
      }

      // Complete the run
      const finalOutput = this.aggregateOutputs(context.stepOutputs, workflow.outputConfig);

      await workflowService.updateRun(runId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        output: finalOutput,
      });

      // Update workflow run count
      await workflowService.updateWorkflow(workflowId, {
        runCount: (workflow.runCount || 0) + 1,
        lastRunAt: new Date().toISOString(),
      });

      const completedRun = await workflowService.getRun(runId);

      sseWriter.write('run_completed', {
        runId,
        result: finalOutput,
        run: completedRun,
      });

      log.info({ runId }, 'Workflow execution completed');

      sseWriter.close();
      this.activeExecutions.delete(runId);
    } catch (error) {
      log.error({ error: error.message }, 'Workflow execution failed');
      sseWriter.write('run_error', { error: error.message });
      sseWriter.close();
    }
  }

  /**
   * Execute a single step
   * @param {Object} step - Step to execute
   * @param {ExecutionContext} context - Execution context
   * @param {function(string): void} onChunk - Callback for streaming output
   * @returns {Promise<string>}
   */
  async executeStep(step, context, onChunk) {
    // Substitute variables in the prompt
    let prompt = step.prompt || '';
    for (const [key, value] of Object.entries(context.variables)) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    // Include previous step outputs if referenced
    const previousOutputs = context.stepOutputs
      .map((output, i) => `Step ${i + 1} output: ${typeof output === 'string' ? output : JSON.stringify(output)}`)
      .join('\n\n');

    if (previousOutputs && prompt.includes('{{previous_outputs}}')) {
      prompt = prompt.replace('{{previous_outputs}}', previousOutputs);
    }

    // Build the system prompt
    const systemPrompt = generateExecutionPrompt(
      context.workflow,
      context.variables
    );

    // Call Claude Agent SDK with streaming
    let fullOutput = '';

    try {
      // Use the Claude Agent SDK query function
      const stream = query({
        prompt: `Execute step "${step.name}":\n\n${prompt}`,
        systemPrompt: systemPrompt,
        allowedTools: step.tools || ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        maxTurns: 5,
        permissionMode: 'bypassPermissions',
      });

      for await (const chunk of stream) {
        // Handle different chunk types from the agent SDK
        if (chunk.type === 'text') {
          fullOutput += chunk.content;
          onChunk(chunk.content);
        } else if (chunk.type === 'assistant' && chunk.message?.content) {
          // Handle structured message responses
          for (const block of chunk.message.content) {
            if (block.type === 'text') {
              fullOutput += block.text;
              onChunk(block.text);
            }
          }
        }
      }

      return fullOutput;
    } catch (error) {
      throw new Error(`Step execution failed: ${error.message}`);
    }
  }

  /**
   * Aggregate step outputs into final result
   * @param {Array} stepOutputs - Outputs from all steps
   * @param {Object} outputConfig - Output configuration
   * @returns {Object}
   */
  aggregateOutputs(stepOutputs, outputConfig) {
    const displayStyle = outputConfig?.displayStyle || 'summary_card';

    switch (displayStyle) {
      case 'summary_card':
        return {
          type: 'summary',
          content: stepOutputs[stepOutputs.length - 1] || '',
          allOutputs: stepOutputs,
        };

      case 'detailed_report':
        return {
          type: 'detailed',
          steps: stepOutputs.map((output, i) => ({
            stepIndex: i,
            output,
          })),
        };

      case 'raw_output':
        return {
          type: 'raw',
          content: stepOutputs.join('\n\n---\n\n'),
        };

      default:
        return {
          type: 'default',
          content: stepOutputs[stepOutputs.length - 1] || '',
        };
    }
  }

  /**
   * Cancel a running execution
   * @param {string} runId - ID of the run to cancel
   */
  cancelExecution(runId) {
    const context = this.activeExecutions.get(runId);
    if (context) {
      context.isCancelled = true;
    }
  }

  /**
   * Resume a paused execution
   * @param {string} runId - ID of the run to resume
   */
  resumeExecution(runId) {
    const context = this.activeExecutions.get(runId);
    if (context) {
      context.isPaused = false;
    }
  }

  /**
   * Get execution status
   * @param {string} runId - ID of the run
   * @returns {Object|null}
   */
  getExecutionStatus(runId) {
    const context = this.activeExecutions.get(runId);
    if (!context) {
      return null;
    }

    return {
      runId,
      workflowId: context.workflowId,
      currentStepIndex: context.currentStepIndex,
      isPaused: context.isPaused,
      isCancelled: context.isCancelled,
      stepsCompleted: context.stepOutputs.length,
      totalSteps: context.workflow.steps?.length || 0,
    };
  }
}

// Singleton instance
const workflowExecutor = new WorkflowExecutor();

export default workflowExecutor;
