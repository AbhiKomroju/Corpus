import { DM_Sans, Fraunces, IBM_Plex_Mono } from 'next/font/google';

/**
 * Display serif for headings — wired into Tailwind as `font-display` via @theme.
 */
export const fontFraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

/**
 * Body UI sans — default `font-sans` stack.
 */
export const fontDmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

/**
 * Mono for labels, kbd hints, and code-like UI.
 */
export const fontPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

/** Single className string for <body> (all CSS variable hooks). */
export const fontVariableClasses = [
  fontFraunces.variable,
  fontDmSans.variable,
  fontPlexMono.variable,
].join(' ');
