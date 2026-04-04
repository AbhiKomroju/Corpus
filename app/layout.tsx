import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fontVariableClasses } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Corpus — RAG over your documents',
  description:
    'Portfolio RAG app: Next.js, Supabase pgvector, Gemini embeddings — query your own files.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

/**
 * Root layout: font CSS variables for Tailwind @theme, global styles in globals.css.
 */
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${fontVariableClasses} font-sans antialiased`}>{children}</body>
    </html>
  );
}
