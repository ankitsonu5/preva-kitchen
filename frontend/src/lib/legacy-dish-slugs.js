// Old duplicate dish slugs. next.config.mjs 301-redirects each one to the
// surviving dish, but the menu data can still contain both copies, so listings
// (menu, home favorites) skip these to show every dish once.
export const LEGACY_DUPLICATE_SLUGS = new Set([
  'preva-lamb-chops',
  'preva-steak-bites',
  'preva-lobster',
  'preva-mac-and-cheese',
  'preva-yams',
  'collard-greens-with-turkey-meat'
]);

export function withoutLegacyDuplicates(products) {
  return (products || []).filter((product) => !LEGACY_DUPLICATE_SLUGS.has(product?.slug));
}
