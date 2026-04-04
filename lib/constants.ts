/**
 * Upload size cap (5 MiB). Used by POST /api/upload and the upload modal.
 * Keeps client and server aligned and fits typical serverless body limits.
 */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MAX_UPLOAD_LABEL_MB = MAX_UPLOAD_BYTES / (1024 * 1024);

/**
 * RAG / embeddings — must match `supabase-setup.sql` (`vector(768)`) and upload route.
 */
export const EMBEDDING_DIMENSIONS = 768;

export const RAG_TOP_K = 5;

/** Minimum cosine similarity (0 = return top-K regardless). Passed to `match_documents`. */
export const RAG_MATCH_THRESHOLD = 0;

export const GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';

export const GEMINI_CHAT_MODEL = 'gemini-2.5-flash-lite';

/** Supabase Storage bucket for originals (see README setup). */
export const SUPABASE_DOCUMENTS_BUCKET = 'documents';

/** LangChain text splitter — tune for retrieval granularity vs API cost. */
export const TEXT_CHUNK_SIZE = 800;

export const TEXT_CHUNK_OVERLAP = 100;
