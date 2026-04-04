'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import type { UploadApiResponse } from '@/lib/api-types';
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL_MB } from '@/lib/constants';
import { fetchJson, getApiPayloadError, isHttpSuccess } from '@/lib/fetch-json';
import { ModalCloseButton } from './ModalCloseButton';
import { modalPanelBaseClass } from './modalChrome';
import { ModalPortal } from './ModalPortal';

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
};

type UploadBanner = { type: 'success' | 'error'; text: string };

/**
 * Modal dialog for uploading documents (PDF, DOCX, TXT).
 * @param props - Visibility, dismiss handler, optional refresh after ingest
 * @returns Portal-mounted ingest UI
 */
export default function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<UploadBanner | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setMessage(null);
    }
  }, [isOpen]);

  /** Validates size against MAX_UPLOAD_BYTES before accepting selection */
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const next = e.target.files[0];
      if (next.size > MAX_UPLOAD_BYTES) {
        setMessage({
          type: 'error',
          text: `File must be ${MAX_UPLOAD_LABEL_MB} MB or smaller.`,
        });
        setFile(null);
        e.target.value = '';
        return;
      }
      setFile(next);
      setMessage(null);
    }
  };

  /** POSTs multipart form to /api/upload and surfaces server errors in-banner */
  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const result = await fetchJson<UploadApiResponse>('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!result.ok) {
        setMessage({ type: 'error', text: result.error });
        return;
      }

      const { data, status } = result;
      if (!data.success || !isHttpSuccess(status)) {
        setMessage({
          type: 'error',
          text: getApiPayloadError(data, status) ?? 'Upload failed',
        });
        return;
      }

      const label = data.fileName ?? 'File';
      const n = data.chunks ?? 0;
      setMessage({
        type: 'success',
        text: `“${label}” ingested — ${n} chunks embedded.`,
      });
      setFile(null);
      setTimeout(() => {
        onUploadSuccess?.();
        onClose();
      }, 1500);
    } catch (error: unknown) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalPortal isOpen={isOpen} onBackdropClose={uploading ? undefined : onClose}>
      <div
        className={`${modalPanelBaseClass} max-h-[90vh] w-full max-w-lg overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-border p-6">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">Ingest</p>
            <h2 id="upload-modal-title" className="font-display text-2xl text-ink">
              Add to library
            </h2>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label
              htmlFor="upload-file-input"
              className="mb-2 block font-mono text-xs uppercase tracking-wider text-ink-muted"
            >
              File (PDF, DOCX, TXT) — max {MAX_UPLOAD_LABEL_MB} MB
            </label>
            <input
              id="upload-file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="block w-full cursor-pointer font-mono text-sm text-ink-muted file:mr-4 file:border-2 file:border-border file:bg-paper file:px-4 file:py-2 file:font-mono file:text-xs file:uppercase file:tracking-wider file:text-ink hover:file:bg-surface-2"
            />
          </div>

          {file && (
            <div className="mb-6 space-y-1 border-2 border-border bg-paper p-4 font-mono text-xs text-ink-muted">
              <p>
                <span className="text-ink">File</span> {file.name}
              </p>
              <p>
                <span className="text-ink">Size</span> {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full border-2 border-border bg-accent py-3 font-display text-lg text-surface shadow-stamp-sm transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {uploading ? 'Chunking & embedding…' : 'Upload & process'}
          </button>

          {message && (
            <div
              className={`mt-6 border-2 border-border p-4 font-mono text-sm ${
                message.type === 'success'
                  ? 'border-moss bg-paper text-moss'
                  : 'border-danger bg-danger-paper text-danger'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="mt-8 border-2 border-dashed border-border bg-paper/80 p-4">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-ink">Pipeline</p>
            <p className="text-sm leading-relaxed text-ink-muted">
              Text extraction → LangChain split → Gemini embeddings → Supabase pgvector. Same dimensions as
              search queries.
            </p>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
