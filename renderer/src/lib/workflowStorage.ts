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

// ============================================================
// DEFAULT WORKFLOW SEEDING
// ============================================================

const ONBOARDING_SEEDED_KEY = 'onboarding_workflow_seeded';
const START_HERE_WORKFLOW_ID = 'wf_system_start_here';

/**
 * The default "Start Here" onboarding workflow
 */
const START_HERE_WORKFLOW: Workflow = {
  id: START_HERE_WORKFLOW_ID,
  userId: 'system',
  name: 'Start Here',
  description: 'Quick setup to get the most out of your AI co-worker',
  icon: '🚀',
  status: 'active',
  goldenInstructions: `Guide the user through a friendly onboarding experience using A2UI components.

## Flow

1. **Welcome** - Show WelcomeHero component
   - Warm greeting, brief explanation of what we'll do
   - "Let's Go" and "Skip for now" buttons

2. **Connect Tools** - Show ToolGrid component
   - Display tools: Gmail, Slack, Notion, Google Calendar, SharePoint, 
     Firecrawl, Exa Search, GitHub, Google Sheets, Google Slides,
     Fireflies, Zoho CRM, HubSpot, Salesforce, Pipedrive
   - Let user select which to connect
   - On "Connect Selected", initiate OAuth for each

3. **Connection Progress** - Show ConnectionProgress component
   - Live updates as each tool connects
   - Handle failures gracefully with retry option

4. **Personal Context** - Show PersonalContextForm component
   - Ask: "What's your role?" (text input)
   - Ask: "What do you do most often?" (multi-select chips)
   - Ask: "Anything else I should know?" (textarea)

5. **Save Context** - Compile answers into markdown, save to user profile

6. **Complete** - Show OnboardingComplete component
   - Summary of what was set up
   - 3 suggested first prompts they can try
   - "Start Chatting" button

## Tone
Be warm, encouraging, efficient. Like chatting with a helpful friend.`,
  steps: [
    { 
      id: 'welcome', 
      name: 'Welcome', 
      order: 1,
      prompt: 'Show WelcomeHero component to greet the user',
      tools: [],
      uiConfig: { showProgress: false, displayResult: { type: 'custom', customComponent: 'WelcomeHero', showIntermediate: false } }
    },
    { 
      id: 'tools', 
      name: 'Connect Tools', 
      order: 2,
      prompt: 'Show ToolGrid component for tool selection',
      tools: ['composio'],
      uiConfig: { showProgress: true, progressMessage: 'Connecting tools...', displayResult: { type: 'custom', customComponent: 'ToolGrid', showIntermediate: true } }
    },
    { 
      id: 'context', 
      name: 'Personal Context', 
      order: 3,
      prompt: 'Show PersonalContextForm to gather user information',
      tools: [],
      uiConfig: { showProgress: false, displayResult: { type: 'custom', customComponent: 'PersonalContextForm', showIntermediate: false } }
    },
    { 
      id: 'complete', 
      name: 'All Done', 
      order: 4,
      prompt: 'Show OnboardingComplete with summary and suggestions',
      tools: [],
      uiConfig: { showProgress: false, displayResult: { type: 'custom', customComponent: 'OnboardingComplete', showIntermediate: false } }
    }
  ],
  variables: [],
  outputConfig: {
    displayStyle: 'minimal',
    actions: []
  },
  tags: ['onboarding', 'system'],
  runCount: 0,
  isFavorite: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Check if onboarding has been completed
 */
export function isOnboardingComplete(): boolean {
  return localStorage.getItem('onboarding_completed') === 'true';
}

/**
 * Mark onboarding as complete
 */
export function markOnboardingComplete(): void {
  localStorage.setItem('onboarding_completed', 'true');
  // Optionally remove the Start Here workflow or just unfavorite it
  const workflow = getWorkflowById(START_HERE_WORKFLOW_ID);
  if (workflow) {
    updateWorkflow(START_HERE_WORKFLOW_ID, { isFavorite: false });
  }
}

/**
 * Seed default workflows on first run
 * DISABLED: Start Here workflow removed - using OnboardingModal instead
 */
export function seedDefaultWorkflows(): boolean {
  // Remove any existing Start Here workflow
  const existing = getWorkflowById(START_HERE_WORKFLOW_ID);
  if (existing) {
    deleteWorkflow(START_HERE_WORKFLOW_ID);
    console.log('🗑️ Removed old "Start Here" workflow');
  }
  return false;
}

/**
 * Get the Start Here workflow ID
 */
export function getStartHereWorkflowId(): string {
  return START_HERE_WORKFLOW_ID;
}
