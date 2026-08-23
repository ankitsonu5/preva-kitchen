import '@/styles/admin.css';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
