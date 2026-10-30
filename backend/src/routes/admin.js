import slugify from 'slugify';
import { col, serialize, asObjectId } from '../lib/db.js';
import {
  cleanText, cleanEmail, cleanBool, cleanInt, cleanOrderUrl,
  normalizeOrderAvailability, publicHtml, pageHtml, cleanCss, parseMoney
} from '../lib/sanitize.js';
import { hashPassword } from '../lib/auth.js';
import { logActivity } from '../lib/activity.js';
import { loadContentInclude } from './public.js';
import { careerJobsCollection } from '../lib/career-jobs.js';
import { RASTA_PASTA_OPTION_GROUPS } from '../lib/menu-options.js';
import { get, post, put, patch, del, badRequest, forbidden, notFound, payloadTooLarge, result } from '../router.js';

const WRITE = ['SUPER_ADMIN', 'ADMIN', 'EDITOR'];
const AUTHOR = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR'];
const MANAGE = ['SUPER_ADMIN', 'ADMIN'];
const CAREERS = ['SUPER_ADMIN', 'ADMIN', 'CAREERS_MANAGER'];

const slug = (value) => slugify(String(value || ''), { lower: true, strict: true });
const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ══════════════════════════════════════════════════════════════════════════
   Dashboard
   ══════════════════════════════════════════════════════════════════════════ */

get('/admin/dashboard', { auth: true }, async () => {
  const [content, media, contacts, reservations, subscribers, activity, categories, users, services, careerApps] = await Promise.all([
    col('content'), col('media'), col('contactEnquiry'),
    col('reservation'), col('subscriber'), col('activityLog'), col('categories'), col('users'), col('services'), col('careerApplications')
  ]);

  const [
    posts, pages, publishedPosts, draftPosts, mediaCount,
    newContacts, newReservations, subscriberCount, recent,
    categoryCount,
    userCount, serviceCount, enquiryCount, careerAppCount,
    recentPosts, recentContacts, recentReservations, recentCareerApps
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
    categories.countDocuments(),
    users.countDocuments({ status: { $ne: 'DISABLED' } }),
    services.countDocuments(),
    contacts.countDocuments(),
    careerApps.countDocuments({ status: { $in: ['NEW', 'PENDING', 'unread'] } }).catch(() => 0),
    content.find({ type: 'POST' }).sort({ updatedAt: -1 }).limit(6).toArray(),
    contacts.find().sort({ createdAt: -1 }).limit(8).toArray(),
    reservations.find().sort({ createdAt: -1 }).limit(8).toArray(),
    careerApps.find({}, { projection: { resume: 0 } }).sort({ createdAt: -1 }).limit(8).toArray()
  ]);

  // One feed of every website form, newest first, in a single shape the
  // dashboard can render without knowing which form a row came from.
  const recentEnquiries = [
    ...recentContacts.map((row) => ({
      ...serialize(row),
      kind: 'contacts',
      formSource: row.formSource || 'Contact form'
    })),
    ...recentReservations.map((row) => ({
      ...serialize(row),
      kind: 'reservations',
      formSource: `Reservation · ${[row.date, row.time].filter(Boolean).join(' ')}${row.guests ? ` · ${row.guests} guests` : ''}`
    })),
    ...recentCareerApps.map((row) => ({
      ...serialize(row),
      kind: 'career-applications',
      firstName: undefined,
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      formSource: `Career application${row.role ? ` · ${row.role}` : ''}`
    }))
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  // Unhandled submissions across every lead form, for the sidebar's Leads badge.
  const newLeadCounts = await Promise.all(Object.values(LEAD_SOURCES).map(async (source) => (
    (await col(source.collection)).countDocuments({ status: { $in: ['NEW', 'new'] } }).catch(() => 0)
  )));
  const newLeads = newLeadCounts.reduce((sum, count) => sum + count, 0);

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
    careerApps: careerAppCount,
    newLeads,
    recentPosts: recentPosts.map(serialize),
    recentEnquiries,
    counts: {
      posts, pages, drafts: draftPosts, media: mediaCount,
      newContacts, newReservations, subscribers: subscriberCount,
      careerApps: careerAppCount
    },
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

  const type = String(body?.type).toUpperCase() === 'PAGE' ? 'PAGE' : 'POST';
  const rawBody = body?.body ?? body?.content;
  const isCodePage = type === 'PAGE' && cleanText(body?.pageTemplate, 80) === 'landing';

  return {
    title,
    slug: slug(body?.slug || title),
    type,
    status,
    excerpt: cleanText(body?.excerpt, 500),
    // Pages get a wider allowlist (<style>, full inline styles, layout tags)
    // so designs pasted in the editor keep their CSS; scripts and event
    // handlers are still stripped. Posts keep the stricter blog allowlist.
    body: type === 'PAGE' ? pageHtml(rawBody) : publicHtml(rawBody),
    customCss: type === 'PAGE' ? cleanCss(body?.customCss) : '',
    // Custom-code pages (Landing template): the exact HTML and JS as written.
    // The public site only ever runs these inside a sandboxed iframe with no
    // same-origin access (CodeFrame.js), so they can't reach site cookies or
    // the admin session; `body` above keeps a sanitised copy for search/excerpts.
    // The editor sends the HTML box as `content`; Quick Edit / bulk publish
    // send the whole list row back, whose `content` is the sanitised copy —
    // so an explicit customHtml always wins and is never replaced by it.
    customHtml: isCodePage ? String(typeof body?.customHtml === 'string' ? body.customHtml : (rawBody ?? '')).slice(0, 2_000_000) : null,
    customJs: isCodePage ? String(body?.customJs ?? '').slice(0, 500_000) : '',
    matchSiteStyle: cleanBool(body?.matchSiteStyle, true),
    sections: (Array.isArray(body?.sections) ? body.sections : []).slice(0, 80),
    featuredImage: cleanText(body?.featuredImage, 2000),
    featuredImageAlt: cleanText(body?.featuredImageAlt, 300),
    categoryIds: [...new Set((Array.isArray(body?.categoryIds) ? body.categoryIds : []).map(String).filter((id) => /^[a-f0-9]{24}$/i.test(id)))].slice(0, 20),
    tagIds: [...new Set((Array.isArray(body?.tagIds) ? body.tagIds : []).map(String).filter((id) => /^[a-f0-9]{24}$/i.test(id)))].slice(0, 40),
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

function resource({
  path, collection, entity, roles = WRITE, sort = { name: 1 }, unique = null,
  build, afterUpdate = null, beforeDelete = null, deleteByName = null
}) {
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

    const before = { ...current };
    await target.updateOne({ _id: id }, { $set: { ...document, updatedAt: new Date() } });
    if (afterUpdate) await afterUpdate(before, document);
    await logActivity(ctx, 'UPDATE', entity, document.name || document.title || '');
    return serialize({ ...current, ...document, _id: id });
  });

  if (deleteByName) {
    del(`/admin/${path}/by-name/:name`, { auth: true, roles }, async (ctx) => {
      const target = await col(collection);
      const name = cleanText(ctx.params.name, 80);
      if (!name) throw badRequest(`A ${entity.toLowerCase().replace('_', ' ')} name is required.`);
      const current = await target.findOne({ name });
      const movedDishes = await deleteByName({ name, current, ctx });
      if (current) await target.deleteOne({ _id: current._id });
      await logActivity(ctx, 'DELETE', entity, name);
      return { ok: true, ...(Number.isFinite(movedDishes) ? { movedDishes } : {}) };
    });
  }

  del(`/admin/${path}/:id`, { auth: true, roles }, async (ctx) => {
    const target = await col(collection);
    const id = asObjectId(ctx.params.id);
    const current = id ? await target.findOne({ _id: id }) : null;
    if (!current) throw notFound(`${entity} not found.`);

    const movedDishes = beforeDelete ? await beforeDelete(current, ctx) : undefined;
    await target.deleteOne({ _id: id });
    await logActivity(ctx, 'DELETE', entity, current.name || current.title || '');
    return { ok: true, ...(Number.isFinite(movedDishes) ? { movedDishes } : {}) };
  });
}

async function moveCategoryDishesToOthers(name) {
  const items = await col('menuItems');
  const count = await items.countDocuments({ category: name });
  if (name === 'Others' && count > 0) {
    throw badRequest('Move dishes out of Others before deleting this category.');
  }
  if (!count) return 0;
  const result = await items.updateMany(
    { category: name },
    { $set: { category: 'Others', updatedAt: new Date() } }
  );
  return result.modifiedCount;
}

resource({
  path: 'categories', collection: 'categories', entity: 'CATEGORY', unique: 'slug',
  build: (body, current = null) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('A category name is required.');
    return { name, slug: slug(body?.slug || name), description: cleanText(body?.description, 500) };
  }
});

resource({
  path: 'tags', collection: 'tags', entity: 'TAG', unique: 'slug',
  // Matches WordPress: authors can create post tags on the fly from the
  // editor even though creating categories still needs an editor/admin role.
  roles: AUTHOR,
  build: (body, current = null) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('A tag name is required.');
    return { name, slug: slug(body?.slug || name) };
  }
});

resource({
  path: 'galleries', collection: 'galleries', entity: 'GALLERY', unique: 'slug',
  sort: { updatedAt: -1 },
  build: (body, current = null) => {
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
    pay: cleanText(body?.pay, 160) || 'Hourly pay, discussed in your interview',
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

/* Food menu categories. A dish stores its category by name, so renaming a
   category here also moves its dishes. */
resource({
  path: 'menu-categories', collection: 'menuCategories', entity: 'MENU_CATEGORY', unique: 'slug',
  roles: MANAGE,
  sort: { sortOrder: 1, name: 1 },
  build: (body, current = null) => {
    const name = cleanText(body?.name, 80);
    if (!name) throw badRequest('A category name is required.');
    return {
      name,
      slug: slug(body?.slug || name),
      image: cleanText(body?.image, 2000),
      description: cleanText(body?.description, 500),
      sortOrder: cleanInt(body?.sortOrder, 0),
      isVisible: current?.isVisible !== false
    };
  },
  afterUpdate: async (current, document) => {
    if (current.name === document.name) return;
    const items = await col('menuItems');
    await items.updateMany({ category: current.name }, { $set: { category: document.name, updatedAt: new Date() } });
  },
  beforeDelete: (current) => moveCategoryDishesToOthers(current.name),
  deleteByName: ({ name }) => moveCategoryDishesToOthers(name)
});

/* Menu items carry the shop fields too, so one screen manages both the
   printed menu and what can be ordered online. */
resource({
  path: 'menu-items', collection: 'menuItems', entity: 'MENU_ITEM', unique: 'slug',
  sort: { category: 1, sortOrder: 1, name: 1 },
  build: (body, current = null) => {
    const name = cleanText(body?.name, 120);
    if (!name) throw badRequest('An item name is required.');

    const itemSlug = slug(body?.slug || name);
    const priceCents = Number.isFinite(Number(body?.priceCents))
      ? cleanInt(body.priceCents, 0)
      : parseMoney(body?.price);
    const optionGroups = Array.isArray(body?.optionGroups)
      ? body.optionGroups
      : (current?.optionGroups || []);

    return {
      name,
      slug: itemSlug,
      seoTitle: cleanText(body?.seoTitle ?? current?.seoTitle, 250),
      seoDescription: cleanText(body?.seoDescription ?? current?.seoDescription, 400),
      focusKeyword: cleanText(body?.focusKeyword ?? current?.focusKeyword, 160),
      price: cleanText(body?.price, 40) || `$${(priceCents / 100).toFixed(2)}`,
      priceCents,
      description: cleanText(body?.description, 500),
      aboutTitle: cleanText(body?.aboutTitle ?? current?.aboutTitle, 240),
      aboutContent: cleanText(body?.aboutContent ?? current?.aboutContent, 6000),
      category: cleanText(body?.category, 80) || 'Others',
      image: cleanText(body?.image, 2000) || null,
      available: cleanBool(body?.available, true),
      isVisible: body?.isVisible === undefined
        ? current?.isVisible !== false
        : cleanBool(body.isVisible, current?.isVisible !== false),
      // A dish added in the admin should get its /menu page straight away, so
      // new items default to orderable; existing items keep what they had.
      orderable: cleanBool(body?.orderable, current?.orderable ?? true),
      featured: cleanBool(body?.featured, false),
      badge: cleanText(body?.badge ?? current?.badge, 40),
      servings: cleanText(body?.servings ?? current?.servings, 40),
      calories: body?.calories === undefined
        ? (current?.calories ?? null)
        : (Number.isFinite(Number(body.calories)) ? cleanInt(body.calories, 0) : null),
      tags: (Array.isArray(body?.tags) ? body.tags : (typeof body?.tags === 'string' ? body.tags.split(',').map(s => s.trim()).filter(Boolean) : [])).slice(0, 20).map((tag) => cleanText(tag, 80)),
      pairings: (Array.isArray(body?.pairings) ? body.pairings : (typeof body?.pairings === 'string' ? body.pairings.split(',').map(s => s.trim()).filter(Boolean) : [])).slice(0, 10).map((p) => cleanText(p, 80)),
      uberEatsUrl: cleanText(body?.uberEatsUrl, 2000) || '',
      doorDashUrl: cleanText(body?.doorDashUrl, 2000) || '',
      grubhubUrl: cleanText(body?.grubhubUrl, 2000) || '',
      faqs: (Array.isArray(body?.faqs) ? body.faqs : (current?.faqs || [])).slice(0, 15).map(f => ({
        q: cleanText(f?.q, 200),
        a: cleanText(f?.a, 1000)
      })).filter(f => f.q && f.a),
      optionGroups: (itemSlug === 'rasta-pasta' && optionGroups.length === 0
        ? RASTA_PASTA_OPTION_GROUPS
        : optionGroups).slice(0, 10).map((group, gi) => ({
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

patch('/admin/menu-visibility', { auth: true, roles: MANAGE }, async (ctx) => {
  const { type, isVisible } = ctx.body || {};
  if (typeof isVisible !== 'boolean') throw badRequest('Visibility must be true or false.');

  if (type === 'item') {
    const id = asObjectId(ctx.body?.id);
    if (!id) throw badRequest('A valid menu item is required.');
    const items = await col('menuItems');
    const current = await items.findOne({ _id: id });
    if (!current) throw notFound('Menu item not found.');
    await items.updateOne({ _id: id }, { $set: { isVisible, updatedAt: new Date() } });
    await logActivity(ctx, 'UPDATE', 'MENU_ITEM_VISIBILITY', current.name);
    return { id: id.toString(), isVisible };
  }

  if (type === 'category') {
    const name = cleanText(ctx.body?.name, 80);
    if (!name) throw badRequest('A category name is required.');
    const categories = await col('menuCategories');
    const current = await categories.findOne({ name });
    const now = new Date();
    let categoryId;
    if (current) {
      await categories.updateOne({ _id: current._id }, { $set: { isVisible, updatedAt: now } });
      categoryId = current._id;
    } else {
      const inserted = await categories.insertOne({
        name,
        slug: slug(name),
        image: '',
        description: '',
        sortOrder: 0,
        isVisible,
        createdAt: now,
        updatedAt: now
      });
      categoryId = inserted.insertedId;
    }
    await logActivity(ctx, 'UPDATE', 'MENU_CATEGORY_VISIBILITY', name);
    return { id: categoryId.toString(), name, isVisible };
  }

  throw badRequest('Visibility target must be a menu item or category.');
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
  const role = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER', 'MARKETING'].includes(ctx.body?.role) ? ctx.body.role : 'AUTHOR';

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
  if (ctx.body?.role && ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'AUTHOR', 'CAREERS_MANAGER', 'MARKETING'].includes(ctx.body.role)) {
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
  const wantsPagination = query.page !== undefined || query.paginated === 'true';
  const limit = Math.max(1, Math.min(Number(query.limit) || (wantsPagination ? 20 : 1500), 1500));
  const page = Math.max(1, Number(query.page) || 1);
  const search = cleanText(query.search, 100);
  const filter = search ? {
    $or: ['title', 'filename', 'altText', 'caption'].map((field) => ({
      [field]: { $regex: escapeRegex(search), $options: 'i' }
    }))
  } : {};
  const total = wantsPagination ? await media.countDocuments(filter) : 0;
  const rows = await media.find(filter).sort({ createdAt: -1 }).skip(wantsPagination ? (page - 1) * limit : 0).limit(limit).toArray();
  const items = rows.map((row) => {
    const { data, ...safe } = row;
    return serialize(safe);
  });
  if (!wantsPagination) return items;
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
});

const IMAGE_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_MEDIA_TYPES = new Set(['video/mp4', 'video/webm', 'video/ogg']);
const MEDIA_TYPES = new Set([...IMAGE_MEDIA_TYPES, ...VIDEO_MEDIA_TYPES]);
const MEDIA_EXTENSIONS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogg'
};
const VALID_MEDIA_EXTENSIONS = {
  'image/jpeg': new Set(['jpg', 'jpeg']),
  'image/png': new Set(['png']),
  'image/webp': new Set(['webp']),
  'image/gif': new Set(['gif']),
  'video/mp4': new Set(['mp4']),
  'video/webm': new Set(['webm']),
  'video/ogg': new Set(['ogg'])
};
const INVALID_MEDIA_TYPE_MESSAGE = 'Unsupported format. Use JPG/PNG/WebP (GIF is also supported); videos may be MP4/WEBM/OGG.';

// Readable, unique public name for an upload: "Chicken Quesadilla.WEBP" ->
// "chicken-quesadilla.webp", then "chicken-quesadilla-2.webp" if taken.
async function uniqueMediaName(media, filename, mimeType) {
  const base = slug(filename.replace(/\.[^.]+$/, '')) || 'media';
  const ext = MEDIA_EXTENSIONS[mimeType];
  for (let n = 1; ; n += 1) {
    const name = `${n === 1 ? base : `${base}-${n}`}.${ext}`;
    if (!(await media.findOne({ slug: name }))) return name;
  }
}

post('/admin/media/upload', { auth: true, roles: AUTHOR }, async (ctx) => {
  const incoming = Array.isArray(ctx.body?.files) ? ctx.body.files.slice(0, 10) : [];
  if (!incoming.length) throw badRequest('No file provided. Choose a file to upload.');

  const media = await col('media');
  const uploaded = [];
  for (const file of incoming) {
    const filename = cleanText(file?.name, 180);
    const mimeType = cleanText(file?.type, 100).toLowerCase();
    const encoded = String(file?.data || '');
    const match = encoded.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]*)$/);
    const extension = filename.split('.').pop()?.toLowerCase();
    if (!filename) throw badRequest('Invalid upload data. Choose a valid file and try again.');
    if (!MEDIA_TYPES.has(mimeType) || !VALID_MEDIA_EXTENSIONS[mimeType]?.has(extension) || (match && match[1].toLowerCase() !== mimeType)) {
      throw badRequest(INVALID_MEDIA_TYPE_MESSAGE);
    }
    if (!match) throw badRequest('Invalid upload data. Choose a valid file and try again.');
    const bytes = Buffer.from(match[2], 'base64');
    const maxBytes = VIDEO_MEDIA_TYPES.has(mimeType) ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (!bytes.length) throw badRequest('Uploaded file is empty.');
    if (bytes.length > maxBytes) {
      throw payloadTooLarge(VIDEO_MEDIA_TYPES.has(mimeType)
        ? 'File too large. Each video must be 25 MB or smaller.'
        : 'File too large. Each image must be 8 MB or smaller.');
    }

    const now = new Date();
    const name = await uniqueMediaName(media, filename, mimeType);
    const url = `/api/media/${name}`;
    const document = {
      filename,
      slug: name,
      url,
      title: cleanText(file?.title, 180) || filename.replace(/\.[^.]+$/, ''),
      altText: cleanText(file?.altText, 200),
      caption: cleanText(file?.caption, 500),
      description: cleanText(file?.description, 1000),
      mimeType,
      size: bytes.length,
      data: bytes,
      createdAt: now,
      updatedAt: now
    };
    const inserted = await media.insertOne(document);
    const publicDocument = { ...document, _id: inserted.insertedId };
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
    description: cleanText(ctx.body?.description, 1000),
    updatedAt: new Date()
  };
  const changed = await media.updateOne({ _id: id }, { $set: update });
  if (!changed.matchedCount) throw notFound('Media not found.');
  const current = await media.findOne({ _id: id });
  const { data, ...safe } = current;
  return serialize(safe);
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
   Enquiries — contact, reservations, VIP requests, guest list
   ══════════════════════════════════════════════════════════════════════════ */

const INBOXES = {
  contacts: 'contactEnquiry',
  reservations: 'reservation',
  'vip-requests': 'vipRequest',
  'guest-list': 'guestListEntry',
  'event-inquiries': 'eventInquiry',
  subscribers: 'subscriber'
};

for (const [path, collection] of Object.entries(INBOXES)) {
  get(`/admin/${path}`, { auth: true }, async ({ query }) => {
    const target = await col(collection);
    const filter = {};
    const status = cleanText(query.status, 20).toUpperCase();
    if (status) filter.status = status;
    const rows = await target.find(filter).sort({ createdAt: -1 }).limit(1000).toArray();
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

/* ══════════════════════════════════════════════════════════════════════════
   Leads — every website form submission in one feed
   ══════════════════════════════════════════════════════════════════════════ */

// One entry per collection a public form writes to. `pick` turns a stored
// document into the shared lead shape; anything it doesn't lift out stays in
// `details` so no submitted field is ever hidden from the admin.
const LEAD_SOURCES = {
  contact: {
    collection: 'contactEnquiry',
    label: 'Contact',
    pick: (row) => ({
      name: row.name || [row.firstName, row.lastName].filter(Boolean).join(' '),
      subject: row.subject || row.inquiry || '',
      message: row.message || '',
      source: row.formSource || 'Contact form'
    }),
    lifted: ['name', 'firstName', 'lastName', 'subject', 'inquiry', 'message', 'formSource']
  },
  reservation: {
    collection: 'reservation',
    label: 'Reservation',
    pick: (row) => ({
      subject: [row.date, row.time, row.guests ? `${row.guests} guests` : '', row.occasion].filter(Boolean).join(' · '),
      message: row.notes || '',
      source: 'Reservation form'
    }),
    lifted: ['notes']
  },
  event: {
    collection: 'eventInquiry',
    label: 'Event inquiry',
    pick: (row) => ({
      subject: [row.eventType || row.useCase, row.preferredDate, row.guestCount ? `${row.guestCount} guests` : ''].filter(Boolean).join(' · '),
      message: row.message || '',
      source: row.landingPage ? `Event page · ${row.landingPage}` : 'Event inquiry form'
    }),
    lifted: ['message']
  },
  career: {
    collection: 'careerApplications',
    label: 'Career application',
    pick: (row, ctx) => ({
      name: [row.firstName, row.lastName].filter(Boolean).join(' '),
      subject: ctx.roleNames[row.role] || row.role || 'General application',
      message: row.message || '',
      source: row.sourceChannel || row.source || 'Careers page'
    }),
    lifted: ['firstName', 'lastName', 'message', 'sourceChannel', 'source', 'resume', 'history', 'screening', 'interview', 'references', 'onboarding', 'internalNotes']
  },
  newsletter: {
    collection: 'subscriber',
    label: 'Newsletter',
    pick: (row) => ({ subject: 'Newsletter sign-up', source: row.source || 'Newsletter form' }),
    lifted: ['source']
  },
  vip: {
    collection: 'vipRequest',
    label: 'VIP request',
    pick: (row) => ({
      subject: [row.date, row.guests ? `${row.guests} guests` : '', row.occasion].filter(Boolean).join(' · '),
      message: row.notes || '',
      source: 'VIP request form'
    }),
    lifted: ['notes']
  },
  'guest-list': {
    collection: 'guestListEntry',
    label: 'Guest list',
    pick: (row) => ({
      subject: [row.eventDate, row.guests ? `${row.guests} guests` : ''].filter(Boolean).join(' · '),
      message: row.notes || '',
      source: 'Guest list form'
    }),
    lifted: ['notes']
  }
};

const LEAD_COMMON_FIELDS = ['_id', 'name', 'email', 'phone', 'status', 'createdAt', 'updatedAt', 'pageUrl', 'pipeline'];
const INBOX_LEAD_STATUS = ['NEW', 'READ', 'CONFIRMED', 'ARCHIVED'];
// Sales pipeline for customer leads. Kept in its own `pipeline` field so the
// inbox status (NEW / READ / CONFIRMED) the other admin pages use is untouched.
const LEAD_STAGES = ['PENDING', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'REJECTED'];

function leadDetails(row, lifted) {
  const skip = new Set([...LEAD_COMMON_FIELDS, ...lifted]);
  const details = {};
  for (const [key, value] of Object.entries(row)) {
    if (skip.has(key) || value === null || value === undefined || value === '') continue;
    details[key] = value instanceof Date ? value.toISOString() : value;
  }
  return details;
}

function toLead(type, row, ctx) {
  const source = LEAD_SOURCES[type];
  const picked = source.pick(row, ctx);
  return {
    id: String(row._id),
    type,
    typeLabel: source.label,
    name: picked.name ?? row.name ?? '',
    email: row.email || '',
    phone: row.phone || '',
    subject: picked.subject || '',
    message: picked.message || '',
    source: picked.source,
    pageUrl: row.pageUrl || '',
    status: String(row.status || 'NEW').toUpperCase(),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
    resume: type === 'career' && row.resume ? { name: row.resume.name, mimeType: row.resume.mimeType, size: row.resume.size } : null,
    stage: type === 'career' ? null : (row.pipeline?.stage || 'PENDING'),
    followUpAt: row.pipeline?.followUpAt || null,
    stageUpdatedAt: row.pipeline?.updatedAt || null,
    stageUpdatedBy: row.pipeline?.updatedBy || '',
    stageHistory: (row.pipeline?.history || []).slice(-30),
    details: leadDetails(row, source.lifted)
  };
}

function leadSource(type) {
  const source = LEAD_SOURCES[type];
  if (!source) throw notFound('Unknown lead type.');
  return source;
}

get('/admin/leads', { auth: true, roles: [...MANAGE, 'MARKETING'] }, async () => {
  const jobs = await careerJobsCollection();
  const jobRows = await jobs.find({}, { projection: { slug: 1, title: 1 } }).toArray();
  const ctx = { roleNames: { 'general-application': 'General application', ...Object.fromEntries(jobRows.map((job) => [job.slug, job.title])) } };

  const groups = await Promise.all(Object.entries(LEAD_SOURCES).map(async ([type, source]) => {
    const target = await col(source.collection);
    // The CV bytes stay in Mongo; the list only needs the file's name and size.
    const rows = await target.find({}, { projection: { 'resume.data': 0 } }).sort({ createdAt: -1 }).limit(5000).toArray();
    return rows.map((row) => toLead(type, row, ctx));
  }));

  const leads = groups.flat().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return {
    leads,
    types: Object.fromEntries(Object.entries(LEAD_SOURCES).map(([type, source]) => [type, source.label])),
    statuses: { inbox: INBOX_LEAD_STATUS, career: CAREER_APPLICATION_STATUS },
    stages: LEAD_STAGES
  };
});

// Move a customer lead along the pipeline, add a note, or set a follow-up date.
// Marketing accounts may do this; status changes and deletes stay admin-only.
put('/admin/leads/:type/:id/pipeline', { auth: true, roles: [...MANAGE, 'MARKETING'] }, async (ctx) => {
  const source = leadSource(ctx.params.type);
  if (ctx.params.type === 'career') throw badRequest('Career applications use the hiring pipeline.');

  const stage = ctx.body?.stage ? cleanText(ctx.body.stage, 20).toUpperCase() : '';
  if (stage && !LEAD_STAGES.includes(stage)) throw badRequest('That is not a valid stage.');
  const note = cleanText(ctx.body?.note, 1000);
  const hasFollowUp = ctx.body && Object.prototype.hasOwnProperty.call(ctx.body, 'followUpAt');
  let followUpAt = null;
  if (hasFollowUp && ctx.body.followUpAt) {
    followUpAt = new Date(ctx.body.followUpAt);
    if (Number.isNaN(followUpAt.getTime())) throw badRequest('Follow-up date is not valid.');
  }
  if (!stage && !note && !hasFollowUp) throw badRequest('Nothing to update.');

  const target = await col(source.collection);
  const id = asObjectId(ctx.params.id);
  const current = id ? await target.findOne({ _id: id }, { projection: { pipeline: 1 } }) : null;
  if (!current) throw notFound('Lead not found.');

  const now = new Date();
  const previous = current.pipeline?.stage || 'PENDING';
  const set = { 'pipeline.updatedAt': now, 'pipeline.updatedBy': ctx.user.email, updatedAt: now };
  if (stage) set['pipeline.stage'] = stage;
  if (hasFollowUp) set['pipeline.followUpAt'] = followUpAt;
  // Closed leads need no reminder.
  if (stage === 'CONVERTED' || stage === 'REJECTED') set['pipeline.followUpAt'] = null;

  const action = [
    stage && stage !== previous ? `${previous} → ${stage}` : '',
    hasFollowUp && !(stage === 'CONVERTED' || stage === 'REJECTED') ? (followUpAt ? `Follow-up set for ${followUpAt.toISOString().slice(0, 10)}` : 'Follow-up cleared') : ''
  ].filter(Boolean).join(' · ') || 'Note added';
  const entry = { at: now, by: ctx.user.email, action, ...(note ? { note } : {}) };

  await target.updateOne({ _id: id }, { $set: set, $push: { 'pipeline.history': { $each: [entry], $slice: -100 } } });
  await logActivity(ctx, 'UPDATE', 'LEAD', `${source.label} ${ctx.params.id} pipeline: ${action}`);
  const updated = await target.findOne({ _id: id }, { projection: { pipeline: 1 } });
  return {
    ok: true,
    stage: updated.pipeline?.stage || 'PENDING',
    followUpAt: updated.pipeline?.followUpAt || null,
    stageUpdatedAt: now,
    stageUpdatedBy: ctx.user.email,
    stageHistory: (updated.pipeline?.history || []).slice(-30)
  };
});

put('/admin/leads/:type/:id/status', { auth: true, roles: MANAGE }, async (ctx) => {
  const source = leadSource(ctx.params.type);
  const status = cleanText(ctx.body?.status, 20).toUpperCase();
  const allowed = ctx.params.type === 'career' ? CAREER_APPLICATION_STATUS : INBOX_LEAD_STATUS;
  if (!allowed.includes(status)) throw badRequest('That is not a valid status.');

  const target = await col(source.collection);
  const id = asObjectId(ctx.params.id);
  const current = id ? await target.findOne({ _id: id }, { projection: { 'resume.data': 0 } }) : null;
  if (!current) throw notFound('Lead not found.');

  const now = new Date();
  const update = { $set: { status, updatedAt: now } };
  if (ctx.params.type === 'career') {
    if (status !== 'NEW' && !current.firstContactAt) update.$set.firstContactAt = now;
    update.$push = { history: { $each: [{ at: now, by: ctx.user.email, action: `Status changed from ${current.status} to ${status}` }], $slice: -100 } };
  }
  await target.updateOne({ _id: id }, update);
  await logActivity(ctx, 'UPDATE', 'LEAD', `${source.label} ${ctx.params.id} → ${status}`);
  return { ok: true, status, updatedAt: now };
});

del('/admin/leads/:type/:id', { auth: true, roles: MANAGE }, async (ctx) => {
  const source = leadSource(ctx.params.type);
  const target = await col(source.collection);
  const id = asObjectId(ctx.params.id);
  if (!id) throw notFound('Lead not found.');

  const removed = await target.deleteOne({ _id: id });
  if (!removed.deletedCount) throw notFound('Lead not found.');
  await logActivity(ctx, 'DELETE', 'LEAD', `${source.label} ${ctx.params.id}`);
  return { ok: true };
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
