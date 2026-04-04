'use client';

import { useCallback, useState, type KeyboardEvent } from 'react';
import { fetchJson, getApiPayloadError } from '@/lib/fetch-json';
import {
  ragSourceLabel,
  type RagSourceChunk,
  type SearchApiResponse,
} from '@/lib/rag-client-types';
import { AppShell } from './AppShell';

/**
 * Home RAG UI: query box, synthesis, and provenance list from /api/search.
 */
export function RagQueryView() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<RagSourceChunk[]>([]);

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setAnswer('');
    setSources([]);
    try {
      const result = await fetchJson<SearchApiResponse>('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmed }),
      });
      if (!result.ok) {
        setAnswer(`Error: ${result.error}`);
        return;
      }
      const apiErr = getApiPayloadError(result.data, result.status);
      if (apiErr) {
        setAnswer(`Error: ${apiErr}`);
        return;
      }
      setAnswer(result.data.answer || 'No answer generated');
      setSources(result.data.sources ?? []);
    } catch (err: unknown) {
      setAnswer(`Error: ${err instanceof Error ? err.message : 'Request failed'}`);
    } finally {
      setLoading(false);
    }
  }, [query]);

  /** Cmd/Ctrl + Enter submits without leaving the textarea */
  const handleQueryKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSearch();
    }
  };

  return (
    <AppShell mainClassName="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-10">
        <h1 className="font-display text-4xl sm:text-5xl text-ink leading-[1.1] mb-3">
          Ask the archive
        </h1>
        <p className="font-mono text-sm text-ink-muted max-w-lg leading-relaxed border-l-2 border-accent pl-4">
          Questions run against embedded chunks in Supabase + pgvector, then Gemini synthesizes an
          answer with citations — nothing leaves your stack except API calls you configure.
        </p>
      </div>

      <section className="app-panel-stamp mb-8">
        <label
          htmlFor="rag-query"
          className="font-mono text-xs uppercase tracking-[0.2em] text-ink-muted block mb-3"
        >
          Natural language query
        </label>
        <textarea
          id="rag-query"
          className="w-full p-4 border-2 border-border bg-paper text-ink placeholder:text-ink-muted/60 resize-none focus:outline-none focus:ring-0 focus:border-accent font-mono text-sm leading-relaxed min-h-[140px]"
          placeholder="e.g. What does the contract say about termination?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleQueryKeyDown}
          rows={5}
        />
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <button
            type="button"
            onClick={() => void handleSearch()}
            className="font-display text-lg px-8 py-3 bg-accent text-surface border-2 border-border shadow-stamp hover:bg-accent-hover hover:-translate-x-px hover:-translate-y-px active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 transition-all"
            disabled={loading || !query.trim()}
          >
            {loading ? 'Retrieving…' : 'Run retrieval'}
          </button>
          <p className="font-mono text-xs text-ink-muted">
            <kbd className="px-1.5 py-0.5 border border-border bg-surface-2 font-mono text-[10px]">
              ⌘
            </kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 border border-border bg-surface-2 font-mono text-[10px]">
              Enter
            </kbd>
            <span className="ml-2">to submit</span>
          </p>
        </div>
      </section>

      {answer ? (
        <section className="app-panel-stamp-sm mb-8">
          <h2 className="font-mono text-xs uppercase tracking-[0.25em] text-accent mb-4">
            Synthesis
          </h2>
          <p className="text-ink leading-[1.75] whitespace-pre-wrap font-sans text-[17px]">
            {answer}
          </p>
        </section>
      ) : null}

      {sources.length > 0 ? (
        <section className="app-panel-provenance">
          <h2 className="font-display text-2xl text-ink mb-2">Provenance</h2>
          <p className="font-mono text-xs text-ink-muted mb-6">
            {sources.length} chunk{sources.length === 1 ? '' : 's'} surfaced by vector search
          </p>
          <ul className="space-y-4">
            {sources.map((source) => (
              <li
                key={source.id}
                className="border-2 border-border bg-surface/80 pl-4 py-3 pr-3 shadow-[inset_5px_0_0_0_var(--color-moss)]"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-moss mb-2">
                  {ragSourceLabel(source.metadata)}
                </p>
                <p className="text-sm text-ink-muted leading-relaxed line-clamp-4">
                  {source.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AppShell>
  );
}
