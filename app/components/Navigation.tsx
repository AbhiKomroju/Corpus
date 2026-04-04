'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  hint: string;
};

/** Stable config so the nav map does not reallocate each render */
const NAV_ITEMS: readonly NavItem[] = [
  { href: '/', label: 'Query', hint: 'Ask the index' },
  { href: '/documents', label: 'Library', hint: 'Files & chunks' },
];

/**
 * Top navigation — editorial layout with a stamped accent bar instead of generic blue underline.
 * @returns Site header with brand and primary routes
 */
export default function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b-[3px] border-border bg-surface/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div
            className="hidden sm:block w-1.5 self-stretch min-h-[3.25rem] bg-accent shadow-stamp-sm shrink-0"
            aria-hidden
          />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-ink-muted mb-1">
              Private RAG
            </p>
            <Link href="/" className="group inline-block">
              <span className="font-display text-3xl sm:text-4xl text-ink tracking-tight leading-none">
                Corpus
              </span>
              <span className="block font-mono text-xs text-ink-muted mt-1 group-hover:text-accent transition-colors">
                retrieval-augmented answers
              </span>
            </Link>
          </div>
        </div>

        <nav className="flex gap-2" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-5 py-3 min-w-[7rem] text-center border-2 border-border transition-all
                  ${active
                    ? 'bg-accent text-surface shadow-stamp translate-x-[-2px] translate-y-[-2px]'
                    : 'bg-surface text-ink hover:bg-surface-2 hover:shadow-stamp-sm'
                  }
                `}
              >
                <span className="block font-display text-lg leading-tight">{item.label}</span>
                <span className="block font-mono text-[10px] uppercase tracking-wider opacity-80 mt-0.5">
                  {item.hint}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
