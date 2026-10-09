import { describe, expect, it } from 'vitest';
import { withCanonicalSlugs } from '../../src/lib/legacy-dish-slugs.js';

const dish = (slug) => ({ id: slug, slug });

describe('related dish links', () => {
  it('points old duplicate slugs at the page they redirect to', () => {
    expect(withCanonicalSlugs([dish('preva-lamb-chops'), dish('fries')], 'catfish-bites-with-fries').map((d) => d.slug))
      .toEqual(['lamb-chops', 'fries']);
  });

  it('drops the dish being viewed, including under its old slug', () => {
    expect(withCanonicalSlugs([dish('preva-lobster'), dish('fries')], 'lobster-bites').map((d) => d.slug)).toEqual(['fries']);
  });

  it('does not list the same dish twice when both slugs are returned', () => {
    expect(withCanonicalSlugs([dish('preva-yams'), dish('yams')], 'fries').map((d) => d.slug)).toEqual(['yams']);
  });
});
