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
  return rewritten.replace(/<table\b[\s\S]*?<\/table>/gi, (table, offset, source) => {
    const prefix = source.slice(Math.max(0, offset - 240), offset);
    const alreadyWrapped = /<(?:div|figure)\b[^>]*class=(["'])[^"']*\bblog-table-wrap\b[^"']*\1[^>]*>\s*$/i.test(prefix);
    return alreadyWrapped ? table : `<div class="blog-table-wrap">${table}</div>`;
  });
}
