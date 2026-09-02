const KITCHEN_ORIGIN = 'https://prevakitchen.com';

// Imported article images live in the local asset library; this helper also
// protects older post revisions that still contain clickable legacy links.
export function rewriteLegacyBlogLinks(html = '') {
  return String(html).replace(
    /(\bhref\s*=\s*["'])https?:\/\/(?:www\.)?prevaclub\.com(?=\/|["'])/gi,
    `$1${KITCHEN_ORIGIN}`
  );
}
