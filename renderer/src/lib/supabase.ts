import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Document types
export interface Document {
  id: string;
  user_id: string;
  name: string;
  type: string;
  mimetype: string | null;
  size_bytes: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  metadata: Record<string, unknown>;
  chunks_count: number;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  page_number: number | null;
  metadata: Record<string, unknown>;
}

// Get signed URL for document download
export async function getDocumentUrl(documentId: string, fileName: string): Promise<string | null> {
  try {
    // Documents are stored at: {user_id}/{document_id}/{filename}
    // For now, we'll use a simplified path
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(`${documentId}/${fileName}`, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error getting document URL:', err);
    return null;
  }
}

// Fetch document metadata
export async function getDocument(documentId: string): Promise<Document | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    console.error('Error fetching document:', error);
    return null;
  }

  return data;
}

// Fetch all documents for current user
export async function getDocuments(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching documents:', error);
    return [];
  }

  return data || [];
}

// Upload document to storage and create metadata entry
export async function uploadDocument(
  file: File,
  userId: string
): Promise<{ document: Document; error: string | null }> {
  try {
    // Create document metadata first
    const { data: doc, error: metaError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        name: file.name,
        type: file.name.split('.').pop()?.toLowerCase() || 'unknown',
        mimetype: file.type,
        size_bytes: file.size,
        status: 'pending'
      })
      .select()
      .single();

    if (metaError) {
      return { document: null as unknown as Document, error: metaError.message };
    }

    // Upload file to storage
    const filePath = `${userId}/${doc.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      // Cleanup metadata if upload fails
      await supabase.from('documents').delete().eq('id', doc.id);
      return { document: null as unknown as Document, error: uploadError.message };
    }

    return { document: doc, error: null };
  } catch (err) {
    return {
      document: null as unknown as Document,
      error: err instanceof Error ? err.message : 'Upload failed'
    };
  }
}

// Search document chunks
export async function searchDocuments(
  query: string,
  documentId?: string,
  limit: number = 10
): Promise<DocumentChunk[]> {
  const { data, error } = await supabase.rpc('search_document_chunks', {
    p_user_id: (await supabase.auth.getUser()).data.user?.id,
    p_query: query,
    p_document_id: documentId || null,
    p_limit: limit
  });

  if (error) {
    console.error('Error searching documents:', error);
    return [];
  }

  return data || [];
}
