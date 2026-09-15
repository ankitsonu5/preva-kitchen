import { cmsFetch } from '@/lib/cms';
import { getCanonicalOrigin } from '@/lib/site-url';
import { getPublishedCareerJobs } from '@/lib/career-api';
import { FALLBACK_PRODUCTS } from '@/data/fallbackMenu';
import { FALLBACK_POSTS } from '@/data/fallbackPosts';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache 1 hour

export default async function sitemap() {
  const base = getCanonicalOrigin();
  const [pages, posts, products, jobs] = await Promise.all([
    cmsFetch('/pages'),
    cmsFetch('/posts', { query: { limit: 200 } }),
    cmsFetch('/shop/products'),
    getPublishedCareerJobs()
  ]);

  const nonKitchen = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|sports bar/i;

  // Legacy duplicate dish slugs permanently redirected in next.config.mjs (Batch 3 SEO
  // audit, Sheet 03). Excluded defensively here so they can never re-enter the sitemap
  // even if the underlying CMS record is still live — a sitemap URL that 301s is a
  // Search Console "redirect" warning we must not reintroduce.
  const legacyDishSlugs = new Set([
    'preva-lamb-chops',
    'preva-steak-bites',
    'preva-lobster',
    'preva-mac-and-cheese',
    'preva-yams',
    'collard-greens-with-turkey-meat'
  ]);

  const coreRoutes = [
    { url: `${base}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/menu`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.95 },
    { url: `${base}/order-online`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${base}/gallery`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.75 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/careers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${base}/reservations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/catering`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/accessibility`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 }
  ];

  const postList = Array.isArray(posts) && posts.length > 0 ? posts : FALLBACK_POSTS;
  const postEntries = postList
    .filter(p => !p.noIndex && !nonKitchen.test(`${p.title || ''} ${p.excerpt || ''}`))
    .map(p => ({
      url: `${base}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || p.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.8
    }));

  const productList = Array.isArray(products) && products.length > 0 ? products : FALLBACK_PRODUCTS;
  const productEntries = productList
    .filter(prod => !legacyDishSlugs.has(String(prod.slug || '')))
    .map(prod => ({
      url: `${base}/menu/${encodeURIComponent(prod.slug || prod.id)}`,
      lastModified: new Date(prod.updatedAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.8
    }));

  const jobList = Array.isArray(jobs) ? jobs : [];
  const jobEntries = jobList
    .filter(job => !nonKitchen.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`))
    .map(job => ({
      url: `${base}/careers/${encodeURIComponent(job.slug)}`,
      lastModified: new Date(job.updatedAt || job.publishedAt || job.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.6
    }));

  const pageList = Array.isArray(pages) ? pages : [];
  const pageEntries = pageList
    .filter(pg => !pg.noIndex && !nonKitchen.test(pg.title || '') && !/^(terms|privacy)$/i.test(String(pg.slug || pg.path || '')))
    .map(pg => ({
      url: `${base}/${String(pg.path || pg.slug).replace(/^\/+/, '')}`,
      lastModified: new Date(pg.updatedAt || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6
    }));

  const all = [...coreRoutes, ...postEntries, ...productEntries, ...jobEntries, ...pageEntries];
  return [...new Map(all.map(item => [item.url, item])).values()];
}
