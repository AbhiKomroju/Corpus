'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchJson, getApiPayloadError } from '@/lib/fetch-json';
import { AppShell } from '../components/AppShell';
import { DeleteDocumentDialog } from '../components/DeleteDocumentDialog';
import PDFViewerModal from '../components/PDFViewerModal';
import UploadModal from '../components/UploadModal';
import { LibraryTable } from './LibraryTable';
import type {
  DocumentDeleteApiResponse,
  DocumentDeleteTarget,
  DocumentsListApiResponse,
  LibraryDocument,
  ViewerSelection,
} from './types';

/**
 * Documents page — library view for managing uploaded documents.
 * Table, preview modal, and upload flow; list state refreshes after ingest or delete.
 * @returns Full-page library UI
 */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [viewerSelection, setViewerSelection] = useState<ViewerSelection | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDeleteTarget | null>(null);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchJson<DocumentsListApiResponse>('/api/documents');
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const apiErr = getApiPayloadError(result.data, result.status);
      if (apiErr) {
        setError(apiErr);
        return;
      }
      setDocuments(result.data.documents ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  const requestDeleteDocument = (id: string, name: string) => {
    setDeleteDialogError(null);
    setDeleteTarget({ id, name });
  };

  const cancelDeleteDocument = () => {
    if (deletingId) return;
    setDeleteTarget(null);
    setDeleteDialogError(null);
  };

  /**
   * Runs after in-app confirmation; updates list on success, inline error in dialog on failure.
   */
  const confirmDeleteDocument = async () => {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setDeletingId(id);
    setDeleteDialogError(null);

    try {
      const result = await fetchJson<DocumentDeleteApiResponse>(
        `/api/documents?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' },
      );

      if (!result.ok) {
        setDeleteDialogError(result.error);
        return;
      }

      const apiErr = getApiPayloadError(result.data, result.status);
      if (apiErr) {
        setDeleteDialogError(apiErr);
        return;
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  const openViewer = (selection: ViewerSelection) => {
    setViewerSelection(selection);
    setShowPDFModal(true);
  };

  const closeViewer = () => {
    setShowPDFModal(false);
    setViewerSelection(null);
  };

  return (
    <AppShell mainClassName="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-ink leading-tight mb-2">Library</h1>
          <p className="font-mono text-sm text-ink-muted max-w-md border-l-2 border-moss pl-4">
            Ingested files live in Storage; chunks and vectors sit in Postgres. Preview or purge from
            here.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="shrink-0 font-display text-lg px-6 py-3 bg-moss text-surface border-2 border-border shadow-stamp hover:bg-moss-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-0 active:translate-y-0 active:shadow-none transition-all self-start sm:self-auto"
        >
          Add manuscript
        </button>
      </div>

      {loading ? (
        <div className="border-[3px] border-dashed border-border bg-surface/50 py-20 text-center">
          <p className="font-mono text-sm text-ink-muted animate-pulse">Loading catalogue…</p>
        </div>
      ) : error ? (
        <div className="border-[3px] border-border bg-danger-paper p-6">
          <p className="font-mono text-sm text-danger">Error: {error}</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="border-[3px] border-border bg-surface p-12 sm:p-16 text-center shadow-stamp-sm">
          <p className="font-display text-2xl text-ink mb-3">The shelves are empty</p>
          <p className="font-mono text-sm text-ink-muted mb-8 max-w-md mx-auto">
            Upload a PDF, DOCX, or TXT to chunk, embed, and query from the Query tab.
          </p>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="font-mono text-sm uppercase tracking-wider px-6 py-3 border-2 border-border bg-accent text-surface shadow-stamp-sm hover:bg-accent-hover transition-colors"
          >
            First upload
          </button>
        </div>
      ) : (
        <LibraryTable
          documents={documents}
          deletingId={deletingId}
          onDelete={requestDeleteDocument}
          onOpenViewer={openViewer}
        />
      )}

      <DeleteDocumentDialog
        isOpen={deleteTarget !== null}
        fileName={deleteTarget?.name ?? ''}
        busy={deletingId !== null}
        errorMessage={deleteDialogError}
        onCancel={cancelDeleteDocument}
        onConfirm={() => void confirmDeleteDocument()}
      />

      {viewerSelection && (
        <PDFViewerModal
          isOpen={showPDFModal}
          onClose={closeViewer}
          fileUrl={viewerSelection.url}
          fileName={viewerSelection.name}
          documentId={viewerSelection.id}
          isPDF={viewerSelection.isPDF !== false}
        />
      )}

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={fetchDocuments}
      />
    </AppShell>
  );
}
