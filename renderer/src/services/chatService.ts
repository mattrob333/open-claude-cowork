import { SERVER_URL } from '../constants';
import { StreamChunk } from '../types';

// Generate a short 2-3 word title for a chat session
export async function generateSessionTitle(userMessage: string, assistantResponse: string): Promise<string> {
  try {
    const response = await fetch(`${SERVER_URL}/api/generate-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userMessage, assistantResponse })
    });
    if (!response.ok) {
      throw new Error('Failed to generate title');
    }
    const data = await response.json();
    return data.title || 'New Chat';
  } catch (error) {
    console.error('Error generating title:', error);
    // Fallback: use first few words of user message
    const words = userMessage.split(' ').slice(0, 3).join(' ');
    return words.length > 25 ? words.substring(0, 25) + '...' : words;
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  documentIds?: string[];
  ephemeralContext?: string;
  activeSkillIds?: string[];
  personalContext?: string;
  workflowPrompt?: string;
  history?: ChatMessage[];  // Conversation history for context
}

export async function* streamChat(
  message: string,
  chatId: string,
  provider: string,
  model: string | null,
  options?: ChatOptions
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      chatId,
      provider,
      model,
      documentIds: options?.documentIds,
      ephemeralContext: options?.ephemeralContext,
      activeSkillIds: options?.activeSkillIds,
      personalContext: options?.personalContext,
      workflowPrompt: options?.workflowPrompt,
      history: options?.history
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamChunk;
          yield data;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }

  // Process remaining buffer
  if (buffer.startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.slice(6)) as StreamChunk;
      yield data;
    } catch {
      // Skip invalid JSON
    }
  }
}

export async function getProviders(): Promise<{ providers: string[]; default: string }> {
  try {
    const response = await fetch(`${SERVER_URL}/api/providers`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[chatService] Error fetching providers:', error);
    return { providers: ['claude'], default: 'claude' };
  }
}

export async function getWorkflows(): Promise<unknown[]> {
  try {
    const response = await fetch(`${SERVER_URL}/api/workflows`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('[chatService] Error fetching workflows:', error);
    return [];
  }
}

export async function saveWorkflow(workflow: {
  name: string;
  description: string;
  systemPrompt: string;
  variables: Array<{ name: string; label: string; type: string; placeholder?: string; options?: string[]; required?: boolean }>;
  icon?: string;
  usedServices?: string[];
}): Promise<unknown> {
  const response = await fetch(`${SERVER_URL}/api/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workflow)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

export async function* runWorkflow(
  workflowId: string,
  variables: Record<string, string>,
  provider: string,
  model: string | null,
  workflow?: unknown  // Pass full workflow object for localStorage-based workflows
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${SERVER_URL}/api/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId, variables, provider, model, workflow })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6)) as StreamChunk;
          yield data;
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function checkHealth(): Promise<{ status: string; timestamp: string; providers: string[] }> {
  const response = await fetch(`${SERVER_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

// Document API types
export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  uploadedAt: number;
  processedAt: number | null;
  chunksCount: number;
  error?: string;
}

export interface DocumentListResponse {
  documents: DocumentInfo[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Upload a document to the server
 */
export async function uploadDocument(file: File, userId?: string): Promise<DocumentInfo> {
  const formData = new FormData();
  formData.append('file', file);
  if (userId) {
    formData.append('userId', userId);
  }

  const response = await fetch(`${SERVER_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get list of all documents
 */
export async function getDocuments(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<DocumentListResponse> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const url = params.toString()
    ? `${SERVER_URL}/api/documents?${params}`
    : `${SERVER_URL}/api/documents`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get a single document by ID
 */
export async function getDocument(id: string): Promise<DocumentInfo> {
  const response = await fetch(`${SERVER_URL}/api/documents/${id}`);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get a signed URL for viewing/downloading a document
 */
export async function getDocumentUrl(id: string, expiresIn = 3600): Promise<{ url: string; expiresIn: number }> {
  const response = await fetch(`${SERVER_URL}/api/documents/${id}/url?expiresIn=${expiresIn}`);

  if (!response.ok) {
    if (response.status === 501) {
      throw new Error('Document URLs require Supabase storage to be configured');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<{ success: boolean; id: string }> {
  const response = await fetch(`${SERVER_URL}/api/documents/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}
