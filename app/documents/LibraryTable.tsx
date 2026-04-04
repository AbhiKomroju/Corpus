'use client';

import { formatFileSizeBytes, formatLocaleDateTime } from '@/lib/format-display';
import {
  documentDownloadHref,
  isPdfFileName,
  nonPdfViewerUrl,
  pdfPreviewUrl,
} from './documentUrls';
import type { LibraryDocument, ViewerSelection } from './types';

type LibraryTableProps = {
  documents: LibraryDocument[];
  deletingId: string | null;
  /** Parent opens confirm UI; API delete runs only after user confirms */
  onDelete: (id: string, name: string) => void;
  onOpenViewer: (selection: ViewerSelection) => void;
};

const thClass =
  'font-mono text-[10px] uppercase tracking-[0.2em] px-4 py-3 font-medium';
const linkBtnClass =
  'shrink-0 font-mono text-xs uppercase tracking-wide underline decoration-2 underline-offset-4';

/**
 * Scrollable stamped table listing ingested documents with preview/download/delete.
 */
export function LibraryTable({ documents, deletingId, onDelete, onOpenViewer }: LibraryTableProps) {
  return (
    <div className="border-[3px] border-border bg-surface overflow-hidden shadow-stamp-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-border text-surface text-left">
              <th className={thClass}>File</th>
              <th className={thClass}>Type</th>
              <th className={thClass}>Size</th>
              <th className={thClass}>Chunks</th>
              <th className={thClass}>Ingested</th>
              <th className={`${thClass} w-[1%] whitespace-nowrap text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-t-2 border-border hover:bg-paper/60 transition-colors"
              >
                <td className="px-4 py-4">
                  <span className="font-medium text-ink">{doc.file_name}</span>
                </td>
                <td className="px-4 py-4">
                  <span className="font-mono text-[11px] px-2 py-1 border border-border bg-paper text-moss uppercase">
                    {doc.file_type || 'unknown'}
                  </span>
                </td>
                <td className="px-4 py-4 font-mono text-sm text-ink-muted">
                  {formatFileSizeBytes(doc.file_size)}
                </td>
                <td className="px-4 py-4 font-mono text-sm text-ink">{doc.total_chunks}</td>
                <td className="px-4 py-4 font-mono text-xs text-ink-muted whitespace-nowrap">
                  {formatLocaleDateTime(doc.upload_date)}
                </td>
                <td className="px-4 py-4 text-right whitespace-nowrap w-[1%]">
                  <DocumentRowActions
                    doc={doc}
                    deletingId={deletingId}
                    onDelete={onDelete}
                    onOpenViewer={onOpenViewer}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type RowActionsProps = {
  doc: LibraryDocument;
  deletingId: string | null;
  onDelete: (id: string, name: string) => void;
  onOpenViewer: (selection: ViewerSelection) => void;
};

/**
 * Preview vs PDF branching and download/delete controls for one row.
 */
function DocumentRowActions({ doc, deletingId, onDelete, onOpenViewer }: RowActionsProps) {
  const pdf = isPdfFileName(doc.file_name);

  return (
    <div className="inline-flex flex-nowrap items-center justify-end gap-x-4 gap-y-1">
      {pdf ? (
        <>
          <button
            type="button"
            onClick={() =>
              onOpenViewer({
                url: pdfPreviewUrl(doc),
                name: doc.file_name,
                id: doc.id,
                isPDF: true,
              })
            }
            className={`${linkBtnClass} text-accent hover:text-accent-hover`}
          >
            Preview
          </button>
          <a
            href={documentDownloadHref(doc.id)}
            download={doc.file_name}
            className={`${linkBtnClass} text-moss hover:text-moss-hover`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() =>
              onOpenViewer({
                url: nonPdfViewerUrl(doc),
                name: doc.file_name,
                id: doc.id,
                isPDF: false,
              })
            }
            className={`${linkBtnClass} text-accent hover:text-accent-hover`}
          >
            View
          </button>
          <a
            href={documentDownloadHref(doc.id)}
            download={doc.file_name}
            className={`${linkBtnClass} text-moss hover:text-moss-hover shrink-0`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </>
      )}
      <button
        type="button"
        onClick={() => onDelete(doc.id, doc.file_name)}
        disabled={deletingId === doc.id}
        className="shrink-0 font-mono text-xs uppercase tracking-wide text-danger hover:underline disabled:opacity-40"
      >
        {deletingId === doc.id ? '…' : 'Delete'}
      </button>
    </div>
  );
}
