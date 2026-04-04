import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SUPABASE_DOCUMENTS_BUCKET } from '@/lib/constants';
import { formatFileTypeLabel } from '@/lib/format-file-type';
import { jsonErrorResponse } from '@/lib/json-error-response';

/** Shape of `metadata` JSON on each chunk row (ingest writes the same keys on every chunk). */
type DocumentMetadata = {
  document_id?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  upload_date?: string;
  total_chunks?: number;
  file_url?: string;
  file_path?: string;
};

type DocumentRow = {
  metadata?: DocumentMetadata | null;
  file_path?: string | null;
};

type ContentRow = {
  content: string;
  metadata?: DocumentMetadata | null;
};

function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;
  return {
    supabase: createClient(url, anonKey),
    supabaseStorage: createClient(url, serviceKey),
  };
}

/** Whitespace-only `id` is treated as missing (avoids odd DB lookups and list fallthrough). */
function normalizeDocumentIdParam(raw: string | null): string | null {
  const t = raw?.trim();
  return t ? t : null;
}

/**
 * One representative row per logical document (path may live in metadata or column).
 */
async function getDocumentRow(
  supabase: SupabaseClient,
  documentId: string,
): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('metadata, file_path')
    .eq('metadata->>document_id', documentId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as DocumentRow;
}

function resolveStoragePath(documentId: string, row: DocumentRow): string {
  const meta = row.metadata;
  const fileName = meta?.file_name || 'document';
  return (
    meta?.file_path ||
    row.file_path ||
    `${documentId}.${fileName.split('.').pop() || 'bin'}`
  );
}

/** Library table row from stored metadata (dedupe picks any chunk — fields are identical per doc). */
function toLibraryEntry(m: DocumentMetadata) {
  const rawType = m.file_type || 'unknown';
  return {
    id: m.document_id as string,
    file_name: m.file_name ?? 'Unknown',
    file_type: formatFileTypeLabel(rawType, m.file_name),
    file_size: m.file_size ?? 0,
    upload_date: m.upload_date ?? new Date().toISOString(),
    total_chunks: m.total_chunks ?? 0,
    file_url: m.file_url,
    file_path: m.file_path,
  };
}

function sortByUploadDateDesc<T extends { upload_date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tb = new Date(b.upload_date).getTime();
    const ta = new Date(a.upload_date).getTime();
    return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
  });
}

/**
 * GET /api/documents
 * - No query: deduplicated library list (newest first)
 * - ?id=: full extracted text + meta
 * - ?id=&file=true: binary from Storage; &view=true forces inline PDF when applicable
 */
export async function GET(req: Request) {
  try {
    const { supabase, supabaseStorage } = getClients();
    const { searchParams } = new URL(req.url);
    const id = normalizeDocumentIdParam(searchParams.get('id'));
    const wantFile = searchParams.get('file') === 'true';
    const viewInlinePdf = searchParams.get('view') === 'true';

    if (id && wantFile) {
      const row = await getDocumentRow(supabase, id);
      if (!row) {
        return jsonErrorResponse('Document not found', 404);
      }

      const meta = row.metadata;
      const fileName = meta?.file_name || 'document';
      const fileType = meta?.file_type || 'application/octet-stream';
      const filePath = resolveStoragePath(id, row);

      const { data: fileData, error: downloadError } = await supabaseStorage.storage
        .from(SUPABASE_DOCUMENTS_BUCKET)
        .download(filePath);

      if (downloadError || !fileData) {
        return jsonErrorResponse(downloadError?.message || 'File not stored', 404);
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      if (buffer.length === 0) {
        return jsonErrorResponse('File is empty', 500);
      }

      const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
      const disposition = viewInlinePdf && isPDF ? 'inline' : 'attachment';

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': fileType,
          'Content-Disposition': `${disposition}; filename="${fileName}"`,
          'Content-Length': String(buffer.length),
          ...(viewInlinePdf && isPDF ? { 'X-Content-Type-Options': 'nosniff' } : {}),
        },
      });
    }

    if (id) {
      const { data: chunks, error } = await supabase
        .from('documents')
        .select('content, metadata')
        .eq('metadata->>document_id', id)
        .order('metadata->>chunk_index', { ascending: true });

      if (error || !chunks?.length) {
        return jsonErrorResponse('Document not found', 404);
      }

      const typed = chunks as ContentRow[];
      const m = typed[0].metadata ?? {};
      const rawType = m.file_type || 'unknown';

      return NextResponse.json({
        id,
        file_name: m.file_name ?? 'Unknown',
        file_type: formatFileTypeLabel(rawType, m.file_name),
        file_size: m.file_size ?? 0,
        upload_date: m.upload_date ?? new Date().toISOString(),
        total_chunks: typed.length,
        fullText: typed.map((c) => c.content).join('\n\n'),
        file_url: m.file_url,
        file_path: m.file_path,
      });
    }

    const { data: rows, error } = await supabase.from('documents').select('metadata');

    if (error) {
      return jsonErrorResponse(error.message);
    }

    const seen = new Map<string, ReturnType<typeof toLibraryEntry>>();
    for (const row of rows ?? []) {
      const m = row.metadata as DocumentMetadata | null | undefined;
      if (m?.document_id && !seen.has(m.document_id)) {
        seen.set(m.document_id, toLibraryEntry(m));
      }
    }

    return NextResponse.json({
      documents: sortByUploadDateDesc(Array.from(seen.values())),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return jsonErrorResponse(message);
  }
}

/**
 * DELETE /api/documents?id=<documentId>
 * Removes Storage object (if path known) and all chunk rows for that document_id.
 */
export async function DELETE(req: Request) {
  try {
    const { supabase, supabaseStorage } = getClients();
    const id = normalizeDocumentIdParam(new URL(req.url).searchParams.get('id'));
    if (!id) {
      return jsonErrorResponse('Document ID required', 400);
    }

    const row = await getDocumentRow(supabase, id);
    const storedPath = row?.metadata?.file_path || row?.file_path || null;

    if (storedPath) {
      await supabaseStorage.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storedPath]);
    }

    const { error } = await supabase.from('documents').delete().eq('metadata->>document_id', id);

    if (error) {
      return jsonErrorResponse(error.message);
    }

    return NextResponse.json({ success: true, fileDeleted: !!storedPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return jsonErrorResponse(message);
  }
}
