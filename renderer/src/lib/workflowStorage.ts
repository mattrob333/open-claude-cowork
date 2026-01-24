/**
 * Workflow Storage Utility
 *
 * Handles saving and loading workflows from localStorage.
 * Can be upgraded to Supabase when auth is configured.
 */

import { Workflow } from '../types/workflow';

const STORAGE_KEY = 'saved_workflows';

/**
 * Get all saved workflows
 */
export function getWorkflows(): Workflow[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading workflows:', error);
    return [];
  }
}

/**
 * Save a new workflow
 */
export function saveWorkflow(workflow: Workflow): void {
  try {
    const existing = getWorkflows();
    existing.push(workflow);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Dispatch event so sidebar updates immediately
    window.dispatchEvent(new CustomEvent('workflow-created', { detail: workflow }));
  } catch (error) {
    console.error('Error saving workflow:', error);
    throw error;
  }
}

/**
 * Update an existing workflow
 */
export function updateWorkflow(id: string, updates: Partial<Workflow>): void {
  try {
    const existing = getWorkflows();
    const index = existing.findIndex(w => w.id === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
      window.dispatchEvent(new CustomEvent('workflow-updated', { detail: existing[index] }));
    }
  } catch (error) {
    console.error('Error updating workflow:', error);
    throw error;
  }
}

/**
 * Delete a workflow
 */
export function deleteWorkflow(id: string): void {
  try {
    const existing = getWorkflows().filter(w => w.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('workflow-deleted', { detail: { id } }));
  } catch (error) {
    console.error('Error deleting workflow:', error);
    throw error;
  }
}

/**
 * Get a single workflow by ID
 */
export function getWorkflowById(id: string): Workflow | undefined {
  return getWorkflows().find(w => w.id === id);
}

/**
 * Toggle workflow favorite status
 */
export function toggleFavorite(id: string): void {
  const workflow = getWorkflowById(id);
  if (workflow) {
    updateWorkflow(id, { isFavorite: !workflow.isFavorite });
  }
}
