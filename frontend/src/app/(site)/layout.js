import './globals.css';
import './styles/style.css';
import './styles/landing-page.css';
import './styles/preva-reservations.css';
import './styles/order-popup.css';
import './styles/contact.css';
import './styles/careers.css';
import '@/styles/tokens.css';
import '@/styles/shop.css';
import './styles/preva-kitchen-refined.css';
import './styles/blog-detail.css';
import './styles/blog-listing.css';
import './styles/luxe.css'; /* premium glossy skin — must load last */
import Shell from '@/components/Shell';
import { cmsFetch } from '@/lib/cms';

/*
 * Chrome translation/accessibility extensions can wrap or move text nodes
 * before React commits an update. React then asks the old parent to remove
 * that node and the browser throws NotFoundError. Install this tiny guard in
 * <head>, before hydration, so reconciliation follows the node's real parent.
 */
const domReconciliationGuard = `
(() => {
  if (window.__prevaDomGuardInstalled) return;
  window.__prevaDomGuardInstalled = true;
  window.__domPatchApplied = true;

  const nativeRemoveChild = Node.prototype.removeChild;
  const nativeInsertBefore = Node.prototype.insertBefore;

  Node.prototype.removeChild = function (child) {
    if (!child || !child.parentNode) return child;
    if (child.parentNode !== this) {
      return nativeRemoveChild.call(child.parentNode, child);
    }
    return nativeRemoveChild.call(this, child);
  };

  Node.prototype.insertBefore = function (newNode, referenceNode) {
    if (!referenceNode || referenceNode.parentNode !== this) {
      return this.appendChild(newNode);
    }
    return nativeInsertBefore.call(this, newNode, referenceNode);
  };
})();
`;

/**
 * The public site.
 *
 * Settings are read from the database on every request, so nothing here can be
 * prerendered at build time.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const settings = await cmsFetch('/settings');
  const oldBrand = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle/i;
  const siteTitle = oldBrand.test(settings?.siteTitle || '') ? 'Preva Kitchen' : (settings?.siteTitle || 'Preva Kitchen');
  const savedDescription = settings?.defaultSeoDescription || settings?.siteDescription || '';

  return {
    title: {
      default: settings?.defaultSeoTitle || siteTitle,
      template: `%s | ${siteTitle}`
    },
    description:
      (!oldBrand.test(savedDescription) && savedDescription) ||
      'Chef-driven comfort food, dine-in, pickup, delivery and catering in Redford Township, Michigan.',
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_CANONICAL_URL ||
        settings?.siteUrl ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'http://localhost:3000'
    ),
    openGraph: settings?.defaultOgImage ? { images: [{ url: settings.defaultOgImage }] } : undefined
  };
}

export default function RootLayout({ children }) {
  // Structured data: helps search engines show rich results (hours, cuisine,
  // reservations). Values mirror the site's own defaults in settings.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Preva Kitchen',
    description:
      'Chef-driven comfort food, dine-in, pickup, delivery and catering in Redford Township, Michigan.',
    servesCuisine: ['American', 'Seafood', 'Caribbean'],
    telephone: '+1-313-286-3586',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '13090 Inkster Rd',
      addressLocality: 'Redford Township',
      addressRegion: 'MI',
      postalCode: '48239',
      addressCountry: 'US'
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '17:00',
        closes: '22:00'
      }
    ],
    acceptsReservations: 'True',
    sameAs: [
      'https://www.instagram.com/prevakitchen/'
    ]
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: domReconciliationGuard }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/*
          The same five families the WordPress theme used, moved out of the
          CSS @import that used to sit two thousand lines into style.css.
          A <link> in the head starts downloading immediately instead of
          waiting for the stylesheet to parse, and unlike next/font it does not
          make `next build` depend on being able to reach Google — which
          matters on a locked-down deploy host. See tokens.css if you later
          want to switch to next/font and self-host these.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Mono:wght@400;500&display=swap"
        />
      </head>
      <body suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
