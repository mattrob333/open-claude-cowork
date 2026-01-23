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
-- COMMENTS
-- =====================================================

COMMENT ON TABLE documents IS 'Stores metadata for uploaded documents';
COMMENT ON TABLE document_chunks IS 'Stores parsed text chunks for RAG retrieval';
COMMENT ON FUNCTION search_document_chunks IS 'Full-text search across document chunks for a user';
