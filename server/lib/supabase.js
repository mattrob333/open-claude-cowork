/**
 * Supabase Client for Server
 *
 * Uses the service role key for full database and storage access.
 * Lazy initialization to allow dotenv to load first.
 */

import { createClient } from '@supabase/supabase-js';
import logger from './logger.js';

const log = logger.base.child({ module: 'supabase' });

// Lazy-initialized client
let _supabase = null;
let _initialized = false;

/**
 * Get or create the Supabase client
 * Lazy initialization ensures dotenv has loaded first
 */
function getSupabaseClient() {
  if (!_initialized) {
    _initialized = true;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      log.warn('Supabase credentials not configured - document persistence will be disabled');
    } else {
      _supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      log.info('Supabase client initialized');
    }
  }
  return _supabase;
}

// Export getter for supabase client (lazy initialization)
export { getSupabaseClient as supabase };

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured() {
  return getSupabaseClient() !== null;
}

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} buffer - File content
 * @param {string} documentId - Document ID
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @param {string} userId - User ID for folder organization
 * @returns {Promise<{path: string, error: string | null}>}
 */
export async function uploadFile(buffer, documentId, fileName, mimeType, userId = 'default') {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { path: null, error: 'Supabase not configured' };
  }

  // Store files at: documents/{userId}/{documentId}/{fileName}
  const filePath = `${userId}/${documentId}/${fileName}`;

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: true
    });

  if (error) {
    log.error({ error: error.message, filePath }, 'Failed to upload file to Supabase');
    return { path: null, error: error.message };
  }

  log.info({ filePath }, 'File uploaded to Supabase Storage');
  return { path: data.path, error: null };
}

/**
 * Get a signed URL for a file
 * @param {string} filePath - Path to the file in storage
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<{url: string | null, error: string | null}>}
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { url: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    log.error({ error: error.message, filePath }, 'Failed to create signed URL');
    return { url: null, error: error.message };
  }

  return { url: data.signedUrl, error: null };
}

/**
 * Delete a file from storage
 * @param {string} filePath - Path to the file
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export async function deleteFile(filePath) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  const { error } = await supabase.storage
    .from('documents')
    .remove([filePath]);

  if (error) {
    log.error({ error: error.message, filePath }, 'Failed to delete file');
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Create a document record in the database
 * @param {Object} doc - Document data
 * @returns {Promise<{document: Object | null, error: string | null}>}
 */
export async function createDocument(doc) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { document: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      id: doc.id,
      user_id: doc.userId,
      name: doc.name,
      type: doc.type,
      mimetype: doc.mimetype,
      size_bytes: doc.size,
      status: doc.status || 'pending',
      metadata: doc.metadata || {}
    })
    .select()
    .single();

  if (error) {
    log.error({ error: error.message, docId: doc.id }, 'Failed to create document record');
    return { document: null, error: error.message };
  }

  return { document: data, error: null };
}

/**
 * Update a document record
 * @param {string} documentId - Document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{document: Object | null, error: string | null}>}
 */
export async function updateDocument(documentId, updates) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { document: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    log.error({ error: error.message, documentId }, 'Failed to update document');
    return { document: null, error: error.message };
  }

  return { document: data, error: null };
}

/**
 * Get a document by ID
 * @param {string} documentId - Document ID
 * @returns {Promise<{document: Object | null, error: string | null}>}
 */
export async function getDocument(documentId) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { document: null, error: 'Supabase not configured' };
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { document: null, error: 'Document not found' };
    }
    log.error({ error: error.message, documentId }, 'Failed to get document');
    return { document: null, error: error.message };
  }

  return { document: data, error: null };
}

/**
 * List documents
 * @param {Object} options - Query options
 * @returns {Promise<{documents: Object[], total: number, error: string | null}>}
 */
export async function listDocuments(options = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { documents: [], total: 0, error: 'Supabase not configured' };
  }

  const { status, limit = 50, offset = 0, userId } = options;

  let query = supabase
    .from('documents')
    .select('*', { count: 'exact' });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    log.error({ error: error.message }, 'Failed to list documents');
    return { documents: [], total: 0, error: error.message };
  }

  return { documents: data || [], total: count || 0, error: null };
}

/**
 * Delete a document and its file
 * @param {string} documentId - Document ID
 * @param {string} storagePath - Full storage path for file deletion
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export async function deleteDocument(documentId, storagePath) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Delete file from storage
  if (storagePath) {
    await deleteFile(storagePath);
  }

  // Delete document record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    log.error({ error: error.message, documentId }, 'Failed to delete document');
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

/**
 * Store document chunks
 * @param {string} documentId - Document ID
 * @param {string} userId - User ID
 * @param {Array} chunks - Array of chunk objects
 * @returns {Promise<{count: number, error: string | null}>}
 */
export async function storeChunks(documentId, userId, chunks) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { count: 0, error: 'Supabase not configured' };
  }

  const chunkRecords = chunks.map((chunk, index) => ({
    document_id: documentId,
    content: chunk.content || chunk.text,
    chunk_index: index,
    metadata: chunk.metadata || {}
  }));

  const { data, error } = await supabase
    .from('document_chunks')
    .insert(chunkRecords)
    .select();

  if (error) {
    log.error({ error: error.message, documentId }, 'Failed to store chunks');
    return { count: 0, error: error.message };
  }

  return { count: data?.length || 0, error: null };
}

/**
 * Fetch chunks for multiple documents
 * @param {string[]} documentIds - Array of document IDs
 * @param {Object} options - Query options
 * @returns {Promise<{chunks: Object[], error: string | null}>}
 */
export async function fetchChunksForDocuments(documentIds, options = {}) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { chunks: [], error: 'Supabase not configured' };
  }

  if (!documentIds || documentIds.length === 0) {
    return { chunks: [], error: null };
  }

  const { maxChunksPerDoc = 50, maxTotalChunks = 200 } = options;

  try {
    // Fetch chunks for all documents, ordered by document and chunk index
    const { data, error } = await supabase
      .from('document_chunks')
      .select('id, document_id, content, chunk_index, metadata')
      .in('document_id', documentIds)
      .order('document_id', { ascending: true })
      .order('chunk_index', { ascending: true })
      .limit(maxTotalChunks);

    if (error) {
      log.error({ error: error.message }, 'Failed to fetch document chunks');
      return { chunks: [], error: error.message };
    }

    // Group by document and limit chunks per document
    const chunksByDoc = new Map();
    for (const chunk of data || []) {
      const docChunks = chunksByDoc.get(chunk.document_id) || [];
      if (docChunks.length < maxChunksPerDoc) {
        docChunks.push(chunk);
        chunksByDoc.set(chunk.document_id, docChunks);
      }
    }

    // Flatten back to array
    const limitedChunks = [];
    for (const docChunks of chunksByDoc.values()) {
      limitedChunks.push(...docChunks);
    }

    log.info({ documentCount: documentIds.length, chunkCount: limitedChunks.length }, 'Fetched document chunks');
    return { chunks: limitedChunks, error: null };
  } catch (err) {
    log.error({ error: err.message }, 'Error fetching document chunks');
    return { chunks: [], error: err.message };
  }
}

/**
 * Get document names by IDs (for context formatting)
 * @param {string[]} documentIds - Array of document IDs
 * @returns {Promise<{documents: Object[], error: string | null}>}
 */
export async function getDocumentsByIds(documentIds) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { documents: [], error: 'Supabase not configured' };
  }

  if (!documentIds || documentIds.length === 0) {
    return { documents: [], error: null };
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, name, type')
    .in('id', documentIds);

  if (error) {
    log.error({ error: error.message }, 'Failed to fetch documents by IDs');
    return { documents: [], error: error.message };
  }

  return { documents: data || [], error: null };
}

export default {
  supabase: getSupabaseClient,
  isSupabaseConfigured,
  uploadFile,
  getSignedUrl,
  deleteFile,
  createDocument,
  updateDocument,
  getDocument,
  listDocuments,
  deleteDocument,
  storeChunks,
  fetchChunksForDocuments,
  getDocumentsByIds
};
