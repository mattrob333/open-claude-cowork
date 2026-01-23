/**
 * Google Drive Connector
 *
 * Connects to Google Drive via Composio.
 * Handles file listing, downloading, and Google Workspace document export.
 */

import logger from '../logger.js';

const log = logger.base.child({ module: 'google-drive-connector' });

// Google Workspace MIME types and their export formats
const GOOGLE_WORKSPACE_TYPES = {
  'application/vnd.google-apps.document': {
    name: 'Google Docs',
    exportMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx'
  },
  'application/vnd.google-apps.spreadsheet': {
    name: 'Google Sheets',
    exportMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx'
  },
  'application/vnd.google-apps.presentation': {
    name: 'Google Slides',
    exportMimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extension: 'pptx'
  },
  'application/vnd.google-apps.drawing': {
    name: 'Google Drawings',
    exportMimeType: 'application/pdf',
    extension: 'pdf'
  }
};

/**
 * Google Drive Connector Class
 */
class GoogleDriveConnector {
  constructor(config = {}) {
    this.config = config;
    this.composioSession = null;
  }

  /**
   * Initialize with Composio session
   * @param {Object} composioSession - Composio session with MCP access
   */
  setComposioSession(composioSession) {
    this.composioSession = composioSession;
    log.info('Composio session set for Google Drive connector');
  }

  /**
   * Test the connection
   * @returns {Object} Connection status
   */
  async testConnection() {
    log.info('Testing Google Drive connection');

    try {
      // Use Composio's Google Drive tool to get about info
      const result = await this.executeComposioTool('GOOGLEDRIVE_GET_ABOUT', {});

      if (result.success) {
        log.info({ email: result.data?.user?.emailAddress }, 'Google Drive connection successful');
        return {
          success: true,
          user: result.data?.user,
          storageQuota: result.data?.storageQuota
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to connect to Google Drive'
      };
    } catch (error) {
      log.error({ error: error.message }, 'Google Drive connection test failed');
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
      includeDeleted = false,
      mimeTypes = null // Array of MIME types to filter
    } = options;

    log.info({ folderId, pageSize }, 'Listing Google Drive files');

    try {
      // Build query
      let query = `'${folderId}' in parents`;

      if (!includeDeleted) {
        query += ' and trashed = false';
      }

      if (mimeTypes && mimeTypes.length > 0) {
        const mimeQuery = mimeTypes.map(m => `mimeType = '${m}'`).join(' or ');
        query += ` and (${mimeQuery})`;
      }

      const params = {
        q: query,
        page_size: pageSize,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, trashed, md5Checksum)'
      };

      if (pageToken) {
        params.page_token = pageToken;
      }

      const result = await this.executeComposioTool('GOOGLEDRIVE_LIST_FILES', params);

      if (!result.success) {
        throw new Error(result.error || 'Failed to list files');
      }

      // Normalize file data
      const files = (result.data?.files || []).map(file => this.normalizeFile(file));

      log.info({ count: files.length }, 'Files listed successfully');

      return {
        success: true,
        files,
        nextPageToken: result.data?.nextPageToken || null,
        hasMore: !!result.data?.nextPageToken
      };
    } catch (error) {
      log.error({ error: error.message, folderId }, 'Failed to list Google Drive files');
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Get file metadata
   * @param {string} fileId - Google Drive file ID
   * @returns {Object} File metadata
   */
  async getFile(fileId) {
    log.info({ fileId }, 'Getting Google Drive file metadata');

    try {
      const result = await this.executeComposioTool('GOOGLEDRIVE_GET_FILE', {
        file_id: fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents, webViewLink, trashed, md5Checksum, exportLinks'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to get file');
      }

      return {
        success: true,
        file: this.normalizeFile(result.data)
      };
    } catch (error) {
      log.error({ error: error.message, fileId }, 'Failed to get Google Drive file');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download file content
   * For Google Workspace files, exports to compatible format
   * @param {string} fileId - Google Drive file ID
   * @param {string} mimeType - Optional: file MIME type (for determining export format)
   * @returns {Object} File content as buffer
   */
  async downloadFile(fileId, mimeType = null) {
    log.info({ fileId, mimeType }, 'Downloading Google Drive file');

    try {
      // Check if this is a Google Workspace file that needs export
      const workspaceType = mimeType ? GOOGLE_WORKSPACE_TYPES[mimeType] : null;

      let result;

      if (workspaceType) {
        // Export Google Workspace file
        log.info({ type: workspaceType.name, exportFormat: workspaceType.extension }, 'Exporting Google Workspace file');

        result = await this.executeComposioTool('GOOGLEDRIVE_EXPORT_FILE', {
          file_id: fileId,
          mime_type: workspaceType.exportMimeType
        });
      } else {
        // Direct download
        result = await this.executeComposioTool('GOOGLEDRIVE_DOWNLOAD_FILE', {
          file_id: fileId
        });
      }

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

      log.info({
        fileId,
        size: buffer.length,
        exported: !!workspaceType
      }, 'File downloaded successfully');

      return {
        success: true,
        buffer,
        size: buffer.length,
        contentType: workspaceType?.exportMimeType || result.data?.contentType,
        exportedFrom: workspaceType?.name || null,
        exportedExtension: workspaceType?.extension || null
      };
    } catch (error) {
      log.error({ error: error.message, fileId }, 'Failed to download Google Drive file');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List changes since a given token
   * @param {string} startPageToken - Start page token from previous sync
   * @returns {Object} Changed files
   */
  async listChanges(startPageToken = null) {
    log.info({ hasToken: !!startPageToken }, 'Listing Google Drive changes');

    try {
      // If no token, get the start token first
      let token = startPageToken;

      if (!token) {
        const tokenResult = await this.executeComposioTool('GOOGLEDRIVE_GET_START_PAGE_TOKEN', {});

        if (!tokenResult.success) {
          throw new Error('Failed to get start page token');
        }

        token = tokenResult.data?.startPageToken;
        log.info({ token }, 'Got initial start page token');

        // Return empty changes with the new token (no changes since we just got the token)
        return {
          success: true,
          changes: [],
          newStartPageToken: token,
          isInitialSync: true
        };
      }

      const result = await this.executeComposioTool('GOOGLEDRIVE_LIST_CHANGES', {
        page_token: token,
        fields: 'nextPageToken, newStartPageToken, changes(fileId, removed, file(id, name, mimeType, size, createdTime, modifiedTime, trashed, md5Checksum))'
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to list changes');
      }

      const changes = (result.data?.changes || []).map(change => ({
        fileId: change.fileId,
        removed: change.removed || false,
        file: change.file ? this.normalizeFile(change.file) : null,
        changeType: change.removed ? 'deleted' : (change.file?.trashed ? 'trashed' : 'modified')
      }));

      log.info({ changeCount: changes.length }, 'Changes listed successfully');

      return {
        success: true,
        changes,
        newStartPageToken: result.data?.newStartPageToken || null,
        nextPageToken: result.data?.nextPageToken || null
      };
    } catch (error) {
      log.error({ error: error.message }, 'Failed to list Google Drive changes');
      return {
        success: false,
        error: error.message,
        changes: []
      };
    }
  }

  /**
   * Search for files
   * @param {string} query - Search query (supports Google Drive search syntax)
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async searchFiles(query, options = {}) {
    const { pageSize = 25, folderId = null } = options;

    log.info({ query, pageSize }, 'Searching Google Drive files');

    try {
      // Build search query
      let searchQuery = `fullText contains '${query.replace(/'/g, "\\'")}'`;

      if (folderId) {
        searchQuery += ` and '${folderId}' in parents`;
      }

      searchQuery += ' and trashed = false';

      const result = await this.executeComposioTool('GOOGLEDRIVE_LIST_FILES', {
        q: searchQuery,
        page_size: pageSize,
        fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink)'
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
      log.error({ error: error.message, query }, 'Google Drive search failed');
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  /**
   * Check if a file is a Google Workspace file
   * @param {string} mimeType - File MIME type
   * @returns {boolean}
   */
  isGoogleWorkspaceFile(mimeType) {
    return mimeType in GOOGLE_WORKSPACE_TYPES;
  }

  /**
   * Get export info for Google Workspace file
   * @param {string} mimeType - File MIME type
   * @returns {Object|null}
   */
  getExportInfo(mimeType) {
    return GOOGLE_WORKSPACE_TYPES[mimeType] || null;
  }

  /**
   * Normalize Google Drive file response to common format
   */
  normalizeFile(file) {
    const isGoogleWorkspace = this.isGoogleWorkspaceFile(file.mimeType);
    const exportInfo = isGoogleWorkspace ? this.getExportInfo(file.mimeType) : null;

    return {
      id: file.id,
      name: file.name,
      path: `/${file.name}`, // Google Drive doesn't have paths, so we use name
      type: this.getFileType(file.name, file.mimeType),
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : null,
      createdAt: file.createdTime,
      modifiedAt: file.modifiedTime,
      contentHash: file.md5Checksum,
      webUrl: file.webViewLink,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      parentId: file.parents?.[0] || null,
      deleted: file.trashed || false,
      isGoogleWorkspace,
      exportAs: exportInfo?.extension || null
    };
  }

  /**
   * Get file type from filename or MIME type
   */
  getFileType(filename, mimeType) {
    // Check for Google Workspace files first
    if (mimeType && this.isGoogleWorkspaceFile(mimeType)) {
      return this.getExportInfo(mimeType)?.extension || 'gdoc';
    }

    // Check for folder
    if (mimeType === 'application/vnd.google-apps.folder') {
      return 'folder';
    }

    // Use file extension
    if (filename) {
      const ext = filename.split('.').pop()?.toLowerCase();
      if (ext && ext !== filename.toLowerCase()) {
        return ext;
      }
    }

    return 'unknown';
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
      log.debug({ toolName, params }, 'Executing Composio tool');

      // Placeholder - in production this would call Composio's MCP
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
      type: 'google_drive',
      configured: !!this.composioSession
    };
  }
}

// Export class and constants
export default GoogleDriveConnector;
export { GoogleDriveConnector, GOOGLE_WORKSPACE_TYPES };
