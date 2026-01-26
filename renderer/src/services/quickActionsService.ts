/**
 * Quick Actions Service
 * 
 * API client for quick actions CRUD operations.
 */

import { SERVER_URL } from '../constants';

export interface QuickAction {
  id: string;
  user_id: string;
  title: string;
  description: string;
  system_prompt: string;
  tools_used: string[];
  category: 'comms' | 'operations' | 'admin' | 'growth' | 'insights';
  created_at: string;
  updated_at: string;
}

export interface ExtractedQuickAction {
  title: string;
  description: string;
  system_prompt: string;
  tools_used: string[];
  category: string;
  conversation_summary: string;
}

/**
 * Get all quick actions for the current user
 */
export async function getQuickActions(category?: string): Promise<QuickAction[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);

  const url = params.toString()
    ? `${SERVER_URL}/api/quick-actions?${params}`
    : `${SERVER_URL}/api/quick-actions`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch quick actions: ${response.status}`);
  }

  const data = await response.json();
  return data.quickActions || [];
}

/**
 * Get a single quick action by ID
 */
export async function getQuickAction(id: string): Promise<QuickAction> {
  const response = await fetch(`${SERVER_URL}/api/quick-actions/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch quick action: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a new quick action
 */
export async function createQuickAction(quickAction: {
  title: string;
  description?: string;
  system_prompt: string;
  tools_used?: string[];
  category?: string;
}): Promise<QuickAction> {
  const response = await fetch(`${SERVER_URL}/api/quick-actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quickAction),
  });

  if (!response.ok) {
    throw new Error(`Failed to create quick action: ${response.status}`);
  }

  return response.json();
}

/**
 * Update a quick action
 */
export async function updateQuickAction(
  id: string,
  updates: Partial<QuickAction>
): Promise<QuickAction> {
  const response = await fetch(`${SERVER_URL}/api/quick-actions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update quick action: ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a quick action
 */
export async function deleteQuickAction(id: string): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/quick-actions/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete quick action: ${response.status}`);
  }
}

/**
 * Extract a quick action from a chat thread
 */
export async function extractQuickAction(
  messages: Array<{ role: string; content: string }>,
  toolsUsed: string[]
): Promise<ExtractedQuickAction> {
  const response = await fetch(`${SERVER_URL}/api/quick-actions/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, tools_used: toolsUsed }),
  });

  if (!response.ok) {
    throw new Error(`Failed to extract quick action: ${response.status}`);
  }

  return response.json();
}
