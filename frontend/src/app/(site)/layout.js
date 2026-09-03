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
import './styles/reference-home.css';
import './styles/preva-selection-modal.css';
import '@/styles/typography.css';
import Shell from '@/components/Shell';
import { cmsFetch } from '@/lib/cms';
import { roboto } from '@/lib/fonts';
import { DEFAULT_OG_IMAGE } from '@/lib/seo';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateSiteWideSchema } from '@/lib/seo-schema';

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
  const description =
    (!oldBrand.test(savedDescription) && savedDescription) ||
    'Chef-driven comfort food, dine-in, pickup, delivery and catering in Redford Township, Michigan.';
  const defaultImage = settings?.defaultOgImage || DEFAULT_OG_IMAGE;

  return {
    applicationName: 'Preva Kitchen',
    title: {
      default: settings?.defaultSeoTitle || siteTitle,
      template: `%s | ${siteTitle}`
    },
    description,
    keywords: [
      'Preva Kitchen',
      'restaurant Redford Township',
      'food delivery Redford MI',
      'pickup restaurant Redford',
      'catering Redford Michigan'
    ],
    authors: [{ name: 'Preva Kitchen' }],
    creator: 'Preva Kitchen',
    publisher: 'Preva Kitchen',
    metadataBase: new URL(getCanonicalOrigin(settings?.siteUrl)),
    alternates: {
      canonical: '/'
    },
    openGraph: {
      title: settings?.defaultSeoTitle || siteTitle,
      description,
      url: '/',
      siteName: 'Preva Kitchen',
      locale: 'en_US',
      type: 'website',
      images: [{ url: defaultImage, width: 1200, height: 630, alt: 'Preva Kitchen' }]
    },
    twitter: {
      card: 'summary_large_image',
      title: settings?.defaultSeoTitle || siteTitle,
      description,
      images: [defaultImage]
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1
      }
    },
    icons: {
      icon: [{ url: '/favicon.ico', type: 'image/svg+xml' }],
      shortcut: '/favicon.ico',
      apple: '/asset/preva-real-logo.png'
    }
  };
}

export default function RootLayout({ children }) {
  const origin = getCanonicalOrigin();
  const jsonLd = generateSiteWideSchema(origin);

  return (
    <html lang="en" className={roboto.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: domReconciliationGuard }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body id="preva-app" className={roboto.className} suppressHydrationWarning>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
