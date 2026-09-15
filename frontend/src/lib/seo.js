export const DEFAULT_OG_IMAGE = '/asset/hero/menu-hero-cinematic.jpg';

export function pageMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  keywords = [],
  noIndex = false
}) {
  const images = image
    ? [{ url: image, width: 1200, height: 630, alt: title }]
    : undefined;

  // Callers (dish pages, category pages, etc.) build this array from several
  // sources — the item name, its category, its tags — which commonly repeat
  // the same term (e.g. a "Preva Wings" dish in the "Preva Wings" category).
  // Dedupe here once, centrally, rather than asking every caller to do it.
  const dedupedKeywords = Array.isArray(keywords)
    ? [...new Set(keywords.map((k) => (typeof k === 'string' ? k.trim() : k)).filter(Boolean))]
    : keywords;

  return {
    title,
    description,
    keywords: dedupedKeywords,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: 'Preva Kitchen',
      locale: 'en_US',
      type,
      images
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
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
