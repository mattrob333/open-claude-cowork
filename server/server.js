import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Composio } from '@composio/core';
import { getProvider, getAvailableProviders, initializeProviders } from './providers/index.js';
import {
  validateChatRequest,
  validateWorkflowCreate,
  validateWorkflowRun
} from './middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Composio
const composio = new Composio();

const composioSessions = new Map();
let defaultComposioSession = null;

// Pre-initialize Composio session on startup
async function initializeComposioSession() {
  const defaultUserId = 'default-user';
  console.log('[COMPOSIO] Pre-initializing session for:', defaultUserId);
  try {
    defaultComposioSession = await composio.create(defaultUserId);
    composioSessions.set(defaultUserId, defaultComposioSession);
    console.log('[COMPOSIO] Session ready with MCP URL:', defaultComposioSession.mcp.url);

    // Update opencode.json with the MCP config
    updateOpencodeConfig(defaultComposioSession.mcp.url, defaultComposioSession.mcp.headers);
    console.log('[OPENCODE] Updated opencode.json with MCP config');
  } catch (error) {
    console.error('[COMPOSIO] Failed to pre-initialize session:', error.message);
  }
}

// Write MCP config to opencode.json
function updateOpencodeConfig(mcpUrl, mcpHeaders) {
  const opencodeConfigPath = path.join(__dirname, 'opencode.json');
  const config = {
    mcp: {
      composio: {
        type: 'remote',
        url: mcpUrl,
        headers: mcpHeaders
      }
    }
  };
  fs.writeFileSync(opencodeConfigPath, JSON.stringify(config, null, 2));
}

// Middleware
app.use(cors());
// Body size limit: 1MB max (rejects large payloads with 413)
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'renderer')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'renderer', 'index.html'));
});

// Chat endpoint using provider abstraction
app.post('/api/chat', validateChatRequest, async (req, res) => {
  const {
    message,
    chatId,
    userId = 'default-user',
    provider: providerName = 'claude',  // Per-request provider selection
    model = null  // Per-request model selection
  } = req.body;

  console.log('[CHAT] Request received:', message.substring(0, 100) + (message.length > 100 ? '...' : ''));
  console.log('[CHAT] Chat ID:', chatId);
  console.log('[CHAT] Provider:', providerName);
  console.log('[CHAT] Model:', model || '(default)');

  // Validate provider
  const availableProviders = getAvailableProviders();
  if (!availableProviders.includes(providerName.toLowerCase())) {
    return res.status(400).json({
      error: `Invalid provider: ${providerName}. Available: ${availableProviders.join(', ')}`
    });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Processing request...' })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  try {
    // Get or create Composio session for this user
    let composioSession = composioSessions.get(userId);
    if (!composioSession) {
      console.log('[COMPOSIO] Creating new session for user:', userId);
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Initializing session...' })}\n\n`);
      composioSession = await composio.create(userId);
      composioSessions.set(userId, composioSession);
      console.log('[COMPOSIO] Session created with MCP URL:', composioSession.mcp.url);

      // Update opencode.json with the MCP config
      updateOpencodeConfig(composioSession.mcp.url, composioSession.mcp.headers);
      console.log('[OPENCODE] Updated opencode.json with MCP config');
    }

    // Get the provider instance
    const provider = getProvider(providerName);

    // Build MCP servers config - passed to provider
    const mcpServers = {
      composio: {
        type: 'http',
        url: composioSession.mcp.url,
        headers: composioSession.mcp.headers
      }
    };

    console.log('[CHAT] Using provider:', provider.name);
    console.log('[CHAT] All stored sessions:', Array.from(provider.sessions.entries()));

    // Stream responses from the provider
    try {
      for await (const chunk of provider.query({
        prompt: message,
        chatId,
        userId,
        mcpServers,
        model,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite'],
        maxTurns: 20
      })) {
        // Send chunk as SSE
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        res.write(data);
      }
    } catch (streamError) {
      console.error('[CHAT] Stream error during iteration:', streamError);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
      }
    }

    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
    console.log('[CHAT] Stream completed');
  } catch (error) {
    clearInterval(heartbeatInterval);
    console.error('[CHAT] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

// Get available providers endpoint
app.get('/api/providers', (_req, res) => {
  res.json({
    providers: getAvailableProviders(),
    default: 'claude'
  });
});

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    providers: getAvailableProviders()
  });
});

// ==================== WORKFLOW ENDPOINTS ====================

const workflowsPath = path.join(__dirname, 'workflows.json');

function loadWorkflows() {
  try {
    if (!fs.existsSync(workflowsPath)) {
      return { workflows: [] };
    }
    return JSON.parse(fs.readFileSync(workflowsPath, 'utf8'));
  } catch (error) {
    console.error('[WORKFLOWS] Error loading workflows:', error);
    return { workflows: [] };
  }
}

function saveWorkflows(data) {
  try {
    fs.writeFileSync(workflowsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[WORKFLOWS] Error saving workflows:', error);
    throw error;
  }
}

// GET /api/workflows - List all workflows
app.get('/api/workflows', (_req, res) => {
  const data = loadWorkflows();
  res.json(data.workflows);
});

// POST /api/workflows - Create a new workflow
app.post('/api/workflows', validateWorkflowCreate, (req, res) => {
  const { name, description, systemPrompt, variables, icon } = req.body;

  const data = loadWorkflows();
  const workflow = {
    id: `wf_${Date.now()}`,
    name,
    description: description || '',
    systemPrompt,
    variables: variables || [],
    icon: icon || 'chat',
    createdAt: Date.now()
  };

  data.workflows.push(workflow);
  saveWorkflows(data);
  console.log('[WORKFLOWS] Created workflow:', workflow.id);

  res.json(workflow);
});

// POST /api/workflows/run - Run a workflow with variables
app.post('/api/workflows/run', validateWorkflowRun, async (req, res) => {
  const {
    workflowId,
    variables = {},
    provider: providerName = 'claude',
    model = null,
    userId = 'default-user'
  } = req.body;

  console.log('[WORKFLOW RUN] Workflow ID:', workflowId);
  console.log('[WORKFLOW RUN] Variables:', variables);
  console.log('[WORKFLOW RUN] Provider:', providerName);

  const workflows = loadWorkflows().workflows;
  const workflow = workflows.find(w => w.id === workflowId);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  // Interpolate variables into system prompt
  let prompt = workflow.systemPrompt;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  console.log('[WORKFLOW RUN] Interpolated prompt:', prompt.substring(0, 200) + '...');

  // Set up SSE response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Running workflow...' })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      res.write(': heartbeat\n\n');
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  try {
    // Get or create Composio session
    let composioSession = composioSessions.get(userId);
    if (!composioSession) {
      composioSession = await composio.create(userId);
      composioSessions.set(userId, composioSession);
    }

    const provider = getProvider(providerName);

    const mcpServers = {
      composio: {
        type: 'http',
        url: composioSession.mcp.url,
        headers: composioSession.mcp.headers
      }
    };

    // Generate a unique chat ID for this workflow run
    const chatId = `workflow_${workflowId}_${Date.now()}`;

    // Stream responses from the provider
    for await (const chunk of provider.query({
      prompt,
      chatId,
      userId,
      mcpServers,
      model,
      systemPrompt: workflow.systemPrompt,
      allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite'],
      maxTurns: 20
    })) {
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      res.write(data);
    }

    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
    console.log('[WORKFLOW RUN] Completed');
  } catch (error) {
    clearInterval(heartbeatInterval);
    console.error('[WORKFLOW RUN] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

await initializeProviders();
await initializeComposioSession();

// Start server and keep reference to prevent garbage collection
const server = app.listen(PORT, () => {
  console.log(`\n✓ Backend server running on http://localhost:${PORT}`);
  console.log(`✓ Chat endpoint: POST http://localhost:${PORT}/api/chat`);
  console.log(`✓ Providers endpoint: GET http://localhost:${PORT}/api/providers`);
  console.log(`✓ Health check: GET http://localhost:${PORT}/api/health`);
  console.log(`✓ Available providers: ${getAvailableProviders().join(', ')}\n`);
});

// Keep the process alive
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Prevent the process from exiting
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
