/**
 * Client-side types for POST /api/search JSON (keeps the home page free of `any`).
 */

/** One retrieved chunk in the `sources` array */
export type RagSourceChunk = {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type SearchApiResponse = {
  answer?: string;
  sources?: RagSourceChunk[];
  error?: string;
};

/**
 * Best-effort label for provenance (metadata keys vary by ingest pipeline).
 */
export function ragSourceLabel(metadata: Record<string, unknown>): string {
  const source = metadata.source;
  const fileName = metadata.file_name;
  if (typeof source === 'string' && source.trim()) return source;
  if (typeof fileName === 'string' && fileName.trim()) return fileName;
  return 'Unknown';
}
