export const DEFAULT_OG_IMAGE = '/asset/hero/menu-hero-cinematic.jpg';

/**
 * Shorten text to at most `max` characters without cutting a word in half.
 * Cuts at the last space before the limit and adds an ellipsis.
 */
export function truncateAtWord(text, max = 155) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '');
  return `${base}…`;
}

export function pageMetadata({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  // The default share image is 1200x630. Pass `imageSize: null` for a custom
  // image of unknown/different dimensions (e.g. square dish photos) so we do not
  // declare 1200x630 for it and get a badly cropped preview.
  imageSize = { width: 1200, height: 630 },
  type = 'website',
  // Accepted for backwards compatibility but no longer output: Google ignores
  // <meta name="keywords"> and it only tells competitors our keyword strategy.
  // eslint-disable-next-line no-unused-vars
  keywords = [],
  noIndex = false,
  // Set when `title` already spells out the brand (e.g. "Terms of Service |
  // Preva Kitchen"). Without this, the root layout's title.template appends
  // " | Preva Kitchen" a second time to every page-level title.
  titleIncludesBrand = false
}) {
  const images = image
    ? [{ url: image, ...(imageSize || {}), alt: title }]
    : undefined;

  return {
    title: titleIncludesBrand ? { absolute: title } : title,
    description,
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
