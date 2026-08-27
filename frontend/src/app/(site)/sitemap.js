import { cmsFetch } from '@/lib/cms';

/**
 * Built on request, not at deploy time.
 *
 * A sitemap frozen into the build would list whatever was published the day
 * it shipped, and it would also mean `next build` cannot run without the
 * database up. Both are avoidable.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const [pages, posts, products, categories, galleries, services, careerJobs] = await Promise.all([
    cmsFetch('/pages'), cmsFetch('/posts', { query: { limit: 100 } }), cmsFetch('/shop/products'), cmsFetch('/categories'),
    cmsFetch('/galleries'), cmsFetch('/services'), cmsFetch('/career-jobs')
  ]);
  const fixed = [
    '', '/shop', '/preva-kitchen', '/blog', '/gallery', '/services', '/contact',
    '/careers', '/careers/apply'
  ];
  const entries = fixed.map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
  const append = (rows, pathFor) => (rows || []).map((row) => ({
    url: `${base}/${String(pathFor(row)).replace(/^\/+|\/+$/g, '')}`,
    lastModified: row.updatedAt || row.publishedAt || new Date()
  }));
  const all = entries
    .concat(append(pages, (row) => row.path || row.slug))
    .concat(append(posts, (row) => `blog/${row.slug}`))
    .concat(append(posts, (row) => row.slug))
    .concat(append(products, (row) => `product/${row.slug}`))
    .concat(append(categories, (row) => `category/${row.slug}`))
    .concat(append(galleries, (row) => `gallery/${row.slug}`))
    .concat(append(services, (row) => `services/${row.slug}`))
    .concat(append(careerJobs, (row) => `careers/${row.slug}`));

  return [...new Map(all.map((entry) => [entry.url, entry])).values()];
}
