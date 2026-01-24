/**
 * useWorkflowCapture Hook
 *
 * Manages the workflow capture flow:
 * 1. User clicks "Save as Workflow"
 * 2. Agent extracts golden instructions
 * 3. Agent identifies variables
 * 4. Agent suggests output config
 * 5. Workflow is saved
 */

import { useState, useCallback } from 'react';
import {
  Workflow,
  WorkflowStep,
  WorkflowVariable,
  OutputConfig,
  WorkflowArtifact,
  GoldenInstructionsData,
  VariablesData,
  OutputConfigData,
} from '../types/workflow';
import { Message } from '../types';

// ============================================================
// TYPES
// ============================================================

type CapturePhase =
  | 'idle'
  | 'extracting'
  | 'reviewing_instructions'
  | 'reviewing_variables'
  | 'reviewing_output'
  | 'saving'
  | 'complete'
  | 'error';

interface WorkflowDraft {
  name: string;
  description: string;
  icon: string;
  goldenInstructions: string;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  outputConfig: OutputConfig;
  sourceConversationId?: string;
}

interface UseWorkflowCaptureOptions {
  /** API base URL */
  apiUrl?: string;
  /** Callback when workflow is saved */
  onSave?: (workflow: Workflow) => void;
  /** Callback when capture is cancelled */
  onCancel?: () => void;
}

interface UseWorkflowCaptureReturn {
  /** Current capture phase */
  phase: CapturePhase;
  /** Current workflow draft */
  draft: WorkflowDraft | null;
  /** Current artifact being shown */
  currentArtifact: WorkflowArtifact | null;
  /** Error message if any */
  error: string | null;
  /** Whether capture is in progress */
  isCapturing: boolean;

  /** Start workflow capture from conversation */
  startCapture: (conversationId: string, messages: Message[]) => Promise<void>;
  /** Approve the current artifact */
  approveArtifact: () => void;
  /** Edit the current artifact data */
  editArtifact: (data: Partial<WorkflowDraft>) => void;
  /** Reject/skip the current artifact */
  rejectArtifact: () => void;
  /** Cancel the entire capture flow */
  cancelCapture: () => void;
  /** Save the workflow */
  saveWorkflow: () => Promise<Workflow | null>;
  /** Update draft directly */
  updateDraft: (updates: Partial<WorkflowDraft>) => void;
}

// ============================================================
// DEFAULT VALUES
// ============================================================

const DEFAULT_DRAFT: WorkflowDraft = {
  name: '',
  description: '',
  icon: '📋',
  goldenInstructions: '',
  steps: [],
  variables: [],
  outputConfig: {
    displayStyle: 'summary_card',
    actions: [
      { id: 'copy', label: 'Copy', icon: 'clipboard', type: 'copy' },
    ],
  },
};

const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  displayStyle: 'summary_card',
  actions: [
    { id: 'copy', label: 'Copy to Clipboard', icon: 'clipboard', type: 'copy' },
  ],
};

// ============================================================
// HOOK IMPLEMENTATION
// ============================================================

export function useWorkflowCapture(
  options: UseWorkflowCaptureOptions = {}
): UseWorkflowCaptureReturn {
  const { apiUrl = '/api', onSave, onCancel } = options;

  // State
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [draft, setDraft] = useState<WorkflowDraft | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<WorkflowArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start workflow capture from conversation
   */
  const startCapture = useCallback(
    async (conversationId: string, messages: Message[]) => {
      setPhase('extracting');
      setError(null);

      // Initialize draft
      setDraft({
        ...DEFAULT_DRAFT,
        sourceConversationId: conversationId,
      });

      try {
        // Call API to extract workflow
        const response = await fetch(`${apiUrl}/workflows/extract`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            messages: messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to extract workflow');
        }

        const data = await response.json();

        // Update draft with extracted data
        setDraft(prev => ({
          ...prev!,
          name: data.suggestedName || 'New Workflow',
          description: data.suggestedDescription || '',
          icon: data.suggestedIcon || '📋',
          goldenInstructions: data.instructions || '',
          steps: (data.steps || []).map((s: { name: string; description: string; tools: string[] }, i: number) => ({
            id: `step_${i}`,
            name: s.name,
            order: i,
            prompt: s.description,
            tools: s.tools || [],
            uiConfig: {
              showProgress: true,
              displayResult: { type: 'streaming', showIntermediate: true },
            },
          })),
        }));

        // Show instructions artifact for review
        setCurrentArtifact({
          id: 'instructions',
          type: 'golden_instructions',
          status: 'shown',
          data: {
            suggestedName: data.suggestedName,
            suggestedIcon: data.suggestedIcon,
            suggestedDescription: data.suggestedDescription,
            instructions: data.instructions,
            steps: data.steps,
            estimatedRuntime: data.estimatedRuntime || '~2 min',
          },
        });

        setPhase('reviewing_instructions');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Extraction failed');
        setPhase('error');
      }
    },
    [apiUrl]
  );

  /**
   * Approve the current artifact and move to next phase
   */
  const approveArtifact = useCallback(() => {
    if (!currentArtifact) return;

    switch (phase) {
      case 'reviewing_instructions':
        // Move to variables review
        setCurrentArtifact({
          id: 'variables',
          type: 'variables',
          status: 'shown',
          data: {
            variables: (draft?.variables || []).map(v => ({
              key: v.key,
              name: v.name,
              type: v.type,
              required: v.required,
              defaultValue: v.defaultValue,
              options: v.options,
              usedInSteps: v.usedInSteps,
            })),
          },
        });
        setPhase('reviewing_variables');
        break;

      case 'reviewing_variables':
        // Move to output config review
        setCurrentArtifact({
          id: 'output',
          type: 'output_config',
          status: 'shown',
          data: {
            suggestedStyle: draft?.outputConfig?.displayStyle || 'summary_card',
            suggestedActions: draft?.outputConfig?.actions || DEFAULT_OUTPUT_CONFIG.actions,
          },
        });
        setPhase('reviewing_output');
        break;

      case 'reviewing_output':
        // Ready to save
        setCurrentArtifact(null);
        setPhase('saving');
        break;

      default:
        break;
    }
  }, [phase, draft, currentArtifact]);

  /**
   * Edit the current artifact data
   */
  const editArtifact = useCallback((data: Partial<WorkflowDraft>) => {
    setDraft(prev => (prev ? { ...prev, ...data } : null));
  }, []);

  /**
   * Reject/skip the current artifact
   */
  const rejectArtifact = useCallback(() => {
    // For now, just move to next phase with defaults
    approveArtifact();
  }, [approveArtifact]);

  /**
   * Cancel the entire capture flow
   */
  const cancelCapture = useCallback(() => {
    setPhase('idle');
    setDraft(null);
    setCurrentArtifact(null);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  /**
   * Save the workflow
   */
  const saveWorkflow = useCallback(async (): Promise<Workflow | null> => {
    if (!draft) return null;

    setPhase('saving');

    try {
      const response = await fetch(`${apiUrl}/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          icon: draft.icon,
          goldenInstructions: draft.goldenInstructions,
          steps: draft.steps,
          variables: draft.variables,
          outputConfig: draft.outputConfig,
          sourceConversationId: draft.sourceConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save workflow');
      }

      const workflow = await response.json();

      setPhase('complete');
      onSave?.(workflow);

      return workflow;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setPhase('error');
      return null;
    }
  }, [draft, apiUrl, onSave]);

  /**
   * Update draft directly
   */
  const updateDraft = useCallback((updates: Partial<WorkflowDraft>) => {
    setDraft(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  return {
    phase,
    draft,
    currentArtifact,
    error,
    isCapturing: phase !== 'idle' && phase !== 'complete' && phase !== 'error',

    startCapture,
    approveArtifact,
    editArtifact,
    rejectArtifact,
    cancelCapture,
    saveWorkflow,
    updateDraft,
  };
}

// ============================================================
// HELPER: Generate suggested variables from conversation
// ============================================================

export function extractVariablesFromMessages(messages: Message[]): WorkflowVariable[] {
  const variables: WorkflowVariable[] = [];
  const seenKeys = new Set<string>();

  // Common patterns to look for
  const patterns = [
    { regex: /company (?:name|called|named) ["']?([^"'\n,]+)["']?/gi, name: 'Company Name', key: 'company_name', type: 'text' as const },
    { regex: /(?:person|contact|name) ["']?([A-Z][a-z]+ [A-Z][a-z]+)["']?/gi, name: 'Contact Name', key: 'contact_name', type: 'text' as const },
    { regex: /(?:email|send to) ["']?([^\s"']+@[^\s"']+)["']?/gi, name: 'Email', key: 'email', type: 'email' as const },
    { regex: /(?:url|website|link) ["']?(https?:\/\/[^\s"']+)["']?/gi, name: 'URL', key: 'url', type: 'url' as const },
  ];

  const fullText = messages.map(m => m.content).join(' ');

  for (const pattern of patterns) {
    const matches = fullText.matchAll(pattern.regex);
    for (const match of matches) {
      if (!seenKeys.has(pattern.key)) {
        seenKeys.add(pattern.key);
        variables.push({
          id: `var_${pattern.key}`,
          name: pattern.name,
          key: pattern.key,
          type: pattern.type,
          required: true,
          placeholder: `Enter ${pattern.name.toLowerCase()}`,
          usedInSteps: [],
        });
      }
    }
  }

  return variables;
}

export default useWorkflowCapture;
