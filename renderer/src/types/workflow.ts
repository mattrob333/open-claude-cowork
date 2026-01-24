/**
 * Workflow System Types
 *
 * Complete type definitions for the workflow capture and execution system.
 * Includes A2UI artifacts for interactive workflow building.
 */

// ============================================================
// CORE WORKFLOW TYPES
// ============================================================

/**
 * Complete workflow definition stored in database
 */
export interface Workflow {
  id: string;
  userId: string;

  // Basic Info
  name: string;
  description: string;
  icon: string;
  color?: string;

  // The Core Content
  goldenInstructions: string;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];

  // Output Configuration
  outputConfig: OutputConfig;

  // Metadata
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  runCount: number;
  averageRunTimeMs?: number;

  // Organization
  isFavorite: boolean;
  folderId?: string;
  tags: string[];

  // Status
  status: 'draft' | 'active' | 'archived';
}

/**
 * Individual step in a workflow
 */
export interface WorkflowStep {
  id: string;
  name: string;
  order: number;

  // The instruction for this step
  prompt: string;

  // Tools this step uses (for display/validation)
  tools: string[];

  // How to present this step during execution
  uiConfig: StepUIConfig;

  // Conditional execution
  condition?: StepCondition;

  // Timing
  estimatedDurationMs?: number;
}

export interface StepCondition {
  type: 'variable_equals' | 'previous_step_contains' | 'always';
  variable?: string;
  value?: string;
  stepId?: string;
  contains?: string;
}

/**
 * UI configuration for a step
 */
export interface StepUIConfig {
  // What to show while running
  showProgress: boolean;
  progressMessage?: string;

  // Input collection (if needed before this step)
  collectInput?: StepInputConfig;

  // How to display results
  displayResult: StepDisplayResult;

  // Checkpoint (pause for approval)
  checkpoint?: StepCheckpoint;
}

export interface StepInputConfig {
  type: 'buttons' | 'form' | 'chat' | 'none';
  prompt?: string;
  fields?: InputField[];
}

export interface StepDisplayResult {
  type: 'streaming' | 'card' | 'table' | 'list' | 'hidden' | 'custom';
  customComponent?: string;
  showIntermediate: boolean;
}

export interface StepCheckpoint {
  enabled: boolean;
  message?: string;
  actions: CheckpointAction[];
}

/**
 * Checkpoint action buttons
 */
export interface CheckpointAction {
  id: string;
  label: string;
  style: 'primary' | 'secondary' | 'danger';
  action: 'continue' | 'regenerate' | 'edit' | 'skip' | 'abort';
}

// ============================================================
// VARIABLE TYPES
// ============================================================

/**
 * Variable definition for workflow customization
 */
export interface WorkflowVariable {
  id: string;
  name: string;
  key: string;

  // Type and validation
  type: VariableType;
  required: boolean;

  // Default and options
  defaultValue?: string | number | boolean | string[];
  options?: VariableOption[];

  // Validation
  validation?: VariableValidation;

  // UI hints
  placeholder?: string;
  helpText?: string;

  // Where it's used (for display)
  usedInSteps: string[];
}

export type VariableType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'boolean'
  | 'date'
  | 'email'
  | 'url';

export interface VariableOption {
  value: string;
  label: string;
  icon?: string;
}

export interface VariableValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  errorMessage?: string;
}

/**
 * Input field for step input collection
 */
export interface InputField {
  id: string;
  variableKey: string;
  type: VariableType;
  label: string;
  required: boolean;
  options?: VariableOption[];
  placeholder?: string;
}

// ============================================================
// OUTPUT TYPES
// ============================================================

/**
 * Output configuration
 */
export interface OutputConfig {
  // Display style
  displayStyle: 'summary_card' | 'detailed_report' | 'minimal' | 'custom';
  customTemplate?: string;

  // Post-completion actions
  actions: OutputAction[];

  // Auto-actions (happen automatically)
  autoActions?: AutoActions;
}

export interface OutputAction {
  id: string;
  label: string;
  icon: string;
  type: 'copy' | 'email' | 'notion' | 'download' | 'open_url' | 'custom';
  config?: Record<string, unknown>;
}

export interface AutoActions {
  sendToNotion?: { databaseId: string };
  sendEmail?: { to: string };
  webhook?: { url: string };
}

// ============================================================
// WORKFLOW RUN TYPES
// ============================================================

/**
 * Record of a workflow execution
 */
export interface WorkflowRun {
  id: string;
  workflowId: string;
  userId: string;

  // Input values used
  variables: Record<string, unknown>;

  // Execution tracking
  status: WorkflowRunStatus;
  currentStepId?: string;

  // Step results
  stepResults: StepResult[];

  // Final output
  output?: string;
  outputFormat?: string;

  // Timing
  startedAt: string;
  completedAt?: string;
  durationMs?: number;

  // Error info
  error?: WorkflowError;
}

export type WorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface StepResult {
  stepId: string;
  status: StepResultStatus;
  startedAt?: string;
  completedAt?: string;

  // What was sent to the agent
  prompt: string;

  // What came back
  response?: string;
  toolCalls?: ToolCallRecord[];

  // User decisions at checkpoints
  checkpointDecision?: CheckpointDecision;
}

export type StepResultStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'skipped'
  | 'failed';

export interface ToolCallRecord {
  id: string;
  name: string;
  input: Record<string, unknown>;
  output?: unknown;
  durationMs?: number;
}

export interface CheckpointDecision {
  action: string;
  timestamp: string;
}

export interface WorkflowError {
  stepId: string;
  message: string;
  stack?: string;
}

// ============================================================
// WORKFLOW ARTIFACT TYPES (for capture flow)
// ============================================================

/**
 * Artifact shown during workflow capture
 */
export interface WorkflowArtifact {
  id: string;
  type: WorkflowArtifactType;
  status: 'pending' | 'shown' | 'approved' | 'editing';
  data: ArtifactData;
}

export type WorkflowArtifactType =
  | 'golden_instructions'
  | 'variables'
  | 'output_config'
  | 'preview';

export type ArtifactData =
  | GoldenInstructionsData
  | VariablesData
  | OutputConfigData
  | PreviewData;

export interface GoldenInstructionsData {
  suggestedName: string;
  suggestedIcon: string;
  suggestedDescription: string;
  instructions: string;
  steps: {
    name: string;
    description: string;
    tools: string[];
  }[];
  estimatedRuntime: string;
}

export interface VariablesData {
  variables: {
    key: string;
    name: string;
    type: VariableType;
    required: boolean;
    defaultValue?: unknown;
    options?: VariableOption[];
    usedInSteps: string[];
    exampleValue?: string;
  }[];
}

export interface OutputConfigData {
  suggestedStyle: 'summary_card' | 'detailed_report' | 'minimal';
  suggestedActions: OutputAction[];
}

export interface PreviewData {
  workflow: Partial<Workflow>;
}

// ============================================================
// WORKFLOW TEMPLATE TYPES
// ============================================================

/**
 * Pre-built workflow template for quick start
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  templateData: Partial<Workflow>;
  isFeatured: boolean;
  useCount: number;
  createdAt: string;
}

// ============================================================
// WORKFLOW PANEL STATE
// ============================================================

export interface WorkflowPanelState {
  workflows: Workflow[];
  isLoading: boolean;
  error: string | null;
  filter: WorkflowFilter;
  selectedWorkflowId: string | null;
  isRunnerOpen: boolean;
}

export interface WorkflowFilter {
  search: string;
  status: 'all' | 'active' | 'draft' | 'archived';
  favoritesOnly: boolean;
  tags: string[];
}

// ============================================================
// WORKFLOW RUNNER STATE
// ============================================================

export interface WorkflowRunnerState {
  workflow: Workflow | null;
  run: WorkflowRun | null;
  phase: 'variables' | 'running' | 'paused' | 'completed' | 'error';
  variables: Record<string, unknown>;
  validationErrors: Record<string, string>;
}

// ============================================================
// API REQUEST/RESPONSE TYPES
// ============================================================

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  icon: string;
  goldenInstructions: string;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  outputConfig: OutputConfig;
  sourceConversationId?: string;
  tags?: string[];
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  icon?: string;
  goldenInstructions?: string;
  steps?: WorkflowStep[];
  variables?: WorkflowVariable[];
  outputConfig?: OutputConfig;
  isFavorite?: boolean;
  status?: 'draft' | 'active' | 'archived';
  tags?: string[];
}

export interface ExecuteWorkflowRequest {
  workflowId: string;
  variables: Record<string, unknown>;
}

export interface WorkflowListResponse {
  workflows: Workflow[];
  total: number;
}

export interface WorkflowRunsResponse {
  runs: WorkflowRun[];
  total: number;
}
