import { SERVER_URL } from '../constants';
import { StreamChunk } from '../types';

export async function* streamChat(
  message: string,
  chatId: string,
  provider: string,
  model: string | null
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${SERVER_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, chatId, provider, model })
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
  model: string | null
): AsyncGenerator<StreamChunk> {
  const response = await fetch(`${SERVER_URL}/api/workflows/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflowId, variables, provider, model })
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
