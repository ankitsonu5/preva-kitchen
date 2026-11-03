import test from 'node:test';
import assert from 'node:assert/strict';
import { ObjectId } from 'mongodb';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-gallery-tests';

const { dispatch } = await import('../src/index.js');
const { col } = await import('../src/lib/db.js');

test('gallery development fallback exposes the existing real photo assets', async () => {
  const response = await dispatch({
    method: 'GET',
    path: '/galleries',
    query: { view: 'photo-gallery' }
  });
  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.map((gallery) => gallery.title),
    ['Food & Drinks', 'Kitchen & Chefs', 'Dining & Ambience', 'Events & Celebrations']
  );
  assert.equal(
    response.body.reduce((count, gallery) => count + gallery.images.length, 0),
    9
  );
});

test('public gallery responses include published collections and visible legacy images in admin order', async () => {
  const galleries = await col('galleries');
  const publishedId = new ObjectId();
  for (const gallery of [
    {
      _id: publishedId,
      title: 'Published collection',
      slug: 'published-gallery-test',
      status: 'PUBLISHED',
      sortOrder: 2,
      images: [
        { url: '/published-late.jpg', sortOrder: 1 },
        { url: '/hidden.jpg', sortOrder: 0, visible: false },
        { url: '/published-first.jpg', sortOrder: 0 }
      ]
    },
    {
      _id: new ObjectId(),
      title: 'Draft collection',
      slug: 'draft-gallery-test',
      status: 'DRAFT',
      visible: true,
      sortOrder: 0,
      images: [{ url: '/draft.jpg' }]
    },
    {
      _id: new ObjectId(),
      title: 'Legacy collection',
      slug: 'legacy-gallery-test',
      visible: true,
      sortOrder: 1,
      images: [{ url: '/legacy.jpg' }]
    }
  ]) {
    await galleries.insertOne(gallery);
  }

  const response = await dispatch({
    method: 'GET',
    path: '/galleries',
    query: { view: 'photo-gallery' }
  });
  assert.equal(response.status, 200);
  const visibleGalleries = response.body.filter((gallery) => gallery.slug.endsWith('-gallery-test'));
  assert.deepEqual(visibleGalleries.map((gallery) => gallery.slug), [
    'legacy-gallery-test',
    'published-gallery-test'
  ]);
  assert.deepEqual(
    visibleGalleries[1].images.map((image) => image.url),
    ['/published-first.jpg', '/published-late.jpg']
  );

  const homepageResponse = await dispatch({ method: 'GET', path: '/galleries' });
  assert.equal(
    homepageResponse.body.some((gallery) => gallery.slug === 'draft-gallery-test'),
    true
  );

  const detail = await dispatch({ method: 'GET', path: '/galleries/published-gallery-test' });
  assert.equal(detail.status, 200);
  assert.equal(detail.body.images.some((image) => image.url === '/hidden.jpg'), false);

  const draftDetail = await dispatch({ method: 'GET', path: '/galleries/draft-gallery-test' });
  assert.equal(draftDetail.status, 404);
});

test('gallery admin updates preserve image metadata, visibility, and display order', async () => {
  const galleries = await col('galleries');
  const galleryId = new ObjectId();
  const createdAt = new Date('2025-01-01T00:00:00.000Z');
  await galleries.insertOne({
    _id: galleryId,
    title: 'Editable collection',
    slug: 'editable-gallery-test',
    status: 'PUBLISHED',
    images: [{ url: '/existing.jpg', createdAt }]
  });

  const response = await dispatch({
    method: 'PUT',
    path: `/admin/galleries/${galleryId}`,
    user: { role: 'ADMIN', id: 'gallery-test-admin' },
    body: {
      title: 'Editable collection',
      slug: 'editable-gallery-test',
      status: 'PUBLISHED',
      sortOrder: 4,
      images: [
        {
          url: '/existing.jpg',
          title: 'Dish title',
          altText: 'Descriptive alt text',
          caption: 'Dish caption',
          description: 'Dish description',
          sortOrder: 0,
          visible: false
        }
      ]
    }
  });

  assert.equal(response.status, 200);
  const saved = await galleries.findOne({ _id: galleryId });
  assert.equal(saved.sortOrder, 4);
  assert.deepEqual(
    {
      title: saved.images[0].title,
      alt: saved.images[0].alt,
      altText: saved.images[0].altText,
      caption: saved.images[0].caption,
      description: saved.images[0].description,
      sortOrder: saved.images[0].sortOrder,
      visible: saved.images[0].visible
    },
    {
      title: 'Dish title',
      alt: 'Descriptive alt text',
      altText: 'Descriptive alt text',
      caption: 'Dish caption',
      description: 'Dish description',
      sortOrder: 0,
      visible: false
    }
  );
  assert.equal(new Date(saved.images[0].createdAt).getTime(), createdAt.getTime());
  assert.ok(saved.images[0].updatedAt);
});
