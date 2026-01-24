import logger from './logger.js';

/**
 * @typedef {import('./skill-loader.js').Skill} Skill
 */

/**
 * Match skills to a user message based on triggers and explicit invocation
 * @param {string} message - User message
 * @param {Skill[]} availableSkills - All available skills
 * @param {string[]} [activeSkillIds] - Already active skill IDs
 * @returns {Skill[]}
 */
export function matchSkills(message, availableSkills, activeSkillIds = []) {
  const matched = [];
  const matchedIds = new Set();
  const lowerMessage = message.toLowerCase();

  // 1. Check for explicit invocation: /skill-name
  const explicitMatch = message.match(/^\/([a-zA-Z0-9_-]+)/);
  if (explicitMatch) {
    const skillId = explicitMatch[1].toLowerCase();
    const skill = availableSkills.find(s => s.id.toLowerCase() === skillId);
    if (skill && !matchedIds.has(skill.id)) {
      matched.push(skill);
      matchedIds.add(skill.id);
      logger.server.debug({ skillId: skill.id }, 'Skill matched via explicit invocation');
    }
  }

  // 2. Add already active skills (maintain session continuity)
  for (const activeId of activeSkillIds) {
    const skill = availableSkills.find(s => s.id === activeId);
    if (skill && !matchedIds.has(skill.id)) {
      matched.push(skill);
      matchedIds.add(skill.id);
    }
  }

  // 3. Check keyword triggers in message
  for (const skill of availableSkills) {
    if (matchedIds.has(skill.id)) continue;

    for (const trigger of skill.triggers) {
      if (lowerMessage.includes(trigger.toLowerCase())) {
        matched.push(skill);
        matchedIds.add(skill.id);
        logger.server.debug({ skillId: skill.id, trigger }, 'Skill matched via trigger');
        break; // Only match once per skill
      }
    }
  }

  return matched;
}

/**
 * Deduplicate skills by ID
 * @param {Skill[]} skills - Array of skills
 * @returns {Skill[]}
 */
export function deduplicateById(skills) {
  const seen = new Set();
  return skills.filter(skill => {
    if (seen.has(skill.id)) return false;
    seen.add(skill.id);
    return true;
  });
}

/**
 * Build enhanced system prompt with skills and document context
 * @param {string | null} basePrompt - Base system prompt
 * @param {Skill[]} skills - Active skills to inject
 * @param {string | null} documentContext - Document context from knowledge base
 * @returns {string}
 */
export function buildSystemPromptWithSkills(basePrompt, skills, documentContext) {
  const parts = [];

  // 1. Add base system prompt if provided
  if (basePrompt && basePrompt.trim()) {
    parts.push(basePrompt);
  }

  // 2. Add document context if provided
  if (documentContext && documentContext.trim()) {
    parts.push(documentContext);
  }

  // 3. Add active skills
  if (skills && skills.length > 0) {
    const skillsSection = skills.map(skill => {
      const metadata = [];
      if (skill.version) metadata.push(`version="${skill.version}"`);
      if (skill.author) metadata.push(`author="${skill.author}"`);
      const metaStr = metadata.length > 0 ? ` ${metadata.join(' ')}` : '';

      return `<skill name="${skill.name}" id="${skill.id}"${metaStr}>\n${skill.content}\n</skill>`;
    }).join('\n\n');

    parts.push(`<active-skills>\nThe following skills are active for this conversation. Follow their instructions when relevant:\n\n${skillsSection}\n</active-skills>`);
  }

  return parts.join('\n\n');
}

/**
 * Extract skill IDs from a message (for /skill-name invocation)
 * @param {string} message - User message
 * @returns {string[]} - Array of skill IDs mentioned
 */
export function extractSkillInvocations(message) {
  const invocations = [];
  const regex = /\/([a-zA-Z0-9_-]+)/g;
  let match;

  while ((match = regex.exec(message)) !== null) {
    invocations.push(match[1].toLowerCase());
  }

  return invocations;
}

/**
 * Strip skill invocations from message (to pass clean message to AI)
 * @param {string} message - User message with potential /skill invocations
 * @returns {string} - Clean message
 */
export function stripSkillInvocations(message) {
  // Remove /skill-name at the start of message
  return message.replace(/^\/[a-zA-Z0-9_-]+\s*/, '').trim();
}

export default {
  matchSkills,
  deduplicateById,
  buildSystemPromptWithSkills,
  extractSkillInvocations,
  stripSkillInvocations
};
