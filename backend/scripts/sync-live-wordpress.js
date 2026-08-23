/**
 * Import the public content currently published on prevaclub.com.
 *
 * The importer only uses public WordPress/WooCommerce REST endpoints. It is
 * safe to re-run: records are upserted by their stable WordPress id/slug and
 * local PageBuilder sections are kept when they already exist.
 *
 * Usage: node scripts/sync-live-wordpress.js
 */
import './env.js';
import { MongoClient } from 'mongodb';
import sanitizeHtml from 'sanitize-html';
import { publicHtml } from '../src/lib/sanitize.js';

const WORDPRESS_ORIGIN = (process.env.WORDPRESS_ORIGIN || 'https://prevaclub.com').replace(/\/$/, '');
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);

function decodeEntities(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function plainText(value = '', max = 500) {
  const withoutTags = sanitizeHtml(String(value), { allowedTags: [], allowedAttributes: {} });
  return decodeEntities(withoutTags).replace(/\s+/g, ' ').trim().slice(0, max);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function fetchAll(path) {
  const rows = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = new URL(`${WORDPRESS_ORIGIN}${path}`);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'Preva-Next-Content-Sync/1.0' },
      signal: AbortSignal.timeout(60000)
    });
    if (!response.ok) throw new Error(`${url.pathname} returned HTTP ${response.status}`);
    rows.push(...(await response.json()));
    totalPages = Number(response.headers.get('x-wp-totalpages')) || 1;
    page += 1;
  } while (page <= totalPages);

  return rows;
}

function featuredImage(item) {
  return (
    item?._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    item?.yoast_head_json?.og_image?.[0]?.url ||
    ''
  );
}

function seoDescription(item, fallback = '') {
  return plainText(
    item?.yoast_head_json?.description || item?.excerpt?.rendered || fallback,
    400
  );
}

function genericPageSections(item, title, description) {
  const copy = description || `Discover ${title} at Preva Nightclub & Restaurant in Redford Township.`;
  return [
    {
      id: `wp-${item.id}-intro`,
      type: 'text',
      enabled: true,
      data: {
        heading: title,
        content: `<p>${escapeHtml(copy)}</p>`
      }
    },
    {
      id: `wp-${item.id}-cta`,
      type: 'cta',
      enabled: true,
      data: {
        heading: 'Plan Your Preva Experience',
        subtext: 'Tell us what you are planning and our team will help with availability and next steps.',
        btnLabel: 'Contact Preva',
        btnUrl: `/contact?source=${encodeURIComponent(item.slug)}`
      }
    }
  ];
}

await client.connect();
const db = client.db(process.env.MONGODB_DB || undefined);

try {
  const [pages, posts, wordpressCategories, products] = await Promise.all([
    fetchAll('/wp-json/wp/v2/pages?_embed=1'),
    fetchAll('/wp-json/wp/v2/posts?_embed=1'),
    fetchAll('/wp-json/wp/v2/categories'),
    fetchAll('/wp-json/wc/store/v1/products')
  ]);

  const content = db.collection('content');
  const categories = db.collection('categories');
  const menuItems = db.collection('menuItems');
  const now = new Date();

  try {
    await content.createIndex({ slug: 1 }, { unique: true, sparse: true, name: 'content_slug_unique' });
  } catch {
    // The app already enforces global slug uniqueness; an existing index is fine.
  }

  for (const category of wordpressCategories) {
    await categories.updateOne(
      { slug: category.slug },
      {
        $set: {
          name: plainText(category.name, 120),
          slug: category.slug,
          description: plainText(category.description, 500),
          wpId: category.id,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  const categoryRows = await categories.find({ wpId: { $in: wordpressCategories.map((item) => item.id) } }).toArray();
  const categoryIdByWpId = new Map(categoryRows.map((item) => [item.wpId, item._id]));

  for (const item of [...pages, ...posts]) {
    const type = item.type === 'post' ? 'POST' : 'PAGE';
    const existing = await content.findOne({ slug: item.slug });
    const title = plainText(item.title?.rendered, 250) || item.slug;
    const description = seoDescription(item, title);
    const body = publicHtml(item.content?.rendered || '');
    const pathname = new URL(item.link, WORDPRESS_ORIGIN).pathname.replace(/^\/+|\/+$/g, '');
    const keepSections = Array.isArray(existing?.sections) && existing.sections.length > 0;
    const sections = keepSections
      ? existing.sections
      : body
        ? []
        : genericPageSections(item, title, description);

    await content.updateOne(
      existing ? { _id: existing._id } : { slug: item.slug },
      {
        $set: {
          type,
          status: 'PUBLISHED',
          slug: item.slug,
          path: pathname,
          wpId: item.id,
          wpParentId: item.parent || null,
          wpTemplate: item.template || '',
          title,
          excerpt: seoDescription(item, plainText(body, 500)),
          body: body || existing?.body || '',
          sections,
          featuredImage: featuredImage(item) || existing?.featuredImage || '',
          seoTitle: plainText(item.yoast_head_json?.title, 250) || title,
          seoDescription: description,
          ogTitle: plainText(item.yoast_head_json?.og_title, 250) || title,
          ogDescription: plainText(item.yoast_head_json?.og_description, 400) || description,
          ogImage: featuredImage(item) || existing?.ogImage || '',
          canonicalUrl: item.link,
          categoryIds: type === 'POST'
            ? (item.categories || []).map((id) => categoryIdByWpId.get(id)).filter(Boolean)
            : (existing?.categoryIds || []),
          publishedAt: item.date_gmt ? new Date(`${item.date_gmt}Z`) : existing?.publishedAt || now,
          wpModifiedAt: item.modified_gmt ? new Date(`${item.modified_gmt}Z`) : now,
          syncedFromWordPressAt: now,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  for (const [index, item] of products.entries()) {
    const priceCents = Number(item.prices?.price) || 0;
    const image = item.images?.[0]?.src || '';
    await menuItems.updateOne(
      { slug: item.slug },
      {
        $set: {
          name: plainText(item.name, 180),
          slug: item.slug,
          description: publicHtml(item.description || item.short_description || ''),
          priceCents,
          price: `$${(priceCents / 100).toFixed(2)}`,
          image,
          category: plainText(item.categories?.[0]?.name || 'Others', 100),
          available: item.is_in_stock !== false,
          orderable: item.is_purchasable !== false,
          featured: Boolean(item.is_featured),
          tags: (item.tags || []).map((tag) => plainText(tag.name, 80)).filter(Boolean),
          wpId: item.id,
          sku: plainText(item.sku, 100),
          sortOrder: index + 1,
          syncedFromWordPressAt: now,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  console.log(`Synced ${pages.length} pages, ${posts.length} posts, ${products.length} products and ${wordpressCategories.length} categories from ${WORDPRESS_ORIGIN}.`);
} finally {
  await client.close();
}
