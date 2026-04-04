/**
 * Shared JSON shapes returned by App Router API routes (client-side typing).
 */

/** POST /api/upload — success and error bodies */
export type UploadApiResponse = {
  success?: boolean;
  error?: string;
  fileName?: string;
  chunks?: number;
};
