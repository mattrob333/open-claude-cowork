/**
 * Workflow Service
 *
 * Handles CRUD operations for workflows using Supabase.
 * Manages workflow storage, retrieval, and run history.
 */

import { createClient } from '@supabase/supabase-js';
import logger from '../lib/logger.js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

function getSupabase() {
  if (!supabase && supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// In-memory fallback for development without Supabase
const memoryStore = {
  workflows: new Map(),
  runs: new Map(),
  templates: new Map(),
};

/**
 * Convert database row to camelCase workflow object
 */
function dbToWorkflow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || '',
    icon: row.icon || '📋',
    color: row.color,
    goldenInstructions: row.golden_instructions,
    steps: row.steps || [],
    variables: row.variables || [],
    outputConfig: row.output_config || { displayStyle: 'summary_card', actions: [] },
    sourceConversationId: row.source_conversation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRunAt: row.last_run_at,
    runCount: row.run_count || 0,
    averageRunTimeMs: row.average_run_time_ms,
    isFavorite: row.is_favorite || false,
    folderId: row.folder_id,
    tags: row.tags || [],
    status: row.status || 'active',
  };
}

/**
 * Convert camelCase workflow to database row
 */
function workflowToDb(workflow) {
  const row = {};
  if (workflow.name !== undefined) row.name = workflow.name;
  if (workflow.description !== undefined) row.description = workflow.description;
  if (workflow.icon !== undefined) row.icon = workflow.icon;
  if (workflow.color !== undefined) row.color = workflow.color;
  if (workflow.goldenInstructions !== undefined) row.golden_instructions = workflow.goldenInstructions;
  if (workflow.steps !== undefined) row.steps = workflow.steps;
  if (workflow.variables !== undefined) row.variables = workflow.variables;
  if (workflow.outputConfig !== undefined) row.output_config = workflow.outputConfig;
  if (workflow.sourceConversationId !== undefined) row.source_conversation_id = workflow.sourceConversationId;
  if (workflow.isFavorite !== undefined) row.is_favorite = workflow.isFavorite;
  if (workflow.folderId !== undefined) row.folder_id = workflow.folderId;
  if (workflow.tags !== undefined) row.tags = workflow.tags;
  if (workflow.status !== undefined) row.status = workflow.status;
  return row;
}

/**
 * Convert database row to camelCase run object
 */
function dbToRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    workflowId: row.workflow_id,
    userId: row.user_id,
    variables: row.variables || {},
    status: row.status || 'pending',
    currentStepId: row.current_step_id,
    stepResults: row.step_results || [],
    output: row.output,
    outputFormat: row.output_format,
    error: row.error,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms,
  };
}

// ============================================================
// WORKFLOW CRUD OPERATIONS
// ============================================================

/**
 * Get all workflows for a user
 */
export async function getWorkflows(userId, options = {}) {
  const client = getSupabase();

  if (!client) {
    // Fallback to in-memory store
    const workflows = Array.from(memoryStore.workflows.values())
      .filter(w => w.userId === userId);
    return workflows;
  }

  try {
    let query = client
      .from('workflows')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }
    if (options.favoritesOnly) {
      query = query.eq('is_favorite', true);
    }
    if (options.folderId) {
      query = query.eq('folder_id', options.folderId);
    }
    if (options.tags && options.tags.length > 0) {
      query = query.contains('tags', options.tags);
    }
    if (options.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // Order by updated_at desc by default
    query = query.order('updated_at', { ascending: false });

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ error: error.message }, 'Failed to fetch workflows');
      throw error;
    }

    return (data || []).map(dbToWorkflow);
  } catch (error) {
    logger.error({ error: error.message }, 'Error in getWorkflows');
    throw error;
  }
}

/**
 * Get a single workflow by ID
 * @param {string} workflowId - The workflow ID
 * @param {string} [userId] - Optional user ID for ownership check
 */
export async function getWorkflow(workflowId, userId) {
  const client = getSupabase();

  if (!client) {
    const workflow = memoryStore.workflows.get(workflowId);
    // If userId provided, check ownership; otherwise just return the workflow
    if (workflow && (!userId || workflow.userId === userId)) {
      return workflow;
    }
    return null;
  }

  try {
    let query = client
      .from('workflows')
      .select('*')
      .eq('id', workflowId);

    // If userId provided, filter by it
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    return dbToWorkflow(data);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Error in getWorkflow');
    throw error;
  }
}

/**
 * Create a new workflow
 */
export async function createWorkflow(workflowData, userId) {
  const client = getSupabase();

  const workflow = {
    user_id: userId,
    name: workflowData.name,
    description: workflowData.description || '',
    icon: workflowData.icon || '📋',
    color: workflowData.color,
    golden_instructions: workflowData.goldenInstructions,
    steps: workflowData.steps || [],
    variables: workflowData.variables || [],
    output_config: workflowData.outputConfig || { displayStyle: 'summary_card', actions: [] },
    source_conversation_id: workflowData.sourceConversationId,
    tags: workflowData.tags || [],
    status: workflowData.status || 'active',
  };

  if (!client) {
    // Fallback to in-memory store
    const id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created = {
      ...dbToWorkflow({ ...workflow, id }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memoryStore.workflows.set(id, created);
    logger.info({ workflowId: id }, 'Workflow created (in-memory)');
    return created;
  }

  try {
    const { data, error } = await client
      .from('workflows')
      .insert(workflow)
      .select()
      .single();

    if (error) {
      logger.error({ error: error.message }, 'Failed to create workflow');
      throw error;
    }

    logger.info({ workflowId: data.id }, 'Workflow created');
    return dbToWorkflow(data);
  } catch (error) {
    logger.error({ error: error.message }, 'Error in createWorkflow');
    throw error;
  }
}

/**
 * Update an existing workflow
 * @param {string} workflowId - The workflow ID
 * @param {Object} updates - Fields to update
 * @param {string} [userId] - Optional user ID for ownership check
 */
export async function updateWorkflow(workflowId, updates, userId) {
  const client = getSupabase();

  if (!client) {
    const existing = memoryStore.workflows.get(workflowId);
    if (!existing || (userId && existing.userId !== userId)) {
      throw new Error('Workflow not found');
    }
    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    memoryStore.workflows.set(workflowId, updated);
    return updated;
  }

  try {
    const dbUpdates = workflowToDb(updates);

    let query = client
      .from('workflows')
      .update(dbUpdates)
      .eq('id', workflowId);

    // If userId provided, filter by it
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Workflow not found');
      }
      throw error;
    }

    logger.info({ workflowId }, 'Workflow updated');
    return dbToWorkflow(data);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Error in updateWorkflow');
    throw error;
  }
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId, userId) {
  const client = getSupabase();

  if (!client) {
    const existing = memoryStore.workflows.get(workflowId);
    if (!existing || existing.userId !== userId) {
      throw new Error('Workflow not found');
    }
    memoryStore.workflows.delete(workflowId);
    return { success: true };
  }

  try {
    const { error } = await client
      .from('workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    logger.info({ workflowId }, 'Workflow deleted');
    return { success: true };
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Error in deleteWorkflow');
    throw error;
  }
}

// ============================================================
// WORKFLOW RUN OPERATIONS
// ============================================================

/**
 * Create a new workflow run
 */
export async function createRun(workflowId, variables, userId) {
  const client = getSupabase();

  const run = {
    workflow_id: workflowId,
    user_id: userId,
    variables: variables || {},
    status: 'pending',
    step_results: [],
  };

  if (!client) {
    const id = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const created = {
      ...dbToRun({ ...run, id }),
      startedAt: new Date().toISOString(),
    };
    memoryStore.runs.set(id, created);
    return created;
  }

  try {
    const { data, error } = await client
      .from('workflow_runs')
      .insert(run)
      .select()
      .single();

    if (error) {
      throw error;
    }

    logger.info({ runId: data.id, workflowId }, 'Workflow run created');
    return dbToRun(data);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Error in createRun');
    throw error;
  }
}

/**
 * Update a workflow run
 */
export async function updateRun(runId, updates) {
  const client = getSupabase();

  if (!client) {
    const existing = memoryStore.runs.get(runId);
    if (!existing) {
      throw new Error('Run not found');
    }
    const updated = { ...existing, ...updates };
    memoryStore.runs.set(runId, updated);
    return updated;
  }

  try {
    const dbUpdates = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.currentStepId !== undefined) dbUpdates.current_step_id = updates.currentStepId;
    if (updates.stepResults !== undefined) dbUpdates.step_results = updates.stepResults;
    if (updates.output !== undefined) dbUpdates.output = updates.output;
    if (updates.outputFormat !== undefined) dbUpdates.output_format = updates.outputFormat;
    if (updates.error !== undefined) dbUpdates.error = updates.error;
    if (updates.completedAt !== undefined) dbUpdates.completed_at = updates.completedAt;
    if (updates.durationMs !== undefined) dbUpdates.duration_ms = updates.durationMs;

    const { data, error } = await client
      .from('workflow_runs')
      .update(dbUpdates)
      .eq('id', runId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return dbToRun(data);
  } catch (error) {
    logger.error({ error: error.message, runId }, 'Error in updateRun');
    throw error;
  }
}

/**
 * Get run history for a workflow
 */
export async function getWorkflowRuns(workflowId, userId, options = {}) {
  const client = getSupabase();

  if (!client) {
    const runs = Array.from(memoryStore.runs.values())
      .filter(r => r.workflowId === workflowId && r.userId === userId)
      .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    return runs;
  }

  try {
    let query = client
      .from('workflow_runs')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []).map(dbToRun);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Error in getWorkflowRuns');
    throw error;
  }
}

/**
 * Get a single run by ID
 */
export async function getRun(runId) {
  const client = getSupabase();

  if (!client) {
    return memoryStore.runs.get(runId) || null;
  }

  try {
    const { data, error } = await client
      .from('workflow_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return dbToRun(data);
  } catch (error) {
    logger.error({ error: error.message, runId }, 'Error in getRun');
    throw error;
  }
}

// ============================================================
// WORKFLOW TEMPLATES
// ============================================================

/**
 * Get all workflow templates
 */
export async function getTemplates(options = {}) {
  const client = getSupabase();

  if (!client) {
    return Array.from(memoryStore.templates.values());
  }

  try {
    let query = client
      .from('workflow_templates')
      .select('*');

    if (options.category) {
      query = query.eq('category', options.category);
    }
    if (options.featured) {
      query = query.eq('is_featured', true);
    }

    query = query.order('use_count', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    logger.error({ error: error.message }, 'Error in getTemplates');
    throw error;
  }
}

/**
 * Create workflow from template
 */
export async function createFromTemplate(templateId, userId, overrides = {}) {
  const client = getSupabase();

  // Get template
  let template;
  if (!client) {
    template = memoryStore.templates.get(templateId);
  } else {
    const { data, error } = await client
      .from('workflow_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      throw new Error('Template not found');
    }
    template = data;
  }

  if (!template) {
    throw new Error('Template not found');
  }

  // Create workflow from template
  const workflowData = {
    ...template.template_data,
    ...overrides,
    name: overrides.name || template.name,
    description: overrides.description || template.description,
    icon: template.icon,
  };

  const workflow = await createWorkflow(workflowData, userId);

  // Increment template use count
  if (client) {
    await client.rpc('increment_template_use_count', { template_id: templateId });
  }

  return workflow;
}

// ============================================================
// EXPORT
// ============================================================

export default {
  getWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  createRun,
  updateRun,
  getWorkflowRuns,
  getRun,
  getTemplates,
  createFromTemplate,
};
