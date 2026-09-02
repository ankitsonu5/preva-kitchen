import 'server-only';

/**
 * Read CMS data from a server component.
 *
 * The API now lives in its own backend service, so server-side rendering
 * fetches it over HTTP. BACKEND_URL is the server-to-server address (inside a
 * private network in production); it is intentionally NOT NEXT_PUBLIC_ — the
 * browser talks to /api on this same origin and Next's rewrite proxies it.
 *
 * Returns null on any non-2xx so callers keep their existing
 * `if (!data) return fallback` shape.
 */
if (process.env.NODE_ENV === 'production' && !process.env.BACKEND_URL) {
  throw new Error('BACKEND_URL is required for production CMS requests.');
}
const BACKEND = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

export async function cmsFetch(path, { method = 'GET', body = null, query = {} } = {}) {
  const url = new URL(`${BACKEND}/api${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(url, {
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    // The backend being down should degrade a page to its fallbacks, not
    // crash the render.
    console.error(`[cms] ${method} ${url.pathname} failed:`, error.message);
    return null;
  }
}

export function contentMetadata(item, fallback = {}) {
  if (!item) return fallback;
  const title = item.seoTitle || item.metaTitle || item.title || fallback.title;
  const description = item.seoDescription || item.metaDescription || item.excerpt || item.description || fallback.description;
  const image = item.ogImage || item.featuredImage || item.coverImage;
  const rawKeywords = item.seoKeywords || item.metaKeywords || item.keywords || item.tags || fallback.keywords || [];
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.map((value) => typeof value === 'string' ? value : value?.name).filter(Boolean)
    : String(rawKeywords).split(',').map((value) => value.trim()).filter(Boolean);
  // Route-owned canonicals win over legacy CMS values. This keeps migrated
  // WordPress URLs from pinning the new Next site to the old domain; the
  // active origin still comes from metadataBase/NEXT_PUBLIC_CANONICAL_URL.
  const canonical = fallback.alternates?.canonical || fallback.canonicalUrl || item.canonicalUrl;
  return {
    title,
    description,
    keywords,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      type: 'article',
      title: item.ogTitle || title,
      description: item.ogDescription || description,
      url: canonical,
      siteName: 'Preva Kitchen',
      locale: 'en_US',
      images: image ? [{ url: image }] : undefined
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: item.ogTitle || title,
      description: item.ogDescription || description,
      images: image ? [image] : undefined
    },
    authors: item.author?.name ? [{ name: item.author.name }] : undefined,
    robots: item.noIndex
      ? { index: false, follow: false }
      : item.metaRobots || fallback.robots || {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1
          }
        }
  };
}
