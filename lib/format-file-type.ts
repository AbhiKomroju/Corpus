/**
 * Maps common MIME types to short labels for tables and UI (avoids long strings like DOCX MIME).
 */
const MIME_TO_LABEL: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
};

/**
 * Returns a compact type label for the library table (e.g. "docx", "pdf").
 * @param mimeOrExt - Stored `file.type` from upload, or an extension-like string
 * @param fileName - Used as fallback to read extension
 */
export function formatFileTypeLabel(
  mimeOrExt: string | undefined | null,
  fileName?: string | null,
): string {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (!mimeOrExt || mimeOrExt === 'unknown') {
    return fromName || 'unknown';
  }
  const key = mimeOrExt.trim().toLowerCase();
  if (MIME_TO_LABEL[key]) {
    return MIME_TO_LABEL[key];
  }
  // Already a short extension (some clients store "docx")
  if (key.length <= 8 && !key.includes('/')) {
    return key;
  }
  if (key.includes('pdf')) return 'pdf';
  if (key.includes('wordprocessingml') || key === 'application/msword') return 'docx';
  if (key.includes('text/plain')) return 'txt';
  return fromName || 'file';
}
