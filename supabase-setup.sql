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

-- 4. Create the match_documents function used by the /api/search route
-- This performs cosine similarity search and returns the top matches
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
