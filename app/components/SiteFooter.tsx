import { GITHUB_REPO_URL } from '@/lib/site';

/**
 * Shared site chrome — stack line + link to source repo.
 */
export function SiteFooter() {
  return (
    <footer className="border-t-2 border-border py-6 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
      <span>Next.js · Supabase · Gemini</span>
      <span className="mx-2 opacity-50" aria-hidden>
        ·
      </span>
      <a
        href={GITHUB_REPO_URL}
        className="underline decoration-1 underline-offset-4 hover:text-ink"
        target="_blank"
        rel="noopener noreferrer"
      >
        Source
      </a>
    </footer>
  );
}
