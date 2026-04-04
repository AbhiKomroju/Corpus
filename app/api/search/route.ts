import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import {
  GEMINI_CHAT_MODEL,
  GEMINI_EMBEDDING_MODEL,
  RAG_MATCH_THRESHOLD,
  RAG_TOP_K,
} from '@/lib/constants';
import { geminiEmbedContentPayload } from '@/lib/gemini-embed';
import { jsonErrorResponse } from '@/lib/json-error-response';

/** Row shape returned by Postgres `match_documents` (see supabase-setup.sql). */
type MatchDocumentRow = {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

function getClients() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  return {
    supabase: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    ),
    embeddingModel: genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL }),
    chatModel: genAI.getGenerativeModel({ model: GEMINI_CHAT_MODEL }),
  };
}

/**
 * Parses and validates POST JSON body; returns a trimmed query or an error response.
 */
async function parseSearchQuery(req: Request): Promise<
  { ok: true; query: string } | { ok: false; response: NextResponse }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: jsonErrorResponse('Invalid JSON body', 400) };
  }

  if (!body || typeof body !== 'object' || !('query' in body)) {
    return { ok: false, response: jsonErrorResponse('Missing `query` in body', 400) };
  }

  const raw = (body as { query: unknown }).query;
  const query = typeof raw === 'string' ? raw.trim() : '';

  if (!query) {
    return { ok: false, response: jsonErrorResponse('Missing or empty `query` string', 400) };
  }

  return { ok: true, query };
}

function buildContextBlock(rows: MatchDocumentRow[]): string {
  return rows.map((r) => r.content).join('\n---\n');
}

function buildRagPrompt(context: string, question: string): string {
  return [
    'You are a helpful assistant. Use the provided context to answer questions.',
    'If the answer is not in the context, say you do not know.',
    '',
    `Context:\n${context}`,
    '',
    `Question:\n${question}`,
  ].join('\n');
}

/**
 * POST /api/search
 * RAG: embed query → pgvector `match_documents` → Gemini answer + source rows.
 */
export async function POST(req: Request) {
  try {
    const parsed = await parseSearchQuery(req);
    if (!parsed.ok) {
      return parsed.response;
    }
    const { query } = parsed;

    const { supabase, embeddingModel, chatModel } = getClients();

    const embedInput = geminiEmbedContentPayload(query);
    const embResult = await embeddingModel.embedContent(embedInput);
    const queryEmbedding = embResult.embedding.values;

    const { data: rawResults, error: rpcError } = await supabase.rpc('match_documents', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: RAG_MATCH_THRESHOLD,
      match_count: RAG_TOP_K,
    });

    if (rpcError) {
      return jsonErrorResponse(rpcError.message);
    }

    const results = (rawResults ?? []) as MatchDocumentRow[];
    const context = buildContextBlock(results);

    const chatResult = await chatModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: buildRagPrompt(context, query) }],
        },
      ],
    });

    const answer = chatResult.response.text();

    return NextResponse.json({
      answer,
      sources: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return jsonErrorResponse(message);
  }
}
