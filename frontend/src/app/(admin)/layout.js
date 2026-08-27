import '@/styles/admin.css';
import '@/styles/typography.css';
import { roboto } from '@/lib/fonts';

/**
 * The admin is a second root layout.
 *
 * It deliberately does not inherit the public site's shell, theme stylesheet
 * or display faces — an operator working through a service does not want the
 * marketing header, and ten thousand lines of theme CSS would only fight with
 * the console styles.
 */
export const metadata = {
  title: { default: 'Preva Admin', template: '%s | Preva Admin' },
  robots: { index: false, follow: false }
};

export default function AdminRootLayout({ children }) {
  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <body id="preva-app" className={roboto.className} suppressHydrationWarning>{children}</body>
    </html>
  );
}
