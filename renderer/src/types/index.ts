
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
  artifactMetadata?: {
    title: string;
    type: string;
    language?: string;
  };
}

export interface Session {
  id: string;
  title: string;
  lastActive: number;
}

export interface ToolLogEntry {
  id: string;
  toolUseId?: string; // The tool_use_id from the API for matching tool_result
  name: string;
  args: any;
  result?: any;
  status: 'running' | 'done' | 'error';
  timestamp: number;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
}

export interface KnowledgeAsset {
  id: string;
  name: string;
  type: string;
  size?: string;
  isActive: boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  icon: string;
}
