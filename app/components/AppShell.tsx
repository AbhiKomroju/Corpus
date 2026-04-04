'use client';

import type { ReactNode } from 'react';
import Navigation from './Navigation';
import { SiteFooter } from './SiteFooter';

type AppShellProps = {
  children: ReactNode;
  /**
   * Tailwind classes for the scrollable content column (width, padding, flex growth).
   * Keeps home vs library aligned without copying the outer layout wrapper.
   */
  mainClassName: string;
};

/**
 * Standard page frame: nav, flexible main, footer — used on Query and Library routes.
 */
export function AppShell({ children, mainClassName }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className={mainClassName}>{children}</main>
      <SiteFooter />
    </div>
  );
}
