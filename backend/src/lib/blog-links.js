export const KITCHEN_ORIGIN = 'https://prevakitchen.com';

/**
 * Move clickable links away from the retired club domain. Image URLs are
 * migrated separately into the project's public asset library.
 */
export function rewriteLegacyBlogLinks(html = '') {
  return String(html).replace(
    /(\bhref\s*=\s*["'])https?:\/\/(?:www\.)?prevaclub\.com(?=\/|["'])/gi,
    `$1${KITCHEN_ORIGIN}`
  );
}

export function blogCanonical(slug = '') {
  return `${KITCHEN_ORIGIN}/blog/${encodeURIComponent(String(slug).trim())}`;
}
