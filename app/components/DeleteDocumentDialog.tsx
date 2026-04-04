'use client';

import { ModalCloseButton } from './ModalCloseButton';
import { modalPanelBaseClass } from './modalChrome';
import { ModalPortal } from './ModalPortal';

type DeleteDocumentDialogProps = {
  isOpen: boolean;
  /** Display name of the file to delete (for copy only) */
  fileName: string;
  /** True while DELETE is in flight */
  busy: boolean;
  /** Shown after a failed delete attempt */
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * In-app confirmation for destructive library actions (replaces `window.confirm`).
 */
export function DeleteDocumentDialog({
  isOpen,
  fileName,
  busy,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteDocumentDialogProps) {
  return (
    <ModalPortal isOpen={isOpen} onBackdropClose={busy ? undefined : onCancel}>
      <div
        className={`${modalPanelBaseClass} w-full max-w-md overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-doc-title"
        aria-describedby="delete-doc-desc"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-border p-6">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
              Library
            </p>
            <h2 id="delete-doc-title" className="font-display text-xl text-ink">
              Remove document?
            </h2>
          </div>
          <ModalCloseButton onClick={onCancel} disabled={busy} />
        </div>
        <div className="p-6">
          <p id="delete-doc-desc" className="font-mono text-sm leading-relaxed text-ink-muted">
            <span className="text-ink font-medium">{fileName}</span> will be removed from Storage,
            Postgres chunks, and embeddings. This cannot be undone.
          </p>
          {errorMessage ? (
            <p
              className="mt-4 border-2 border-danger bg-danger-paper p-3 font-mono text-sm text-danger"
              role="alert"
            >
              {errorMessage}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="border-2 border-border bg-surface px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-ink transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="border-2 border-border bg-danger px-5 py-2.5 font-mono text-xs uppercase tracking-wider text-surface shadow-stamp-sm transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
