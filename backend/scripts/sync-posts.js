import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { MongoClient } from 'mongodb';
import sanitizeHtml from 'sanitize-html';

const WORDPRESS_ORIGIN = (process.env.WORDPRESS_ORIGIN || 'https://prevaclub.com').replace(/\/$/, '');
const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(uri);
const NON_KITCHEN_COPY = /night\s*life|night\s*club|\bclub\b|\bvip\b|bottle service|\bdj\b|afrobeats|sports bar|happy hour|pre-game|afterpart|party at|dress code/i;

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

async function syncPosts() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || undefined);

  try {
    console.log('Fetching live WordPress posts and categories from prevaclub.com...');
    const [posts, wordpressCategories] = await Promise.all([
      fetchAll('/wp-json/wp/v2/posts?_embed=1'),
      fetchAll('/wp-json/wp/v2/categories')
    ]);

    const content = db.collection('content');
    const categories = db.collection('categories');
    const now = new Date();
    const categoryNameByWpId = new Map(
      wordpressCategories.map((category) => [category.id, plainText(category.name, 120)])
    );
    const kitchenPosts = posts.filter((item) => {
      const categoryNames = (item.categories || [])
        .map((id) => categoryNameByWpId.get(id) || '')
        .join(' ');
      const publicCopy = plainText(
        `${item.title?.rendered || ''} ${item.excerpt?.rendered || ''} ${categoryNames}`,
        5000
      );
      return !NON_KITCHEN_COPY.test(publicCopy);
    });

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

    for (const item of kitchenPosts) {
      const existing = await content.findOne({ slug: item.slug });
      const title = plainText(item.title?.rendered, 250) || item.slug;
      const description = seoDescription(item, title);
      const body = item.content?.rendered || '';
      const pathname = new URL(item.link, WORDPRESS_ORIGIN).pathname.replace(/^\/+|\/+$/g, '');

      await content.updateOne(
        existing ? { _id: existing._id } : { slug: item.slug },
        {
          $set: {
            type: 'POST',
            status: 'PUBLISHED',
            slug: item.slug,
            path: pathname,
            wpId: item.id,
            title,
            excerpt: seoDescription(item, plainText(body, 500)),
            body: body || existing?.body || '',
            featuredImage: featuredImage(item) || existing?.featuredImage || '',
            seoTitle: plainText(item.yoast_head_json?.title, 250) || title,
            seoDescription: description,
            ogTitle: plainText(item.yoast_head_json?.og_title, 250) || title,
            ogDescription: plainText(item.yoast_head_json?.og_description, 400) || description,
            ogImage: featuredImage(item) || existing?.ogImage || '',
            canonicalUrl: item.link,
            categoryIds: (item.categories || []).map((id) => categoryIdByWpId.get(id)).filter(Boolean),
            publishedAt: item.date_gmt ? new Date(`${item.date_gmt}Z`) : existing?.publishedAt || now,
            wpModifiedAt: item.modified_gmt ? new Date(`${item.modified_gmt}Z`) : now,
            syncedFromWordPressAt: now,
            updatedAt: now
          },
          $setOnInsert: { createdAt: now }
        },
        { upsert: true }
      );
      console.log(`Synced blog post: "${title}"`);
    }

    console.log(`Successfully synced ${kitchenPosts.length} kitchen blog posts into MongoDB (${posts.length - kitchenPosts.length} club/nightlife posts skipped).`);
  } finally {
    await client.close();
  }
}

syncPosts().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
