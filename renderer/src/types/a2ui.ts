/**
 * A2UI (Agent-to-UI) Types
 *
 * Type definitions for the A2UI streaming component system.
 * A2UI allows the agent to render interactive React components in the UI.
 */

// ============================================================
// CORE A2UI MESSAGE TYPES
// ============================================================

/**
 * Base interface for all A2UI messages
 */
export interface A2UIMessageBase {
  type: A2UIMessageType;
}

export type A2UIMessageType =
  | 'createSurface'
  | 'updateComponents'
  | 'updateData'
  | 'deleteSurface'
  | 'event';

/**
 * Create a new UI surface (container for components)
 */
export interface CreateSurfaceMessage extends A2UIMessageBase {
  type: 'createSurface';
  surfaceId: string;
  catalogId?: string;
  rootComponent?: A2UIComponent;
}

/**
 * Update components within a surface
 */
export interface UpdateComponentsMessage extends A2UIMessageBase {
  type: 'updateComponents';
  surfaceId: string;
  components: A2UIComponent[];
}

/**
 * Update the data model for a surface
 */
export interface UpdateDataMessage extends A2UIMessageBase {
  type: 'updateData';
  surfaceId: string;
  path: string;
  value: unknown;
  merge?: boolean;
}

/**
 * Delete a surface
 */
export interface DeleteSurfaceMessage extends A2UIMessageBase {
  type: 'deleteSurface';
  surfaceId: string;
}

/**
 * User event from UI to agent
 */
export interface A2UIEventMessage extends A2UIMessageBase {
  type: 'event';
  surfaceId: string;
  eventName: string;
  payload?: Record<string, unknown>;
}

export type A2UIMessage =
  | CreateSurfaceMessage
  | UpdateComponentsMessage
  | UpdateDataMessage
  | DeleteSurfaceMessage
  | A2UIEventMessage;

// ============================================================
// SURFACE AND COMPONENT TYPES
// ============================================================

/**
 * A2UI Surface - container for components with its own data model
 */
export interface A2UISurface {
  id: string;
  catalogId?: string;
  components: Map<string, A2UIComponent>;
  rootComponentId: string;
}

/**
 * A2UI Component Definition
 */
export interface A2UIComponent {
  id: string;
  type: A2UIComponentType;
  props: A2UIComponentProps;
  children?: string[]; // IDs of child components
}

/**
 * All available A2UI component types
 */
export type A2UIComponentType =
  // Layout
  | 'Column'
  | 'Row'
  | 'Card'
  | 'Divider'
  | 'Spacer'
  // Typography
  | 'Text'
  | 'Heading'
  | 'Markdown'
  // Inputs
  | 'TextField'
  | 'TextArea'
  | 'Button'
  | 'ButtonGroup'
  | 'MultiSelect'
  | 'RadioGroup'
  | 'CheckboxGroup'
  | 'Select'
  | 'DatePicker'
  | 'Toggle'
  // Display
  | 'Icon'
  | 'Chip'
  | 'ChipGroup'
  | 'ProgressSpinner'
  | 'ProgressBar'
  | 'List'
  | 'LabelValue'
  | 'Accordion'
  | 'Table'
  | 'Image'
  // Custom Workflow Components
  | 'StatsRow'
  | 'CompanyInfoCard'
  | 'EmailPreviewCard'
  | 'EmailDraftsList'
  | 'StepProgress'
  | 'VariableForm';

/**
 * Component props - union of all possible prop types
 */
export type A2UIComponentProps = Record<string, unknown> & {
  // Common props
  className?: string;
  style?: React.CSSProperties;

  // Data binding
  dataRef?: string; // Reference to data model path like "/companies/0/name"

  // Event handlers (string event names that get sent back to agent)
  onPress?: string;
  onChange?: string;
  onSubmit?: string;
};

// ============================================================
// SPECIFIC COMPONENT PROP TYPES
// ============================================================

export interface ColumnProps {
  children: string[];
  gap?: number;
  padding?: number;
  alignment?: 'start' | 'center' | 'end' | 'stretch';
}

export interface RowProps {
  children: string[];
  gap?: number;
  alignment?: 'start' | 'center' | 'end' | 'space_between';
  wrap?: boolean;
}

export interface CardProps {
  children: string[];
  variant?: 'default' | 'outlined' | 'elevated';
}

export interface TextProps {
  text: string;
  style?:
    | 'body'
    | 'body_large'
    | 'body_secondary'
    | 'heading_small'
    | 'heading_medium'
    | 'heading_large'
    | 'label'
    | 'value'
    | 'emoji_large'
    | 'section_header'
    | 'step_title'
    | 'variable_name'
    | 'list_item_numbered';
  animate?: 'none' | 'pulse';
}

export interface TextFieldProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: string;
  required?: boolean;
  autoFocus?: boolean;
  type?: 'text' | 'email' | 'url' | 'number' | 'password';
  error?: string;
  disabled?: boolean;
}

export interface TextAreaProps extends Omit<TextFieldProps, 'type'> {
  rows?: number;
  maxLength?: number;
}

export interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  onPress: string;
}

export interface ButtonGroupProps {
  label?: string;
  options: { value: string; label: string; icon?: string }[];
  value: string;
  onChange: string;
}

export interface MultiSelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: string;
  maxSelections?: number;
}

export interface RadioGroupProps {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: string;
}

export interface CheckboxGroupProps {
  options: { value: string; label: string }[];
  value: string[];
  onChange: string;
}

export interface SelectProps {
  label?: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: string;
  placeholder?: string;
}

export interface IconProps {
  name: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  color?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';
}

export interface ChipProps {
  label: string;
  variant?: 'default' | 'info' | 'success' | 'warning' | 'error' | 'status';
  removable?: boolean;
  onRemove?: string;
}

export interface ChipGroupProps {
  chips: string[];
}

export interface ProgressSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

export interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'error';
}

export interface ListProps {
  items: unknown[];
  renderItem: string; // Component ID to render for each item
}

export interface LabelValueProps {
  label: string;
  value: string;
  copyable?: boolean;
}

export interface AccordionProps {
  sections: {
    id: string;
    title: string;
    content: string; // Component ID
    defaultOpen?: boolean;
  }[];
}

export interface TableProps {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, unknown>[];
}

// ============================================================
// CUSTOM WORKFLOW COMPONENT PROPS
// ============================================================

export interface StatsRowProps {
  stats: { label: string; value: string; icon?: string }[];
}

export interface CompanyInfoCardProps {
  name: string;
  description: string;
  funding?: string;
  employees?: string;
  recentNews?: { title: string; date: string; url?: string }[];
}

export interface EmailPreviewCardProps {
  subject: string;
  body: string;
  tone?: string;
  recipient?: string;
  editable?: boolean;
  onEdit?: string;
}

export interface EmailDraftsListProps {
  drafts: {
    id: string;
    recipient: string;
    subject: string;
    body: string;
    tone?: string;
  }[];
  onCopy: string;
  onOpenInGmail?: string;
}

export interface StepProgressProps {
  steps: {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
    durationMs?: number;
  }[];
  currentStepId?: string;
}

export interface VariableFormProps {
  variables: {
    key: string;
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
    options?: { value: string; label: string }[];
    placeholder?: string;
    helpText?: string;
  }[];
  values: Record<string, unknown>;
  errors: Record<string, string>;
  onChange: string;
  onSubmit: string;
}

// ============================================================
// DATA MODEL TYPES
// ============================================================

/**
 * Data model for a surface - can be any JSON structure
 */
export type A2UIDataModel = Record<string, unknown>;

/**
 * Data reference - points to a path in the data model
 */
export interface DataRef {
  dataRef: string;
}

/**
 * Check if a value is a data reference
 */
export function isDataRef(value: unknown): value is DataRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    'dataRef' in value &&
    typeof (value as DataRef).dataRef === 'string'
  );
}

// ============================================================
// RENDERER STATE TYPES
// ============================================================

/**
 * State for the A2UI renderer
 */
export interface A2UIRendererState {
  surfaces: Map<string, A2UISurface>;
  dataModels: Map<string, A2UIDataModel>;
  isStreaming: boolean;
  error: string | null;
}

/**
 * Event handler callback type
 */
export type A2UIEventHandler = (
  surfaceId: string,
  eventName: string,
  payload?: Record<string, unknown>
) => void;

// ============================================================
// STREAM CHUNK TYPES
// ============================================================

/**
 * A2UI stream chunk (received via SSE)
 */
export interface A2UIStreamChunk {
  type: 'a2ui';
  message: A2UIMessage;
}

/**
 * Check if a stream chunk is an A2UI message
 */
export function isA2UIChunk(chunk: unknown): chunk is A2UIStreamChunk {
  return (
    typeof chunk === 'object' &&
    chunk !== null &&
    (chunk as A2UIStreamChunk).type === 'a2ui'
  );
}
