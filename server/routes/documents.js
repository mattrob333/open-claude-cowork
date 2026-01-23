/**
 * Document Routes
 *
 * API endpoints for document upload, processing, and retrieval.
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import logger from '../lib/logger.js';
import doclingClient from '../lib/docling-client.js';

const router = Router();
const log = logger.base.child({ module: 'documents' });

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
      'text/csv'
    ];
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.csv'];

    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype || ext}`), false);
    }
  }
});

// In-memory document store (replace with database in production)
const documents = new Map();

/**
 * Generate a document ID
 */
function generateDocumentId() {
  return `doc_${crypto.randomBytes(8).toString('hex')}`;
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
  const { chunkSize = 1000, extractTables = true } = req.body;

  log.info({
    documentId,
    filename: originalname,
    size,
    mimetype
  }, 'Document upload started');

  // Create document record
  const document = {
    id: documentId,
    name: originalname,
    type: path.extname(originalname).slice(1),
    size,
    mimetype,
    uploadedAt: Date.now(),
    status: 'processing',
    chunks: [],
    metadata: {}
  };

  documents.set(documentId, document);

  try {
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
router.get('/', (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let docs = Array.from(documents.values());

  // Filter by status if provided
  if (status) {
    docs = docs.filter(d => d.status === status);
  }

  // Sort by uploadedAt descending
  docs.sort((a, b) => b.uploadedAt - a.uploadedAt);

  // Pagination
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
});

/**
 * GET /api/documents/:id
 * Get a single document with full details
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const document = documents.get(id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  res.json(document);
});

/**
 * GET /api/documents/:id/chunks
 * Get document chunks for RAG
 */
router.get('/:id/chunks', (req, res) => {
  const { id } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  const document = documents.get(id);

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
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!documents.has(id)) {
    return res.status(404).json({ error: 'Document not found' });
  }

  documents.delete(id);
  log.info({ documentId: id }, 'Document deleted');

  res.json({ success: true, id });
});

/**
 * POST /api/documents/:id/reprocess
 * Reprocess a document
 */
router.post('/:id/reprocess', async (req, res) => {
  const { id } = req.params;
  const { chunkSize = 1000 } = req.body;

  const document = documents.get(id);

  if (!document) {
    return res.status(404).json({ error: 'Document not found' });
  }

  // Check if we have the original content
  // In production, this would retrieve from storage
  res.status(501).json({
    error: 'Reprocessing requires stored original document',
    message: 'Not implemented in memory-only mode'
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
      circuitBreaker: doclingClient.getCircuitState()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      circuitBreaker: doclingClient.getCircuitState()
    });
  }
});

export default router;
