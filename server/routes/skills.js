import { Router } from 'express';
import { loadSkills, getSkillById, saveSkill, deleteSkill } from '../lib/skill-loader.js';
import logger from '../lib/logger.js';

const router = Router();

/**
 * GET /api/skills
 * Get all available skills
 */
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    const skills = await loadSkills(userId);

    // Return skills with minimal info for listing
    const skillList = skills.map(skill => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      triggers: skill.triggers,
      version: skill.version,
      author: skill.author,
      source: skill.source,
      isActive: skill.isActive
    }));

    res.json({ skills: skillList, total: skillList.length });
  } catch (error) {
    logger.server.error({ error: error.message }, 'Error loading skills');
    res.status(500).json({ error: 'Failed to load skills' });
  }
});

/**
 * GET /api/skills/:skillId
 * Get a single skill by ID (includes full content)
 */
router.get('/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { userId } = req.query;

    const skill = await getSkillById(skillId, userId);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({ skill });
  } catch (error) {
    logger.server.error({ error: error.message, skillId: req.params.skillId }, 'Error loading skill');
    res.status(500).json({ error: 'Failed to load skill' });
  }
});

/**
 * GET /api/skills/:skillId/content
 * Get only the content of a skill (for preview)
 */
router.get('/:skillId/content', async (req, res) => {
  try {
    const { skillId } = req.params;
    const { userId } = req.query;

    const skill = await getSkillById(skillId, userId);

    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    res.json({
      id: skill.id,
      name: skill.name,
      content: skill.content
    });
  } catch (error) {
    logger.server.error({ error: error.message, skillId: req.params.skillId }, 'Error loading skill content');
    res.status(500).json({ error: 'Failed to load skill content' });
  }
});

/**
 * POST /api/skills
 * Create a new skill (saves to user skills directory)
 */
router.post('/', async (req, res) => {
  try {
    const { id, name, description, triggers, version, author, content } = req.body;

    // Validate required fields
    if (!id || !name || !content) {
      return res.status(400).json({
        error: 'Missing required fields: id, name, and content are required'
      });
    }

    // Validate id format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      return res.status(400).json({
        error: 'Invalid skill ID. Use only letters, numbers, hyphens, and underscores.'
      });
    }

    const skill = await saveSkill({
      id,
      name,
      description,
      triggers,
      version,
      author,
      content
    });

    if (!skill) {
      return res.status(500).json({ error: 'Failed to save skill' });
    }

    logger.server.info({ skillId: id }, 'Skill created via API');
    res.status(201).json({ skill });
  } catch (error) {
    logger.server.error({ error: error.message }, 'Error creating skill');
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

/**
 * DELETE /api/skills/:skillId
 * Delete a user skill
 */
router.delete('/:skillId', async (req, res) => {
  try {
    const { skillId } = req.params;

    // Check if skill exists and is a user skill
    const skill = await getSkillById(skillId);
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    if (skill.source !== 'user') {
      return res.status(403).json({
        error: 'Cannot delete non-user skills. Only user-created skills can be deleted.'
      });
    }

    const deleted = await deleteSkill(skillId);
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete skill' });
    }

    logger.server.info({ skillId }, 'Skill deleted via API');
    res.json({ success: true, message: `Skill "${skillId}" deleted` });
  } catch (error) {
    logger.server.error({ error: error.message, skillId: req.params.skillId }, 'Error deleting skill');
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

export default router;
