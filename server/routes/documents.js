/**
 * Document Routes
 *
 * API endpoints for document upload, processing, and retrieval.
 * Uses Supabase for storage and metadata persistence.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import logger from '../lib/logger.js';
import doclingClient from '../lib/docling-client.js';
import {
  isSupabaseConfigured,
  uploadFile,
  getSignedUrl,
  createDocument,
  updateDocument,
  getDocument,
  listDocuments,
  deleteDocument,
  storeChunks
} from '../lib/supabase.js';

const router = Router();
const log = logger.base.child({ module: 'documents' });

// Default user ID for single-user mode (no auth)
const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown',
      'application/json',
      'text/csv',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp'
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype || ext}`), false);
    }
  }
});

// In-memory fallback store (used when Supabase is not configured)
const memoryDocuments = new Map();

/**
 * Generate a document ID
 */
function generateDocumentId() {
  return crypto.randomUUID();
}

/**
 * POST /api/documents/upload
 * Upload and process a document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  const documentId = generateDocumentId();
  const { originalname, size, mimetype, buffer } = req.file;
  const { chunkSize = 1000, extractTables = true, skipProcessing = false } = req.body;
  const userId = req.body.userId || DEFAULT_USER_ID;
  const fileType = path.extname(originalname).slice(1).toLowerCase();

  log.info({
    documentId,
    filename: originalname,
    size,
    mimetype,
    supabaseEnabled: isSupabaseConfigured()
  }, 'Document upload started');

  // Create document record
  const document = {
    id: documentId,
    userId,
    name: originalname,
    type: fileType,
    size,
    mimetype,
    uploadedAt: Date.now(),
    status: 'pending',
    chunks: [],
    metadata: {},
    storagePath: null
  };

  try {
    // Upload file to Supabase Storage
    if (isSupabaseConfigured()) {
      const { path: storagePath, error: uploadError } = await uploadFile(
        buffer,
        documentId,
        originalname,
        mimetype
      );

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError}`);
      }

      document.storagePath = storagePath;

      // Create document record in database
      const { document: dbDoc, error: dbError } = await createDocument({
        id: documentId,
        userId,
        name: originalname,
        type: fileType,
        mimetype,
        size,
        status: 'pending',
        metadata: { storagePath }
      });

      if (dbError) {
        throw new Error(`Database insert failed: ${dbError}`);
      }

      log.info({ documentId, storagePath }, 'File uploaded to Supabase');
    } else {
      // Fallback: store in memory
      document.buffer = buffer;
      memoryDocuments.set(documentId, document);
    }

    // Skip processing for images or if explicitly requested
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileType);
    if (skipProcessing === 'true' || skipProcessing === true || isImage) {
      document.status = 'ready';
      document.processedAt = Date.now();

      if (isSupabaseConfigured()) {
        await updateDocument(documentId, {
          status: 'ready',
          processed_at: new Date().toISOString()
        });
      }

      return res.status(201).json({
        id: document.id,
        name: document.name,
        type: document.type,
        size: document.size,
        status: document.status,
        chunksCount: 0,
        processedAt: document.processedAt
      });
    }

    // Update status to processing
    document.status = 'processing';
    if (isSupabaseConfigured()) {
      await updateDocument(documentId, { status: 'processing' });
    }

    // Parse document using Docling
    const result = await doclingClient.parseSync(buffer, originalname, {
      chunkSize: parseInt(chunkSize, 10),
      extractTables: extractTables === 'true' || extractTables === true
    });

    // Update document with parsed content
    document.status = result.status === 'completed' ? 'ready' : 'error';
    document.chunks = result.chunks || [];
    document.metadata = result.metadata || {};
    document.processedAt = Date.now();
    document.error = result.error;

    // Store in Supabase
    if (isSupabaseConfigured()) {
      await updateDocument(documentId, {
        status: document.status,
        processed_at: new Date().toISOString(),
        metadata: document.metadata,
        chunks_count: document.chunks.length,
        error_message: document.error || null
      });

      // Store chunks
      if (document.chunks.length > 0) {
        await storeChunks(documentId, userId, document.chunks);
      }
    }

    log.info({
      documentId,
      status: document.status,
      chunks: document.chunks.length,
      processingTimeMs: result.processing_time_ms
    }, 'Document processing completed');

    res.status(201).json({
      id: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
      status: document.status,
      chunksCount: document.chunks.length,
      processedAt: document.processedAt
    });
  } catch (error) {
    log.error({ documentId, error: error.message }, 'Document processing failed');

    document.status = 'error';
    document.error = error.message;

    if (isSupabaseConfigured()) {
      await updateDocument(documentId, {
        status: 'error',
        error_message: error.message
      });
    }

    res.status(500).json({
      error: 'Document processing failed',
      message: error.message,
      documentId
    });
  }
});

/**
 * GET /api/documents
 * List all documents
 */
router.get('/', async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  if (isSupabaseConfigured()) {
    const { documents, total, error } = await listDocuments({
      status,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    if (error) {
      return res.status(500).json({ error });
    }

    res.json({
      documents: documents.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size_bytes,
        status: d.status,
        uploadedAt: new Date(d.created_at).getTime(),
        processedAt: d.processed_at ? new Date(d.processed_at).getTime() : null,
        chunksCount: d.chunks_count || 0
      })),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } else {
    // Fallback: use memory store
    let docs = Array.from(memoryDocuments.values());

    if (status) {
      docs = docs.filter(d => d.status === status);
    }

    docs.sort((a, b) => b.uploadedAt - a.uploadedAt);

    const total = docs.length;
    const paginatedDocs = docs.slice(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10));

    res.json({
      documents: paginatedDocs.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        status: d.status,
        uploadedAt: d.uploadedAt,
        processedAt: d.processedAt,
        chunksCount: d.chunks?.length || 0
      })),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a single document with full details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured()) {
    const { document, error } = await getDocument(id);

    if (error) {
      return res.status(error === 'Document not found' ? 404 : 500).json({ error });
    }

    res.json({
      id: document.id,
      name: document.name,
      type: document.type,
      size: document.size_bytes,
      mimetype: document.mimetype,
      status: document.status,
      uploadedAt: new Date(document.created_at).getTime(),
      processedAt: document.processed_at ? new Date(document.processed_at).getTime() : null,
      chunksCount: document.chunks_count || 0,
      metadata: document.metadata,
      error: document.error_message
    });
  } else {
    const document = memoryDocuments.get(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      id: document.id,
      name: document.name,
      type: document.type,
      size: document.size,
      mimetype: document.mimetype,
      status: document.status,
      uploadedAt: document.uploadedAt,
      processedAt: document.processedAt,
      chunksCount: document.chunks?.length || 0,
      metadata: document.metadata,
      error: document.error
    });
  }
});

/**
 * GET /api/documents/:id/url
 * Get a signed URL for the document file
 */
router.get('/:id/url', async (req, res) => {
  const { id } = req.params;
  const { expiresIn = 3600 } = req.query;

  if (!isSupabaseConfigured()) {
    return res.status(501).json({
      error: 'Supabase not configured',
      message: 'Document URLs require Supabase storage'
    });
  }

  // Get document to find file path
  const { document, error: docError } = await getDocument(id);

  if (docError) {
    return res.status(docError === 'Document not found' ? 404 : 500).json({ error: docError });
  }

  // Construct file path
  const filePath = `${id}/${document.name}`;

  const { url, error } = await getSignedUrl(filePath, parseInt(expiresIn, 10));

  if (error) {
    return res.status(500).json({ error });
  }

  res.json({ url, expiresIn: parseInt(expiresIn, 10) });
});

/**
 * GET /api/documents/:id/chunks
 * Get document chunks for RAG
 */
router.get('/:id/chunks', async (req, res) => {
  const { id } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  if (isSupabaseConfigured()) {
    // Fetch from Supabase
    const { supabase: getSupabaseClient } = await import('../lib/supabase.js');
    const supabase = getSupabaseClient();

    const { data, error, count } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact' })
      .eq('document_id', id)
      .order('chunk_index', { ascending: true })
      .range(parseInt(offset, 10), parseInt(offset, 10) + parseInt(limit, 10) - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      documentId: id,
      chunks: data.map(c => ({
        id: c.id,
        content: c.content,
        chunkIndex: c.chunk_index,
        pageNumber: c.page_number,
        metadata: c.metadata
      })),
      total: count || 0,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } else {
    const document = memoryDocuments.get(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const chunks = document.chunks || [];
    const paginatedChunks = chunks.slice(
      parseInt(offset, 10),
      parseInt(offset, 10) + parseInt(limit, 10)
    );

    res.json({
      documentId: id,
      chunks: paginatedChunks,
      total: chunks.length,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured()) {
    // Get document first to get file name
    const { document, error: docError } = await getDocument(id);

    if (docError === 'Document not found') {
      return res.status(404).json({ error: 'Document not found' });
    }

    const { success, error } = await deleteDocument(id, document?.name);

    if (error) {
      return res.status(500).json({ error });
    }

    log.info({ documentId: id }, 'Document deleted');
    res.json({ success: true, id });
  } else {
    if (!memoryDocuments.has(id)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    memoryDocuments.delete(id);
    log.info({ documentId: id }, 'Document deleted');
    res.json({ success: true, id });
  }
});

/**
 * POST /api/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', async (req, res) => {
  const { id } = req.params;

  // Not implemented for now
  res.status(501).json({
    error: 'Reprocessing not implemented',
    message: 'Feature coming soon'
  });
});

/**
 * GET /api/documents/health
 * Check Docling service health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await doclingClient.health();
    res.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      docling: health,
      supabase: isSupabaseConfigured() ? 'configured' : 'not configured',
      circuitBreaker: doclingClient.getCircuitState()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      supabase: isSupabaseConfigured() ? 'configured' : 'not configured',
      circuitBreaker: doclingClient.getCircuitState()
    });
  }
});

export default router;
