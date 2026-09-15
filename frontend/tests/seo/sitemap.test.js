// Guardrail suite: sitemap sanity (Phase 14 "sitemap sanity" check).
//
// frontend/src/app/sitemap.js is a real Next.js `sitemap()` route handler —
// it fetches from the CMS backend at request time. We mock its three data
// dependencies (cmsFetch, getPublishedCareerJobs, getCanonicalOrigin) with
// vi.mock (same technique a prior batch used per the master brief: "simulated
// invocation with mocked deps") and invoke the real default export, then
// assert on the real output array.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEST_ORIGIN = 'https://prevakitchen.com';

const cmsFetchMock = vi.fn();
const getPublishedCareerJobsMock = vi.fn();

vi.mock('@/lib/cms', () => ({
  cmsFetch: (...args) => cmsFetchMock(...args)
}));
vi.mock('@/lib/career-api', () => ({
  getPublishedCareerJobs: (...args) => getPublishedCareerJobsMock(...args)
}));
vi.mock('@/lib/site-url', () => ({
  getCanonicalOrigin: () => TEST_ORIGIN
}));

const LEGACY_DISH_SLUGS = [
  'preva-lamb-chops',
  'preva-steak-bites',
  'preva-lobster',
  'preva-mac-and-cheese',
  'preva-yams',
  'collard-greens-with-turkey-meat'
];

function mockCmsResponses({ pages = [], posts = [], products = [] } = {}) {
  cmsFetchMock.mockImplementation((path) => {
    if (path === '/pages') return Promise.resolve(pages);
    if (path === '/posts') return Promise.resolve(posts);
    if (path === '/shop/products') return Promise.resolve(products);
    return Promise.resolve(null);
  });
}

beforeEach(() => {
  cmsFetchMock.mockReset();
  getPublishedCareerJobsMock.mockReset();
});

describe('SEO guardrails: sitemap.js', () => {
  it('excludes the 6 legacy duplicate dish slugs even if the CMS still returns them', async () => {
    mockCmsResponses({
      products: LEGACY_DISH_SLUGS.map((slug, i) => ({ slug, id: `legacy-${i}`, updatedAt: '2026-01-01T00:00:00.000Z' }))
        .concat([{ slug: 'lamb-chops', id: 'current-1', updatedAt: '2026-01-01T00:00:00.000Z' }])
    });
    getPublishedCareerJobsMock.mockResolvedValue([]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();

    for (const slug of LEGACY_DISH_SLUGS) {
      expect(entries.some((e) => e.url.endsWith(`/menu/${slug}`)), `legacy slug "${slug}" must not appear in sitemap`).toBe(false);
    }
    expect(entries.some((e) => e.url === `${TEST_ORIGIN}/menu/lamb-chops`)).toBe(true);
  });

  it('never includes /checkout, /order/, or /preview', async () => {
    mockCmsResponses({});
    getPublishedCareerJobsMock.mockResolvedValue([]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();

    for (const entry of entries) {
      expect(entry.url, `sitemap must not include checkout: ${entry.url}`).not.toContain('/checkout');
      expect(entry.url, `sitemap must not include /order/: ${entry.url}`).not.toMatch(/\/order\//);
      expect(entry.url, `sitemap must not include /preview: ${entry.url}`).not.toContain('/preview');
    }
  });

  it('every entry has an absolute https URL on the canonical origin', async () => {
    mockCmsResponses({
      pages: [{ path: 'gallery', title: 'Gallery', updatedAt: '2026-01-01T00:00:00.000Z' }],
      posts: [{ slug: 'a-post', title: 'A Post', updatedAt: '2026-01-01T00:00:00.000Z' }],
      products: [{ slug: 'lamb-chops', updatedAt: '2026-01-01T00:00:00.000Z' }]
    });
    getPublishedCareerJobsMock.mockResolvedValue([
      { slug: 'line-cook-redford', title: 'Line Cook', department: 'Kitchen', updatedAt: '2026-01-01T00:00:00.000Z' }
    ]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();

    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(() => new URL(entry.url), `not a valid absolute URL: ${entry.url}`).not.toThrow();
      const parsed = new URL(entry.url);
      expect(parsed.protocol, `must be https: ${entry.url}`).toBe('https:');
      expect(parsed.origin, `must be on the canonical origin: ${entry.url}`).toBe(TEST_ORIGIN);
      expect(entry.lastModified, `missing lastModified: ${entry.url}`).toBeTruthy();
    }
  });

  it('excludes noIndex CMS pages and nightlife/club content from the kitchen sitemap', async () => {
    mockCmsResponses({
      pages: [
        { path: 'gallery', title: 'Gallery', updatedAt: '2026-01-01T00:00:00.000Z' },
        { path: 'secret-draft', title: 'Secret Draft', noIndex: true, updatedAt: '2026-01-01T00:00:00.000Z' },
        { path: 'vip-nightclub', title: 'VIP Night Club', updatedAt: '2026-01-01T00:00:00.000Z' }
      ],
      posts: [
        { slug: 'noindex-post', title: 'Hidden', noIndex: true, updatedAt: '2026-01-01T00:00:00.000Z' }
      ]
    });
    getPublishedCareerJobsMock.mockResolvedValue([
      { slug: 'bottle-service-host', title: 'Bottle Service Host', department: 'VIP', updatedAt: '2026-01-01T00:00:00.000Z' }
    ]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain(`${TEST_ORIGIN}/gallery`);
    expect(urls.some((u) => u.includes('secret-draft'))).toBe(false);
    expect(urls.some((u) => u.includes('vip-nightclub'))).toBe(false);
    expect(urls.some((u) => u.includes('noindex-post'))).toBe(false);
    expect(urls.some((u) => u.includes('bottle-service-host'))).toBe(false);
  });

  it('always includes the core indexable routes (home, menu, contact, careers, reservations, catering, about, legal pages)', async () => {
    mockCmsResponses({});
    getPublishedCareerJobsMock.mockResolvedValue([]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // The homepage entry is `${base}` with no trailing slash (see
    // coreRoutes in sitemap.js) — every other core route appends its path.
    expect(urls, 'missing core route /').toContain(TEST_ORIGIN);
    for (const path of ['/menu', '/contact', '/careers', '/reservations', '/catering', '/about', '/privacy-policy', '/terms', '/accessibility']) {
      expect(urls, `missing core route ${path}`).toContain(`${TEST_ORIGIN}${path}`);
    }
  });

  it('de-duplicates entries by URL', async () => {
    mockCmsResponses({
      pages: [{ path: 'menu', title: 'Duplicate of core route', updatedAt: '2026-01-01T00:00:00.000Z' }]
    });
    getPublishedCareerJobsMock.mockResolvedValue([]);

    const sitemap = (await import('@/app/sitemap.js')).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});
