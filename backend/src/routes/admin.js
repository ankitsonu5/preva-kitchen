import slugify from 'slugify';
import { col, serialize, asObjectId } from '../lib/db.js';
import {
  cleanText, cleanEmail, cleanBool, cleanInt, cleanOrderUrl,
  normalizeOrderAvailability, publicHtml, parseMoney
} from '../lib/sanitize.js';
import { hashPassword } from '../lib/auth.js';
import { logActivity } from '../lib/activity.js';
import { loadContentInclude } from './public.js';
import { stripe, stripeConfigured, paymentStatusSummary } from '../lib/stripe.js';
import { careerJobsCollection } from '../lib/career-jobs.js';
import { get, post, put, patch, del, badRequest, forbidden, notFound, result } from '../router.js';

const WRITE = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];
const AUTHOR = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR'];
const MANAGE = ['SUPER_ADMIN', 'ADMIN'];
const CAREERS = ['SUPER_ADMIN', 'ADMIN', 'CAREERS_MANAGER'];

const slug = (value) => slugify(String(value || ''), { lower: true, strict: true });

/* ══════════════════════════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/dashboard', { auth: true }, async () => {
  const [content, media, contacts, orders, reservations, subscribers, activity, categories, users, services, careerApps] = await Promise.all([
    col('content'), col('media'), col('contactEnquiry'), col('order'),
    col('reservation'), col('subscriber'), col('activityLog'), col('categories'), col('users'), col('services'), col('careerApplications')
  ]);

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    posts, pages, publishedPosts, draftPosts, mediaCount,
    newContacts, newReservations, subscriberCount, recent,
    revenue, activeOrders, totalOrders, categoryCount,
    userCount, serviceCount, enquiryCount, careerAppCount,
    recentPosts, recentEnquiries, recentOrders
  ] = await Promise.all([
    content.countDocuments({ type: 'POST' }),
    content.countDocuments({ type: 'PAGE' }),
    content.countDocuments({ type: 'POST', status: 'PUBLISHED' }),
    content.countDocuments({ type: 'POST', status: 'DRAFT' }),
    media.countDocuments(),
    contacts.countDocuments({ status: { $in: ['NEW', 'unread', 'PENDING'] } }).catch(() => 0),
    reservations.countDocuments({ status: { $in: ['NEW', 'PENDING', 'unread'] } }).catch(() => 0),
    subscribers.countDocuments(),
    activity.find().sort({ createdAt: -1 }).limit(10).toArray(),
    orders.aggregate([
      { $match: { status: { $in: ['PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED'] }, createdAt: { $gte: since } } },
      { $group: { _id: null, total: { $sum: '$totalCents' }, count: { $sum: 1 } } }
    ]).toArray(),
    orders.countDocuments({ status: { $in: ['PENDING', 'PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY'] } }),
    orders.countDocuments(),
    categories.countDocuments(),
    users.countDocuments({ status: { $ne: 'DISABLED' } }),
    services.countDocuments(),
    contacts.countDocuments(),
    careerApps.countDocuments({ status: { $in: ['NEW', 'PENDING', 'unread'] } }).catch(() => 0),
    content.find({ type: 'POST' }).sort({ updatedAt: -1 }).limit(6).toArray(),
    contacts.find().sort({ createdAt: -1 }).limit(6).toArray(),
    orders.find().sort({ createdAt: -1 }).limit(6).toArray()
  ]);

  return {
    posts,
    pages,
    publishedPosts,
    draftPosts,
    galleryImages: mediaCount,
    categories: categoryCount,
    users: userCount,
    services: serviceCount,
    enquiries: enquiryCount,
    unreadEnquiries: newContacts,
    newReservations,
    activeOrders,
    totalOrders,
    careerApps: careerAppCount,
    recentPosts: recentPosts.map(serialize),
    recentEnquiries: recentEnquiries.map(serialize),
    recentOrders: recentOrders.map(serialize),
    counts: {
      posts, pages, drafts: draftPosts, media: mediaCount,
      newContacts, newReservations, subscribers: subscriberCount,
      openOrders: activeOrders,
      careerApps: careerAppCount
    },
    revenue30d: revenue[0]?.total || 0,
    orders30d: revenue[0]?.count || 0,
    recentActivity: recent.map(serialize)
  };
});

/* ══════════════════════════════════════════════════════════════════════════
   Content (posts and pages)
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/content', { auth: true }, async ({ query, user }) => {
  const content = await col('content');
  const filter = {};
  if (user.role === 'AUTHOR') filter.authorId = asObjectId(user.id);
  if (query.type) filter.type = cleanText(query.type, 20).toUpperCase();
  if (query.status) filter.status = cleanText(query.status, 20).toUpperCase();
  if (query.search) filter.title = { $regex: cleanText(query.search, 100), $options: 'i' };

  const rows = await content.find(filter).sort({ updatedAt: -1 }).limit(200).toArray();
  return loadContentInclude(rows);
});

get('/admin/content/:id', { auth: true }, async ({ params, user }) => {
  const content = await col('content');
  const row = await content.findOne({ _id: asObjectId(params.id) });
  if (!row) throw notFound('Content not found.');
  if (user.role === 'AUTHOR' && String(row.authorId) !== user.id) throw forbidden('You can only open your own content.');
  const [withRelations] = await loadContentInclude([row]);
  return withRelations;
});

function contentPayload(body, user) {
  const title = cleanText(body?.title, 250);
  if (!title) throw badRequest('A title is required.');

  const status = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'TRASH'].includes(String(body?.status).toUpperCase())
    ? String(body.status).toUpperCase()
    : 'DRAFT';
  const requestedPublishDate = body?.publishedAt ? new Date(body.publishedAt) : null;
  const hasValidPublishDate = requestedPublishDate && !Number.isNaN(requestedPublishDate.getTime());
  if (status === 'SCHEDULED' && !hasValidPublishDate) {
    throw badRequest('Choose a valid date and time before scheduling this content.');
  }

  return {
    title,
    slug: slug(body?.slug || title),
    type: String(body?.type).toUpperCase() === 'PAGE' ? 'PAGE' : 'POST',
    status,
    excerpt: cleanText(body?.excerpt, 500),
    body: publicHtml(body?.body ?? body?.content),
    sections: (Array.isArray(body?.sections) ? body.sections : []).slice(0, 80),
    featuredImage: cleanText(body?.featuredImage, 2000),
    categoryIds: (Array.isArray(body?.categoryIds) ? body.categoryIds : []).map(String).slice(0, 20),
    tagIds: (Array.isArray(body?.tagIds) ? body.tagIds : []).map(String).slice(0, 40),
    seoTitle: cleanText(body?.seoTitle, 250),
    seoDescription: cleanText(body?.seoDescription, 400),
    ogTitle: cleanText(body?.ogTitle, 250),
    ogDescription: cleanText(body?.ogDescription, 400),
    ogImage: cleanText(body?.ogImage, 2000),
    canonicalUrl: cleanText(body?.canonicalUrl, 2000),
    metaRobots: cleanText(body?.metaRobots, 80),
    focusKeyword: cleanText(body?.focusKeyword, 160),
    noIndex: cleanBool(body?.noIndex, false),
    parentPageId: cleanText(body?.parentPageId, 80),
    sortOrder: cleanInt(body?.sortOrder, 0),
    pageTemplate: cleanText(body?.pageTemplate, 80) || 'default',
    authorId: user?.id ? asObjectId(user.id) : null,
    publishedAt: status === 'PUBLISHED'
      ? (hasValidPublishDate ? requestedPublishDate : new Date())
      : status === 'SCHEDULED' && hasValidPublishDate
        ? requestedPublishDate
        : null
  };
}

post('/admin/content', { auth: true, roles: AUTHOR }, async (ctx) => {
  const content = await col('content');
  const document = contentPayload(ctx.body, ctx.user);
  if (ctx.user.role === 'AUTHOR' && document.type !== 'POST') throw forbidden('Authors can create posts, but not website pages.');

  if (await content.findOne({ slug: document.slug })) {
    throw badRequest('That slug is already used by another item.');
  }

  const now = new Date();
  const inserted = await content.insertOne({ ...document, createdAt: now, updatedAt: now });
  await logActivity(ctx, 'CREATE', document.type, document.title);
  return result(serialize({ ...document, _id: inserted.insertedId }), { status: 201 });
});

put('/admin/content/:id', { auth: true, roles: AUTHOR }, async (ctx) => {
  const content = await col('content');
  const id = asObjectId(ctx.params.id);
  const current = id ? await content.findOne({ _id: id }) : null;
  if (!current) throw notFound('Content not found.');

  // Authors may only edit their own work.
  if (ctx.user.role === 'AUTHOR' && String(current.authorId) !== ctx.user.id) {
    throw badRequest('You can only edit your own content.');
  }

  const document = contentPayload(ctx.body, ctx.user);
  if (ctx.user.role === 'AUTHOR' && document.type !== 'POST') throw forbidden('Authors can edit posts, but not website pages.');
  const clash = await content.findOne({ slug: document.slug, _id: { $ne: id } });
  if (clash) throw badRequest('That slug is already used by another item.');

  // Keep the original publish date rather than bumping it on every edit.
  document.publishedAt = document.status === 'PUBLISHED'
    ? current.publishedAt || document.publishedAt || new Date()
    : document.status === 'SCHEDULED'
      ? document.publishedAt
      : null;
  document.authorId = current.authorId || document.authorId;

  await content.updateOne({ _id: id }, { $set: { ...document, updatedAt: new Date() } });
  await logActivity(ctx, 'UPDATE', document.type, document.title);
  return serialize({ ...current, ...document, _id: id });
});

del('/admin/content/:id', { auth: true, roles: WRITE }, async (ctx) => {
  const content = await col('content');
  const id = asObjectId(ctx.params.id);
  const current = id ? await content.findOne({ _id: id }) : null;
  if (!current) throw notFound('Content not found.');

  // First delete moves to trash, second removes it for good.
  if (current.status === 'TRASH') {
    await content.deleteOne({ _id: id });
    await logActivity(ctx, 'DELETE', current.type, current.title);
    return { ok: true, removed: true };
  }

  await content.updateOne({ _id: id }, { $set: { status: 'TRASH', updatedAt: new Date() } });
  await logActivity(ctx, 'TRASH', current.type, current.title);
  return { ok: true, trashed: true };
});

patch('/admin/content/:id/restore', { auth: true, roles: WRITE }, async (ctx) => {
  const content = await col('content');
  const id = asObjectId(ctx.params.id);
  const current = id ? await content.findOne({ _id: id }) : null;
  if (!current) throw notFound('Content not found.');

  await content.updateOne({ _id: id }, { $set: { status: 'DRAFT', updatedAt: new Date() } });
  await logActivity(ctx, 'RESTORE', current.type, current.title);
  return { ok: true };
});

post('/admin/content/:id/preview-token', { auth: true }, async ({ params, user }) => {
  const content = await col('content');
  const id = asObjectId(params.id);
  if (!id) throw notFound('Content not found.');

  const current = await content.findOne({ _id: id });
  if (!current) throw notFound('Content not found.');
  if (user.role === 'AUTHOR' && String(current.authorId) !== user.id) throw forbidden('You can only preview your own content.');

  const token = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  const updated = await content.updateOne(
    { _id: id },
    { $set: { previewToken: token, previewTokenExpiresAt: expires } }
  );
  return { token, expiresAt: expires, url: `/preview?token=${token}` };
});

/* ══════════════════════════════════════════════════════════════════════════
   Settings and sections
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/settings', { auth: true }, async () => {
  const settings = await col('setting');
  const rows = await settings.find().toArray();
  const flat = {};
  for (const row of rows) flat[row.key] = row.value;
  return flat;
});

put('/admin/settings', { auth: true, roles: MANAGE }, async (ctx) => {
  const settings = await col('setting');
  const payload = ctx.body && typeof ctx.body === 'object' ? ctx.body : {};
  const now = new Date();

  const operations = Object.entries(payload).slice(0, 200).map(([key, value]) => ({
    updateOne: {
      filter: { key: cleanText(key, 80) },
      update: { $set: { key: cleanText(key, 80), value, updatedAt: now } },
      upsert: true
    }
  }));

  if (operations.length) await settings.bulkWrite(operations);
  await logActivity(ctx, 'UPDATE', 'SETTINGS', `${operations.length} keys`);
  return { ok: true, updated: operations.length };
});

get('/admin/sections', { auth: true }, async () => {
  const sections = await col('contentSections');
  const rows = await sections.find().sort({ key: 1 }).toArray();
  return rows.map(serialize);
});

post('/admin/sections', { auth: true, roles: MANAGE }, async (ctx) => {
  const key = cleanText(ctx.body?.key, 80);
  if (!key) throw badRequest('A section key is required.');

  const sections = await col('contentSections');
  if (await sections.findOne({ key })) throw badRequest('That section key already exists.');

  const now = new Date();
  const document = {
    key,
    title: cleanText(ctx.body?.title, 200) || key,
    visible: ctx.body?.visible !== false,
    data: ctx.body?.data ?? {},
    createdAt: now,
    updatedAt: now
  };
  const inserted = await sections.insertOne(document);
  await logActivity(ctx, 'CREATE', 'SECTION', key);
  return result(serialize({ ...document, _id: inserted.insertedId }), { status: 201 });
});

put('/admin/sections/:key', { auth: true, roles: MANAGE }, async (ctx) => {
  const sections = await col('contentSections');
  const key = cleanText(ctx.params.key, 80);
  await sections.updateOne(
    { key },
    {
      $set: {
        key,
        title: cleanText(ctx.body?.title, 200) || key,
        visible: ctx.body?.visible !== false,
        data: ctx.body?.data ?? {},
        updatedAt: new Date()
      },
      $setOnInsert: { createdAt: new Date() }
    },
    { upsert: true }
  );
  await logActivity(ctx, 'UPDATE', 'SECTION', key);
  return { ok: true };
});

del('/admin/sections/:key', { auth: true, roles: MANAGE }, async (ctx) => {
  const sections = await col('contentSections');
  await sections.deleteOne({ key: cleanText(ctx.params.key, 80) });
  await logActivity(ctx, 'DELETE', 'SECTION', ctx.params.key);
  return { ok: true };
});

/* ══════════════════════════════════════════════════════════════════════════
   A CRUD factory
   ─────────────────────────────────────────────────────────────────────────
   Categories, tags, galleries, services, ordering platforms and menu items
   are all the same shape: list, create, update, delete, with a slug and an
   activity log line. Writing that six times is six chances to get one of them
   subtly wrong, so it is written once.
   ══════════════════════════════════════════════════════════════════════════ */

function resource({ path, collection, entity, roles = WRITE, sort = { name: 1 }, unique = null, build }) {
  get(`/admin/${path}`, { auth: true }, async () => {
    const target = await col(collection);
    const rows = await target.find().sort(sort).toArray();
    return rows.map(serialize);
  });

  post(`/admin/${path}`, { auth: true, roles }, async (ctx) => {
    const target = await col(collection);
    const document = await build(ctx.body, null, ctx);

    if (unique && (await target.findOne({ [unique]: document[unique] }))) {
      throw badRequest(`Another ${entity.toLowerCase().replace('_', ' ')} already uses that ${unique}.`);
    }

    const now = new Date();
    const inserted = await target.insertOne({ ...document, createdAt: now, updatedAt: now });
    await logActivity(ctx, 'CREATE', entity, document.name || document.title || document[unique] || '');
    return result(serialize({ ...document, _id: inserted.insertedId }), { status: 201 });
  });

  put(`/admin/${path}/:id`, { auth: true, roles }, async (ctx) => {
    const target = await col(collection);
    const id = asObjectId(ctx.params.id);
    const current = id ? await target.findOne({ _id: id }) : null;
    if (!current) throw notFound(`${entity} not found.`);

    const document = await build(ctx.body, current, ctx);

    if (unique) {
      const clash = await target.findOne({ [unique]: document[unique], _id: { $ne: id } });
      if (clash) throw badRequest(`Another ${entity.toLowerCase().replace('_', ' ')} already uses that ${unique}.`);
    }

    await target.updateOne({ _id: id }, { $set: { ...document, updatedAt: new Date() } });
    await logActivity(ctx, 'UPDATE', entity, document.name || document.title || '');
    return serialize({ ...current, ...document, _id: id });
  });

  del(`/admin/${path}/:id`, { auth: true, roles }, async (ctx) => {
    const target = await col(collection);
    const id = asObjectId(ctx.params.id);
    const current = id ? await target.findOne({ _id: id }) : null;
    if (!current) throw notFound(`${entity} not found.`);

    await target.deleteOne({ _id: id });
    await logActivity(ctx, 'DELETE', entity, current.name || current.title || '');
    return { ok: true };
  });
}

resource({
  path: 'categories', collection: 'categories', entity: 'CATEGORY', unique: 'slug',
  build: (body) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('A category name is required.');
    return { name, slug: slug(body?.slug || name), description: cleanText(body?.description, 500) };
  }
});

resource({
  path: 'tags', collection: 'tags', entity: 'TAG', unique: 'slug',
  build: (body) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('A tag name is required.');
    return { name, slug: slug(body?.slug || name) };
  }
});

resource({
  path: 'galleries', collection: 'galleries', entity: 'GALLERY', unique: 'slug',
  sort: { updatedAt: -1 },
  build: (body) => {
    const title = cleanText(body?.title, 200);
    if (!title) throw badRequest('A gallery title is required.');
    return {
      title,
      name: title,
      slug: slug(body?.slug || title),
      description: cleanText(body?.description, 1000),
      coverImage: cleanText(body?.coverImage, 2000),
      images: (Array.isArray(body?.images) ? body.images : []).slice(0, 200).map((image) => ({
        url: cleanText(image?.url ?? image, 2000),
        alt: cleanText(image?.alt, 200),
        caption: cleanText(image?.caption, 300)
      })),
      status: String(body?.status).toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    };
  }
});

resource({
  path: 'services', collection: 'services', entity: 'SERVICE', unique: 'slug',
  sort: { sortOrder: 1, name: 1 },
  build: (body) => {
    const title = cleanText(body?.title, 200);
    if (!title) throw badRequest('A service title is required.');
    return {
      title,
      name: title,
      slug: slug(body?.slug || title),
      excerpt: cleanText(body?.excerpt, 500),
      body: publicHtml(body?.body),
      image: cleanText(body?.image, 2000),
      icon: cleanText(body?.icon, 80),
      sortOrder: cleanInt(body?.sortOrder, 0),
      status: String(body?.status).toUpperCase() === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
    };
  }
});

resource({
  path: 'ordering-platforms', collection: 'orderingPlatforms', entity: 'ORDERING_PLATFORM',
  sort: { sortOrder: 1, name: 1 },
  build: (body) => {
    const name = cleanText(body?.name, 120);
    const url = cleanOrderUrl(body?.url);
    if (!name) throw badRequest('A platform name is required.');
    if (!url) throw badRequest('Enter a valid http(s) or tel: ordering URL.');
    return {
      name,
      providerKey: slug(body?.providerKey || name),
      description: cleanText(body?.description, 240),
      logo: cleanText(body?.logo, 2000),
      availability: normalizeOrderAvailability(body?.availability),
      url,
      isActive: cleanBool(body?.isActive, true),
      sortOrder: cleanInt(body?.sortOrder, 0)
    };
  }
});

/* Career roles are CMS records: publishing one exposes it on the public
   careers pages and in the application form. */
function careerJobPayload(body) {
  const title = cleanText(body?.title, 160);
  if (!title) throw badRequest('A job title is required.');

  return {
    title,
    slug: slug(body?.slug || title),
    department: cleanText(body?.department, 120) || 'Preva Kitchen',
    location: cleanText(body?.location, 160) || 'Redford Township, MI',
    badge: cleanText(body?.badge, 80) || 'Ongoing hiring',
    type: cleanText(body?.type, 100) || 'Part-time / Full-time',
    schedule: cleanText(body?.schedule, 160) || 'Flexible shifts',
    pay: cleanText(body?.pay, 160) || 'Pay range pending confirmation',
    salaryMin: Math.max(Number(body?.salaryMin) || 0, 0),
    salaryMax: Math.max(Number(body?.salaryMax) || 0, 0),
    salaryUnit: ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'].includes(String(body?.salaryUnit).toUpperCase())
      ? String(body.salaryUnit).toUpperCase()
      : 'HOUR',
    intro: cleanText(body?.intro, 1200),
    responsibilities: (Array.isArray(body?.responsibilities) ? body.responsibilities : [])
      .slice(0, 30).map((item) => cleanText(item, 500)).filter(Boolean),
    qualifications: (Array.isArray(body?.qualifications) ? body.qualifications : [])
      .slice(0, 30).map((item) => cleanText(item, 500)).filter(Boolean),
    growth: cleanText(body?.growth, 1200),
    interview: cleanText(body?.interview, 200),
    trial: cleanBool(body?.trial, false),
    image: cleanText(body?.image, 2000) || '/asset/careers/preva-team-culture-v2.png',
    status: ['PUBLISHED', 'DRAFT', 'CLOSED'].includes(String(body?.status).toUpperCase())
      ? String(body.status).toUpperCase()
      : 'DRAFT',
    sortOrder: cleanInt(body?.sortOrder, 0)
  };
}

get('/admin/career-jobs', { auth: true, roles: CAREERS }, async () => {
  const jobs = await careerJobsCollection();
  const rows = await jobs.find().sort({ sortOrder: 1, title: 1 }).toArray();
  return rows.map(serialize);
});

post('/admin/career-jobs', { auth: true, roles: CAREERS }, async (ctx) => {
  const jobs = await careerJobsCollection();
  const document = careerJobPayload(ctx.body);
  if (await jobs.findOne({ slug: document.slug })) throw badRequest('That job slug is already in use.');
  const now = new Date();
  const inserted = await jobs.insertOne({ ...document, publishedAt: document.status === 'PUBLISHED' ? now : null, createdAt: now, updatedAt: now });
  await logActivity(ctx, 'CREATE', 'CAREER_JOB', document.title);
  return result(serialize({ ...document, _id: inserted.insertedId, createdAt: now, updatedAt: now }), { status: 201 });
});

put('/admin/career-jobs/:id', { auth: true, roles: CAREERS }, async (ctx) => {
  const jobs = await careerJobsCollection();
  const id = asObjectId(ctx.params.id);
  const current = id ? await jobs.findOne({ _id: id }) : null;
  if (!current) throw notFound('Career job not found.');
  const document = careerJobPayload(ctx.body);
  const clash = await jobs.findOne({ slug: document.slug, _id: { $ne: id } });
  if (clash) throw badRequest('That job slug is already in use.');
  const updatedAt = new Date();
  const publishedAt = document.status === 'PUBLISHED' ? current.publishedAt || updatedAt : current.publishedAt || null;
  await jobs.updateOne({ _id: id }, { $set: { ...document, publishedAt, updatedAt } });
  await logActivity(ctx, 'UPDATE', 'CAREER_JOB', document.title);
  return serialize({ ...current, ...document, _id: id, updatedAt });
});

del('/admin/career-jobs/:id', { auth: true, roles: CAREERS }, async (ctx) => {
  const jobs = await careerJobsCollection();
  const id = asObjectId(ctx.params.id);
  const current = id ? await jobs.findOne({ _id: id }) : null;
  if (!current) throw notFound('Career job not found.');
  await jobs.deleteOne({ _id: id });
  await logActivity(ctx, 'DELETE', 'CAREER_JOB', current.title);
  return { ok: true };
});

resource({
  path: 'menus', collection: 'menus', entity: 'MENU', roles: MANAGE, unique: 'location',
  sort: { location: 1 },
  build: (body) => {
    const location = cleanText(body?.location, 60);
    if (!location) throw badRequest('A menu location is required.');
    const menuItem = (item) => {
      const title = cleanText(item?.title ?? item?.label, 120);
      const openInNewTab = item?.openInNewTab === true || item?.target === '_blank';
      return {
        // Keep both names during the WordPress-to-Next migration. Public and
        // admin clients use title; label keeps older seeded data compatible.
        title,
        label: title,
        url: cleanText(item?.url, 2000),
        openInNewTab,
        target: openInNewTab ? '_blank' : '_self',
        visible: item?.visible !== false,
        children: (Array.isArray(item?.children) ? item.children : []).slice(0, 40).map((child) => {
          const childTitle = cleanText(child?.title ?? child?.label, 120);
          const childNewTab = child?.openInNewTab === true || child?.target === '_blank';
          return {
            title: childTitle,
            label: childTitle,
            url: cleanText(child?.url, 2000),
            openInNewTab: childNewTab,
            target: childNewTab ? '_blank' : '_self',
            visible: child?.visible !== false
          };
        }).filter((child) => child.title && child.url)
      };
    };
    return {
      location,
      name: cleanText(body?.name, 120) || location,
      items: (Array.isArray(body?.items) ? body.items : []).slice(0, 100).map(menuItem).filter((item) => item.title && item.url)
    };
  }
});

/* Menu items carry the shop fields too, so one screen manages both the
   printed menu and what can be ordered online. */
resource({
  path: 'menu-items', collection: 'menuItems', entity: 'MENU_ITEM',
  sort: { category: 1, sortOrder: 1, name: 1 },
  build: (body) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('An item name is required.');

    const priceCents = Number.isFinite(Number(body?.priceCents))
      ? cleanInt(body.priceCents, 0)
      : parseMoney(body?.price);

    return {
      name,
      slug: slug(body?.slug || name),
      price: cleanText(body?.price, 40) || `$${(priceCents / 100).toFixed(2)}`,
      priceCents,
      description: cleanText(body?.description, 500),
      category: cleanText(body?.category, 80) || 'Others',
      image: cleanText(body?.image, 2000) || null,
      available: cleanBool(body?.available, true),
      orderable: cleanBool(body?.orderable, false),
      featured: cleanBool(body?.featured, false),
      badge: cleanText(body?.badge, 40),
      servings: cleanText(body?.servings, 40),
      calories: Number.isFinite(Number(body?.calories)) ? cleanInt(body.calories, 0) : null,
      tags: (Array.isArray(body?.tags) ? body.tags : (typeof body?.tags === 'string' ? body.tags.split(',').map(s => s.trim()).filter(Boolean) : [])).slice(0, 20).map((tag) => cleanText(tag, 80)),
      pairings: (Array.isArray(body?.pairings) ? body.pairings : (typeof body?.pairings === 'string' ? body.pairings.split(',').map(s => s.trim()).filter(Boolean) : [])).slice(0, 10).map((p) => cleanText(p, 80)),
      uberEatsUrl: cleanText(body?.uberEatsUrl, 2000) || '',
      doorDashUrl: cleanText(body?.doorDashUrl, 2000) || '',
      grubhubUrl: cleanText(body?.grubhubUrl, 2000) || '',
      faqs: (Array.isArray(body?.faqs) ? body.faqs : []).slice(0, 15).map(f => ({
        q: cleanText(f?.q, 200),
        a: cleanText(f?.a, 1000)
      })).filter(f => f.q && f.a),
      optionGroups: (Array.isArray(body?.optionGroups) ? body.optionGroups : []).slice(0, 10).map((group, gi) => ({
        id: cleanText(group?.id, 40) || `g${gi + 1}`,
        label: cleanText(group?.label, 80) || `Option ${gi + 1}`,
        type: group?.type === 'check' ? 'check' : 'radio',
        required: cleanBool(group?.required, false),
        maxPick: cleanInt(group?.maxPick, 0),
        options: (Array.isArray(group?.options) ? group.options : []).slice(0, 30).map((option, oi) => ({
          id: cleanText(option?.id, 40) || `g${gi + 1}o${oi + 1}`,
          label: cleanText(option?.label, 80),
          priceCents: Number.isFinite(Number(option?.priceCents))
            ? cleanInt(option.priceCents, 0)
            : parseMoney(option?.price),
          available: cleanBool(option?.available, true)
        }))
      })),
      sortOrder: cleanInt(body?.sortOrder, 0)
    };
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   Users
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/users', { auth: true, roles: MANAGE }, async ({ user }) => {
  const users = await col('users');
  const filter = user.role === 'SUPER_ADMIN' ? {} : { role: { $ne: 'SUPER_ADMIN' } };
  const rows = await users.find(filter).project({ passwordHash: 0 }).sort({ createdAt: -1 }).toArray();
  return rows.map(serialize);
});

post('/admin/users', { auth: true, roles: MANAGE }, async (ctx) => {
  const email = cleanEmail(ctx.body?.email);
  const password = String(ctx.body?.password || '');
  const role = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER'].includes(ctx.body?.role) ? ctx.body.role : 'AUTHOR';

  if (!email) throw badRequest('An email address is required.');
  if (password.length < 12) throw badRequest('Use at least 12 characters for the password.');
  if (ctx.user.role !== 'SUPER_ADMIN' && role === 'SUPER_ADMIN') throw forbidden('Only the site owner can create a Super Admin.');

  const users = await col('users');
  if (await users.findOne({ email })) throw badRequest('That email address is already registered.');

  const now = new Date();
  const document = {
    email,
    name: cleanText(ctx.body?.name, 120),
    role,
    status: ['ACTIVE', 'DISABLED'].includes(ctx.body?.status) ? ctx.body.status : 'ACTIVE',
    passwordHash: await hashPassword(password),
    createdAt: now,
    updatedAt: now
  };

  const inserted = await users.insertOne(document);
  await logActivity(ctx, 'CREATE', 'USER', email);
  const { passwordHash, ...safe } = document;
  return result(serialize({ ...safe, _id: inserted.insertedId }), { status: 201 });
});

put('/admin/users/:id', { auth: true, roles: MANAGE }, async (ctx) => {
  const users = await col('users');
  const id = asObjectId(ctx.params.id);
  const current = id ? await users.findOne({ _id: id }) : null;
  if (!current) throw notFound('User not found.');
  if (ctx.user.role !== 'SUPER_ADMIN' && current.role === 'SUPER_ADMIN') throw forbidden('Only the site owner can edit a Super Admin.');

  const update = { updatedAt: new Date() };
  if (ctx.body?.name !== undefined) update.name = cleanText(ctx.body.name, 120);
  if (ctx.body?.email !== undefined) {
    const nextEmail = cleanEmail(ctx.body.email);
    if (!nextEmail) throw badRequest('Enter a valid email address.');
    const clash = await users.findOne({ email: nextEmail, _id: { $ne: id } });
    if (clash) throw badRequest('That email address is already registered.');
    update.email = nextEmail;
  }
  if (ctx.body?.role && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER'].includes(ctx.body.role)) {
    if (ctx.user.role !== 'SUPER_ADMIN' && ctx.body.role === 'SUPER_ADMIN') throw forbidden('Only the site owner can grant Super Admin access.');
    update.role = ctx.body.role;
  }
  if (ctx.body?.status && ['ACTIVE', 'DISABLED'].includes(ctx.body.status)) update.status = ctx.body.status;
  if (ctx.body?.password) {
    if (String(ctx.body.password).length < 12) throw badRequest('Use at least 12 characters for the password.');
    update.passwordHash = await hashPassword(String(ctx.body.password));
  }

  if (current._id.toString() === ctx.user.id) {
    if (update.status === 'DISABLED') throw badRequest('You cannot disable your own account.');
    if (update.role && update.role !== current.role) throw badRequest('You cannot change your own role. Ask another administrator.');
  }

  // The last active owner must not be able to lock everyone out.
  if ((update.role && update.role !== 'SUPER_ADMIN') || update.status === 'DISABLED') {
    if (current.role === 'SUPER_ADMIN') {
      const owners = await users.countDocuments({ role: 'SUPER_ADMIN', status: { $ne: 'DISABLED' } });
      if (owners <= 1) throw badRequest('This is the last active owner account. Promote someone else first.');
    }
  }

  await users.updateOne({ _id: id }, { $set: update });
  await logActivity(ctx, 'UPDATE', 'USER', current.email);
  const { passwordHash, ...safe } = { ...current, ...update };
  return serialize({ ...safe, _id: id });
});

del('/admin/users/:id', { auth: true, roles: MANAGE }, async (ctx) => {
  const users = await col('users');
  const id = asObjectId(ctx.params.id);
  const current = id ? await users.findOne({ _id: id }) : null;
  if (!current) throw notFound('User not found.');
  if (current._id.toString() === ctx.user.id) throw badRequest('You cannot delete your own account.');
  if (ctx.user.role !== 'SUPER_ADMIN' && current.role === 'SUPER_ADMIN') throw forbidden('Only the site owner can delete a Super Admin.');

  if (current.role === 'SUPER_ADMIN') {
    const owners = await users.countDocuments({ role: 'SUPER_ADMIN', status: { $ne: 'DISABLED' } });
    if (owners <= 1) throw badRequest('This is the last active owner account.');
  }

  await users.deleteOne({ _id: id });
  await logActivity(ctx, 'DELETE', 'USER', current.email);
  return { ok: true };
});

/* ══════════════════════════════════════════════════════════════════════════
   Media
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/media', { auth: true }, async ({ query }) => {
  const media = await col('media');
  const limit = Math.min(Number(query.limit) || 100, 300);
  const rows = await media.find().sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map((row) => {
    const { data, ...safe } = row;
    return serialize(safe);
  });
});

const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const VIDEO_MEDIA_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);
const MEDIA_TYPES = new Set([...IMAGE_MEDIA_TYPES, ...VIDEO_MEDIA_TYPES]);

post('/admin/media/upload', { auth: true, roles: AUTHOR }, async (ctx) => {
  const incoming = Array.isArray(ctx.body?.files) ? ctx.body.files.slice(0, 10) : [];
  if (!incoming.length) throw badRequest('Choose at least one image or video to upload.');

  const media = await col('media');
  const uploaded = [];
  for (const file of incoming) {
    const filename = cleanText(file?.name, 180);
    const mimeType = cleanText(file?.type, 100).toLowerCase();
    const encoded = String(file?.data || '');
    const match = encoded.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!filename || !match || !MEDIA_TYPES.has(mimeType) || match[1].toLowerCase() !== mimeType) {
      throw badRequest('Uploads must be JPG, PNG, WEBP, GIF, AVIF, MP4, WEBM, or OGG media.');
    }
    const bytes = Buffer.from(match[2], 'base64');
    const maxBytes = VIDEO_MEDIA_TYPES.has(mimeType) ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!bytes.length || bytes.length > maxBytes) {
      throw badRequest(VIDEO_MEDIA_TYPES.has(mimeType) ? 'Each video must be 25 MB or smaller.' : 'Each image must be 8 MB or smaller.');
    }

    const now = new Date();
    const document = {
      filename,
      title: cleanText(file?.title, 180) || filename.replace(/\.[^.]+$/, ''),
      altText: cleanText(file?.altText, 200),
      caption: '',
      mimeType,
      size: bytes.length,
      data: bytes,
      createdAt: now,
      updatedAt: now
    };
    const inserted = await media.insertOne(document);
    const url = `/api/media/${inserted.insertedId}`;
    await media.updateOne({ _id: inserted.insertedId }, { $set: { url } });
    const publicDocument = { ...document, _id: inserted.insertedId, url };
    delete publicDocument.data;
    uploaded.push(serialize(publicDocument));
    await logActivity(ctx, 'CREATE', 'MEDIA', filename);
  }
  return result(uploaded, { status: 201 });
});

put('/admin/media/:id', { auth: true, roles: AUTHOR }, async (ctx) => {
  const media = await col('media');
  const id = asObjectId(ctx.params.id);
  if (!id) throw notFound('Media not found.');

  const update = {
    altText: cleanText(ctx.body?.altText ?? ctx.body?.alt, 200),
    title: cleanText(ctx.body?.title, 200),
    caption: cleanText(ctx.body?.caption, 500),
    updatedAt: new Date()
  };
  const changed = await media.updateOne({ _id: id }, { $set: update });
  if (!changed.matchedCount) throw notFound('Media not found.');
  return { ok: true };
});

del('/admin/media/:id', { auth: true, roles: WRITE }, async (ctx) => {
  const media = await col('media');
  const id = asObjectId(ctx.params.id);
  const current = id ? await media.findOne({ _id: id }) : null;
  if (!current) throw notFound('Media not found.');

  await media.deleteOne({ _id: id });
  await logActivity(ctx, 'DELETE', 'MEDIA', current.filename || '');
  return { ok: true };
});

/* ══════════════════════════════════════════════════════════════════════════
   Orders and the kitchen display
   ══════════════════════════════════════════════════════════════════════════ */

const ORDER_STATUS = ['PENDING', 'PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];

function orderFilter(query = {}) {
  const filter = {};
  const status = cleanText(query.status, 20).toUpperCase();
  const fulfilment = cleanText(query.fulfilment, 20).toUpperCase();
  const search = cleanText(query.search, 100);

  if (status === 'OPEN' || query.open === 'true') {
    filter.status = { $in: ['PENDING', 'PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY'] };
  } else if (status === 'PAID' || status === 'RECEIVED') {
    filter.status = { $in: ['PAID', 'RECEIVED'] };
  } else if (ORDER_STATUS.includes(status)) {
    filter.status = status;
  }
  if (['PICKUP', 'DELIVERY'].includes(fulfilment)) filter.fulfilment = fulfilment;

  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const clauses = [
      { 'customer.name': { $regex: escaped, $options: 'i' } },
      { 'customer.phone': { $regex: escaped, $options: 'i' } },
      { 'customer.email': { $regex: escaped, $options: 'i' } }
    ];
    const orderNumber = Number(search.replace(/^#/, ''));
    if (Number.isInteger(orderNumber) && orderNumber > 0) clauses.unshift({ orderNumber });
    filter.$or = clauses;
  }

  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))) {
    filter.createdAt = {};
    if (from && !Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (to && !Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
  }

  return filter;
}

get('/admin/orders', { auth: true }, async ({ query }) => {
  const orders = await col('order');
  const limit = Math.min(Math.max(cleanInt(query.limit, 200), 1), 500);
  const rows = await orders.find(orderFilter(query)).sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map(serialize);
});

get('/admin/orders-summary', { auth: true }, async () => {
  const orders = await col('order');
  const rows = await orders.find().sort({ createdAt: -1 }).limit(5000).toArray();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const paidStatuses = new Set(['PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED']);
  const openStatuses = new Set(['PENDING', 'PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY']);
  const counts = Object.fromEntries(ORDER_STATUS.map((one) => [one, 0]));
  let todayOrders = 0;
  let todayRevenueCents = 0;

  for (const order of rows) {
    if (counts[order.status] !== undefined) counts[order.status] += 1;
    const createdAt = order.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && createdAt >= todayStart && paidStatuses.has(order.status)) {
      todayOrders += 1;
      todayRevenueCents += Number(order.totalCents) || 0;
    }
  }

  return {
    total: rows.length,
    open: rows.filter((order) => openStatuses.has(order.status)).length,
    todayOrders,
    todayRevenueCents,
    counts
  };
});

get('/admin/orders/:id', { auth: true }, async ({ params }) => {
  const orders = await col('order');
  const id = asObjectId(params.id);
  const row = id
    ? await orders.findOne({ _id: id })
    : await orders.findOne({ orderNumber: Number(params.id) });
  if (!row) throw notFound('Order not found.');
  return serialize(row);
});

patch('/admin/orders/:id/status', { auth: true }, async (ctx) => {
  const status = cleanText(ctx.body?.status, 20).toUpperCase();
  if (!ORDER_STATUS.includes(status)) throw badRequest('That is not a valid order status.');

  const orders = await col('order');
  const id = asObjectId(ctx.params.id);
  const current = id ? await orders.findOne({ _id: id }) : null;
  if (!current) throw notFound('Order not found.');

  const allowed = {
    PENDING: ['CANCELLED'],
    PAID: ['PREPARING'],
    RECEIVED: ['PREPARING'],
    PREPARING: ['READY'],
    READY: current.fulfilment === 'DELIVERY' ? ['ON_THE_WAY'] : ['COMPLETED'],
    ON_THE_WAY: ['DELIVERED'],
    DELIVERED: ['COMPLETED']
  };
  if (!(allowed[current.status] || []).includes(status)) {
    throw badRequest(`Order #${current.orderNumber} cannot move from ${current.status} to ${status}.`);
  }

  const now = new Date();
  const statusHistory = [
    ...(Array.isArray(current.statusHistory) ? current.statusHistory : []),
    { status, at: now, by: ctx.user?.email || 'admin' }
  ].slice(-30);
  await orders.updateOne({ _id: id }, { $set: { status, statusHistory, updatedAt: now } });
  await logActivity(ctx, 'UPDATE', 'ORDER', `#${current.orderNumber} → ${status}`);
  return serialize({ ...current, status, statusHistory, updatedAt: now });
});

/**
 * Refund an order.
 *
 * The refund is issued through Stripe and nothing is written here — the
 * `charge.refunded` webhook updates the order. One writer for payment state
 * means the database cannot disagree with Stripe about what was refunded.
 */
post('/admin/orders/:id/refund', { auth: true, roles: MANAGE }, async (ctx) => {
  const orders = await col('order');
  const id = asObjectId(ctx.params.id);
  const order = id ? await orders.findOne({ _id: id }) : null;
  if (!order) throw notFound('Order not found.');

  if (order.payment?.provider !== 'stripe' || !order.payment?.paymentIntentId) {
    throw badRequest('This order was not paid by card, so there is nothing to refund.');
  }
  if (!stripeConfigured()) throw badRequest('Stripe is not configured on this server.');
  if (order.payment?.status === 'REFUNDED') throw badRequest('This order has already been refunded.');

  const paid = Number(order.payment.amountCents || order.totalCents) || 0;
  const alreadyRefunded = Math.max(0, Number(order.payment.refundedCents) || 0);
  const refundable = Math.max(0, paid - alreadyRefunded);
  if (refundable <= 0) throw badRequest('Stripe has already refunded the full payment.');

  const requested = Number.isFinite(Number(ctx.body?.amountCents))
    ? cleanInt(ctx.body.amountCents, 0)
    : refundable;

  if (requested <= 0 || requested > refundable) {
    throw badRequest(`Enter a refund amount between one cent and the remaining refundable amount (${refundable} cents).`);
  }

  try {
    // Stripe is the authority for whether this payment can be refunded. The
    // local record is checked as well, but never trusted on its own.
    const paymentIntent = await stripe().paymentIntents.retrieve(order.payment.paymentIntentId);
    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Stripe does not show this payment as successfully completed.');
    }
    if (String(paymentIntent.currency || '').toLowerCase() !== String(order.payment.currency || 'usd').toLowerCase()) {
      throw new Error('Stripe payment currency does not match this order.');
    }
    if (Number(paymentIntent.amount_received) < paid) {
      throw new Error('Stripe payment amount does not match this order.');
    }
    const expectedMode = String(order.payment.mode || '').toLowerCase();
    const actualMode = paymentIntent.livemode ? 'live' : 'test';
    if (expectedMode && expectedMode !== actualMode) {
      throw new Error('Stripe payment mode does not match this order.');
    }

    const refund = await stripe().refunds.create(
      {
        payment_intent: order.payment.paymentIntentId,
        amount: requested,
        reason: 'requested_by_customer',
        metadata: { orderNumber: String(order.orderNumber), by: ctx.user.email }
      },
      {
        // Network retries and repeated clicks return the original Stripe
        // refund instead of withdrawing the same amount twice.
        idempotencyKey: `preva-refund-${order._id}-${alreadyRefunded}-${requested}`
      }
    );

    await logActivity(ctx, 'REFUND', 'ORDER', `#${order.orderNumber} requested ${(requested / 100).toFixed(2)} via Stripe`);
    return {
      ok: true,
      refundId: refund.id,
      refundStatus: refund.status,
      requestedCents: requested,
      remainingAfterRequestCents: Math.max(0, refundable - requested),
      note: 'Stripe will confirm the final payment state on the webhook.'
    };
  } catch (error) {
    console.error('[admin] Stripe refund failed', {
      type: error?.type || 'StripeError',
      code: error?.code || '',
      message: String(error?.message || 'Refund failed').slice(0, 300),
      requestId: error?.requestId || ''
    });
    throw badRequest(error?.message || 'Stripe refused that refund.');
  }
});

/** Shows the operator whether payments are actually armed. */
get('/admin/payment-status', { auth: true }, async () => paymentStatusSummary());

/* ══════════════════════════════════════════════════════════════════════════
   Enquiries — contact, reservations, VIP requests, guest list
   ══════════════════════════════════════════════════════════════════════════ */

const INBOXES = {
  contacts: 'contactEnquiry',
  reservations: 'reservation',
  'vip-requests': 'vipRequest',
  'guest-list': 'guestListEntry'
};

for (const [path, collection] of Object.entries(INBOXES)) {
  get(`/admin/${path}`, { auth: true }, async ({ query }) => {
    const target = await col(collection);
    const filter = {};
    const status = cleanText(query.status, 20).toUpperCase();
    if (status) filter.status = status;
    const rows = await target.find(filter).sort({ createdAt: -1 }).limit(300).toArray();
    return rows.map(serialize);
  });

  put(`/admin/${path}/:id/status`, { auth: true, roles: MANAGE }, async (ctx) => {
    const status = cleanText(ctx.body?.status, 20).toUpperCase();
    if (!['NEW', 'READ', 'CONFIRMED', 'ARCHIVED'].includes(status)) {
      throw badRequest('That is not a valid status.');
    }
    const target = await col(collection);
    const id = asObjectId(ctx.params.id);
    if (!id) throw notFound('Entry not found.');

    const changed = await target.updateOne({ _id: id }, { $set: { status, updatedAt: new Date() } });
    if (!changed.matchedCount) throw notFound('Entry not found.');
    return { ok: true };
  });

  del(`/admin/${path}/:id`, { auth: true, roles: MANAGE }, async (ctx) => {
    const target = await col(collection);
    const id = asObjectId(ctx.params.id);
    if (!id) throw notFound('Entry not found.');

    const removed = await target.deleteOne({ _id: id });
    if (!removed.deletedCount) throw notFound('Entry not found.');
    await logActivity(ctx, 'DELETE', collection.toUpperCase(), ctx.params.id);
    return { ok: true };
  });
}

get('/admin/subscribers', { auth: true }, async () => {
  const subscribers = await col('subscriber');
  const rows = await subscribers.find().sort({ createdAt: -1 }).limit(1000).toArray();
  return rows.map(serialize);
});

const CAREER_APPLICATION_STATUS = [
  'NEW', 'SCREENING', 'REVIEWING', 'INTERVIEW', 'REFERENCE_CHECK',
  'OFFERED', 'HIRED', 'ONBOARDING', 'HOLD', 'PASSED', 'ARCHIVED'
];

const CAREER_SCREEN_OUTCOMES = ['PENDING', 'ADVANCE', 'HOLD', 'PASS'];
const CAREER_REFERENCE_STATUS = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'NOT_REQUIRED'];

function optionalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function safeApplication(row) {
  return serialize({
    ...row,
    resume: row.resume ? { name: row.resume.name, mimeType: row.resume.mimeType, size: row.resume.size } : null
  });
}

get('/admin/careers/dashboard', { auth: true, roles: CAREERS }, async () => {
  const applications = await col('careerApplications');
  const jobs = await careerJobsCollection();
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const staleBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeStatuses = { $nin: ['PASSED', 'ARCHIVED'] };

  const [
    total, newCount, overdue, active, interviewing, hired, onboarding,
    publishedJobs, staleJobs, recent, urgent, roleGroups, upcomingInterviews
  ] = await Promise.all([
    applications.countDocuments(),
    applications.countDocuments({ status: 'NEW' }),
    applications.countDocuments({ status: 'NEW', responseDueAt: { $lt: now } }),
    applications.countDocuments({ status: activeStatuses }),
    applications.countDocuments({ status: { $in: ['INTERVIEW', 'REFERENCE_CHECK'] } }),
    applications.countDocuments({ status: 'HIRED' }),
    applications.countDocuments({ status: 'ONBOARDING' }),
    jobs.countDocuments({ status: 'PUBLISHED' }),
    jobs.countDocuments({ status: 'PUBLISHED', updatedAt: { $lt: staleBefore } }),
    applications.find().sort({ createdAt: -1 }).limit(8).toArray(),
    applications.find({ status: 'NEW', responseDueAt: { $lt: now } }).sort({ responseDueAt: 1 }).limit(8).toArray(),
    applications.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }, { $sort: { count: -1 } }]).toArray(),
    applications.find({
      'interview.scheduledAt': { $gte: now, $lte: nextWeek },
      status: { $in: ['INTERVIEW', 'REFERENCE_CHECK'] }
    }).sort({ 'interview.scheduledAt': 1 }).limit(8).toArray()
  ]);

  return {
    counts: { total, new: newCount, overdue, active, interviewing, hired, onboarding, publishedJobs, staleJobs },
    recent: recent.map(safeApplication),
    urgent: urgent.map(safeApplication),
    upcomingInterviews: upcomingInterviews.map(safeApplication),
    byRole: roleGroups.map((item) => ({ role: item._id || 'general-application', count: item.count }))
  };
});

get('/admin/career-applications', { auth: true, roles: CAREERS }, async ({ query }) => {
  const applications = await col('careerApplications');
  const filter = {};
  const status = cleanText(query.status, 20).toUpperCase();
  const role = cleanText(query.role, 80);
  if (CAREER_APPLICATION_STATUS.includes(status)) filter.status = status;
  if (role) filter.role = role;

  const rows = await applications.find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  return rows.map(safeApplication);
});

patch('/admin/career-applications/:id', { auth: true, roles: CAREERS }, async (ctx) => {
  const applications = await col('careerApplications');
  const id = asObjectId(ctx.params.id);
  const current = id ? await applications.findOne({ _id: id }) : null;
  if (!current) throw notFound('Application not found.');

  const update = { updatedAt: new Date() };
  const requestedStatus = cleanText(ctx.body?.status, 30).toUpperCase();
  if (requestedStatus) {
    if (!CAREER_APPLICATION_STATUS.includes(requestedStatus)) throw badRequest('That is not a valid application status.');
    update.status = requestedStatus;
    if (requestedStatus !== 'NEW' && !current.firstContactAt) update.firstContactAt = new Date();
  }
  if (ctx.body?.internalNotes !== undefined) update.internalNotes = cleanText(ctx.body.internalNotes, 8000);
  if (ctx.body?.sourceChannel !== undefined) update.sourceChannel = cleanText(ctx.body.sourceChannel, 120);
  if (ctx.body?.nextActionAt !== undefined) update.nextActionAt = optionalDate(ctx.body.nextActionAt);

  if (ctx.body?.screening && typeof ctx.body.screening === 'object') {
    const value = ctx.body.screening;
    const outcome = cleanText(value.outcome, 20).toUpperCase();
    update.screening = {
      outcome: CAREER_SCREEN_OUTCOMES.includes(outcome) ? outcome : current.screening?.outcome || 'PENDING',
      contactedAt: optionalDate(value.contactedAt) || current.screening?.contactedAt || null,
      transportation: cleanText(value.transportation, 240),
      payAligned: cleanText(value.payAligned, 240),
      competency: cleanText(value.competency, 1200),
      notes: cleanText(value.notes, 3000)
    };
  }

  if (ctx.body?.interview && typeof ctx.body.interview === 'object') {
    const value = ctx.body.interview;
    update.interview = {
      scheduledAt: optionalDate(value.scheduledAt),
      interviewer: cleanText(value.interviewer, 160),
      format: cleanText(value.format, 80),
      durationMinutes: Math.min(Math.max(cleanInt(value.durationMinutes, 30), 10), 180),
      score: Math.min(Math.max(Number(value.score) || 0, 0), 5),
      notes: cleanText(value.notes, 5000),
      trialShiftAt: optionalDate(value.trialShiftAt),
      trialOutcome: cleanText(value.trialOutcome, 500)
    };
  }

  if (ctx.body?.references && typeof ctx.body.references === 'object') {
    const value = ctx.body.references;
    const status = cleanText(value.status, 30).toUpperCase();
    update.references = {
      consent: cleanBool(value.consent, false),
      status: CAREER_REFERENCE_STATUS.includes(status) ? status : 'NOT_STARTED',
      count: Math.min(Math.max(cleanInt(value.count, 0), 0), 10),
      wouldRehire: cleanText(value.wouldRehire, 80),
      notes: cleanText(value.notes, 4000)
    };
  }

  if (ctx.body?.onboarding && typeof ctx.body.onboarding === 'object') {
    const value = ctx.body.onboarding;
    const previous = current.onboarding || {};
    const checkin = (key) => ({
      dueAt: optionalDate(value.checkins?.[key]?.dueAt) || previous.checkins?.[key]?.dueAt || null,
      completedAt: optionalDate(value.checkins?.[key]?.completedAt),
      notes: cleanText(value.checkins?.[key]?.notes, 1600)
    });
    update.onboarding = {
      startDate: optionalDate(value.startDate),
      mentor: cleanText(value.mentor, 160),
      paperwork: {
        i9: cleanBool(value.paperwork?.i9, false),
        w4: cleanBool(value.paperwork?.w4, false),
        michiganNewHire: cleanBool(value.paperwork?.michiganNewHire, false),
        handbook: cleanBool(value.paperwork?.handbook, false)
      },
      checkins: { day14: checkin('day14'), day30: checkin('day30'), day60: checkin('day60'), day90: checkin('day90') }
    };
  }

  const changedStatus = update.status && update.status !== current.status;
  const history = {
    at: new Date(),
    by: ctx.user.email,
    action: changedStatus ? `Status changed from ${current.status} to ${update.status}` : 'Candidate record updated'
  };
  await applications.updateOne(
    { _id: id },
    { $set: update, $push: { history: { $each: [history], $slice: -100 } } }
  );
  await logActivity(ctx, 'UPDATE', 'CAREER_APPLICATION', `${current.firstName} ${current.lastName}`);
  return safeApplication({ ...current, ...update, _id: id, history: [...(current.history || []), history].slice(-100) });
});

patch('/admin/career-applications/:id/status', { auth: true, roles: CAREERS }, async (ctx) => {
  const status = cleanText(ctx.body?.status, 20).toUpperCase();
  if (!CAREER_APPLICATION_STATUS.includes(status)) throw badRequest('That is not a valid application status.');
  const applications = await col('careerApplications');
  const id = asObjectId(ctx.params.id);
  const current = id ? await applications.findOne({ _id: id }) : null;
  if (!current) throw notFound('Application not found.');

  const now = new Date();
  const update = { status, updatedAt: now };
  if (status !== 'NEW' && !current.firstContactAt) update.firstContactAt = now;
  await applications.updateOne(
    { _id: id },
    {
      $set: update,
      $push: { history: { $each: [{ at: now, by: ctx.user.email, action: `Status changed from ${current.status} to ${status}` }], $slice: -100 } }
    }
  );
  await logActivity(ctx, 'UPDATE', 'CAREER_APPLICATION', `${current.firstName} ${current.lastName} → ${status}`);
  return { ok: true, status };
});

get('/admin/career-applications/:id/resume', { auth: true, roles: CAREERS }, async ({ params }) => {
  const applications = await col('careerApplications');
  const id = asObjectId(params.id);
  const row = id ? await applications.findOne({ _id: id }) : null;
  if (!row?.resume?.data) throw notFound('Resume not found.');

  const filename = cleanText(row.resume.name, 180).replace(/["\r\n]/g, '') || 'resume.pdf';
  return result(Buffer.from(row.resume.data.buffer || row.resume.data), {
    headers: {
      'Content-Type': row.resume.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store'
    }
  });
});

get('/admin/activity-logs', { auth: true, roles: MANAGE }, async ({ query }) => {
  const logs = await col('activityLog');
  const limit = Math.min(Number(query.limit) || 100, 500);
  const rows = await logs.find().sort({ createdAt: -1 }).limit(limit).toArray();
  return rows.map(serialize);
});
