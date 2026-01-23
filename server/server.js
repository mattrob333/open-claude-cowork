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
import logger from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Composio
const composio = new Composio();

// Session storage with TTL tracking
// Map<userId, { session: ComposioSession, lastAccess: number }>
const composioSessions = new Map();
let defaultComposioSession = null;

// Session TTL: 24 hours in milliseconds
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
// Cleanup interval: run every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

// Session cleanup function
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [userId, sessionData] of composioSessions.entries()) {
    // Skip default session
    if (userId === 'default-user') continue;

    const age = now - (sessionData.lastAccess || 0);
    if (age > SESSION_TTL_MS) {
      composioSessions.delete(userId);
      cleanedCount++;
      logger.composio.debug({ userId, ageHours: Math.round(age / 3600000) }, 'Cleaned up expired session');
    }
  }

  if (cleanedCount > 0) {
    logger.composio.info({ cleanedCount, remainingSessions: composioSessions.size }, 'Session cleanup completed');
  }
}

// Start cleanup interval
const cleanupIntervalId = setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

// Helper to get or create session with TTL tracking
function getSessionWithTTL(userId) {
  const sessionData = composioSessions.get(userId);
  if (sessionData) {
    // Update last access time
    sessionData.lastAccess = Date.now();
    return sessionData.session;
  }
  return null;
}

function setSessionWithTTL(userId, session) {
  composioSessions.set(userId, {
    session,
    lastAccess: Date.now()
  });
}

// Pre-initialize Composio session on startup
async function initializeComposioSession() {
  const defaultUserId = 'default-user';
  logger.composio.info({ userId: defaultUserId }, 'Pre-initializing session');
  try {
    defaultComposioSession = await composio.create(defaultUserId);
    setSessionWithTTL(defaultUserId, defaultComposioSession);
    logger.composio.info({ mcpUrl: defaultComposioSession.mcp.url }, 'Session ready');

    // Update opencode.json with the MCP config
    updateOpencodeConfig(defaultComposioSession.mcp.url, defaultComposioSession.mcp.headers);
    logger.provider.info('Updated opencode.json with MCP config');
  } catch (error) {
    logger.composio.error({ error: error.message }, 'Failed to pre-initialize session');
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

// CORS Configuration
// In production, set CORS_ORIGINS env var (comma-separated list of allowed origins)
// In development, localhost origins are allowed by default
const getAllowedOrigins = () => {
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }
  // Development defaults
  return [
    'http://localhost:5173',  // Vite dev server
    'http://localhost:3001',  // Express server (self)
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3001'
  ];
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    // Allow requests with no origin (e.g., same-origin requests, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.cors.warn({ origin }, 'Blocked request from origin');
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
// Body size limit: 1MB max (rejects large payloads with 413)
app.use(express.json({ limit: '1mb' }));
app.use(logger.middleware);
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

  logger.chat.info({
    messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    chatId,
    provider: providerName,
    model: model || '(default)'
  }, 'Chat request received');

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
    // Get or create Composio session for this user (with TTL tracking)
    let composioSession = getSessionWithTTL(userId);
    if (!composioSession) {
      logger.composio.info({ userId }, 'Creating new session');
      res.write(`data: ${JSON.stringify({ type: 'status', message: 'Initializing session...' })}\n\n`);
      composioSession = await composio.create(userId);
      setSessionWithTTL(userId, composioSession);
      logger.composio.info({ userId, mcpUrl: composioSession.mcp.url }, 'Session created');

      // Update opencode.json with the MCP config
      updateOpencodeConfig(composioSession.mcp.url, composioSession.mcp.headers);
      logger.provider.info('Updated opencode.json with MCP config');
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

    logger.chat.debug({ provider: provider.name, sessionCount: provider.sessions.size }, 'Using provider');

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
      logger.chat.error({ error: streamError.message, chatId }, 'Stream error during iteration');
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: streamError.message })}\n\n`);
      }
    }

    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
    logger.chat.info({ chatId }, 'Stream completed');
  } catch (error) {
    clearInterval(heartbeatInterval);
    logger.chat.error({ error: error.message, chatId }, 'Chat error');
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
    logger.workflow.error({ error: error.message }, 'Error loading workflows');
    return { workflows: [] };
  }
}

function saveWorkflows(data) {
  try {
    fs.writeFileSync(workflowsPath, JSON.stringify(data, null, 2));
  } catch (error) {
    logger.workflow.error({ error: error.message }, 'Error saving workflows');
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
  logger.workflow.info({ workflowId: workflow.id, name: workflow.name }, 'Workflow created');

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

  logger.workflow.info({
    workflowId,
    variables,
    provider: providerName
  }, 'Workflow run started');

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

  logger.workflow.debug({ promptPreview: prompt.substring(0, 200) }, 'Interpolated prompt');

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
    // Get or create Composio session (with TTL tracking)
    let composioSession = getSessionWithTTL(userId);
    if (!composioSession) {
      composioSession = await composio.create(userId);
      setSessionWithTTL(userId, composioSession);
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
    logger.workflow.info({ workflowId }, 'Workflow run completed');
  } catch (error) {
    clearInterval(heartbeatInterval);
    logger.workflow.error({ error: error.message, workflowId }, 'Workflow run error');
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.end();
  }
});

await initializeProviders();
await initializeComposioSession();

// Start server and keep reference to prevent garbage collection
const server = app.listen(PORT, () => {
  logger.server.info({
    port: PORT,
    endpoints: {
      chat: `POST http://localhost:${PORT}/api/chat`,
      providers: `GET http://localhost:${PORT}/api/providers`,
      health: `GET http://localhost:${PORT}/api/health`
    },
    availableProviders: getAvailableProviders()
  }, 'Server started');
});

// Keep the process alive
server.on('error', (err) => {
  logger.server.error({ error: err.message }, 'Server error');
});

// Prevent the process from exiting
process.on('SIGINT', () => {
  logger.server.info('Shutting down server...');

  // Clear cleanup interval
  clearInterval(cleanupIntervalId);

  // Clear all sessions
  const sessionCount = composioSessions.size;
  composioSessions.clear();
  logger.composio.info({ clearedSessions: sessionCount }, 'Sessions cleared');

  server.close(() => {
    logger.server.info('Server closed');
    process.exit(0);
  });
});
