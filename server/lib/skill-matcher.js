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
 * Build a compact skills manifest for the agent to reason about
 * @param {Skill[]} availableSkills - All available skills
 * @param {Set<string>} activeIds - Set of active skill IDs
 * @returns {string}
 */
function buildSkillsManifest(availableSkills, activeIds) {
  if (!availableSkills || availableSkills.length === 0) {
    return '';
  }

  const skillEntries = availableSkills.map(skill => {
    const isActive = activeIds.has(skill.id);
    const status = isActive ? ' [ACTIVE]' : '';
    const triggers = skill.triggers.length > 0 ? ` (triggers: ${skill.triggers.slice(0, 3).join(', ')})` : '';
    return `- ${skill.id}${status}: ${skill.description}${triggers}`;
  }).join('\n');

  return `<skills-manifest>
You have access to the following skills. Skills provide specialized instructions and methodologies.

${skillEntries}

To use a skill that isn't active, you can mention it to the user or incorporate its approach if you know it's relevant to their request. Active skills have their full instructions loaded below.
</skills-manifest>`;
}

/**
 * Workflow System Instructions
 * Included in system prompt to guide AI on workflow saving behavior
 */
const WORKFLOW_SYSTEM_INSTRUCTIONS = `<workflow-system>
## Workflow Saving

When the user asks to save a workflow, OR when you receive a message containing "WORKFLOW_EXTRACTION_REQUEST", you should:

1. Analyze the conversation to understand what was accomplished
2. Generate ALL of the following yourself (do NOT ask the user):
   - name: A short, catchy name (2-4 words)
   - icon: An appropriate emoji
   - description: One sentence explaining what it does
   - steps: 3-7 clear steps describing the process
   - tools: List of integrations/tools used (e.g., "google_calendar", "web_search")
   - goldenInstructions: The complete prompt/instructions to reproduce this workflow

3. Return your response with the following JSON structure embedded at the end:

\`\`\`json:workflow_approval
{
  "name": "Morning Briefing",
  "icon": "🌅",
  "description": "Daily briefing with calendar, tasks, and priorities",
  "steps": [
    {"name": "Fetch Calendar", "description": "Get today's calendar events", "tools": ["google_calendar"]},
    {"name": "Review Tasks", "description": "Check pending tasks and deadlines", "tools": ["task_manager"]},
    {"name": "Generate Summary", "description": "Create prioritized daily briefing", "tools": []}
  ],
  "tools": ["google_calendar", "task_manager"],
  "goldenInstructions": "You are a personal assistant helping create a morning briefing. First, fetch today's calendar events..."
}
\`\`\`

IMPORTANT:
- Generate the name and description yourself based on the conversation
- Do NOT ask the user "what would you like to name it?" - you decide everything
- Do NOT create Python files or JSON files on disk
- The workflow is saved when the user clicks Approve in the UI

## Auto-Detect Workflow Opportunities

After completing a multi-step task that used 2+ tools, consider suggesting to save it as a workflow.
Add a suggestion at the end of your response:

\`\`\`json:workflow_suggestion
{
  "suggestedName": "Begin the Day",
  "icon": "🌅"
}
\`\`\`

This will render as a button the user can click to trigger the full workflow extraction flow.
</workflow-system>`;

/**
 * Build enhanced system prompt with skills and document context
 * @param {string | null} basePrompt - Base system prompt
 * @param {Skill[]} activeSkills - Active skills to inject (full content)
 * @param {string | null} documentContext - Document context from knowledge base
 * @param {Skill[]} [availableSkills] - All available skills (for manifest)
 * @param {string | null} [personalContext] - User's personal context
 * @returns {string}
 */
export function buildSystemPromptWithSkills(basePrompt, activeSkills, documentContext, availableSkills = null, personalContext = null) {
  const parts = [];

  // 1. Add personal context first (most important for personalization)
  if (personalContext && personalContext.trim()) {
    parts.push(`<personal-context>
The following is important context about the user. Use this to personalize your responses and understand their preferences, background, and communication style:

${personalContext}
</personal-context>`);
  }

  // 2. Add base system prompt if provided
  if (basePrompt && basePrompt.trim()) {
    parts.push(basePrompt);
  }

  // 3. Add workflow system instructions
  parts.push(WORKFLOW_SYSTEM_INSTRUCTIONS);

  // 3. Add skills manifest (all available skills)
  if (availableSkills && availableSkills.length > 0) {
    const activeIds = new Set((activeSkills || []).map(s => s.id));
    const manifest = buildSkillsManifest(availableSkills, activeIds);
    if (manifest) {
      parts.push(manifest);
    }
  }

  // 4. Add document context if provided
  if (documentContext && documentContext.trim()) {
    parts.push(documentContext);
  }

  // 5. Add active skills (full content)
  if (activeSkills && activeSkills.length > 0) {
    const skillsSection = activeSkills.map(skill => {
      const metadata = [];
      if (skill.version) metadata.push(`version="${skill.version}"`);
      if (skill.author) metadata.push(`author="${skill.author}"`);
      const metaStr = metadata.length > 0 ? ` ${metadata.join(' ')}` : '';

      return `<skill name="${skill.name}" id="${skill.id}"${metaStr}>\n${skill.content}\n</skill>`;
    }).join('\n\n');

    parts.push(`<active-skills>\nThe following skills are active. Follow their instructions when relevant:\n\n${skillsSection}\n</active-skills>`);
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
