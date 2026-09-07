const KITCHEN_ORIGIN = 'https://prevakitchen.com';

// Imported article images live in the local asset library; this helper also
// protects older post revisions that still contain clickable legacy links.
export function rewriteLegacyBlogLinks(html = '') {
  const rewritten = String(html).replace(
    /(\bhref\s*=\s*["'])https?:\/\/(?:www\.)?prevaclub\.com(?=\/|["'])/gi,
    `$1${KITCHEN_ORIGIN}`
  );

  // WordPress imports often contain a bare <table>. New tables created in the
  // admin already have this wrapper; add it at render time for legacy posts so
  // every table gets the same borders, spacing and horizontal scroll on mobile.
  let cleaned = rewritten.replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 240), offset);
    const alreadyWrapped = /<(?:div|figure)\b[^>]*class=(["'])[^"']*\bblog-table-wrap\b[^"']*\1[^>]*>\s*$/i.test(prefix);
    return alreadyWrapped ? table : `<div class="blog-table-wrap">${table}</div>`;
  });

  // Strip harsh inline gold backgrounds (e.g. #c5a059 / #d5ad55 / rgb(197, 160, 89)) and black text from WordPress group/callout blocks
  cleaned = cleaned
    .replace(/(<[^>]*\bclass=["'][^"']*(?:has-background|wp-block-group)[^"']*["'][^>]*)\bstyle=["'][^"']*background(?:-color)?:\s*(?:#(?:c5a059|d5ad55|dfc07e|c6a15b|b8924b|cca43b|d4af37)|rgba?\([^)]+\))[^"']*["']/gi, '$1')
    .replace(/\bstyle=["'][^"']*background(?:-color)?:\s*(?:#(?:c5a059|d5ad55|dfc07e|c6a15b|b8924b|cca43b|d4af37)|rgba?\(\s*197\s*,\s*160\s*,\s*89)[^"']*["']/gi, '')
    .replace(/\bhas-black-color\b/gi, '')
    .replace(/\bstyle=["'][^"']*color:\s*(?:#000(?:000)?|black|#111(?:111)?)[^"']*["']/gi, '');

  return cleaned;
}
