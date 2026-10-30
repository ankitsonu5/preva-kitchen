import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-public-tests';

const { dispatch } = await import('../src/index.js');
const { col } = await import('../src/lib/db.js');

test('public post summaries omit large article fields and retain full API responses by default', async () => {
  const posts = await col('content');
  const postId = new ObjectId();
  await posts.insertOne({
    _id: postId,
    title: 'Summary Test Post',
    slug: 'summary-test-post',
    type: 'POST',
    status: 'PUBLISHED',
    excerpt: 'A short summary.',
    body: '<p>Full article content.</p>',
    customCss: '.large { content: "not for a listing"; }',
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    categoryIds: [],
    tagIds: [],
    noIndex: false
  });

  const summaryResponse = await dispatch({
    method: 'GET',
    path: '/posts',
    query: { limit: '100', summary: 'true' }
  });
  assert.equal(summaryResponse.status, 200);
  const summaryPost = summaryResponse.body.find((post) => post.slug === 'summary-test-post');
  assert.ok(summaryPost);
  assert.equal(summaryPost.excerpt, 'A short summary.');
  assert.equal(summaryPost.body, undefined);
  assert.equal(summaryPost.content, undefined);
  assert.equal(summaryPost.customCss, undefined);

  const fullResponse = await dispatch({
    method: 'GET',
    path: '/posts',
    query: { limit: '100' }
  });
  const fullPost = fullResponse.body.find((post) => post.slug === 'summary-test-post');
  assert.equal(fullPost.body, '<p>Full article content.</p>');
  assert.equal(fullPost.content, '<p>Full article content.</p>');
});

test('public post routes return 503 for MongoDB network failures', async () => {
  const previousDatabase = globalThis.__prevaDb;
  globalThis.__prevaDb = {
    collection() {
      const error = new Error('test network timeout');
      error.name = 'MongoNetworkTimeoutError';
      throw error;
    }
  };

  try {
    const listResponse = await dispatch({ method: 'GET', path: '/posts' });
    const detailResponse = await dispatch({ method: 'GET', path: '/posts/example-post' });
    assert.equal(listResponse.status, 503);
    assert.equal(detailResponse.status, 503);
    assert.match(listResponse.body.message, /temporarily unavailable/i);
    assert.match(detailResponse.body.message, /temporarily unavailable/i);
  } finally {
    globalThis.__prevaDb = previousDatabase;
  }
});

test('Rasta Pasta receives its optional protein modifier and admin writes persist it only on that item', async () => {
  const menuItems = await col('menuItems');
  const rastaPasta = await menuItems.findOne({ slug: 'rasta-pasta' });
  assert.ok(rastaPasta);

  const publicRasta = await dispatch({ method: 'GET', path: '/shop/products/rasta-pasta' });
  assert.equal(publicRasta.status, 200);
  assert.equal(publicRasta.body.product.priceCents, rastaPasta.priceCents);
  assert.deepEqual(
    publicRasta.body.product.optionGroups[0].options.map(({ label, priceCents }) => [label, priceCents]),
    [
      ['No Extra Protein', 0],
      ['Chicken', 500],
      ['Shrimp', 600],
      ['Steak', 700],
      ['Lobster', 1200]
    ]
  );
  assert.equal(publicRasta.body.product.optionGroups[0].label, 'PROTEIN OPTIONS');
  assert.equal(publicRasta.body.product.optionGroups[0].required, false);

  const updateResponse = await dispatch({
    method: 'PUT',
    path: `/admin/menu-items/${rastaPasta._id}`,
    user: { role: 'ADMIN', id: 'test-admin' },
    body: {
      name: rastaPasta.name,
      slug: rastaPasta.slug,
      price: rastaPasta.price,
      priceCents: rastaPasta.priceCents,
      description: rastaPasta.description,
      category: rastaPasta.category,
      image: rastaPasta.image,
      available: rastaPasta.available,
      orderable: rastaPasta.orderable
    }
  });
  assert.equal(updateResponse.status, 200);
  const savedRasta = await menuItems.findOne({ _id: rastaPasta._id });
  assert.equal(savedRasta.priceCents, rastaPasta.priceCents);
  assert.equal(savedRasta.optionGroups[0].label, 'PROTEIN OPTIONS');
  assert.equal(savedRasta.optionGroups[0].options[4].priceCents, 1200);

  const publicWings = await dispatch({ method: 'GET', path: '/shop/products/preva-wings' });
  assert.equal(publicWings.status, 200);
  assert.deepEqual(publicWings.body.product.optionGroups, []);
});

test('menu summary responses omit detail-only fields and keep Rasta Pasta pricing data', async () => {
  const response = await dispatch({
    method: 'GET',
    path: '/shop/products',
    query: { summary: 'true' }
  });
  assert.equal(response.status, 200);
  const rastaPasta = response.body.find((product) => product.slug === 'rasta-pasta');
  assert.ok(rastaPasta);
  assert.equal(rastaPasta.priceCents, 2200);
  assert.equal(rastaPasta.aboutContent, undefined);
  assert.equal(rastaPasta.faqs, undefined);
  assert.equal(rastaPasta.optionGroups[0].label, 'PROTEIN OPTIONS');
});

test('menu items with orderable false are excluded in both summary and full responses', async () => {
  const menuItems = await col('menuItems');
  const slug = 'summary-orderable-false-test';
  await menuItems.insertOne({
    name: 'Summary Orderable False Test',
    slug,
    category: 'Test',
    orderable: false,
    available: true,
    isVisible: true,
    priceCents: 100,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const [summaryResponse, fullResponse] = await Promise.all([
    dispatch({ method: 'GET', path: '/shop/products', query: { summary: 'true' } }),
    dispatch({ method: 'GET', path: '/shop/products' })
  ]);

  assert.equal(summaryResponse.status, 200);
  assert.equal(fullResponse.status, 200);
  assert.equal(summaryResponse.body.some((item) => item.slug === slug), false);
  assert.equal(fullResponse.body.some((item) => item.slug === slug), false);
});
