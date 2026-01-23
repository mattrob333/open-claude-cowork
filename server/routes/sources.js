/**
 * Source Routes
 *
 * API endpoints for managing document sources (connectors) and sync operations.
 */

import { Router } from 'express';
import logger from '../lib/logger.js';
import syncService from '../lib/sync-service.js';

const router = Router();
const log = logger.base.child({ module: 'sources' });

// In-memory storage for source connections (replace with database in production)
const sourceConnections = new Map();

/**
 * Generate a connection ID
 */
function generateConnectionId() {
  return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== CONNECTION CRUD ====================

/**
 * GET /api/sources
 * List all source connections
 */
router.get('/', (req, res) => {
  const { userId = 'default-user', type, status } = req.query;

  let connections = Array.from(sourceConnections.values())
    .filter(c => c.userId === userId);

  // Filter by type if provided
  if (type) {
    connections = connections.filter(c => c.type === type);
  }

  // Filter by status if provided
  if (status) {
    connections = connections.filter(c => c.status === status);
  }

  // Don't expose credentials in list
  const sanitized = connections.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    status: c.status,
    syncEnabled: c.syncEnabled,
    lastSyncAt: c.lastSyncAt,
    nextSyncAt: c.nextSyncAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt
  }));

  res.json({
    connections: sanitized,
    total: sanitized.length
  });
});

/**
 * POST /api/sources
 * Create a new source connection
 */
router.post('/', async (req, res) => {
  const {
    name,
    type,
    config = {},
    authType = 'oauth',
    syncEnabled = true,
    syncIntervalMinutes = 60,
    userId = 'default-user'
  } = req.body;

  // Validate required fields
  if (!name || !type) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['name', 'type']
    });
  }

  // Validate type
  const validTypes = ['sharepoint', 'google_drive', 'onedrive', 'dropbox', 's3', 'local'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Invalid type: ${type}`,
      validTypes
    });
  }

  const connectionId = generateConnectionId();

  const connection = {
    id: connectionId,
    userId,
    name,
    type,
    config,
    authType,
    syncEnabled,
    syncIntervalMinutes,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  sourceConnections.set(connectionId, connection);

  log.info({ connectionId, type, name }, 'Source connection created');

  res.status(201).json({
    id: connectionId,
    name,
    type,
    status: 'pending',
    message: 'Connection created. Use the connect endpoint to authenticate.'
  });
});

/**
 * GET /api/sources/:id
 * Get a single source connection
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  // Return without credentials
  res.json({
    id: connection.id,
    name: connection.name,
    type: connection.type,
    config: connection.config,
    authType: connection.authType,
    syncEnabled: connection.syncEnabled,
    syncIntervalMinutes: connection.syncIntervalMinutes,
    status: connection.status,
    lastSyncAt: connection.lastSyncAt,
    nextSyncAt: connection.nextSyncAt,
    errorMessage: connection.errorMessage,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt
  });
});

/**
 * PUT /api/sources/:id
 * Update a source connection
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  const {
    name,
    config,
    syncEnabled,
    syncIntervalMinutes
  } = req.body;

  // Update allowed fields
  if (name !== undefined) connection.name = name;
  if (config !== undefined) connection.config = { ...connection.config, ...config };
  if (syncEnabled !== undefined) connection.syncEnabled = syncEnabled;
  if (syncIntervalMinutes !== undefined) connection.syncIntervalMinutes = syncIntervalMinutes;

  connection.updatedAt = Date.now();

  log.info({ connectionId: id }, 'Source connection updated');

  res.json({
    id: connection.id,
    name: connection.name,
    type: connection.type,
    syncEnabled: connection.syncEnabled,
    updatedAt: connection.updatedAt
  });
});

/**
 * DELETE /api/sources/:id
 * Delete a source connection
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!sourceConnections.has(id)) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  // Cancel any active sync
  syncService.cancelSync(id);

  sourceConnections.delete(id);

  log.info({ connectionId: id }, 'Source connection deleted');

  res.json({ success: true, id });
});

// ==================== CONNECTION ACTIONS ====================

/**
 * POST /api/sources/:id/connect
 * Test and activate a connection
 */
router.post('/:id/connect', async (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  log.info({ connectionId: id, type: connection.type }, 'Testing connection');

  try {
    // Get the connector
    const connector = syncService.getConnector(connection);

    // Test the connection
    const testResult = await connector.testConnection();

    if (testResult.success) {
      connection.status = 'connected';
      connection.errorMessage = null;
      connection.updatedAt = Date.now();

      log.info({ connectionId: id }, 'Connection successful');

      res.json({
        success: true,
        status: 'connected',
        details: testResult
      });
    } else {
      connection.status = 'error';
      connection.errorMessage = testResult.error;
      connection.updatedAt = Date.now();

      res.status(400).json({
        success: false,
        error: testResult.error
      });
    }
  } catch (error) {
    log.error({ connectionId: id, error: error.message }, 'Connection test failed');

    connection.status = 'error';
    connection.errorMessage = error.message;
    connection.updatedAt = Date.now();

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sources/:id/disconnect
 * Disconnect a source
 */
router.post('/:id/disconnect', (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  // Cancel any active sync
  syncService.cancelSync(id);

  connection.status = 'disabled';
  connection.updatedAt = Date.now();

  log.info({ connectionId: id }, 'Connection disconnected');

  res.json({
    success: true,
    status: 'disabled'
  });
});

// ==================== SYNC OPERATIONS ====================

/**
 * POST /api/sources/:id/sync
 * Trigger a sync for a connection
 */
router.post('/:id/sync', async (req, res) => {
  const { id } = req.params;
  const { fullSync = false } = req.body;

  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  if (connection.status !== 'connected') {
    return res.status(400).json({
      error: 'Connection not ready',
      status: connection.status,
      message: 'Connect the source first using POST /connect'
    });
  }

  log.info({ connectionId: id, fullSync }, 'Starting sync');

  try {
    // Start sync (async - returns immediately)
    const syncResult = await syncService.startSync(connection, {
      fullSync,
      deltaToken: connection.lastDeltaToken
    });

    if (syncResult.success) {
      // Update connection with sync info
      connection.status = 'syncing';
      connection.lastSyncAt = Date.now();
      connection.updatedAt = Date.now();

      res.json({
        success: true,
        syncId: syncResult.syncJob.id,
        message: 'Sync started',
        filesDiscovered: syncResult.syncJob.filesDiscovered
      });
    } else {
      res.status(400).json({
        success: false,
        error: syncResult.error
      });
    }
  } catch (error) {
    log.error({ connectionId: id, error: error.message }, 'Failed to start sync');

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sources/:id/sync/status
 * Get sync status for a connection
 */
router.get('/:id/sync/status', (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  const syncStatus = syncService.getSyncStatus(id);

  res.json({
    connectionId: id,
    connectionStatus: connection.status,
    ...syncStatus,
    lastSyncAt: connection.lastSyncAt
  });
});

/**
 * POST /api/sources/:id/sync/cancel
 * Cancel an active sync
 */
router.post('/:id/sync/cancel', (req, res) => {
  const { id } = req.params;
  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  const result = syncService.cancelSync(id);

  if (result.success) {
    connection.status = 'connected';
    connection.updatedAt = Date.now();

    res.json({
      success: true,
      message: 'Sync cancelled'
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error
    });
  }
});

// ==================== FILE BROWSING ====================

/**
 * GET /api/sources/:id/files
 * List files from a source
 */
router.get('/:id/files', async (req, res) => {
  const { id } = req.params;
  const { folderId = 'root', pageSize = 50, pageToken } = req.query;

  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  if (connection.status !== 'connected') {
    return res.status(400).json({
      error: 'Connection not ready',
      status: connection.status
    });
  }

  try {
    const connector = syncService.getConnector(connection);
    const result = await connector.listFiles({
      folderId,
      pageSize: parseInt(pageSize, 10),
      pageToken
    });

    res.json(result);
  } catch (error) {
    log.error({ connectionId: id, error: error.message }, 'Failed to list files');

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sources/:id/search
 * Search files in a source
 */
router.get('/:id/search', async (req, res) => {
  const { id } = req.params;
  const { q, pageSize = 25 } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const connection = sourceConnections.get(id);

  if (!connection) {
    return res.status(404).json({ error: 'Source connection not found' });
  }

  if (connection.status !== 'connected') {
    return res.status(400).json({
      error: 'Connection not ready',
      status: connection.status
    });
  }

  try {
    const connector = syncService.getConnector(connection);
    const result = await connector.searchFiles(q, {
      pageSize: parseInt(pageSize, 10)
    });

    res.json(result);
  } catch (error) {
    log.error({ connectionId: id, query: q, error: error.message }, 'Search failed');

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== GLOBAL SYNC STATUS ====================

/**
 * GET /api/sources/syncs/active
 * Get all active syncs across all connections
 */
router.get('/syncs/active', (req, res) => {
  const activeSyncs = syncService.getActiveSyncs();

  res.json({
    syncs: activeSyncs,
    count: activeSyncs.length
  });
});

export default router;
