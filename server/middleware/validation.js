/**
 * Input validation middleware for API endpoints
 * Task 0.2: Security - Input Validation
 */

// Maximum sizes
const MAX_MESSAGE_LENGTH = 50000; // 50KB text limit
const MAX_CHAT_ID_LENGTH = 100;
const MAX_USER_ID_LENGTH = 100;
const MAX_PROVIDER_LENGTH = 50;
const MAX_MODEL_LENGTH = 100;
const MAX_WORKFLOW_NAME_LENGTH = 200;
const MAX_SYSTEM_PROMPT_LENGTH = 100000; // 100KB for system prompts

// Regex patterns
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SAFE_STRING_PATTERN = /^[\x20-\x7E\n\r\t\u00A0-\uFFFF]*$/; // Printable ASCII + Unicode

/**
 * Validate chat request body
 */
export function validateChatRequest(req, res, next) {
  const { message, chatId, userId, provider, model } = req.body;

  // Message is required and must be a non-empty string
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Message must be a string' });
  }
  if (message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(413).json({
      error: `Message too large. Maximum ${MAX_MESSAGE_LENGTH} characters allowed`
    });
  }

  // ChatId validation (optional but must be valid format if present)
  if (chatId !== undefined && chatId !== null) {
    if (typeof chatId !== 'string') {
      return res.status(400).json({ error: 'chatId must be a string' });
    }
    if (chatId.length > MAX_CHAT_ID_LENGTH) {
      return res.status(400).json({ error: 'chatId too long' });
    }
    if (chatId.length > 0 && !SAFE_ID_PATTERN.test(chatId)) {
      return res.status(400).json({ error: 'chatId contains invalid characters' });
    }
  }

  // UserId validation (optional but must be valid format if present)
  if (userId !== undefined && userId !== null) {
    if (typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId must be a string' });
    }
    if (userId.length > MAX_USER_ID_LENGTH) {
      return res.status(400).json({ error: 'userId too long' });
    }
    if (userId.length > 0 && !SAFE_ID_PATTERN.test(userId)) {
      return res.status(400).json({ error: 'userId contains invalid characters' });
    }
  }

  // Provider validation (optional)
  if (provider !== undefined && provider !== null) {
    if (typeof provider !== 'string') {
      return res.status(400).json({ error: 'provider must be a string' });
    }
    if (provider.length > MAX_PROVIDER_LENGTH) {
      return res.status(400).json({ error: 'provider name too long' });
    }
  }

  // Model validation (optional)
  if (model !== undefined && model !== null) {
    if (typeof model !== 'string') {
      return res.status(400).json({ error: 'model must be a string' });
    }
    if (model.length > MAX_MODEL_LENGTH) {
      return res.status(400).json({ error: 'model name too long' });
    }
  }

  next();
}

/**
 * Validate workflow creation request
 */
export function validateWorkflowCreate(req, res, next) {
  const { name, description, systemPrompt, variables, icon } = req.body;

  // Name is required
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (typeof name !== 'string') {
    return res.status(400).json({ error: 'Name must be a string' });
  }
  if (name.trim().length === 0) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }
  if (name.length > MAX_WORKFLOW_NAME_LENGTH) {
    return res.status(400).json({ error: 'Name too long' });
  }

  // SystemPrompt is required
  if (!systemPrompt) {
    return res.status(400).json({ error: 'systemPrompt is required' });
  }
  if (typeof systemPrompt !== 'string') {
    return res.status(400).json({ error: 'systemPrompt must be a string' });
  }
  if (systemPrompt.trim().length === 0) {
    return res.status(400).json({ error: 'systemPrompt cannot be empty' });
  }
  if (systemPrompt.length > MAX_SYSTEM_PROMPT_LENGTH) {
    return res.status(413).json({
      error: `systemPrompt too large. Maximum ${MAX_SYSTEM_PROMPT_LENGTH} characters allowed`
    });
  }

  // Description (optional)
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string' });
    }
    if (description.length > MAX_WORKFLOW_NAME_LENGTH) {
      return res.status(400).json({ error: 'description too long' });
    }
  }

  // Variables (optional array)
  if (variables !== undefined && variables !== null) {
    if (!Array.isArray(variables)) {
      return res.status(400).json({ error: 'variables must be an array' });
    }
    if (variables.length > 50) {
      return res.status(400).json({ error: 'Too many variables (max 50)' });
    }
    for (const v of variables) {
      if (typeof v !== 'string' && typeof v !== 'object') {
        return res.status(400).json({ error: 'Each variable must be a string or object' });
      }
    }
  }

  // Icon (optional)
  if (icon !== undefined && icon !== null) {
    if (typeof icon !== 'string') {
      return res.status(400).json({ error: 'icon must be a string' });
    }
    if (icon.length > 50) {
      return res.status(400).json({ error: 'icon name too long' });
    }
  }

  next();
}

/**
 * Validate workflow run request
 */
export function validateWorkflowRun(req, res, next) {
  const { workflowId, variables, provider, model, userId } = req.body;

  // WorkflowId is required
  if (!workflowId) {
    return res.status(400).json({ error: 'workflowId is required' });
  }
  if (typeof workflowId !== 'string') {
    return res.status(400).json({ error: 'workflowId must be a string' });
  }
  if (!SAFE_ID_PATTERN.test(workflowId)) {
    return res.status(400).json({ error: 'workflowId contains invalid characters' });
  }

  // Variables (optional object)
  if (variables !== undefined && variables !== null) {
    if (typeof variables !== 'object' || Array.isArray(variables)) {
      return res.status(400).json({ error: 'variables must be an object' });
    }
    const keys = Object.keys(variables);
    if (keys.length > 50) {
      return res.status(400).json({ error: 'Too many variables (max 50)' });
    }
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
        return res.status(400).json({ error: `Variable "${key}" has invalid type` });
      }
    }
  }

  // Provider validation (optional)
  if (provider !== undefined && provider !== null) {
    if (typeof provider !== 'string') {
      return res.status(400).json({ error: 'provider must be a string' });
    }
    if (provider.length > MAX_PROVIDER_LENGTH) {
      return res.status(400).json({ error: 'provider name too long' });
    }
  }

  // Model validation (optional)
  if (model !== undefined && model !== null) {
    if (typeof model !== 'string') {
      return res.status(400).json({ error: 'model must be a string' });
    }
    if (model.length > MAX_MODEL_LENGTH) {
      return res.status(400).json({ error: 'model name too long' });
    }
  }

  // UserId validation (optional)
  if (userId !== undefined && userId !== null) {
    if (typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId must be a string' });
    }
    if (userId.length > MAX_USER_ID_LENGTH) {
      return res.status(400).json({ error: 'userId too long' });
    }
    if (userId.length > 0 && !SAFE_ID_PATTERN.test(userId)) {
      return res.status(400).json({ error: 'userId contains invalid characters' });
    }
  }

  next();
}

// Export constants for testing
export const limits = {
  MAX_MESSAGE_LENGTH,
  MAX_CHAT_ID_LENGTH,
  MAX_USER_ID_LENGTH,
  MAX_PROVIDER_LENGTH,
  MAX_MODEL_LENGTH,
  MAX_WORKFLOW_NAME_LENGTH,
  MAX_SYSTEM_PROMPT_LENGTH
};
