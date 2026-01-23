import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../lib/logger.js';
import {
  validateWorkflowCreate,
  validateWorkflowRun
} from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Path to workflows JSON file
const workflowsPath = path.join(__dirname, '..', 'workflows.json');

// Load workflows from file
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

// Save workflows to file
function saveWorkflows(data) {
  try {
    fs.writeFileSync(workflowsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.workflow.error({ error: error.message }, 'Error saving workflows');
    throw error;
  }
}

// GET /api/workflows - List all workflows
router.get('/', (_req, res) => {
  const data = loadWorkflows();
  res.json(data.workflows);
});

// GET /api/workflows/:id - Get a specific workflow
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const data = loadWorkflows();
  const workflow = data.workflows.find(w => w.id === id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
});

// POST /api/workflows - Create a new workflow
router.post('/', validateWorkflowCreate, (req, res) => {
  const { name, description, systemPrompt, variables, icon } = req.body;

  const data = loadWorkflows();
  const workflow = {
    id: `wf_${Date.now()}`,
    name,
    description: description || '',
    systemPrompt,
    variables: variables || [],
    icon: icon || 'chat',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  data.workflows.push(workflow);
  saveWorkflows(data);
  logger.workflow.info({ workflowId: workflow.id, name: workflow.name }, 'Workflow created');

  res.status(201).json(workflow);
});

// PUT /api/workflows/:id - Update a workflow
router.put('/:id', validateWorkflowCreate, (req, res) => {
  const { id } = req.params;
  const { name, description, systemPrompt, variables, icon } = req.body;

  const data = loadWorkflows();
  const index = data.workflows.findIndex(w => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const workflow = {
    ...data.workflows[index],
    name,
    description: description || '',
    systemPrompt,
    variables: variables || [],
    icon: icon || 'chat',
    updatedAt: Date.now()
  };

  data.workflows[index] = workflow;
  saveWorkflows(data);
  logger.workflow.info({ workflowId: workflow.id, name: workflow.name }, 'Workflow updated');

  res.json(workflow);
});

// DELETE /api/workflows/:id - Delete a workflow
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const data = loadWorkflows();
  const index = data.workflows.findIndex(w => w.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const [deleted] = data.workflows.splice(index, 1);
  saveWorkflows(data);
  logger.workflow.info({ workflowId: id, name: deleted.name }, 'Workflow deleted');

  res.json({ success: true, deleted });
});

// Export the router and the run handler (which needs provider access)
export default router;
export { loadWorkflows, saveWorkflows };
