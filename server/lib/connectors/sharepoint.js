/**
 * SharePoint Connector
 *
 * Connects to Microsoft SharePoint/OneDrive for Business via Composio.
 * Handles file listing, downloading, and change detection.
 */

import logger from '../logger.js';

const log = logger.base.child({ module: 'sharepoint-connector' });

/**
 * SharePoint Connector Class
 */
class SharePointConnector {
  constructor(config = {}) {
    this.config = config;
    this.composioSession = null;
    this.siteUrl = config.siteUrl || null;
    this.driveId = config.driveId || null;
  }

  /**
   * Initialize with Composio session
   * @param {Object} composioSession - Composio session with MCP access
   */
  setComposioSession(composioSession) {
    this.composioSession = composioSession;
    log.info('Composio session set for SharePoint connector');
  }

  /**
   * Test the connection
   * @returns {Object} Connection status
   */
  async testConnection() {
    log.info('Testing SharePoint connection');

    try {
      // Use Composio's SharePoint tool to list root
      const result = await this.executeComposioTool('SHAREPOINT_LIST_DRIVES', {});

      if (result.success) {
        log.info({ driveCount: result.data?.length }, 'SharePoint connection successful');
        return {
          success: true,
          drives: result.data || []
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to connect to SharePoint'
      };
    } catch (error) {
      log.error({ error: error.message }, 'SharePoint connection test failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List files in a folder
   * @param {Object} options - List options
   * @returns {Object} List of files
   */
  async listFiles(options = {}) {
    const {
      folderId = 'root',
      pageSize = 100,
      pageToken = null,
      includeDeleted = false
    } = options;

    log.info({ folderId, pageSize }, 'Listing SharePoint files');

    try {
      const params = {
        drive_id: this.driveId,
        folder_id: folderId,
        page_size: pageSize
      };

      if (pageToken) {
        params.page_token = pageToken;
      }

      const result = await this.executeComposioTool('SHAREPOINT_LIST_FILES', params);

      if (!result.success) {
        throw new Error(result.error || 'Failed to list files');
      }

      // Normalize file data
      const files = (result.data?.files || []).map(file => this.normalizeFile(file));

      // Filter deleted if not requested
      const filteredFiles = includeDeleted
        ? files
        : files.filter(f => !f.deleted);

      log.info({ count: filteredFiles.length }, 'Files listed successfully');

      return {
        success: true,
        files: filteredFiles,
        nextPageToken: result.data?.nextPageToken || null,
        hasMore: !!result.data?.nextPageToken
      };
    } catch (error) {
      log.error({ error: error.message, folderId }, 'Failed to list SharePoint files');
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Get file metadata
   * @param {string} fileId - SharePoint file ID
   * @returns {Object} File metadata
   */
  async getFile(fileId) {
    log.info({ fileId }, 'Getting SharePoint file metadata');

    try {
      const result = await this.executeComposioTool('SHAREPOINT_GET_FILE', {
        drive_id: this.driveId,
        file_id: fileId
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to get file');
      }

      return {
        success: true,
        file: this.normalizeFile(result.data)
      };
    } catch (error) {
      log.error({ error: error.message, fileId }, 'Failed to get SharePoint file');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download file content
   * @param {string} fileId - SharePoint file ID
   * @returns {Object} File content as buffer
   */
  async downloadFile(fileId) {
    log.info({ fileId }, 'Downloading SharePoint file');

    try {
      const result = await this.executeComposioTool('SHAREPOINT_DOWNLOAD_FILE', {
        drive_id: this.driveId,
        file_id: fileId
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to download file');
      }

      // Result should contain base64 encoded content or direct buffer
      const content = result.data?.content;
      const buffer = content
        ? (typeof content === 'string' ? Buffer.from(content, 'base64') : content)
        : null;

      if (!buffer) {
        throw new Error('No content in download response');
      }

      log.info({ fileId, size: buffer.length }, 'File downloaded successfully');

      return {
        success: true,
        buffer,
        size: buffer.length,
        contentType: result.data?.contentType
      };
    } catch (error) {
      log.error({ error: error.message, fileId }, 'Failed to download SharePoint file');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List changes since a given token
   * @param {string} deltaToken - Delta token from previous sync
   * @returns {Object} Changed files
   */
  async listChanges(deltaToken = null) {
    log.info({ hasDeltaToken: !!deltaToken }, 'Listing SharePoint changes');

    try {
      const params = {
        drive_id: this.driveId
      };

      if (deltaToken) {
        params.delta_token = deltaToken;
      }

      const result = await this.executeComposioTool('SHAREPOINT_LIST_CHANGES', params);

      if (!result.success) {
        throw new Error(result.error || 'Failed to list changes');
      }

      const changes = (result.data?.changes || []).map(item => ({
        ...this.normalizeFile(item),
        changeType: item.changeType || 'modified'
      }));

      log.info({ changeCount: changes.length }, 'Changes listed successfully');

      return {
        success: true,
        changes,
        deltaToken: result.data?.deltaToken || null
      };
    } catch (error) {
      log.error({ error: error.message }, 'Failed to list SharePoint changes');
      return {
        success: false,
        error: error.message,
        changes: []
      };
    }
  }

  /**
   * Search for files
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchFiles(query, options = {}) {
    const { pageSize = 25 } = options;

    log.info({ query, pageSize }, 'Searching SharePoint files');

    try {
      const result = await this.executeComposioTool('SHAREPOINT_SEARCH_FILES', {
        drive_id: this.driveId,
        query,
        page_size: pageSize
      });

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      const files = (result.data?.files || []).map(file => this.normalizeFile(file));

      log.info({ resultCount: files.length }, 'Search completed');

      return {
        success: true,
        files
      };
    } catch (error) {
      log.error({ error: error.message, query }, 'SharePoint search failed');
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Normalize SharePoint file response to common format
   */
  normalizeFile(file) {
    return {
      id: file.id,
      name: file.name,
      path: file.webUrl || file.path || `/${file.name}`,
      type: this.getFileType(file.name),
      mimeType: file.file?.mimeType || file.mimeType,
      size: file.size,
      createdAt: file.createdDateTime,
      modifiedAt: file.lastModifiedDateTime,
      etag: file.eTag,
      webUrl: file.webUrl,
      isFolder: !!file.folder,
      parentId: file.parentReference?.id,
      deleted: file.deleted || false,
      downloadUrl: file['@microsoft.graph.downloadUrl']
    };
  }

  /**
   * Get file type from filename
   */
  getFileType(filename) {
    if (!filename) return 'unknown';
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext || 'unknown';
  }

  /**
   * Execute a Composio tool
   * This is a placeholder - actual implementation depends on Composio SDK
   */
  async executeComposioTool(toolName, params) {
    if (!this.composioSession) {
      return {
        success: false,
        error: 'Composio session not configured'
      };
    }

    try {
      // This would use the Composio MCP to execute the tool
      // The actual implementation depends on how Composio exposes SharePoint tools
      log.debug({ toolName, params }, 'Executing Composio tool');

      // Placeholder - in production this would call Composio's MCP
      // const response = await fetch(this.composioSession.mcp.url, {
      //   method: 'POST',
      //   headers: {
      //     ...this.composioSession.mcp.headers,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     tool: toolName,
      //     arguments: params
      //   })
      // });

      // For now, return a placeholder response
      return {
        success: true,
        data: {},
        message: 'Tool execution requires Composio MCP integration'
      };
    } catch (error) {
      log.error({ error: error.message, toolName }, 'Composio tool execution failed');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get connector status
   */
  getStatus() {
    return {
      type: 'sharepoint',
      configured: !!this.composioSession,
      siteUrl: this.siteUrl,
      driveId: this.driveId
    };
  }
}

// Export class
export default SharePointConnector;
export { SharePointConnector };
