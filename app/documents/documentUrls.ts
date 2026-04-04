import type { LibraryDocument } from './types';

/**
 * Whether the library row should use PDF iframe preview (by filename).
 */
export function isPdfFileName(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

/**
 * Signed or proxied file download URL for a document row.
 */
export function documentDownloadHref(documentId: string): string {
  return `/api/documents?id=${encodeURIComponent(documentId)}&file=true`;
}

/**
 * URL shown in the PDF iframe (signed URL with view flag, or API proxy with view=true).
 */
export function pdfPreviewUrl(doc: LibraryDocument): string {
  if (doc.file_url) {
    const sep = doc.file_url.includes('?') ? '&' : '?';
    return `${doc.file_url}${sep}view=true`;
  }
  return `${documentDownloadHref(doc.id)}&view=true`;
}

/**
 * Viewer URL for non-PDF files (text modal); prefers signed URL when present.
 */
export function nonPdfViewerUrl(doc: LibraryDocument): string {
  return doc.file_url || documentDownloadHref(doc.id);
}
