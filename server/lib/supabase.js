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
 * @returns {Promise<{path: string, error: string | null}>}
 */
export async function uploadFile(buffer, documentId, fileName, mimeType) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { path: null, error: 'Supabase not configured' };
  }

  // Store files at: documents/{documentId}/{fileName}
  const filePath = `${documentId}/${fileName}`;

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
 * @param {string} fileName - File name for storage deletion
 * @returns {Promise<{success: boolean, error: string | null}>}
 */
export async function deleteDocument(documentId, fileName) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' };
  }

  // Delete file from storage
  if (fileName) {
    await deleteFile(`${documentId}/${fileName}`);
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
    user_id: userId,
    content: chunk.content || chunk.text,
    chunk_index: index,
    page_number: chunk.page || null,
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
  storeChunks
};
