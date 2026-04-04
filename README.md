# Corpus — RAG over your documents

**Repository:** [github.com/AbhiKomroju/Corpus](https://github.com/AbhiKomroju/Corpus) · clone URL `https://github.com/AbhiKomroju/Corpus.git`

A **retrieval-augmented generation (RAG)** app: upload **PDF, DOCX, or TXT**, get files **chunked + embedded** into **Supabase (Postgres + pgvector)**, then ask questions in natural language. Answers use **Google Gemini** with retrieved chunks as context, plus **source citations**.

The UI is intentionally **editorial** (custom typography and palette) rather than generic “AI SaaS” styling.

## Features

- **Ingest:** Supabase Storage for originals; text extraction (pdf2json, mammoth, plain text).
- **Chunking:** LangChain `RecursiveCharacterTextSplitter` (size/overlap from `lib/constants.ts`).
- **Embeddings:** `gemini-embedding-001` at **768 dimensions** (matches pgvector column + HNSW index).
- **Retrieval:** Postgres RPC `match_documents` (cosine distance `<=>`).
- **Generation:** `gemini-2.5-flash-lite` with a grounded prompt.
- **Library:** List documents, preview (PDF iframe + extracted text tab), download, in-app delete confirmation.

## Tech stack

| Layer            | Choice                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Framework        | **Next.js 16** (App Router) + **TypeScript**                                |
| Styling          | **Tailwind CSS v4** (`@tailwindcss/postcss`, `@theme` in `app/globals.css`) |
| Database         | **Supabase** — PostgreSQL + **pgvector**                                    |
| File storage     | **Supabase Storage** (bucket name: `documents`, see `SUPABASE_DOCUMENTS_BUCKET` in `lib/constants.ts`) |
| Embeddings + LLM | **Google Gemini** (`@google/generative-ai`)                                 |
| Chunking         | **@langchain/textsplitters**                                                |

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- A **Supabase** project
- A **Gemini API key** — [Google AI Studio](https://aistudio.google.com/) → Get API key

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/AbhiKomroju/Corpus.git
cd Corpus
npm install
```

### 2. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full script in **`supabase-setup.sql`** (enables `vector`, creates the `documents` table, HNSW index, and `match_documents`).
3. Open **Storage** → create a bucket named **`documents`** (same name as in code). Configure policies for your security model; the API uses the **service role** for server-side uploads and reads when needed.
4. Under **Project Settings → API**, copy **Project URL**, **anon** key, and **service_role** key (server-only).

### 3. Environment variables

The repo includes **`.env.local.example`** (safe to commit — placeholders only). Copy it and add real secrets locally:

```bash
cp .env.local.example .env.local
# Edit .env.local — never commit this file
```

| Variable | Where it runs | Notes |
| -------- | ------------- | ----- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Public project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Browser + server | Supabase **anon** key; RLS applies to client-facing access. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Used in API routes for Storage and privileged operations. **Do not** use the `NEXT_PUBLIC_` prefix. |
| `GEMINI_API_KEY` | **Server only** | Used in `/api/upload` and `/api/search`. **Never** expose to the client. |

Forks/clones: use the same variable **names** in hosting dashboards (e.g. Vercel) as in `.env.local.example`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. **Library** → upload a file.
2. **Query** → ask a question about its contents.
3. Inspect **Provenance** for retrieved chunks.

### 5. Production build

```bash
npm run build
npm start
```

## How RAG works here

```
Upload → extract text → split chunks → embed (768-d) → store in Postgres
Query  → embed question → match_documents (top-K) → prompt LLM with chunks → answer + sources
```

1. Chunks and the search query use the **same** embedding model and dimensionality.
2. `match_documents` returns the most similar rows by **cosine distance** (threshold and top-K live in `lib/constants.ts`).
3. The chat model is told to use **only** that context and to say when the answer is not in the context.

## Deploying

- **Git remote:** [https://github.com/AbhiKomroju/Corpus](https://github.com/AbhiKomroju/Corpus) (`git clone https://github.com/AbhiKomroju/Corpus.git`). In Vercel, **Import** that repository, then set env vars.
- **Do not** commit `.env` or `.env.local` (real keys). **Do** commit `.env.local.example` so others can bootstrap.
- On **Vercel** (or similar), add the same variable **names** under **Environment Variables** for **Production** (and **Preview** if you want previews to work), then redeploy.
- Names starting with `NEXT_PUBLIC_` are inlined into the **client** bundle at build time.
- `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must remain **server-only** (no `NEXT_PUBLIC_` prefix).

## Project structure

```
Corpus/
├── app/
│   ├── api/
│   │   ├── upload/route.ts      # Storage upload, extract, chunk, embed, insert
│   │   ├── search/route.ts      # Embed query, RPC, Gemini answer
│   │   └── documents/route.ts   # List, full text, file stream, delete
│   ├── components/
│   │   ├── RagQueryView.tsx     # Home / Query UI (client)
│   │   ├── AppShell.tsx         # Nav + main + footer wrapper
│   │   ├── Navigation.tsx
│   │   ├── SiteFooter.tsx
│   │   ├── UploadModal.tsx
│   │   ├── PDFViewerModal.tsx
│   │   ├── DeleteDocumentDialog.tsx
│   │   ├── ModalPortal.tsx
│   │   ├── ModalCloseButton.tsx
│   │   └── modalChrome.ts       # Shared modal panel classes
│   ├── documents/
│   │   ├── page.tsx             # Library page
│   │   ├── LibraryTable.tsx
│   │   ├── documentUrls.ts      # Preview/download URL helpers
│   │   └── types.ts             # Library + API response types
│   ├── fonts.ts                 # next/font → CSS variables
│   ├── layout.tsx
│   ├── page.tsx                 # Renders RagQueryView
│   └── globals.css              # Tailwind v4 + design tokens
├── lib/
│   ├── constants.ts             # RAG, models, upload cap, bucket name
│   ├── site.ts                  # GitHub repo URL (footer + docs)
│   ├── fetch-json.ts            # Safe client JSON parsing (HTML-safe)
│   ├── json-error-response.ts   # Shared `{ error }` API responses
│   ├── gemini-embed.ts          # Embedding request payload helper
│   ├── api-types.ts             # Client types for upload API
│   ├── rag-client-types.ts      # Client types for search API
│   ├── format-display.ts        # Size / date formatting
│   └── format-file-type.ts      # MIME → short labels
├── supabase-setup.sql
├── .env.local.example           # Template — copy to .env.local
├── next.config.ts               # e.g. turbopack.root for correct workspace resolution
├── postcss.config.mjs
└── README.md
```

## Scripts

| Command         | Description            |
| --------------- | ---------------------- |
| `npm run dev`   | Dev server (Turbopack) |
| `npm run build` | Production build       |
| `npm start`     | Production server      |
| `npm run lint`  | ESLint (Next.js config) |

## Limits & tuning

- **Upload size:** **5 MB** per file (enforced in `POST /api/upload` and the upload modal; see `MAX_UPLOAD_BYTES` in `lib/constants.ts`).
- **Chunking / RAG:** `TEXT_CHUNK_SIZE`, `TEXT_CHUNK_OVERLAP`, `RAG_TOP_K`, `RAG_MATCH_THRESHOLD` live in **`lib/constants.ts`** and should stay consistent with **`supabase-setup.sql`** (embedding dimension **768**).

## Troubleshooting

- **Upload fails with storage / RLS errors:** set `SUPABASE_SERVICE_ROLE_KEY` in the server environment and ensure the **`documents`** bucket exists.
- **Search returns DB errors:** confirm `supabase-setup.sql` ran successfully and the vector dimension is **768** everywhere.
- **Turbopack “wrong workspace root”:** this repo sets `turbopack.root` in `next.config.ts` to the project directory when multiple lockfiles confuse Next.js.
