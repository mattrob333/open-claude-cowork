/**
 * Document Sync Service
 *
 * Orchestrates synchronization of documents from external sources.
 * Manages sync jobs, change detection, and processing queue.
 */

import logger from './logger.js';
import SharePointConnector from './connectors/sharepoint.js';
import GoogleDriveConnector from './connectors/google-drive.js';
import doclingClient from './docling-client.js';

const log = logger.base.child({ module: 'sync-service' });

// Supported file types for processing
const SUPPORTED_FILE_TYPES = new Set([
  'pdf', 'docx', 'doc', 'txt', 'md', 'json', 'csv',
  'xlsx', 'xls', 'pptx', 'ppt'
]);

// Connector registry
const CONNECTOR_TYPES = {
  sharepoint: SharePointConnector,
  google_drive: GoogleDriveConnector
};

/**
 * Sync Service Class
 */
class SyncService {
  constructor(config = {}) {
    this.config = {
      maxConcurrentSyncs: config.maxConcurrentSyncs || 3,
      syncBatchSize: config.syncBatchSize || 50,
      retryAttempts: config.retryAttempts || 3,
      retryDelayMs: config.retryDelayMs || 5000,
      ...config
    };

    // Active connectors by connection ID
    this.connectors = new Map();

    // Active sync jobs
    this.activeSyncs = new Map();

    // Event callbacks
    this.callbacks = {
      onSyncStart: null,
      onSyncProgress: null,
      onSyncComplete: null,
      onFileDiscovered: null,
      onFileProcessed: null,
      onError: null
    };
  }

  /**
   * Register event callbacks
   */
  on(event, callback) {
    if (event in this.callbacks) {
      this.callbacks[event] = callback;
    }
    return this;
  }

  /**
   * Emit an event
   */
  emit(event, data) {
    if (this.callbacks[event]) {
      try {
        this.callbacks[event](data);
      } catch (error) {
        log.error({ event, error: error.message }, 'Event callback error');
      }
    }
  }

  /**
   * Get or create a connector for a source connection
   * @param {Object} connection - Connection configuration
   * @returns {Object} Connector instance
   */
  getConnector(connection) {
    // Check if we already have this connector
    if (this.connectors.has(connection.id)) {
      return this.connectors.get(connection.id);
    }

    // Create new connector
    const ConnectorClass = CONNECTOR_TYPES[connection.type];

    if (!ConnectorClass) {
      throw new Error(`Unsupported connector type: ${connection.type}`);
    }

    const connector = new ConnectorClass(connection.config);
    this.connectors.set(connection.id, connector);

    log.info({ connectionId: connection.id, type: connection.type }, 'Created connector');

    return connector;
  }

  /**
   * Set Composio session on a connector
   */
  setConnectorSession(connectionId, composioSession) {
    const connector = this.connectors.get(connectionId);

    if (connector) {
      connector.setComposioSession(composioSession);
    }
  }

  /**
   * Start a sync job for a connection
   * @param {Object} connection - Source connection
   * @param {Object} options - Sync options
   * @returns {Object} Sync job info
   */
  async startSync(connection, options = {}) {
    const {
      fullSync = false,
      deltaToken = null,
      folderId = 'root'
    } = options;

    // Check if already syncing
    if (this.activeSyncs.has(connection.id)) {
      log.warn({ connectionId: connection.id }, 'Sync already in progress');
      return {
        success: false,
        error: 'Sync already in progress'
      };
    }

    const syncId = `sync_${connection.id}_${Date.now()}`;

    log.info({
      syncId,
      connectionId: connection.id,
      type: connection.type,
      fullSync
    }, 'Starting sync');

    // Track sync job
    const syncJob = {
      id: syncId,
      connectionId: connection.id,
      startedAt: Date.now(),
      status: 'running',
      filesDiscovered: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      errors: []
    };

    this.activeSyncs.set(connection.id, syncJob);
    this.emit('onSyncStart', { syncId, connection });

    try {
      const connector = this.getConnector(connection);

      // Discover files
      let discoveredFiles = [];

      if (fullSync || !deltaToken) {
        // Full sync: list all files
        discoveredFiles = await this.discoverAllFiles(connector, folderId);
      } else {
        // Incremental sync: get changes since last sync
        const changes = await connector.listChanges(deltaToken);

        if (changes.success) {
          discoveredFiles = changes.changes
            .filter(c => !c.removed && c.file)
            .map(c => c.file);

          // Store new delta token
          syncJob.newDeltaToken = changes.deltaToken || changes.newStartPageToken;
        } else {
          throw new Error(changes.error || 'Failed to get changes');
        }
      }

      syncJob.filesDiscovered = discoveredFiles.length;

      log.info({
        syncId,
        filesDiscovered: discoveredFiles.length
      }, 'Files discovered');

      // Process discovered files
      for (const file of discoveredFiles) {
        try {
          // Skip folders
          if (file.isFolder) {
            syncJob.filesSkipped++;
            continue;
          }

          // Check if file type is supported
          if (!this.isSupportedFile(file)) {
            syncJob.filesSkipped++;
            continue;
          }

          this.emit('onFileDiscovered', { syncId, file, connection });

          // Process the file
          const processResult = await this.processFile(connector, file, connection);

          if (processResult.success) {
            syncJob.filesProcessed++;
            this.emit('onFileProcessed', { syncId, file, result: processResult });
          } else {
            syncJob.errors.push({
              fileId: file.id,
              fileName: file.name,
              error: processResult.error
            });
          }

          // Emit progress
          this.emit('onSyncProgress', {
            syncId,
            processed: syncJob.filesProcessed,
            total: discoveredFiles.length,
            skipped: syncJob.filesSkipped
          });
        } catch (fileError) {
          log.error({
            syncId,
            fileId: file.id,
            error: fileError.message
          }, 'Error processing file');

          syncJob.errors.push({
            fileId: file.id,
            fileName: file.name,
            error: fileError.message
          });
        }
      }

      // Complete sync
      syncJob.status = 'completed';
      syncJob.completedAt = Date.now();
      syncJob.duration = syncJob.completedAt - syncJob.startedAt;

      log.info({
        syncId,
        filesProcessed: syncJob.filesProcessed,
        filesSkipped: syncJob.filesSkipped,
        errorCount: syncJob.errors.length,
        durationMs: syncJob.duration
      }, 'Sync completed');

      this.emit('onSyncComplete', { syncJob });

      return {
        success: true,
        syncJob
      };
    } catch (error) {
      log.error({ syncId, error: error.message }, 'Sync failed');

      syncJob.status = 'failed';
      syncJob.error = error.message;
      syncJob.completedAt = Date.now();

      this.emit('onError', { syncId, error });

      return {
        success: false,
        error: error.message,
        syncJob
      };
    } finally {
      this.activeSyncs.delete(connection.id);
    }
  }

  /**
   * Discover all files recursively
   */
  async discoverAllFiles(connector, folderId = 'root', allFiles = []) {
    let pageToken = null;

    do {
      const result = await connector.listFiles({
        folderId,
        pageSize: this.config.syncBatchSize,
        pageToken
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to list files');
      }

      // Add files to list
      for (const file of result.files) {
        if (file.isFolder) {
          // Recursively get files from subfolder
          await this.discoverAllFiles(connector, file.id, allFiles);
        } else {
          allFiles.push(file);
        }
      }

      pageToken = result.nextPageToken;
    } while (pageToken);

    return allFiles;
  }

  /**
   * Process a single file
   */
  async processFile(connector, file, connection) {
    log.debug({ fileId: file.id, fileName: file.name }, 'Processing file');

    try {
      // Download file content
      const downloadResult = await connector.downloadFile(file.id, file.mimeType);

      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error
        };
      }

      // Parse with Docling
      const parseResult = await doclingClient.parseSync(
        downloadResult.buffer,
        file.name,
        {
          chunkSize: 1000,
          extractTables: true
        }
      );

      return {
        success: parseResult.status === 'completed',
        documentId: parseResult.document_id,
        chunks: parseResult.chunks?.length || 0,
        processingTimeMs: parseResult.processing_time_ms,
        error: parseResult.error
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a file type is supported
   */
  isSupportedFile(file) {
    // Check by extension
    if (file.type && SUPPORTED_FILE_TYPES.has(file.type.toLowerCase())) {
      return true;
    }

    // Check by name extension
    if (file.name) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext && SUPPORTED_FILE_TYPES.has(ext)) {
        return true;
      }
    }

    // Check for Google Workspace files (they export to supported formats)
    if (file.isGoogleWorkspace && file.exportAs) {
      return SUPPORTED_FILE_TYPES.has(file.exportAs);
    }

    return false;
  }

  /**
   * Get sync status for a connection
   */
  getSyncStatus(connectionId) {
    const activeSync = this.activeSyncs.get(connectionId);

    if (activeSync) {
      return {
        syncing: true,
        ...activeSync
      };
    }

    return {
      syncing: false
    };
  }

  /**
   * Cancel an active sync
   */
  cancelSync(connectionId) {
    const activeSync = this.activeSyncs.get(connectionId);

    if (activeSync) {
      activeSync.status = 'cancelled';
      this.activeSyncs.delete(connectionId);

      log.info({ connectionId, syncId: activeSync.id }, 'Sync cancelled');

      return { success: true };
    }

    return { success: false, error: 'No active sync' };
  }

  /**
   * Get all active syncs
   */
  getActiveSyncs() {
    return Array.from(this.activeSyncs.values());
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Cancel all active syncs
    for (const [connectionId] of this.activeSyncs) {
      this.cancelSync(connectionId);
    }

    // Clear connectors
    this.connectors.clear();

    log.info('Sync service cleaned up');
  }
}

// Export singleton and class
const syncService = new SyncService();

export default syncService;
export { SyncService, SUPPORTED_FILE_TYPES, CONNECTOR_TYPES };
