'use client';

import { useEffect, useState } from 'react';
import {
  getApiPayloadError,
  isHttpSuccess,
  mimeTypeLooksLikeJson,
  readJsonResponse,
} from '@/lib/fetch-json';
import { ModalCloseButton } from './ModalCloseButton';
import { modalPanelBaseClass } from './modalChrome';
import { ModalPortal } from './ModalPortal';

type PDFViewerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  documentId?: string;
  isPDF?: boolean;
};

type ViewerTab = 'preview' | 'content';

/**
 * Full-screen modal for previewing uploaded documents.
 * PDFs: iframe preview plus tab for extracted text. Non-PDF: extracted text only.
 * Fetches are aborted on unmount or dependency change to avoid setState after close.
 * @param props - Open state, URLs, optional document id for /api/documents text
 * @returns Portal-mounted viewer
 */
export default function PDFViewerModal({
  isOpen,
  onClose,
  fileUrl,
  fileName,
  documentId,
  isPDF = true,
}: PDFViewerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewerTab>('preview');
  const [text, setText] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  // Reset viewer state when opening or when the target document changes
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setLoading(true);
    setActiveTab(isPDF ? 'preview' : 'content');
    setText('');
    setTextError(null);
  }, [isOpen, isPDF, documentId]);

  // Probe PDF URL (JSON body means API error wrapper); abort if modal closes or URL changes
  useEffect(() => {
    if (!isOpen) return;
    if (!isPDF) {
      setLoading(false);
      return;
    }
    if (!fileUrl) return;

    const ac = new AbortController();
    setError(null);
    setLoading(true);

    fetch(fileUrl, {
      signal: ac.signal,
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
      .then(async (res) => {
        const ct = res.headers.get('content-type') ?? '';
        if (mimeTypeLooksLikeJson(ct)) {
          const parsed = await readJsonResponse<{ error?: string }>(res);
          if (!parsed.ok) throw new Error(parsed.error);
          throw new Error(parsed.data.error || 'File not available');
        }
        if (!isHttpSuccess(res.status)) {
          throw new Error(`Failed to load: ${res.status}`);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF');
        setLoading(false);
      });

    return () => ac.abort();
  }, [isOpen, fileUrl, isPDF]);

  // Load concatenated chunks when user is on the text tab (encode id for query safety)
  useEffect(() => {
    if (!isOpen || !documentId || activeTab !== 'content') return;
    // Skip repeat fetch when toggling Original ↔ Plain text after a successful load (errors keep text empty)
    if (text) return;

    const ac = new AbortController();
    setTextLoading(true);
    setTextError(null);

    (async () => {
      try {
        const q = new URLSearchParams({ id: documentId });
        const res = await fetch(`/api/documents?${q}`, { signal: ac.signal });
        if (ac.signal.aborted) return;
        const parsed = await readJsonResponse<{ error?: string; fullText?: string }>(res);
        if (ac.signal.aborted) return;
        if (!parsed.ok) {
          setTextError(parsed.error);
          return;
        }
        const apiErr = getApiPayloadError(parsed.data, res.status);
        if (apiErr) {
          setTextError(apiErr);
          return;
        }
        setText(parsed.data.fullText || 'No text content available');
      } catch (err: unknown) {
        if (ac.signal.aborted) return;
        setTextError(err instanceof Error ? err.message : 'Failed to fetch document text');
      } finally {
        if (!ac.signal.aborted) setTextLoading(false);
      }
    })();

    return () => ac.abort();
  }, [isOpen, documentId, activeTab, text]);

  const titleId = 'pdf-viewer-modal-title';

  return (
    <ModalPortal isOpen={isOpen} onBackdropClose={onClose}>
      <div
        className={`${modalPanelBaseClass} flex h-[90vh] w-full max-w-6xl flex-col`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex flex-col border-b-2 border-border">
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ink-muted">
                {isPDF ? 'Document' : 'Extracted'}
              </p>
              <h2 id={titleId} className="truncate font-display text-xl text-ink">
                {fileName}
              </h2>
            </div>
            <ModalCloseButton onClick={onClose} className="shrink-0" />
          </div>

          {isPDF && (
            <div className="flex border-t-2 border-border">
              {(['preview', 'content'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 border-b-2 px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] transition-colors ${
                    activeTab === tab
                      ? 'border-accent bg-paper text-ink'
                      : 'border-transparent text-ink-muted hover:bg-paper/50 hover:text-ink'
                  }`}
                >
                  {tab === 'preview' ? 'Original' : 'Plain text'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          {isPDF && activeTab === 'preview' && (
            <div className="h-full overflow-hidden bg-paper">
              {error ? (
                <div className="flex h-full flex-col items-center justify-center p-8">
                  <div className="max-w-md border-[3px] border-border bg-warn-paper p-6 shadow-stamp-sm">
                    <h3 className="mb-2 font-display text-lg text-warn-ink">Could not load file</h3>
                    <p className="mb-4 font-mono text-sm text-warn-ink/90">{error}</p>
                    {documentId && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('content')}
                        className="border-2 border-border bg-moss px-4 py-2 font-mono text-xs uppercase tracking-wider text-surface"
                      >
                        Show extracted text
                      </button>
                    )}
                  </div>
                </div>
              ) : loading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="animate-pulse font-mono text-sm text-ink-muted">Loading…</p>
                </div>
              ) : (
                <iframe
                  src={`${fileUrl}${fileUrl.includes('?') ? '&' : '?'}view=true#toolbar=1&navpanes=0&scrollbar=1`}
                  className="h-full w-full border-0"
                  title={fileName}
                  allow="fullscreen"
                  onError={() => setError('Failed to load PDF')}
                />
              )}
            </div>
          )}

          {(!isPDF || activeTab === 'content') && (
            <div className="h-full overflow-auto bg-paper p-6">
              {textLoading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="font-mono text-sm text-ink-muted">Fetching text…</p>
                </div>
              ) : textError ? (
                <div className="border-2 border-danger bg-danger-paper p-4">
                  <p className="font-mono text-sm text-danger">Error: {textError}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                    As extracted for embedding — layout may differ from source.
                  </p>
                  <pre className="whitespace-pre-wrap border-2 border-border bg-surface p-4 font-mono text-sm leading-relaxed text-ink">
                    {text || 'No text content available'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
