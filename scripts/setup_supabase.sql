-- Supabase Schema for Document Management
-- Run this script in the Supabase SQL Editor to create the document storage schema.
--
-- Tables:
--   documents: Uploaded document metadata
--   document_chunks: Parsed text chunks for RAG retrieval
--
-- Features:
--   - Row Level Security (RLS) for multi-tenant isolation
--   - Automatic timestamps
--   - Full-text search on chunk content
--   - Indexes for common query patterns

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable pgvector for future embedding storage (optional)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- DOCUMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- File metadata
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- File extension (pdf, docx, txt, etc.)
  mimetype TEXT,
  size_bytes BIGINT NOT NULL,

  -- Processing status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message TEXT,

  -- Parsing metadata from Docling
  metadata JSONB DEFAULT '{}'::jsonb,
  chunks_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_name ON documents USING gin(name gin_trgm_ops);

-- =====================================================
-- DOCUMENT_CHUNKS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Chunk content
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,

  -- Location metadata
  page_number INTEGER,

  -- Additional metadata from parsing
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Future: embedding vector for semantic search
  -- embedding vector(1536),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for chunks
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_chunks_chunk_index ON document_chunks(document_id, chunk_index);

-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_chunks_content_fts
  ON document_chunks
  USING gin(to_tsvector('english', content));

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Documents policies: users can only access their own documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Chunks policies: users can only access chunks of their own documents
CREATE POLICY "Users can view own chunks"
  ON document_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chunks"
  ON document_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chunks"
  ON document_chunks FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- SERVICE ROLE POLICIES (for backend operations)
-- =====================================================

-- Allow service role to bypass RLS for backend processing
-- This is handled automatically by Supabase when using the service_role key

-- =====================================================
-- STORAGE BUCKET (for original files)
-- =====================================================

-- Create storage bucket for document files
-- Run this in Supabase Dashboard > Storage or via API:
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false);
--
-- Storage policies:
-- CREATE POLICY "Users can upload own documents"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can read own documents"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete own documents"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to search chunks using full-text search
CREATE OR REPLACE FUNCTION search_document_chunks(
  p_user_id UUID,
  p_query TEXT,
  p_document_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  chunk_index INTEGER,
  page_number INTEGER,
  metadata JSONB,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    dc.page_number,
    dc.metadata,
    ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', p_query)) as rank
  FROM document_chunks dc
  WHERE dc.user_id = p_user_id
    AND (p_document_id IS NULL OR dc.document_id = p_document_id)
    AND to_tsvector('english', dc.content) @@ plainto_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_document_chunks TO authenticated;

-- =====================================================
-- ENTERPRISE CONNECTOR TABLES
-- =====================================================

-- Source connection types
-- Represents connections to external document sources (SharePoint, Google Drive, etc.)
CREATE TABLE IF NOT EXISTS source_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Connection details
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sharepoint', 'google_drive', 'onedrive', 'dropbox', 's3', 'local')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Authentication
  auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth', 'api_key', 'service_account')),
  credentials_encrypted BYTEA,  -- Encrypted credentials

  -- Sync settings
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60,
  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'connected', 'syncing', 'error', 'disabled')),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for source_connections
CREATE INDEX IF NOT EXISTS idx_source_connections_user_id ON source_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_source_connections_type ON source_connections(type);
CREATE INDEX IF NOT EXISTS idx_source_connections_status ON source_connections(status);
CREATE INDEX IF NOT EXISTS idx_source_connections_next_sync ON source_connections(next_sync_at)
  WHERE sync_enabled = true AND status = 'connected';

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_source_connections_updated_at ON source_connections;
CREATE TRIGGER update_source_connections_updated_at
  BEFORE UPDATE ON source_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SOURCE FILES TABLE
-- =====================================================

-- Tracks files discovered from external sources
CREATE TABLE IF NOT EXISTS source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES source_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- External file reference
  external_id TEXT NOT NULL,        -- ID in the source system
  external_path TEXT NOT NULL,      -- Path/URL in the source system
  name TEXT NOT NULL,
  type TEXT NOT NULL,               -- File extension
  mimetype TEXT,
  size_bytes BIGINT,

  -- Version tracking
  external_modified_at TIMESTAMPTZ,
  external_version TEXT,            -- ETag or version ID from source
  content_hash TEXT,                -- Hash of content for change detection

  -- Sync status
  sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'downloading', 'processing', 'synced', 'error', 'skipped')),
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,

  -- Timestamps
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one entry per external file per connection
  UNIQUE (connection_id, external_id)
);

-- Indexes for source_files
CREATE INDEX IF NOT EXISTS idx_source_files_connection_id ON source_files(connection_id);
CREATE INDEX IF NOT EXISTS idx_source_files_user_id ON source_files(user_id);
CREATE INDEX IF NOT EXISTS idx_source_files_document_id ON source_files(document_id);
CREATE INDEX IF NOT EXISTS idx_source_files_sync_status ON source_files(sync_status);
CREATE INDEX IF NOT EXISTS idx_source_files_external_path ON source_files(external_path);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_source_files_updated_at ON source_files;
CREATE TRIGGER update_source_files_updated_at
  BEFORE UPDATE ON source_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROCESSING QUEUE TABLE
-- =====================================================

-- Queue for files waiting to be processed
CREATE TABLE IF NOT EXISTS processing_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- References (one of these should be set)
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  source_file_id UUID REFERENCES source_files(id) ON DELETE CASCADE,

  -- Queue metadata
  priority INTEGER NOT NULL DEFAULT 0,  -- Higher = more urgent
  job_type TEXT NOT NULL CHECK (job_type IN ('parse', 'reparse', 'sync', 'embed')),

  -- Processing options
  options JSONB DEFAULT '{}'::jsonb,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,

  -- Worker assignment
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure either document_id or source_file_id is set
  CHECK (document_id IS NOT NULL OR source_file_id IS NOT NULL)
);

-- Indexes for processing_queue
CREATE INDEX IF NOT EXISTS idx_processing_queue_user_id ON processing_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_status ON processing_queue(status);
CREATE INDEX IF NOT EXISTS idx_processing_queue_priority ON processing_queue(priority DESC, created_at ASC)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_processing_queue_document_id ON processing_queue(document_id);
CREATE INDEX IF NOT EXISTS idx_processing_queue_source_file_id ON processing_queue(source_file_id);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_processing_queue_updated_at ON processing_queue;
CREATE TRIGGER update_processing_queue_updated_at
  BEFORE UPDATE ON processing_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ENTERPRISE CONNECTOR RLS POLICIES
-- =====================================================

-- Enable RLS on enterprise tables
ALTER TABLE source_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE processing_queue ENABLE ROW LEVEL SECURITY;

-- Source connections policies
CREATE POLICY "Users can view own connections"
  ON source_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON source_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON source_connections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON source_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Source files policies
CREATE POLICY "Users can view own source files"
  ON source_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own source files"
  ON source_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own source files"
  ON source_files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own source files"
  ON source_files FOR DELETE
  USING (auth.uid() = user_id);

-- Processing queue policies
CREATE POLICY "Users can view own queue items"
  ON processing_queue FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own queue items"
  ON processing_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue items"
  ON processing_queue FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue items"
  ON processing_queue FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- QUEUE HELPER FUNCTIONS
-- =====================================================

-- Function to claim next job from queue
CREATE OR REPLACE FUNCTION claim_next_queue_job(
  p_worker_id TEXT,
  p_job_types TEXT[] DEFAULT ARRAY['parse', 'reparse', 'sync', 'embed']
)
RETURNS processing_queue AS $$
DECLARE
  claimed_job processing_queue;
BEGIN
  -- Select and lock the highest priority pending job
  SELECT * INTO claimed_job
  FROM processing_queue
  WHERE status = 'pending'
    AND job_type = ANY(p_job_types)
    AND attempts < max_attempts
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- If we found a job, claim it
  IF claimed_job.id IS NOT NULL THEN
    UPDATE processing_queue
    SET
      status = 'processing',
      worker_id = p_worker_id,
      started_at = now(),
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = claimed_job.id
    RETURNING * INTO claimed_job;
  END IF;

  RETURN claimed_job;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a queue job
CREATE OR REPLACE FUNCTION complete_queue_job(
  p_job_id UUID,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE processing_queue
  SET
    status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
    error_message = p_error_message,
    completed_at = now(),
    updated_at = now()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE documents IS 'Stores metadata for uploaded documents';
COMMENT ON TABLE document_chunks IS 'Stores parsed text chunks for RAG retrieval';
COMMENT ON TABLE source_connections IS 'Enterprise connector configurations (SharePoint, Google Drive, etc.)';
COMMENT ON TABLE source_files IS 'Files discovered from external enterprise sources';
COMMENT ON TABLE processing_queue IS 'Queue for document processing jobs';
COMMENT ON FUNCTION search_document_chunks IS 'Full-text search across document chunks for a user';
COMMENT ON FUNCTION claim_next_queue_job IS 'Atomically claim the next pending job from the queue';
COMMENT ON FUNCTION complete_queue_job IS 'Mark a queue job as completed or failed';
