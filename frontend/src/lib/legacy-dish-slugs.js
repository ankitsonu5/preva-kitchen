// Duplicate source slugs. Production data can contain both copies, while the
// static fallback contains only the descriptive `preva-*` form. Hide a slug
// only when its preferred short form is actually present; otherwise the
// fallback item must remain visible.
export const LEGACY_DUPLICATE_SLUGS = new Set([
  'preva-lamb-chops',
  'preva-steak-bites',
  'preva-lobster',
  'preva-mac-and-cheese',
  'preva-yams',
  'collard-greens-with-turkey-meat'
]);

const PREFERRED_SLUG_BY_DUPLICATE = new Map([
  ['preva-lamb-chops', 'lamb-chops'],
  ['preva-steak-bites', 'steak-bites'],
  ['preva-lobster', 'lobster-bites'],
  ['preva-mac-and-cheese', 'mac-and-cheese'],
  ['preva-yams', 'yams'],
  ['collard-greens-with-turkey-meat', 'collard-greens-turkey']
]);

export function withoutLegacyDuplicates(products) {
  const list = products || [];
  const present = new Set(list.map((product) => product?.slug));
  return list.filter((product) => {
    const preferredSlug = PREFERRED_SLUG_BY_DUPLICATE.get(product?.slug);
    return !preferredSlug || !present.has(preferredSlug);
  });
}

// For lists linking to dish pages (related dishes): point each old duplicate at
// the slug next.config.mjs redirects it to, so the link opens in one hop, then
// drop repeats and the dish the visitor is already on.
export function withCanonicalSlugs(products, currentSlug) {
  const seen = new Set([PREFERRED_SLUG_BY_DUPLICATE.get(currentSlug) || currentSlug]);
  const out = [];
  for (const product of products || []) {
    const slug = PREFERRED_SLUG_BY_DUPLICATE.get(product?.slug) || product?.slug;
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug === product.slug ? product : { ...product, slug });
  }
  return out;
}
