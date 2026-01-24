/**
 * Email Templates API Routes
 *
 * REST endpoints for email template CRUD operations.
 * Stores templates in local JSON file for simplicity.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import logger from '../lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Path to email templates JSON file
const templatesPath = path.join(__dirname, '..', 'email-templates.json');

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Load templates from JSON file
 */
function loadTemplates() {
  try {
    if (!fs.existsSync(templatesPath)) {
      return { templates: [] };
    }
    return JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  } catch (error) {
    logger.error({ error: error.message }, 'Error loading email templates');
    return { templates: [] };
  }
}

/**
 * Save templates to JSON file
 */
function saveTemplates(data) {
  try {
    fs.writeFileSync(templatesPath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.error({ error: error.message }, 'Error saving email templates');
    throw error;
  }
}

// ============================================================
// ROUTES
// ============================================================

/**
 * GET /api/email-templates - List all email templates
 */
router.get('/', (req, res) => {
  try {
    const data = loadTemplates();
    res.json({ templates: data.templates || [] });
  } catch (error) {
    logger.error({ error: error.message }, 'Error listing email templates');
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

/**
 * GET /api/email-templates/:id - Get a specific template
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadTemplates();
    const template = data.templates.find(t => t.id === id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    logger.error({ error: error.message }, 'Error getting email template');
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * POST /api/email-templates - Create a new template
 */
router.post('/', (req, res) => {
  try {
    const { name, subject, body } = req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: 'Name and subject are required' });
    }

    const data = loadTemplates();
    const now = new Date().toISOString();

    const newTemplate = {
      id: uuidv4(),
      name,
      subject,
      body: body || '',
      createdAt: now,
      updatedAt: now
    };

    data.templates.push(newTemplate);
    saveTemplates(data);

    logger.info({ templateId: newTemplate.id, name }, 'Email template created');
    res.status(201).json({ template: newTemplate });
  } catch (error) {
    logger.error({ error: error.message }, 'Error creating email template');
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * PUT /api/email-templates/:id - Update a template
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;

    const data = loadTemplates();
    const index = data.templates.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedTemplate = {
      ...data.templates[index],
      ...(name && { name }),
      ...(subject && { subject }),
      ...(body !== undefined && { body }),
      updatedAt: new Date().toISOString()
    };

    data.templates[index] = updatedTemplate;
    saveTemplates(data);

    logger.info({ templateId: id }, 'Email template updated');
    res.json({ template: updatedTemplate });
  } catch (error) {
    logger.error({ error: error.message }, 'Error updating email template');
    res.status(500).json({ error: 'Failed to update template' });
  }
});

/**
 * DELETE /api/email-templates/:id - Delete a template
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadTemplates();
    const index = data.templates.findIndex(t => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }

    data.templates.splice(index, 1);
    saveTemplates(data);

    logger.info({ templateId: id }, 'Email template deleted');
    res.json({ success: true });
  } catch (error) {
    logger.error({ error: error.message }, 'Error deleting email template');
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;
