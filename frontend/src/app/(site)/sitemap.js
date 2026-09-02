import { cmsFetch } from '@/lib/cms';
import { getCanonicalOrigin } from '@/lib/site-url';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  const base = getCanonicalOrigin();
  const [pages, posts, products, galleries, services, careerJobs] = await Promise.all([
    cmsFetch('/pages'),
    cmsFetch('/posts', { query: { limit: 200 } }),
    cmsFetch('/shop/products'),
    cmsFetch('/galleries'),
    cmsFetch('/services'),
    cmsFetch('/career-jobs')
  ]);

  const nonKitchen = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|sports bar/i;

  const coreRoutes = [
    { url: `${base}`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/menu`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${base}/preva-kitchen`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/gallery`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/services`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/careers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 }
  ];

  const postEntries = (Array.isArray(posts) ? posts : [])
    .filter(p => !p.noIndex && !nonKitchen.test(`${p.title} ${p.excerpt}`))
    .map(p => ({
      url: `${base}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: new Date(p.updatedAt || p.publishedAt || p.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.8
    }));

  const productEntries = (Array.isArray(products) ? products : [])
    .map(prod => ({
      url: `${base}/menu/${encodeURIComponent(prod.slug || prod.id)}`,
      lastModified: new Date(prod.updatedAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.8
    }));

  const pageEntries = (Array.isArray(pages) ? pages : [])
    .filter(pg => !pg.noIndex && !nonKitchen.test(pg.title))
    .map(pg => ({
      url: `${base}/${String(pg.path || pg.slug).replace(/^\/+/, '')}`,
      lastModified: new Date(pg.updatedAt || Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6
    }));

  const all = [...coreRoutes, ...postEntries, ...productEntries, ...pageEntries];
  return [...new Map(all.map(item => [item.url, item])).values()];
}
