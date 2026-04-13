import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import mammoth from 'mammoth';
import {
  GEMINI_EMBEDDING_MODEL,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL_MB,
  SUPABASE_DOCUMENTS_BUCKET,
  TEXT_CHUNK_OVERLAP,
  TEXT_CHUNK_SIZE,
} from '@/lib/constants';
import { geminiEmbedContentPayload } from '@/lib/gemini-embed';

/**
 * Returns Supabase + Gemini clients for upload operations.
 * Both DB and Storage clients use the service-role key so they bypass RLS —
 * all mutations are server-side only; the public anon key is read-only.
 */
function getClients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const privilegedKey = serviceKey || anonKey;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return {
    supabaseStorage: createClient(url, privilegedKey),
    supabase: createClient(url, privilegedKey),
    embeddingModel: genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL }),
  };
}

function uploadFail(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function uploadSuccess(body: {
  documentId: string;
  fileName: string;
  chunks: number;
  textLength: number;
  fileUrl: string;
}) {
  return NextResponse.json({ success: true, ...body });
}

/** pdf2json page graph (minimal fields used for text extraction). */
type PdfParserData = {
  Pages?: { Texts?: { R?: { T?: string }[] }[] }[];
};

function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    try {
      return decodeURIComponent(str.replace(/%/g, '%25'));
    } catch {
      return str;
    }
  }
}

/**
 * Deletes partial DB rows and the storage object after a failed ingest (no orphaned chunks/file).
 */
async function cleanupPartialIngest(
  supabaseStorage: SupabaseClient,
  supabase: SupabaseClient,
  storagePath: string,
  documentId: string,
) {
  await supabase.from('documents').delete().eq('metadata->>document_id', documentId);
  await supabaseStorage.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]);
}

async function removeStorageOnly(supabaseStorage: SupabaseClient, storagePath: string) {
  await supabaseStorage.storage.from(SUPABASE_DOCUMENTS_BUCKET).remove([storagePath]);
}

function storageErrorToResponse(message: string): NextResponse {
  const msg = message || 'Unknown storage error';
  if (msg.includes('row-level security') || msg.includes('RLS')) {
    return uploadFail(
      `Storage RLS error: ${msg}. Ensure SUPABASE_SERVICE_ROLE_KEY is set.`,
    );
  }
  return uploadFail(`Failed to store file: ${msg}`);
}

async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.pdf')) {
    const PDFParser = (await import('pdf2json')).default;
    return new Promise((resolve, reject) => {
      const pdfParser = new (PDFParser as new (arg0: null, arg1: boolean) => {
        on: (ev: string, fn: (payload: unknown) => void) => void;
        parseBuffer: (buf: Buffer) => void;
      })(null, true);

      pdfParser.on('pdfParser_dataError', (err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'parserError' in err
            ? String((err as { parserError: unknown }).parserError)
            : 'Unknown PDF error';
        reject(new Error(`PDF parsing error: ${msg}`));
      });

      pdfParser.on('pdfParser_dataReady', (pdfData: unknown) => {
        try {
          const data = pdfData as PdfParserData;
          let fullText = '';
          data.Pages?.forEach((page) =>
            page.Texts?.forEach((text) =>
              text.R?.forEach((r) => {
                if (r.T) fullText += `${safeDecodeURIComponent(r.T)} `;
              }),
            ),
          );
          resolve(fullText.trim());
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'parse failed';
          reject(new Error(`Error extracting text: ${msg}`));
        }
      });

      pdfParser.parseBuffer(buffer);
    });
  }

  if (lower.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (lower.endsWith('.txt')) {
    return buffer.toString('utf-8');
  }

  throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
}

type IngestContext = {
  supabase: SupabaseClient;
  supabaseStorage: SupabaseClient;
  embeddingModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
  file: File;
  documentId: string;
  uploadDate: string;
  storagePath: string;
  publicUrl: string;
};

/**
 * Embeds each chunk and inserts rows; on failure rolls back storage + DB for this document.
 */
async function persistChunks(
  chunks: string[],
  ctx: IngestContext,
): Promise<NextResponse | null> {
  const { supabase, supabaseStorage, embeddingModel, file, documentId, uploadDate, storagePath, publicUrl } =
    ctx;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      const embedInput = geminiEmbedContentPayload(chunk);
      const embResult = await embeddingModel.embedContent(embedInput);
      const embedding = embResult.embedding.values;

      const { error } = await supabase.from('documents').insert({
        content: chunk,
        metadata: {
          source: file.name,
          document_id: documentId,
          file_name: file.name,
          file_type: file.type || file.name.split('.').pop(),
          file_size: file.size,
          upload_date: uploadDate,
          chunk_index: i,
          total_chunks: chunks.length,
          file_path: storagePath,
          file_url: publicUrl,
        },
        file_path: storagePath,
        file_url: publicUrl,
        embedding: JSON.stringify(embedding),
      });

      if (error) {
        await cleanupPartialIngest(supabaseStorage, supabase, storagePath, documentId);
        return uploadFail(error.message);
      }
    } catch (err: unknown) {
      await cleanupPartialIngest(supabaseStorage, supabase, storagePath, documentId);
      const msg = err instanceof Error ? err.message : 'Embedding or database write failed';
      return uploadFail(msg);
    }
  }

  return null;
}

/**
 * POST /api/upload
 * Storage → extract → split → embed → insert chunks (768-d vectors, same as search).
 */
export async function POST(req: Request) {
  try {
    const { supabaseStorage, supabase, embeddingModel } = getClients();

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) {
      return uploadFail('No file provided', 400);
    }

    if (typeof file.size === 'number' && file.size > MAX_UPLOAD_BYTES) {
      return uploadFail(`File too large. Maximum size is ${MAX_UPLOAD_LABEL_MB} MB.`, 413);
    }

    const documentId = crypto.randomUUID();
    const uploadDate = new Date().toISOString();
    const storagePath = `${documentId}.${file.name.split('.').pop() || 'bin'}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const { error: storageError } = await supabaseStorage.storage
      .from(SUPABASE_DOCUMENTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      return storageErrorToResponse(storageError.message || 'Unknown storage error');
    }

    const { data: urlData } = supabaseStorage.storage
      .from(SUPABASE_DOCUMENTS_BUCKET)
      .getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    let text: string;
    try {
      text = await extractTextFromFile(file);
    } catch (err: unknown) {
      await removeStorageOnly(supabaseStorage, storagePath);
      const msg = err instanceof Error ? err.message : 'Text extraction failed';
      return uploadFail(msg, 400);
    }

    if (!text.trim()) {
      await removeStorageOnly(supabaseStorage, storagePath);
      return uploadFail('Could not extract text from file', 400);
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: TEXT_CHUNK_SIZE,
      chunkOverlap: TEXT_CHUNK_OVERLAP,
    });
    const chunks = await splitter.splitText(text);

    if (chunks.length === 0) {
      await removeStorageOnly(supabaseStorage, storagePath);
      return uploadFail('No text chunks produced from file', 400);
    }

    const ingestError = await persistChunks(chunks, {
      supabase,
      supabaseStorage,
      embeddingModel,
      file,
      documentId,
      uploadDate,
      storagePath,
      publicUrl,
    });

    if (ingestError) {
      return ingestError;
    }

    return uploadSuccess({
      documentId,
      fileName: file.name,
      chunks: chunks.length,
      textLength: text.length,
      fileUrl: publicUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process file';
    return uploadFail(message);
  }
}
