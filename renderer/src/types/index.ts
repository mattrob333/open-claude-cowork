export enum Role {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isArtifact?: boolean;
  artifactMetadata?: ArtifactMetadata;
  // A2UI support for workflow capture artifacts
  isA2UI?: boolean;
  a2uiType?: 'workflow_capture_golden' | 'workflow_capture_variables' | 'workflow_capture_output' | 'workflow_capture_preview';
  a2uiData?: WorkflowCaptureData;
}

// Data for workflow capture A2UI artifacts
export interface WorkflowCaptureData {
  // For golden instructions artifact
  suggestedName?: string;
  suggestedIcon?: string;
  suggestedDescription?: string;
  goldenInstructions?: string;
  steps?: { name: string; description: string; tools: string[] }[];
  estimatedRuntime?: string;
  // For variables artifact
  variables?: {
    key: string;
    name: string;
    type: string;
    required: boolean;
    defaultValue?: unknown;
    options?: { value: string; label: string }[];
    usedInSteps: string[];
    exampleValue?: string;
  }[];
  // For output config artifact
  outputStyle?: 'summary_card' | 'detailed_report' | 'minimal';
  suggestedActions?: { id: string; label: string; icon: string; type: string }[];
  // For preview/final save
  workflowPreview?: {
    name: string;
    description: string;
    icon: string;
    stepCount: number;
    variableCount: number;
  };
}

export interface ArtifactMetadata {
  title: string;
  type: string;
  language?: string;
}

export interface Session {
  id: string;
  title: string;
  lastActive: number;
}

// Tool-related types
export interface ToolArgs {
  [key: string]: string | number | boolean | null | undefined | ToolArgs | ToolArgs[];
}

export interface ToolLogEntry {
  id: string;
  toolUseId?: string; // The tool_use_id from the API for matching tool_result
  name: string;
  args: ToolArgs;
  result?: string;
  status: 'running' | 'done' | 'error';
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: ToolArgs;
}

export interface ToolResult {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// Stream chunk types for SSE
export type StreamChunkType =
  | 'connected'
  | 'status'
  | 'session_init'
  | 'text'
  | 'tool_use'
  | 'tool_result'
  | 'skills_active'
  | 'error'
  | 'done';

export interface BaseStreamChunk {
  type: StreamChunkType;
}

export interface ConnectedChunk extends BaseStreamChunk {
  type: 'connected';
  message: string;
}

export interface StatusChunk extends BaseStreamChunk {
  type: 'status';
  message: string;
}

export interface SessionInitChunk extends BaseStreamChunk {
  type: 'session_init';
  session_id: string;
}

export interface TextChunk extends BaseStreamChunk {
  type: 'text';
  content: string;
}

export interface ToolUseChunk extends BaseStreamChunk {
  type: 'tool_use';
  id?: string;
  tool_use_id?: string;
  name: string;
  input?: ToolArgs;
}

export interface ToolResultChunk extends BaseStreamChunk {
  type: 'tool_result';
  id?: string;
  tool_use_id?: string;
  result?: string;
  content?: string;
}

export interface ErrorChunk extends BaseStreamChunk {
  type: 'error';
  message: string;
}

export interface DoneChunk extends BaseStreamChunk {
  type: 'done';
}

export interface SkillsActiveChunk extends BaseStreamChunk {
  type: 'skills_active';
  skills: Array<{ id: string; name: string }>;
}

export type StreamChunk =
  | ConnectedChunk
  | StatusChunk
  | SessionInitChunk
  | TextChunk
  | ToolUseChunk
  | ToolResultChunk
  | SkillsActiveChunk
  | ErrorChunk
  | DoneChunk;

// Chat types
export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  provider?: string;
  model?: string;
}

// Model types
export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

// Knowledge base types
export interface KnowledgeAsset {
  id: string;
  name: string;
  type: string;
  size?: string;
  isActive: boolean;
}

// Ephemeral document for session context (not persisted)
export interface EphemeralDocument {
  id: string;
  name: string;
  type: string;
  content: string;          // Extracted text content
  isActive: boolean;        // Include in current chat context
  addedAt: number;          // Timestamp when added
  expiresAt?: number;       // Optional auto-cleanup timestamp
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'txt' | 'md' | 'json' | 'csv' | string;
  size: number;
  uploadedAt: number;
  processedAt?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error?: string;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata?: Record<string, string | number>;
  embedding?: number[];
}

// Workflow types
export interface WorkflowVariable {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
  systemPrompt?: string;
  variables?: WorkflowVariable[];
  createdAt?: number;
  usedServices?: string[];  // Services used by this workflow (e.g., ['gmail', 'slack'])
}

// Alias for WorkflowTemplate for backwards compatibility
export type Workflow = WorkflowTemplate;

// API response types
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  providers: string[];
  services?: {
    docling?: 'healthy' | 'unhealthy' | 'unknown';
    database?: 'healthy' | 'unhealthy' | 'unknown';
  };
}

export interface ProvidersResponse {
  providers: string[];
  default: string;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  version: string;
  author?: string;
  content?: string;  // Full markdown content (only when fetching single skill)
  filePath?: string;
  isActive: boolean;
  source: 'user' | 'project' | 'plugin' | 'builtin';
}

export interface SkillsResponse {
  skills: Skill[];
  total: number;
}

export interface SkillActiveEvent {
  type: 'skills_active';
  skills: Array<{ id: string; name: string }>;
}
