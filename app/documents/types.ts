/**
 * One row from GET /api/documents (deduped per document_id).
 */
export type LibraryDocument = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  total_chunks: number;
  file_url?: string;
  file_path?: string;
};

/**
 * Props passed into PDFViewerModal when opening from the library table.
 */
export type ViewerSelection = {
  url: string;
  name: string;
  id?: string;
  isPDF?: boolean;
};

/** GET /api/documents (no query) — library list or error payload */
export type DocumentsListApiResponse = {
  documents?: LibraryDocument[];
  error?: string;
};

/** DELETE /api/documents?id=… */
export type DocumentDeleteApiResponse = {
  success?: boolean;
  error?: string;
  fileDeleted?: boolean;
};

/** Row pending confirmation in DeleteDocumentDialog */
export type DocumentDeleteTarget = {
  id: string;
  name: string;
};
