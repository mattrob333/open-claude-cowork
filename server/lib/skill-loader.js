import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import os from 'os';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} Skill
 * @property {string} id - Derived from folder name
 * @property {string} name - From frontmatter
 * @property {string} description - From frontmatter
 * @property {string[]} triggers - Keywords that activate skill
 * @property {string} version
 * @property {string} [author]
 * @property {string} content - Full markdown content (without frontmatter)
 * @property {string} filePath - Source location
 * @property {boolean} isActive - Currently enabled
 * @property {'user' | 'project' | 'plugin' | 'builtin'} source
 */

/**
 * Parse a SKILL.md file and extract metadata and content
 * @param {string} filePath - Path to the SKILL.md file
 * @param {'user' | 'project' | 'plugin' | 'builtin'} source - Source type
 * @returns {Skill | null}
 */
export function parseSkillFile(filePath, source) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(fileContent);

    // Validate required fields
    if (!frontmatter.name) {
      logger.server.warn({ filePath }, 'Skill missing required "name" in frontmatter');
      return null;
    }

    const skillId = path.basename(path.dirname(filePath));

    return {
      id: skillId,
      name: frontmatter.name,
      description: frontmatter.description || '',
      triggers: Array.isArray(frontmatter.triggers) ? frontmatter.triggers : [],
      version: frontmatter.version || '1.0.0',
      author: frontmatter.author,
      content: body.trim(),
      filePath,
      isActive: false,
      source
    };
  } catch (error) {
    logger.server.error({ filePath, error: error.message }, 'Error parsing skill file');
    return null;
  }
}

/**
 * Load skills from a directory containing skill folders
 * @param {string} basePath - Base directory path
 * @param {'user' | 'project' | 'plugin' | 'builtin'} source - Source type
 * @returns {Promise<Skill[]>}
 */
async function loadSkillsFromDirectory(basePath, source) {
  const skills = [];

  try {
    if (!fs.existsSync(basePath)) {
      return skills;
    }

    const entries = fs.readdirSync(basePath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(basePath, entry.name, 'SKILL.md');
        const skill = parseSkillFile(skillPath, source);
        if (skill) {
          skills.push(skill);
          logger.server.debug({ skillId: skill.id, source }, 'Loaded skill');
        }
      }
    }
  } catch (error) {
    logger.server.error({ basePath, source, error: error.message }, 'Error loading skills from directory');
  }

  return skills;
}

/**
 * Load built-in skills from server/skills/
 * @returns {Promise<Skill[]>}
 */
export async function loadBuiltinSkills() {
  const builtinPath = path.join(__dirname, '..', 'skills');
  return loadSkillsFromDirectory(builtinPath, 'builtin');
}

/**
 * Load project skills from .claude/skills/ in the current working directory
 * @param {string} [projectDir] - Project directory (defaults to cwd)
 * @returns {Promise<Skill[]>}
 */
export async function loadProjectSkills(projectDir = process.cwd()) {
  const projectPath = path.join(projectDir, '.claude', 'skills');
  return loadSkillsFromDirectory(projectPath, 'project');
}

/**
 * Load user skills from ~/.claude/skills/
 * @param {string} [userId] - User ID (not currently used, reserved for future)
 * @returns {Promise<Skill[]>}
 */
export async function loadUserSkills(userId) {
  const homeDir = os.homedir();
  const userPath = path.join(homeDir, '.claude', 'skills');
  return loadSkillsFromDirectory(userPath, 'user');
}

/**
 * Deduplicate skills by name, keeping the later source (higher priority)
 * Priority: user > project > plugin > builtin
 * @param {Skill[]} skills - Array of skills
 * @returns {Skill[]}
 */
function deduplicateByName(skills) {
  const skillMap = new Map();

  for (const skill of skills) {
    // Later skills override earlier ones (user overrides project overrides builtin)
    skillMap.set(skill.id, skill);
  }

  return Array.from(skillMap.values());
}

/**
 * Load all skills from all sources in priority order
 * Discovery order: builtin < plugin < project < user
 * @param {string} [userId] - User ID for user-specific skills
 * @returns {Promise<Skill[]>}
 */
export async function loadSkills(userId) {
  const allSkills = [];

  // Load in priority order (lowest to highest)
  // Later sources override earlier ones
  const builtinSkills = await loadBuiltinSkills();
  allSkills.push(...builtinSkills);

  // Plugin skills would go here in the future
  // const pluginSkills = await loadPluginSkills();
  // allSkills.push(...pluginSkills);

  const projectSkills = await loadProjectSkills();
  allSkills.push(...projectSkills);

  const userSkills = await loadUserSkills(userId);
  allSkills.push(...userSkills);

  const deduped = deduplicateByName(allSkills);

  logger.server.info({
    total: deduped.length,
    builtin: builtinSkills.length,
    project: projectSkills.length,
    user: userSkills.length
  }, 'Skills loaded');

  return deduped;
}

/**
 * Get a single skill by ID
 * @param {string} skillId - The skill ID
 * @param {string} [userId] - User ID for user-specific skills
 * @returns {Promise<Skill | null>}
 */
export async function getSkillById(skillId, userId) {
  const skills = await loadSkills(userId);
  return skills.find(s => s.id === skillId) || null;
}

/**
 * Save a skill to the user skills directory
 * @param {Object} skillData - Skill data to save
 * @param {string} skillData.id - Skill ID (used as folder name)
 * @param {string} skillData.name - Skill name
 * @param {string} skillData.description - Skill description
 * @param {string[]} [skillData.triggers] - Trigger keywords
 * @param {string} [skillData.version] - Version number
 * @param {string} [skillData.author] - Author name
 * @param {string} skillData.content - Skill markdown content
 * @returns {Promise<Skill>}
 */
export async function saveSkill(skillData) {
  const homeDir = os.homedir();
  const skillsDir = path.join(homeDir, '.claude', 'skills');
  const skillDir = path.join(skillsDir, skillData.id);
  const skillPath = path.join(skillDir, 'SKILL.md');

  // Create directories if they don't exist
  if (!fs.existsSync(skillsDir)) {
    fs.mkdirSync(skillsDir, { recursive: true });
  }
  if (!fs.existsSync(skillDir)) {
    fs.mkdirSync(skillDir, { recursive: true });
  }

  // Build frontmatter
  const frontmatter = {
    name: skillData.name,
    description: skillData.description || '',
    triggers: skillData.triggers || [],
    version: skillData.version || '1.0.0',
  };
  if (skillData.author) {
    frontmatter.author = skillData.author;
  }

  // Build the SKILL.md content
  const yamlContent = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) return `${key}: []`;
        return `${key}:\n${value.map(v => `  - "${v}"`).join('\n')}`;
      }
      return `${key}: "${value}"`;
    })
    .join('\n');

  const fileContent = `---\n${yamlContent}\n---\n\n${skillData.content}`;

  // Write the file
  fs.writeFileSync(skillPath, fileContent, 'utf-8');

  logger.server.info({ skillId: skillData.id }, 'Skill saved');

  // Return the parsed skill
  return parseSkillFile(skillPath, 'user');
}

/**
 * Delete a user skill
 * @param {string} skillId - The skill ID to delete
 * @returns {Promise<boolean>} - True if deleted, false if not found
 */
export async function deleteSkill(skillId) {
  const homeDir = os.homedir();
  const skillDir = path.join(homeDir, '.claude', 'skills', skillId);

  if (!fs.existsSync(skillDir)) {
    return false;
  }

  // Only delete user skills (not builtin/project)
  const skillPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) {
    return false;
  }

  // Remove the skill directory
  fs.rmSync(skillDir, { recursive: true, force: true });
  logger.server.info({ skillId }, 'Skill deleted');

  return true;
}

export default {
  loadSkills,
  loadBuiltinSkills,
  loadProjectSkills,
  loadUserSkills,
  parseSkillFile,
  getSkillById,
  saveSkill,
  deleteSkill
};
