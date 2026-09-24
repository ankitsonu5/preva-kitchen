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
 * Normalizes legacy blog links, imported WordPress content, and relative links:
 * - Redirects any blog post links to canonical /blog/:slug structure.
 * - Prevents duplicate root URLs (/slug vs /blog/slug).
 * - Strips outdated club domain references.
 * - Formats legacy tables and inline background styles.
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

  // 3. WordPress imports often contain a bare <table>. New tables created in the
  // admin already have this wrapper; add it at render time for legacy posts so
  // every table gets the same borders, spacing and horizontal scroll on mobile.
  content = content.replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 240), offset);
    const alreadyWrapped = /<(?:div|figure)\b[^>]*class=(["'])[^"']*\bblog-table-wrap\b[^"']*\1[^>]*>\s*$/i.test(prefix);
    return alreadyWrapped ? table : `<div class="blog-table-wrap">${table}</div>`;
  });

  // 4. Strip harsh inline gold backgrounds from WordPress callout blocks
  content = content
    .replace(/(<[^>]*\bclass=["'][^"']*(?:has-background|wp-block-group)[^"']*["'][^>]*)\bstyle=["'][^"']*background(?:-color)?:\s*(?:#(?:c5a059|d5ad55|dfc07e|c6a15b|b8924b|cca43b|d4af37)|rgba?\([^)]+\))[^"']*["']/gi, '$1')
    .replace(/\bstyle=["'][^"']*background(?:-color)?:\s*(?:#(?:c5a059|d5ad55|dfc07e|c6a15b|b8924b|cca43b|d4af37)|rgba?\(\s*197\s*,\s*160\s*,\s*89)[^"']*["']/gi, '')
    .replace(/\bhas-black-color\b/gi, '')
    .replace(/\bstyle=["'][^"']*color:\s*(?:#000(?:000)?|black|#111(?:111)?)[^"']*["']/gi, '');

  return content;
}
