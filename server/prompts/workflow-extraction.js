/**
 * Workflow Extraction Prompts
 *
 * System prompts for extracting workflows from conversations
 * and executing saved workflows.
 */

/**
 * System prompt for extracting a workflow from a conversation
 */
export const WORKFLOW_EXTRACTION_SYSTEM_PROMPT = `
You are a workflow extraction assistant. Your job is to analyze conversations and extract reusable workflows.

When the user triggers "Save as Workflow", you will:

1. Analyze the conversation to identify the "golden path" - the core instructions that led to the successful outcome

2. Present the extracted workflow as an A2UI artifact with:
   - Suggested name
   - Suggested icon (emoji)
   - Brief description
   - Step-by-step instructions
   - Tools that were used
   - Estimated runtime

3. Wait for user approval or edits

4. After approval, identify variables - things that would change each time the workflow runs:
   - Look for specific names, companies, dates, etc. that were mentioned
   - Determine appropriate input types (text, select, date, etc.)
   - Suggest sensible defaults

5. Present variables as a second A2UI artifact

6. After approval, suggest output configuration:
   - Display style (summary, detailed, minimal)
   - Actions (copy, email, save to Notion)

7. After final approval, save the workflow

Important guidelines:
- Be concise in your step extraction - focus on the essential instructions
- Identify 3-7 steps typically
- Variables should be things the user would actually want to change
- Don't over-engineer - keep it simple
- The workflow should be reusable for similar tasks

## A2UI Response Format

When presenting the workflow extraction, emit an A2UI surface with interactive components:

\`\`\`json
{
  "type": "createSurface",
  "surfaceId": "workflow_extraction",
  "rootComponent": {
    "id": "root",
    "type": "Column",
    "props": {
      "gap": 16,
      "children": ["header", "instructions", "steps", "actions"]
    }
  }
}
\`\`\`

Follow with updateData to populate the content.
`;

/**
 * System prompt for executing a saved workflow
 */
export const WORKFLOW_EXECUTION_SYSTEM_PROMPT = `
You are executing a saved workflow. Follow the golden instructions exactly.

For each step:
1. Read the step instructions
2. Use the available tools as needed
3. Provide clear, structured output
4. If the step has a checkpoint, pause and wait for user approval

Current workflow: {{workflow_name}}

Golden Instructions:
{{golden_instructions}}

Variables provided:
{{variables_json}}

Execute step by step. Show progress. Be thorough but efficient.

## Output Format

When executing, emit A2UI surfaces to show progress:

1. Start with a StepProgress component showing all steps
2. Update step status as you proceed
3. Show intermediate results using appropriate components
4. At checkpoints, show action buttons and wait
5. On completion, show the final output with action buttons
`;

/**
 * Generate the extraction prompt with conversation context
 * @param {Array} messages - Conversation messages
 * @returns {string} Complete extraction prompt
 */
export function generateExtractionPrompt(messages) {
  const conversationSummary = messages
    .map(m => `[${m.role}]: ${m.content.substring(0, 500)}${m.content.length > 500 ? '...' : ''}`)
    .join('\n');

  return `
${WORKFLOW_EXTRACTION_SYSTEM_PROMPT}

## Conversation to Extract From

${conversationSummary}

---

Now analyze this conversation and extract the workflow. Start by presenting the suggested name, icon, and step-by-step instructions as an A2UI artifact.
`;
}

/**
 * Generate the execution prompt for a workflow
 * @param {Object} workflow - The workflow to execute
 * @param {Object} variables - Variable values provided by user
 * @returns {string} Complete execution prompt
 */
export function generateExecutionPrompt(workflow, variables) {
  const variablesJson = JSON.stringify(variables, null, 2);

  let prompt = WORKFLOW_EXECUTION_SYSTEM_PROMPT
    .replace('{{workflow_name}}', workflow.name)
    .replace('{{golden_instructions}}', workflow.goldenInstructions)
    .replace('{{variables_json}}', variablesJson);

  // Add step details
  if (workflow.steps && workflow.steps.length > 0) {
    prompt += '\n\n## Steps to Execute\n\n';
    workflow.steps.forEach((step, index) => {
      prompt += `### Step ${index + 1}: ${step.name}\n`;
      prompt += `${step.prompt}\n`;
      if (step.tools && step.tools.length > 0) {
        prompt += `Tools: ${step.tools.join(', ')}\n`;
      }
      if (step.uiConfig?.checkpoint?.enabled) {
        prompt += `⏸️ Checkpoint: Wait for user approval before proceeding\n`;
      }
      prompt += '\n';
    });
  }

  return prompt;
}

/**
 * Parse an extraction response into workflow structure
 * @param {string} response - The agent's response
 * @returns {Object|null} Extracted workflow data or null
 */
export function parseExtractionResponse(response) {
  try {
    // Look for JSON blocks in the response
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse the whole response as JSON
    return JSON.parse(response);
  } catch {
    return null;
  }
}

export default {
  WORKFLOW_EXTRACTION_SYSTEM_PROMPT,
  WORKFLOW_EXECUTION_SYSTEM_PROMPT,
  generateExtractionPrompt,
  generateExecutionPrompt,
  parseExtractionResponse,
};
