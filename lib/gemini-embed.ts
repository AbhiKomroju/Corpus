import { EMBEDDING_DIMENSIONS } from '@/lib/constants';

/**
 * Gemini embedding request shape. `outputDimensionality` is supported by the API but omitted from
 * SDK typings; pass this object to `embedContent` (not an inline literal) to avoid excess-property errors.
 */
export function geminiEmbedContentPayload(text: string) {
  return {
    content: { role: 'user' as const, parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMENSIONS,
  };
}
