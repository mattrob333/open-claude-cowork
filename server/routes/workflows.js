/**
 * Workflow API Routes
 *
 * REST endpoints for workflow CRUD operations and execution.
 * Supports both Supabase storage and in-memory fallback.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../lib/logger.js';
import workflowService from '../services/workflow-service.js';
import workflowExecutor from '../services/workflow-executor.js';
import {
  validateWorkflowCreate,
  validateWorkflowRun
} from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Legacy: Path to workflows JSON file (for backwards compatibility)
const workflowsPath = path.join(__dirname, '..', 'workflows.json');

// Legacy file-based functions for backwards compatibility
function loadWorkflows() {
  try {
    if (!fs.existsSync(workflowsPath)) {
      return { workflows: [] };
    }
    return JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));
  } catch (error) {
    logger.workflow.error({ error: error.message }, 'Error loading workflows');
    return { workflows: [] };
  }
}

function saveWorkflows(data) {
  try {
    fs.writeFileSync(workflowsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.workflow.error({ error: error.message }, 'Error saving workflows');
    throw error;
  }
}

// Helper to get user ID from request
function getUserId(req) {
  return req.headers['x-user-id'] || 'default';
}

// ============================================================
// WORKFLOW CRUD ENDPOINTS
// ============================================================

/**
 * GET /api/workflows - List all workflows for user
 */
router.get('/', async (req, res) => {
  const userId = getUserId(req);

  try {
    const options = {
      status: req.query.status,
      favoritesOnly: req.query.favorites === 'true',
      search: req.query.search,
      tags: req.query.tags ? req.query.tags.split(',') : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
    };

    const workflows = await workflowService.getWorkflows(userId, options);
    res.json({ workflows, total: workflows.length });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to list workflows');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/templates - Get workflow templates
 */
router.get('/templates', async (req, res) => {
  try {
    const options = {
      category: req.query.category,
      featured: req.query.featured === 'true',
    };

    const templates = await workflowService.getTemplates(options);
    res.json({ templates });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get templates');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/:id - Get single workflow
 */
router.get('/:id', async (req, res) => {
  const userId = getUserId(req);

  try {
    const workflow = await workflowService.getWorkflow(req.params.id, userId);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json(workflow);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get workflow');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows - Create new workflow
 */
router.post('/', async (req, res) => {
  const userId = getUserId(req);

  try {
    // Support both old format (systemPrompt) and new format (goldenInstructions)
    const workflowData = {
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      color: req.body.color,
      goldenInstructions: req.body.goldenInstructions || req.body.systemPrompt || '',
      steps: req.body.steps || [],
      variables: req.body.variables || [],
      outputConfig: req.body.outputConfig || { displayStyle: 'summary_card', actions: [] },
      sourceConversationId: req.body.sourceConversationId,
      tags: req.body.tags || [],
      status: req.body.status || 'active',
    };

    // Validate required fields
    if (!workflowData.name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const workflow = await workflowService.createWorkflow(workflowData, userId);
    res.status(201).json(workflow);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create workflow');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/from-template - Create workflow from template
 */
router.post('/from-template', async (req, res) => {
  const userId = getUserId(req);
  const { templateId, name, description } = req.body;

  try {
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const workflow = await workflowService.createFromTemplate(
      templateId,
      userId,
      { name, description }
    );

    res.status(201).json(workflow);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create from template');
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/workflows/:id - Update workflow
 */
router.put('/:id', async (req, res) => {
  const userId = getUserId(req);

  try {
    const updates = {};
    const allowedFields = [
      'name', 'description', 'icon', 'color', 'goldenInstructions',
      'steps', 'variables', 'outputConfig', 'isFavorite', 'status', 'tags'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Support legacy systemPrompt field
    if (req.body.systemPrompt !== undefined && !updates.goldenInstructions) {
      updates.goldenInstructions = req.body.systemPrompt;
    }

    const workflow = await workflowService.updateWorkflow(req.params.id, updates, userId);
    res.json(workflow);
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    logger.error({ error: error.message }, 'Failed to update workflow');
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/workflows/:id - Delete workflow
 */
router.delete('/:id', async (req, res) => {
  const userId = getUserId(req);

  try {
    await workflowService.deleteWorkflow(req.params.id, userId);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Workflow not found') {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    logger.error({ error: error.message }, 'Failed to delete workflow');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/favorite - Toggle favorite
 */
router.post('/:id/favorite', async (req, res) => {
  const userId = getUserId(req);

  try {
    const workflow = await workflowService.getWorkflow(req.params.id, userId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    const updated = await workflowService.updateWorkflow(req.params.id, {
      isFavorite: !workflow.isFavorite
    }, userId);

    res.json(updated);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to toggle favorite');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/duplicate - Duplicate a workflow
 */
router.post('/:id/duplicate', async (req, res) => {
  const userId = getUserId(req);

  try {
    const workflow = await workflowService.getWorkflow(req.params.id, userId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Create a copy with modified name
    const copy = await workflowService.createWorkflow({
      ...workflow,
      name: `${workflow.name} (Copy)`,
      sourceConversationId: undefined,
    }, userId);

    res.status(201).json(copy);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to duplicate workflow');
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// WORKFLOW RUN ENDPOINTS
// ============================================================

/**
 * GET /api/workflows/:id/runs - Get run history
 */
router.get('/:id/runs', async (req, res) => {
  const userId = getUserId(req);

  try {
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
    };

    const runs = await workflowService.getWorkflowRuns(req.params.id, userId, options);
    res.json({ runs, total: runs.length });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get runs');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/:id/run - Start workflow execution (creates a run)
 *
 * Note: Actual execution with SSE streaming is handled by a separate endpoint
 * that integrates with the Claude provider. This endpoint creates the run record.
 */
router.post('/:id/run', async (req, res) => {
  const userId = getUserId(req);
  const { variables } = req.body;

  try {
    // Verify workflow exists
    const workflow = await workflowService.getWorkflow(req.params.id, userId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Validate required variables
    const missingVars = (workflow.variables || [])
      .filter(v => v.required && !variables?.[v.key])
      .map(v => v.name);

    if (missingVars.length > 0) {
      return res.status(400).json({
        error: 'Missing required variables',
        missing: missingVars
      });
    }

    // Create run record
    const run = await workflowService.createRun(req.params.id, variables || {}, userId);

    res.status(201).json({
      run,
      workflow,
      message: 'Run created. Use /api/workflows/execute to start execution with SSE.'
    });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to create run');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/runs/:runId - Get a specific run
 */
router.get('/runs/:runId', async (req, res) => {
  try {
    const run = await workflowService.getRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json(run);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get run');
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/workflows/runs/:runId/cancel - Cancel a running workflow
 */
router.post('/runs/:runId/cancel', async (req, res) => {
  try {
    const run = await workflowService.getRun(req.params.runId);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    if (run.status !== 'running' && run.status !== 'paused') {
      return res.status(400).json({ error: 'Run is not active' });
    }

    const updated = await workflowService.updateRun(req.params.runId, {
      status: 'cancelled',
      completedAt: new Date().toISOString(),
    });

    res.json(updated);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to cancel run');
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// EXECUTION ENDPOINT (SSE Streaming)
// ============================================================

/**
 * GET /api/workflows/:id/execute - Execute a workflow with SSE streaming
 *
 * Uses GET for EventSource compatibility. Variables are passed via query params.
 * This endpoint streams progress events to the client as the workflow executes.
 */
router.get('/:id/execute', async (req, res) => {
  const userId = getUserId(req);
  const workflowId = req.params.id;
  const variables = req.query.variables ? JSON.parse(req.query.variables) : {};
  // Accept workflow from query params for localStorage-based workflows
  const clientWorkflow = req.query.workflow ? JSON.parse(req.query.workflow) : null;

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Create SSE writer helper
  const sseWriter = {
    write: (eventType, data) => {
      res.write(`data: ${JSON.stringify({ type: eventType, ...data })}\n\n`);
    },
    close: () => {
      res.end();
    }
  };

  // Handle client disconnect
  req.on('close', () => {
    logger.info({ workflowId }, 'Client disconnected from workflow execution');
  });

  try {
    // Execute the workflow (pass clientWorkflow for localStorage-based workflows)
    await workflowExecutor.execute(workflowId, variables, sseWriter, clientWorkflow);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Failed to execute workflow');
    sseWriter.write('run_error', { error: error.message });
    sseWriter.close();
  }
});

/**
 * POST /api/workflows/execute - Execute a workflow with SSE streaming (alternative)
 *
 * POST endpoint for cases where query params are not sufficient.
 * Note: EventSource doesn't support POST, so this requires a different client approach.
 */
router.post('/execute', async (req, res) => {
  const userId = getUserId(req);
  const { workflowId, variables } = req.body;

  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId is required' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // Create SSE writer helper
  const sseWriter = {
    write: (eventType, data) => {
      res.write(`data: ${JSON.stringify({ type: eventType, ...data })}\n\n`);
    },
    close: () => {
      res.end();
    }
  };

  // Handle client disconnect
  req.on('close', () => {
    logger.info({ workflowId }, 'Client disconnected from workflow execution');
  });

  try {
    // Execute the workflow
    await workflowExecutor.execute(workflowId, variables || {}, sseWriter);
  } catch (error) {
    logger.error({ error: error.message, workflowId }, 'Failed to execute workflow');
    sseWriter.write('run_error', { error: error.message });
    sseWriter.close();
  }
});

/**
 * POST /api/workflows/runs/:runId/resume - Resume a paused execution
 */
router.post('/runs/:runId/resume', async (req, res) => {
  try {
    workflowExecutor.resumeExecution(req.params.runId);
    res.json({ success: true, message: 'Execution resumed' });
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to resume execution');
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/workflows/runs/:runId/status - Get execution status
 */
router.get('/runs/:runId/status', async (req, res) => {
  try {
    const status = workflowExecutor.getExecutionStatus(req.params.runId);
    if (!status) {
      // Check database for completed runs
      const run = await workflowService.getRun(req.params.runId);
      if (run) {
        return res.json({
          runId: run.id,
          status: run.status,
          isActive: false,
        });
      }
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(status);
  } catch (error) {
    logger.error({ error: error.message }, 'Failed to get execution status');
    res.status(500).json({ error: error.message });
  }
});

// Export the router and legacy functions for backwards compatibility
export default router;
export { loadWorkflows, saveWorkflows };
