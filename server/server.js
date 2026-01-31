import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { Composio } from '@composio/core';
import { getProvider, getAvailableProviders, initializeProviders, clearProviderCache } from './providers/index.js';
import {
  validateChatRequest,
  validateWorkflowRun
} from './middleware/validation.js';
import logger from './lib/logger.js';
import workflowsRouter, { loadWorkflows } from './routes/workflows.js';
import documentsRouter from './routes/documents.js';
import sourcesRouter from './routes/sources.js';
import skillsRouter from './routes/skills.js';
import emailTemplatesRouter from './routes/email-templates.js';
import personalContextRouter from './routes/personal-context.js';
import userSettingsRouter from './routes/user-settings.js';
import quickActionsRouter from './routes/quick-actions.js';
import { fetchChunksForDocuments, getDocumentsByIds } from './lib/supabase.js';
import { loadSkills } from './lib/skill-loader.js';
import { matchSkills, buildSystemPromptWithSkills, stripSkillInvocations } from './lib/skill-matcher.js';

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
    'http://localhost:5174',  // Vite dev server (alternate)
    'http://localhost:5175',  // Vite dev server (alternate)
    'http://localhost:3001',  // Express server (self)
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
// Body size limit: 1MB max (rejects large payloads with 413)
app.use(express.json({ limit: '1mb' }));
app.use(logger.middleware);

// Static file serving
// In production (NODE_ENV=production), serve built frontend from renderer/dist
// In development, serve from renderer root (Vite dev server handles this usually)
const isProduction = process.env.NODE_ENV === 'production';
const staticPath = isProduction
  ? path.join(__dirname, '..', 'renderer', 'dist')
  : path.join(__dirname, '..', 'renderer');

app.use(express.static(staticPath));

// Helper to format document chunks as context
async function buildDocumentContext(documentIds, ephemeralContext) {
  let contextParts = [];

  logger.chat.info({ documentIds, hasEphemeral: !!ephemeralContext }, 'Building document context');

  // Add ephemeral context (already extracted text from frontend)
  if (ephemeralContext && ephemeralContext.trim()) {
    contextParts.push(ephemeralContext);
  }

  // Fetch and format persistent document chunks
  if (documentIds && documentIds.length > 0) {
    const { chunks, error: chunksError } = await fetchChunksForDocuments(documentIds);
    
    logger.chat.info({ chunksCount: chunks?.length, chunksError }, 'Fetched document chunks');

    if (!chunksError && chunks.length > 0) {
      // Get document names for better context
      const { documents } = await getDocumentsByIds(documentIds);
      const docNameMap = new Map(documents.map(d => [d.id, d.name]));

      // Group chunks by document
      const chunksByDoc = new Map();
      for (const chunk of chunks) {
        const docId = chunk.document_id;
        if (!chunksByDoc.has(docId)) {
          chunksByDoc.set(docId, []);
        }
        chunksByDoc.get(docId).push(chunk);
      }

      // Format each document's chunks
      for (const [docId, docChunks] of chunksByDoc) {
        const docName = docNameMap.get(docId) || 'Unknown Document';
        const content = docChunks.map(c => c.content).join('\n\n');
        contextParts.push(`<document name="${docName}">\n${content}\n</document>`);
      }
    }
  }

  if (contextParts.length === 0) {
    return null;
  }

  return `<context>\nThe following documents have been provided as reference material:\n\n${contextParts.join('\n\n')}\n</context>`;
}

// Chat endpoint using provider abstraction
app.post('/api/chat', validateChatRequest, async (req, res) => {
  let {
    message,
    chatId,
    userId = 'default-user',
    provider: providerName = 'claude',  // Per-request provider selection
    model = null,  // Per-request model selection
    documentIds = [],  // Active Knowledge Base document IDs
    ephemeralContext = '',  // Ephemeral document content (already extracted)
    activeSkillIds = [],  // Active skill IDs for this session
    personalContext = '',  // User's personal context for personalized responses
    workflowPrompt = '',  // Quick Action workflow instructions
    history = []  // Conversation history from client
  } = req.body;

  // Handle Quick Action extraction trigger - expand hidden trigger to full prompt
  if (message === '__QUICK_ACTION_EXTRACT__') {
    message = `Analyze the conversation above and extract a reusable Quick Action. You must:
1. Generate a short, catchy name for this Quick Action (2-4 words)
2. Choose an appropriate emoji icon
3. Write a one-sentence description
4. List the key steps (3-7 steps)
5. List the tools/integrations used
6. Create the golden instructions (the core prompt that makes this work)

Then return the Quick Action data in the JSON format specified in your instructions.

DO NOT ask the user to provide the name or description. YOU generate everything.`;
  }

  logger.chat.info({
    messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
    chatId,
    provider: providerName,
    model: model || '(default)',
    documentCount: documentIds?.length || 0,
    hasEphemeralContext: !!ephemeralContext,
    activeSkillCount: activeSkillIds?.length || 0
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

    // Build document context if documents are active
    const documentContext = await buildDocumentContext(documentIds, ephemeralContext);
    
    if (documentContext) {
      logger.chat.info({ contextLength: documentContext.length }, 'Document context built and will be injected into system prompt');
    } else {
      logger.chat.info('No document context to inject');
    }

    // Load and match skills
    const availableSkills = await loadSkills(userId);
    const matchedSkills = matchSkills(message, availableSkills, activeSkillIds);

    if (matchedSkills.length > 0) {
      logger.chat.debug({
        matchedSkillIds: matchedSkills.map(s => s.id),
        matchedSkillCount: matchedSkills.length
      }, 'Skills matched for message');

      // Notify client about active skills
      res.write(`data: ${JSON.stringify({
        type: 'skills_active',
        skills: matchedSkills.map(s => ({ id: s.id, name: s.name }))
      })}\n\n`);
    }

    // Build enhanced system prompt with skills manifest and document context
    // Pass all available skills so agent knows what's available, plus matched skills for full content
    let enhancedSystemPrompt = buildSystemPromptWithSkills(null, matchedSkills, documentContext, availableSkills, personalContext);
    
    // Add workflow prompt as high-priority context if present
    if (workflowPrompt) {
      enhancedSystemPrompt = `## ACTIVE WORKFLOW INSTRUCTIONS\n\nYou have been asked to run the following workflow. Follow these instructions carefully:\n\n${workflowPrompt}\n\n---\n\n${enhancedSystemPrompt || ''}`;
    }

    // Strip skill invocations from message (e.g., /code-review -> rest of message)
    const cleanMessage = stripSkillInvocations(message);
    const userPrompt = cleanMessage || message;

    // Stream responses from the provider
    try {
      for await (const chunk of provider.query({
        prompt: userPrompt,
        chatId,
        userId,
        mcpServers,
        model,
        systemPrompt: enhancedSystemPrompt || undefined,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'WebSearch', 'WebFetch', 'TodoWrite'],
        maxTurns: 20,
        history: history || []  // Pass conversation history for context
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

// Health check endpoint with comprehensive service checks
app.get('/api/health', async (_req, res) => {
  const startTime = Date.now();
  const checks = {
    server: { status: 'healthy' },
    composio: { status: 'unknown' },
    docling: { status: 'unknown' },
    providers: { status: 'unknown', available: [] }
  };

  // Check Composio session
  try {
    const hasSession = defaultComposioSession !== null || composioSessions.size > 0;
    checks.composio = {
      status: hasSession ? 'healthy' : 'degraded',
      activeSessions: composioSessions.size,
      message: hasSession ? 'Session available' : 'No active sessions'
    };
  } catch (error) {
    checks.composio = { status: 'unhealthy', error: error.message };
  }

  // Check Docling sidecar (if configured)
  const doclingUrl = process.env.DOCLING_URL;
  if (doclingUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${doclingUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      checks.docling = {
        status: response.ok ? 'healthy' : 'degraded',
        url: doclingUrl
      };
    } catch (error) {
      checks.docling = {
        status: 'unhealthy',
        url: doclingUrl,
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      };
    }
  } else {
    checks.docling = { status: 'not_configured' };
  }

  // Check providers
  try {
    const available = getAvailableProviders();
    checks.providers = {
      status: available.length > 0 ? 'healthy' : 'degraded',
      available,
      count: available.length
    };
  } catch (error) {
    checks.providers = { status: 'unhealthy', error: error.message };
  }

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status);
  let overallStatus = 'healthy';
  if (statuses.includes('unhealthy')) {
    overallStatus = 'unhealthy';
  } else if (statuses.includes('degraded')) {
    overallStatus = 'degraded';
  }

  const responseTime = Date.now() - startTime;

  res.status(overallStatus === 'unhealthy' ? 503 : 200).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    responseTimeMs: responseTime,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks
  });
});

// ==================== WORKFLOW ENDPOINTS ====================

// Mount workflows router for CRUD operations
app.use('/api/workflows', workflowsRouter);

// Mount documents router for file upload and management
app.use('/api/documents', documentsRouter);

// Mount sources router for enterprise connector management
app.use('/api/sources', sourcesRouter);

// Mount skills router for skills discovery and management
app.use('/api/skills', skillsRouter);

// Mount email templates router for email template management
app.use('/api/email-templates', emailTemplatesRouter);

// Mount personal context router for user profile/context management
app.use('/api/user/personal-context', personalContextRouter);

// Mount user settings router for API key management
app.use('/api/user/settings', userSettingsRouter);

// Mount quick actions router for simplified workflow management
app.use('/api/quick-actions', quickActionsRouter);

// POST /api/composio/auth-url - Get Composio OAuth URL for a specific app
app.post('/api/composio/auth-url', async (req, res) => {
  const { app: appName } = req.body;
  
  if (!appName) {
    return res.status(400).json({ error: 'App name is required' });
  }

  try {
    // For now, return the Composio app connection URL
    // In production, this would use Composio SDK to generate proper OAuth URLs
    const url = `https://app.composio.dev/apps/${appName}`;
    res.json({ url, app: appName });
  } catch (error) {
    logger.error({ error: error.message, app: appName }, 'Failed to get auth URL');
    res.status(500).json({ error: error.message });
  }
});

// POST /api/workflows/run - Run a workflow with variables (needs Composio access)
app.post('/api/workflows/run', validateWorkflowRun, async (req, res) => {
  const {
    workflowId,
    variables = {},
    provider: providerName = 'claude',
    model = null,
    userId = 'default-user',
    workflow: clientWorkflow = null  // Accept workflow from frontend
  } = req.body;

  logger.workflow.info({
    workflowId,
    variables,
    provider: providerName
  }, 'Workflow run started');

  // Try to find workflow: first from client, then from JSON file
  let workflow = clientWorkflow;
  if (!workflow) {
    const workflows = loadWorkflows().workflows;
    workflow = workflows.find(w => w.id === workflowId);
  }

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found. Pass workflow object in request body.' });
  }

  // Use goldenInstructions or systemPrompt
  let prompt = workflow.goldenInstructions || workflow.systemPrompt || '';
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

// Generate session title endpoint
app.post('/api/generate-title', async (req, res) => {
  const { userMessage } = req.body;
  
  try {
    // Simple title extraction: first 3-5 meaningful words
    const words = userMessage
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 2) // Skip short words
      .slice(0, 4)
      .join(' ');
    
    const title = words.length > 0 ? words.substring(0, 30) : 'New Chat';
    res.json({ title });
  } catch (error) {
    logger.chat.error({ error: error.message }, 'Error generating title');
    res.json({ title: 'New Chat' });
  }
});

// SPA fallback - serve index.html for all non-API routes (must be AFTER all API routes)
// Express 5 requires named wildcard parameter: /{*path} or (/.*)
app.get('/{*path}', (req, res) => {
  const indexPath = isProduction
    ? path.join(__dirname, '..', 'renderer', 'dist', 'index.html')
    : path.join(__dirname, '..', 'renderer', 'index.html');
  res.sendFile(indexPath);
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

// Graceful shutdown handler
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    logger.server.warn({ signal }, 'Shutdown already in progress, ignoring signal');
    return;
  }
  isShuttingDown = true;

  logger.server.info({ signal }, 'Graceful shutdown initiated');

  // Set a force-exit timeout (10 seconds)
  const forceExitTimeout = setTimeout(() => {
    logger.server.error('Forced exit after timeout');
    process.exit(1);
  }, 10000);

  try {
    // 1. Stop accepting new connections
    server.close(() => {
      logger.server.info('HTTP server closed');
    });

    // 2. Clear cleanup interval
    clearInterval(cleanupIntervalId);
    logger.server.debug('Cleanup interval cleared');

    // 3. Clean up providers
    logger.server.info('Cleaning up providers...');
    await clearProviderCache();
    logger.provider.info('Providers cleaned up');

    // 4. Clear all Composio sessions
    const sessionCount = composioSessions.size;
    composioSessions.clear();
    logger.composio.info({ clearedSessions: sessionCount }, 'Sessions cleared');

    // 5. All done
    clearTimeout(forceExitTimeout);
    logger.server.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimeout);
    logger.server.error({ error: error.message }, 'Error during shutdown');
    process.exit(1);
  }
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.server.fatal({ error: error.message, stack: error.stack }, 'Uncaught exception');
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.server.error({ reason: String(reason) }, 'Unhandled promise rejection');
});
