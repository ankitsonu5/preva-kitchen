export const KITCHEN_ORIGIN = 'https://prevakitchen.com';

const NON_BLOG_ROOT_PATHS = new Set([
  '',
  'menu',
  'about',
  'contact',
  'careers',
  'gallery',
  'checkout',
  'catering',
  'reservations',
  'privacy-policy',
  'terms',
  'accessibility',
  'order-online',
  'online-order-platform',
  'preva-kitchen-menu',
  'preva-kitchen',
  'blog',
  'asset',
  'api',
  'admin',
  'kitchen',
  'display',
  'category',
  'product',
  'order',
  'preview',
  'shop'
]);

/**
 * Move clickable links away from the retired club domain and force all
 * blog post internal links to the canonical /blog/:slug structure.
 */
export function rewriteLegacyBlogLinks(html = '') {
  let content = String(html || '');

  // 1. Rewrite any prevakitchen.com/<slug> or prevaclub.com/<slug> or /<slug> to /blog/<slug> if <slug> is a post
  content = content.replace(
    /(\bhref\s*=\s*["'])(?:https?:\/\/(?:www\.)?(?:prevakitchen\.com|prevaclub\.com))?\/([a-z0-9-]+)\/?([?#][^"']*)?(["'])/gi,
    (match, prefix, slug, queryOrHash = '', suffix) => {
      const lower = slug.toLowerCase();
      if (NON_BLOG_ROOT_PATHS.has(lower)) {
        return `${prefix}${KITCHEN_ORIGIN}/${lower}${queryOrHash}${suffix}`;
      }
      return `${prefix}${KITCHEN_ORIGIN}/blog/${lower}${queryOrHash}${suffix}`;
    }
  );

  // 2. Also ensure any remaining prevaclub.com links are pointed to prevakitchen.com
  content = content.replace(
    /(\bhref\s*=\s*["'])https?:\/\/(?:www\.)?prevaclub\.com(?=\/|["'])/gi,
    `$1${KITCHEN_ORIGIN}`
  );

  return content;
}

export function blogCanonical(slug = '') {
  return `${KITCHEN_ORIGIN}/blog/${encodeURIComponent(String(slug).trim())}`;
}
