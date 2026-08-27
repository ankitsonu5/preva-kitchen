import { Roboto } from 'next/font/google';

/**
 * One optimized Roboto instance shared by the public site and admin console.
 * Next.js self-hosts the generated font files, preloads them, and prevents
 * browser requests to Google at runtime.
 */
export const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  preload: true,
  variable: '--font-roboto',
  fallback: ['Arial', 'sans-serif'],
  adjustFontFallback: true
});
