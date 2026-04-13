-- ==========================================================
-- RAG Search App — Supabase Database Setup
-- ==========================================================
-- Run this SQL in your Supabase SQL Editor (Dashboard → SQL Editor)
-- This sets up everything needed for vector search and RAG.
--
-- IMPORTANT: If you previously ran the OpenAI version (1536 dims),
-- drop the old table first:  DROP TABLE IF EXISTS documents;
-- ==========================================================

-- 1. Enable the pgvector extension for embedding storage and similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table to store chunks, metadata, and embeddings
-- Gemini's gemini-embedding-001 with outputDimensionality=768
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(768),
  file_path TEXT NULL,
  file_url TEXT NULL
);

-- 3. Create an index for fast cosine similarity search on embeddings
-- Using hnsw instead of ivfflat because ivfflat has a 2000-dim limit
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- 4. Enable Row Level Security (RLS)
-- With RLS enabled, the anon key (public / client-facing) can only SELECT.
-- All inserts, updates, and deletes go through API routes using the
-- service_role key, which bypasses RLS entirely.
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 4a. Allow the anon role to read all documents (needed for library listing
--     and as a safety net — server routes use service_role anyway).
CREATE POLICY "anon_select_documents"
  ON documents
  FOR SELECT
  TO anon
  USING (true);

-- 4b. Allow the authenticated role to read all documents
--     (forward-compatible for when user auth is added).
CREATE POLICY "authenticated_select_documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

-- 4c. Allow the authenticated role full write access
--     (future-proofing: logged-in users can insert/update/delete).
CREATE POLICY "authenticated_insert_documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update_documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete_documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (true);

-- NOTE: The anon role has NO insert/update/delete policies.
-- The service_role key (used by API routes) bypasses RLS, so server
-- mutations work without issue. This prevents direct client-side
-- writes through the publicly-exposed anon key.

-- 5. Create the match_documents function used by the /api/search route
-- This performs cosine similarity search and returns the top matches
-- SECURITY INVOKER (default): runs with the caller's privileges, so
-- anon callers are still subject to the SELECT policy above.
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > match_threshold
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
