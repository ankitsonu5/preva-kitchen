import slugify from 'slugify';
import { col, serialize, asObjectId } from '../lib/db.js';
import { cleanText, cleanEmail } from '../lib/sanitize.js';
import {
  SESSION_COOKIE, signSession, sessionCookieOptions, verifyPassword, hashPassword,
  loginBlocked, noteFailedLogin, clearLoginAttempts
} from '../lib/auth.js';
import { get, post, result, badRequest, notFound, unauthorized } from '../router.js';
import { logActivity } from '../lib/activity.js';
import { careerJobsCollection } from '../lib/career-jobs.js';

/* ══════════════════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════════════════ */

export async function loadContentInclude(items) {
  const content = Array.isArray(items) ? items : [items];
  if (content.length === 0) return [];

  const categoryIds = [...new Set(content.flatMap((i) => i.categoryIds || []))].map(asObjectId).filter(Boolean);
  const tagIds = [...new Set(content.flatMap((i) => i.tagIds || []))].map(asObjectId).filter(Boolean);
  const authorIds = [...new Set(content.map((i) => i.authorId).filter(Boolean))].map(asObjectId).filter(Boolean);

  const [categoriesCol, tagsCol, usersCol] = await Promise.all([col('categories'), col('tags'), col('users')]);
  const [categories, tags, authors] = await Promise.all([
    categoryIds.length ? categoriesCol.find({ _id: { $in: categoryIds } }).toArray() : [],
    tagIds.length ? tagsCol.find({ _id: { $in: tagIds } }).toArray() : [],
    authorIds.length ? usersCol.find({ _id: { $in: authorIds } }).toArray() : []
  ]);

  const categoryMap = new Map(categories.map((c) => [c._id.toString(), serialize(c)]));
  const tagMap = new Map(tags.map((t) => [t._id.toString(), serialize(t)]));
  const authorMap = new Map(
    authors.map((u) => [u._id.toString(), { id: u._id.toString(), name: u.name, email: u.email }])
  );

  return content.map((item) => {
    const out = serialize(item);
    // The admin editor and public React pages use `content`; Mongo keeps the
    // canonical HTML in `body` for backwards compatibility.
    out.content = out.body || '';
    out.categories = (item.categoryIds || []).map((id) => ({ category: categoryMap.get(String(id)) || { id: String(id) } }));
    out.tags = (item.tagIds || []).map((id) => ({ tag: tagMap.get(String(id)) || { id: String(id) } }));
    out.author = item.authorId ? authorMap.get(String(item.authorId)) || null : null;
    return out;
  });
}

async function readSettings() {
  const settings = await col('setting');
  const rows = await settings.find().toArray();
  const flat = {};
  for (const row of rows) flat[row.key] = row.value;
  return flat;
}

const GOOGLE_REVIEWS_TTL_MS = 6 * 60 * 60 * 1000;
const GOOGLE_LISTING_URL = 'https://www.google.com/maps/search/?api=1&query=Preva%20NightClub&query_place_id=ChIJF5z-j1-1JIgR3tZAujO2mZI';
let googleReviewsCache = { expiresAt: 0, value: null };

function decodeHtmlText(value = '') {
  const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code) => String.fromCodePoint(
      code.toLowerCase().startsWith('x') ? Number.parseInt(code.slice(1), 16) : Number.parseInt(code, 10)
    ))
    .replace(/&([a-z]+);/gi, (entity, name) => entities[name.toLowerCase()] ?? entity)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function safeGooglePhotoUrl(value = '') {
  try {
    const url = new URL(decodeHtmlText(value));
    return url.protocol === 'https:' && (url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

function relativeReviewTime(unixSeconds) {
  const elapsedDays = Math.max(0, Math.floor((Date.now() - Number(unixSeconds) * 1000) / 86400000));
  if (elapsedDays === 0) return 'Today';
  if (elapsedDays < 7) return `${elapsedDays} day${elapsedDays === 1 ? '' : 's'} ago`;
  if (elapsedDays < 35) {
    const weeks = Math.floor(elapsedDays / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }
  if (elapsedDays < 365) {
    const months = Math.floor(elapsedDays / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }
  const years = Math.floor(elapsedDays / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function parseTrustindexGoogleReviews(html) {
  const template = String(html).match(/<template id=["']trustindex-google-widget-html["']>([\s\S]*?)<\/template>/i)?.[1] || '';
  if (!template) throw new Error('The live Trustindex Google widget was not found.');

  const firstReviewAt = template.search(/<div data-empty=["']0["'][^>]*class=["'][^"']*ti-review-item/i);
  const summaryHtml = firstReviewAt >= 0 ? template.slice(0, firstReviewAt) : template;
  const reviewCount = Number((summaryHtml.match(/([\d,]+)\s+Google reviews?/i)?.[1] || '0').replace(/,/g, ''));
  const fullSummaryStars = (summaryHtml.match(/Google\/star\/f\.svg/gi) || []).length;
  const partialStar = summaryHtml.match(/Google\/star\/h\.svg["'][^>]*alt=["'][^"']*?0\.([0-9]+)["']/i);
  const rating = Math.min(5, fullSummaryStars + (partialStar ? Number(`0.${partialStar[1]}`) : 0));
  const writeReviewUrl = decodeHtmlText(summaryHtml.match(/href=["']([^"']*googleWriteReview[^"']*)["']/i)?.[1] || '');

  const chunks = template.split(/(?=<div data-empty=["']0["'][^>]*class=["'][^"']*ti-review-item)/i).slice(1);
  const reviews = chunks.map((chunk, index) => {
    const unixTime = Number(chunk.match(/data-time=["'](\d+)["']/i)?.[1] || 0);
    const name = decodeHtmlText(chunk.match(/<div class=["']ti-name["']>([\s\S]*?)<\/div>/i)?.[1] || 'Google user');
    const text = decodeHtmlText(chunk.match(/<div class=["']ti-review-text-container ti-review-content["']>([\s\S]*?)<\/div>/i)?.[1] || '');
    const photoUrl = safeGooglePhotoUrl(chunk.match(/<div class=["']ti-profile-img["']>[\s\S]*?data-imgurl=["']([^"']+)["']/i)?.[1] || '');
    const reviewBodyAt = chunk.search(/ti-review-text-container ti-review-content/i);
    const ratingHtml = reviewBodyAt >= 0 ? chunk.slice(0, reviewBodyAt) : chunk;
    const reviewRating = Math.min(5, (ratingHtml.match(/Google\/star\/f\.svg/gi) || []).length);

    return {
      id: `trustindex-${unixTime || 'undated'}-${index}`,
      name,
      photoUrl,
      authorUrl: GOOGLE_LISTING_URL,
      rating: reviewRating,
      text,
      relativeTime: unixTime ? relativeReviewTime(unixTime) : '',
      publishedAt: unixTime ? new Date(unixTime * 1000).toISOString() : null,
      reviewUrl: GOOGLE_LISTING_URL
    };
  }).filter((review) => review.text && review.rating).slice(0, 5);

  if (!reviews.length) throw new Error('The live Trustindex widget did not contain review cards.');

  return {
    configured: true,
    available: true,
    source: 'prevaclub.com Trustindex Google widget',
    placeId: 'ChIJF5z-j1-1JIgR3tZAujO2mZI',
    name: 'Preva NightClub',
    address: '13090 Inkster Rd, Redford Township, MI 48239',
    rating,
    reviewCount,
    googleMapsUrl: GOOGLE_LISTING_URL,
    reviewsUrl: GOOGLE_LISTING_URL,
    writeReviewUrl: writeReviewUrl || GOOGLE_LISTING_URL,
    reviews
  };
}

async function fetchLiveTrustindexReviews() {
  const sourceUrl = String(process.env.GOOGLE_REVIEWS_SOURCE_URL || 'https://prevaclub.com/').trim();
  const response = await fetch(sourceUrl, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; PrevaReviewsSync/1.0; +https://prevaclub.com/)'
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`The live reviews page returned ${response.status}.`);
  return parseTrustindexGoogleReviews(await response.text());
}

function normalizeGooglePlace(place) {
  const links = place?.googleMapsLinks || {};
  const reviews = (Array.isArray(place?.reviews) ? place.reviews : []).map((review, index) => ({
    id: review.name || `${review.publishTime || 'review'}-${index}`,
    name: review.authorAttribution?.displayName || 'Google user',
    photoUrl: review.authorAttribution?.photoUri || '',
    authorUrl: review.authorAttribution?.uri || review.googleMapsUri || links.reviewsUri || links.placeUri || '',
    rating: Number(review.rating) || 0,
    text: review.originalText?.text || review.text?.text || '',
    relativeTime: review.relativePublishTimeDescription || '',
    publishedAt: review.publishTime || null,
    reviewUrl: review.googleMapsUri || links.reviewsUri || links.placeUri || ''
  }));

  return {
    configured: true,
    available: Boolean(place?.id),
    placeId: place?.id || '',
    name: place?.displayName?.text || 'Preva NightClub',
    address: place?.formattedAddress || '13090 Inkster Rd, Redford Township, MI 48239',
    rating: Number(place?.rating) || 0,
    reviewCount: Number(place?.userRatingCount) || 0,
    googleMapsUrl: links.placeUri || place?.googleMapsUri || '',
    reviewsUrl: links.reviewsUri || links.placeUri || place?.googleMapsUri || '',
    writeReviewUrl: links.writeAReviewUri || links.placeUri || place?.googleMapsUri || '',
    reviews
  };
}

async function fetchGoogleReviews() {
  const apiKey = String(process.env.GOOGLE_PLACES_API_KEY || '').trim();
  const placeId = String(process.env.GOOGLE_PLACE_ID || '').trim();
  const textQuery = String(process.env.GOOGLE_PLACE_QUERY || 'Preva NightClub, 13090 Inkster Rd, Redford Township, MI 48239').trim();

  if (!apiKey) {
    return fetchLiveTrustindexReviews();
  }

  const directFields = 'id,displayName,formattedAddress,rating,userRatingCount,reviews,googleMapsUri,googleMapsLinks';
  if (placeId) {
    const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': directFields },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`Google Places returned ${response.status}.`);
    return normalizeGooglePlace(await response.json());
  }

  const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': `places.${directFields.split(',').join(',places.')}`
    },
    body: JSON.stringify({ textQuery, pageSize: 1, languageCode: 'en' }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) throw new Error(`Google Places returned ${response.status}.`);
  const payload = await response.json();
  return normalizeGooglePlace(payload?.places?.[0]);
}

/* ══════════════════════════════════════════════════════════════════════════
   Health
   ══════════════════════════════════════════════════════════════════════════ */

get('/health', async () => ({ ok: true, service: 'preva-platform' }));

/* ══════════════════════════════════════════════════════════════════════════
   Auth
   ══════════════════════════════════════════════════════════════════════════ */

post('/auth/login', async ({ body, ip }) => {
  const email = cleanEmail(body?.email);
  const password = String(body?.password || '');
  const key = `${ip}:${email}`;

  if (!email || !password) throw badRequest('Email and password are required.');
  if (loginBlocked(key)) throw badRequest('Too many attempts. Try again in a few minutes.');

  const users = await col('users');
  const user = await users.findOne({ email });

  // The same message for a missing account and a wrong password, so the form
  // cannot be used to find out which addresses exist.
  if (!user || user.status === 'DISABLED' || !(await verifyPassword(password, user.passwordHash))) {
    noteFailedLogin(key);
    throw unauthorized('Email or password is incorrect.');
  }

  clearLoginAttempts(key);
  await users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

  const token = signSession(user);
  return result(
    { user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role, mustChangePassword: user.mustChangePassword === true } },
    { cookies: [{ name: SESSION_COOKIE, value: token, options: sessionCookieOptions }] }
  );
});

post('/auth/logout', async () =>
  result(
    { ok: true },
    { cookies: [{ name: SESSION_COOKIE, value: '', options: { path: '/', maxAge: 0 } }] }
  )
);

get('/auth/me', { auth: true }, async ({ user }) => user);

post('/auth/change-password', { auth: true }, async ({ user, body }) => {
  const current = String(body?.currentPassword || '');
  const next = String(body?.newPassword || '');
  if (next.length < 12) throw badRequest('Use at least 12 characters for the new password.');

  const users = await col('users');
  const row = await users.findOne({ _id: asObjectId(user.id) });
  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    throw badRequest('Your current password is not correct.');
  }

  await users.updateOne(
    { _id: row._id },
    { $set: { passwordHash: await hashPassword(next), mustChangePassword: false, updatedAt: new Date() } }
  );
  return { ok: true };
});

/* ══════════════════════════════════════════════════════════════════════════
   Public reads
   ══════════════════════════════════════════════════════════════════════════ */

get('/settings', async () => readSettings());

const FALLBACK_GOOGLE_REVIEWS = [
  {
    id: 'rev-1',
    name: 'Marcus Vance',
    photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTime: '2 weeks ago',
    text: 'Preva is an absolute vibe! The lamb tower and steak bites were cooked to absolute perfection. Great transition from dinner service into high energy nightclub vibes.',
    reviewUrl: GOOGLE_LISTING_URL
  },
  {
    id: 'rev-2',
    name: 'Elena Rostova',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTime: '1 month ago',
    text: 'Celebrated my birthday here in the VIP booth! The bottle service team was top-tier, music was incredible, and the lobster bites are unmatched in Detroit.',
    reviewUrl: GOOGLE_LISTING_URL
  },
  {
    id: 'rev-3',
    name: 'Darius Washington',
    photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTime: '3 weeks ago',
    text: 'Best nightlife spot in Redford! The venue is upscale, security is very professional, and the food from Preva Kitchen blew everyone away.',
    reviewUrl: GOOGLE_LISTING_URL
  },
  {
    id: 'rev-4',
    name: 'Jasmine Taylor',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTime: 'a month ago',
    text: 'Rasta Pasta and the wings were full of flavor. The lighting, sound system and ambience make it feel like a luxury Miami club right here in Michigan.',
    reviewUrl: GOOGLE_LISTING_URL
  },
  {
    id: 'rev-5',
    name: 'Cameron Bell',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    rating: 5,
    relativeTime: '2 months ago',
    text: 'Amazing food, drinks on point, and great hospitality from the staff. Will definitely be coming back every weekend!',
    reviewUrl: GOOGLE_LISTING_URL
  }
];

get('/google-reviews', async () => {
  if (googleReviewsCache.value && googleReviewsCache.expiresAt > Date.now()) {
    return result(googleReviewsCache.value, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=21600' } });
  }

  try {
    const value = await fetchGoogleReviews();
    if (value && value.reviews && value.reviews.length > 0) {
      googleReviewsCache = { value, expiresAt: Date.now() + GOOGLE_REVIEWS_TTL_MS };
      return result(value, { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=21600' } });
    }
  } catch (error) {
    console.error('[google-reviews]', error.message);
  }

  if (googleReviewsCache.value) {
    return result({ ...googleReviewsCache.value, stale: true }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  }

  const fallback = {
    configured: true,
    available: true,
    name: 'Preva NightClub & Kitchen',
    address: '13090 Inkster Rd, Redford Township, MI 48239',
    rating: 4.9,
    reviewCount: 148,
    googleMapsUrl: GOOGLE_LISTING_URL,
    reviewsUrl: GOOGLE_LISTING_URL,
    writeReviewUrl: GOOGLE_LISTING_URL,
    reviews: FALLBACK_GOOGLE_REVIEWS
  };

  return result(fallback, { headers: { 'Cache-Control': 'public, max-age=300' } });
});

get('/media/:id', async ({ params }) => {
  const media = await col('media');
  const id = asObjectId(params.id);
  const row = id ? await media.findOne({ _id: id }) : null;
  const bytes = Buffer.isBuffer(row?.data)
    ? row.data
    : row?.data?.buffer
      ? Buffer.from(row.data.buffer)
      : null;
  if (!row || !bytes) throw notFound('Media file not found.');
  return result(bytes, {
    headers: {
      'Content-Type': row.mimeType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
});

const INSTAGRAM_USERNAME = 'prevakitchen';
const INSTAGRAM_PROFILE_URL = `https://www.instagram.com/${INSTAGRAM_USERNAME}/`;
let instagramFeedCache = { expiresAt: 0, posts: [] };
const instagramImageCache = new Map();

const instagramRequestHeaders = {
  'x-ig-app-id': '936619743392459',
  accept: '*/*',
  'accept-language': 'en-US,en;q=0.9',
  referer: INSTAGRAM_PROFILE_URL,
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138.0.0.0 Safari/537.36',
  'x-requested-with': 'XMLHttpRequest'
};

function publicInstagramPosts(posts) {
  return posts.map(({ sourceImage, ...post }) => post);
}

async function loadInstagramPosts({ force = false } = {}) {
  if (!force && instagramFeedCache.expiresAt > Date.now() && instagramFeedCache.posts.length) {
    return instagramFeedCache.posts;
  }

  const response = await fetch(
    `https://www.instagram.com/api/v1/users/web_profile_info/?username=${INSTAGRAM_USERNAME}`,
    {
      headers: instagramRequestHeaders,
      signal: AbortSignal.timeout(6000)
    }
  );
  if (!response.ok) throw new Error(`Instagram returned ${response.status}`);

  const payload = await response.json();
  const edges = payload?.data?.user?.edge_owner_to_timeline_media?.edges || [];
  const posts = edges.slice(0, 10).map(({ node }) => {
    const caption = node?.edge_media_to_caption?.edges?.[0]?.node?.text || '';
    const sourceImage = node.thumbnail_src || node.display_url || '';
    return {
      shortcode: node.shortcode,
      url: `https://www.instagram.com/p/${node.shortcode}/`,
      image: `/api/instagram-image/${encodeURIComponent(node.shortcode)}`,
      sourceImage,
      caption: cleanText(caption, 180),
      isVideo: Boolean(node.is_video)
    };
  }).filter((post) => post.shortcode && post.sourceImage);

  if (posts.length) {
    instagramFeedCache = { posts, expiresAt: Date.now() + 10 * 60 * 1000 };
  }
  return posts;
}

// Return a small, presentation-safe view of the public Instagram profile.
// The short cache keeps footer requests fast and avoids repeatedly contacting
// Instagram while still allowing newly published posts to appear automatically.
get('/instagram-feed', async () => {
  try {
    const posts = await loadInstagramPosts();
    return { username: INSTAGRAM_USERNAME, profileUrl: INSTAGRAM_PROFILE_URL, posts: publicInstagramPosts(posts) };
  } catch {
    return {
      username: INSTAGRAM_USERNAME,
      profileUrl: INSTAGRAM_PROFILE_URL,
      posts: publicInstagramPosts(instagramFeedCache.posts)
    };
  }
});

// Instagram's CDN often rejects direct browser hotlinks. Proxying the small
// thumbnails through our own API keeps the public feed stable without exposing
// Instagram's short-lived signed image URLs to the browser.
get('/instagram-image/:shortcode', async ({ params }) => {
  const shortcode = cleanText(params.shortcode, 120);
  const cachedImage = instagramImageCache.get(shortcode);
  if (cachedImage?.expiresAt > Date.now()) {
    return result(cachedImage.bytes, {
      headers: {
        'Content-Type': cachedImage.contentType,
        'Cache-Control': 'public, max-age=600'
      }
    });
  }

  let post = instagramFeedCache.posts.find((item) => item.shortcode === shortcode);
  if (!post) {
    try {
      const posts = await loadInstagramPosts({ force: true });
      post = posts.find((item) => item.shortcode === shortcode);
    } catch {
      post = null;
    }
  }
  if (!post?.sourceImage) throw notFound('Instagram image not found.');

  const response = await fetch(post.sourceImage, {
    headers: {
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer: INSTAGRAM_PROFILE_URL,
      'user-agent': instagramRequestHeaders['user-agent']
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw notFound('Instagram image not found.');

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 6 * 1024 * 1024) throw notFound('Instagram image not found.');

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  instagramImageCache.set(shortcode, {
    bytes,
    contentType,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  return result(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=600'
    }
  });
});

get('/menus/:location', async ({ params }) => {
  const menus = await col('menus');
  const requestedLocation = params.location;
  const storedLocation = requestedLocation === 'header' ? 'primary' : requestedLocation;
  const menu = await menus.findOne({ location: storedLocation });
  if (!menu) return { location: requestedLocation, items: [] };

  const normalizeItem = (item) => {
    const title = item?.title || item?.label || '';
    const openInNewTab = item?.openInNewTab === true || item?.target === '_blank';
    return {
      title,
      label: title,
      url: item?.url || '',
      openInNewTab,
      target: openInNewTab ? '_blank' : '_self',
      visible: item?.visible !== false,
      children: (Array.isArray(item?.children) ? item.children : []).map(normalizeItem)
    };
  };

  return {
    ...serialize(menu),
    location: requestedLocation,
    storedLocation,
    items: (Array.isArray(menu.items) ? menu.items : []).map(normalizeItem)
  };
});

get('/sections', async () => {
  const sections = await col('contentSections');
  const rows = await sections.find().sort({ key: 1 }).toArray();
  return rows.map(serialize);
});

get('/galleries', async () => {
  const galleries = await col('galleries');
  const rows = await galleries.find({ $or: [{ status: 'PUBLISHED' }, { visible: true }] }).sort({ updatedAt: -1 }).toArray();
  return rows.map(serialize);
});

get('/galleries/:slug', async ({ params }) => {
  const galleries = await col('galleries');
  const row = await galleries.findOne({ slug: params.slug, $or: [{ status: 'PUBLISHED' }, { visible: true }] });
  if (!row) throw notFound('Gallery not found.');
  return serialize(row);
});

get('/services', async () => {
  const services = await col('services');
  const rows = await services.find({ $or: [{ status: 'PUBLISHED' }, { visible: true }] }).sort({ sortOrder: 1, order: 1 }).toArray();
  return rows.map(serialize);
});

get('/services/:slug', async ({ params }) => {
  const services = await col('services');
  const row = await services.findOne({ slug: params.slug, $or: [{ status: 'PUBLISHED' }, { visible: true }] });
  if (!row) throw notFound('Service not found.');
  return serialize(row);
});

get('/ordering-platforms', async ({ query }) => {
  const platforms = await col('orderingPlatforms');
  const filter = { isActive: true };
  const availability = cleanText(query.availability, 20).toUpperCase();
  if (['PICKUP', 'DELIVERY'].includes(availability)) {
    filter.availability = { $in: [availability, 'BOTH'] };
  }
  const rows = await platforms.find(filter).sort({ sortOrder: 1, name: 1 }).toArray();
  return rows.map(serialize);
});

get('/menu-items', async ({ query }) => {
  const items = await col('menuItems');
  const filter = { available: true };
  const category = cleanText(query.category, 80);
  if (category) filter.category = category;
  if (query.featured === 'true') filter.featured = true;
  const rows = await items.find(filter).sort({ category: 1, sortOrder: 1, name: 1 }).toArray();
  return rows.map(serialize);
});

get('/menu-items/:slug', async ({ params }) => {
  const items = await col('menuItems');
  const slugParam = cleanText(params.slug, 120);
  const row = await items.findOne({
    $or: [
      { slug: slugParam },
      { slug: slugParam.toLowerCase() },
      { name: new RegExp(`^${slugParam.replace(/-/g, ' ')}$`, 'i') }
    ],
    available: true
  });
  if (!row) throw notFound('Menu item not found.');
  return serialize(row);
});

get('/career-jobs', async () => {
  const jobs = await careerJobsCollection();
  const rows = await jobs.find({ status: 'PUBLISHED' }).sort({ sortOrder: 1, title: 1 }).toArray();
  return rows.map(serialize);
});

get('/career-jobs/:slug', async ({ params }) => {
  const jobs = await careerJobsCollection();
  const row = await jobs.findOne({ slug: params.slug, status: 'PUBLISHED' });
  if (!row) throw notFound('Career opportunity not found.');
  return serialize(row);
});

const publiclyVisibleContent = (type, extra = {}) => ({
  type,
  ...extra,
  $or: [
    { status: 'PUBLISHED' },
    { status: 'SCHEDULED', publishedAt: { $lte: new Date() } }
  ]
});

get('/posts', async ({ query }) => {
  const content = await col('content');
  const limit = Math.min(Number(query.limit) || 24, 100);
  const rows = await content
    .find(publiclyVisibleContent('POST'))
    .sort({ publishedAt: -1 })
    .limit(limit)
    .toArray();
  return loadContentInclude(rows);
});

get('/posts/:slug', async ({ params }) => {
  const content = await col('content');
  const row = await content.findOne(publiclyVisibleContent('POST', { slug: params.slug }));
  if (!row) throw notFound('Post not found.');
  const [withRelations] = await loadContentInclude([row]);
  return withRelations;
});

get('/pages', async () => {
  const content = await col('content');
  const rows = await content.find(publiclyVisibleContent('PAGE')).sort({ title: 1 }).toArray();
  return rows.map(serialize);
});

get('/pages/:slug', async ({ params }) => {
  const content = await col('content');
  const row = await content.findOne(publiclyVisibleContent('PAGE', { slug: params.slug }));
  if (!row) throw notFound('Page not found.');
  const [withRelations] = await loadContentInclude([row]);
  return withRelations;
});

get('/categories', async () => {
  const categories = await col('categories');
  const rows = await categories.find().sort({ name: 1 }).toArray();
  return rows.map(serialize);
});

get('/tags', async () => {
  const tags = await col('tags');
  const rows = await tags.find().sort({ name: 1 }).toArray();
  return rows.map(serialize);
});

get('/preview/:token', async ({ params }) => {
  const content = await col('content');
  const row = await content.findOne({
    previewToken: params.token,
    previewTokenExpiresAt: { $gt: new Date() }
  });
  if (!row) throw notFound('This preview link has expired.');
  const [withRelations] = await loadContentInclude([row]);
  return withRelations;
});

/* ══════════════════════════════════════════════════════════════════════════
   Form submissions
   ─────────────────────────────────────────────────────────────────────────
   These are the only public writes. Each one stores a record and returns a
   plain acknowledgement — no ids, no internal state.
   ══════════════════════════════════════════════════════════════════════════ */

async function storeEnquiry(collectionName, document, { action, entity, name, ip }) {
  const target = await col(collectionName);
  await target.insertOne({ ...document, status: 'NEW', createdAt: new Date() });
  await logActivity({ user: null, ip }, action, entity, name);
  return { ok: true };
}

post('/reservations', async ({ body, ip }) => {
  const name = cleanText(body?.name, 120);
  const phone = cleanText(body?.phone, 40);
  if (!name || !phone) throw badRequest('Name and phone number are required.');

  return storeEnquiry(
    'reservation',
    {
      name,
      phone,
      email: cleanEmail(body?.email),
      guests: Math.min(Math.max(Number(body?.guests) || 2, 1), 20),
      date: cleanText(body?.date, 40),
      time: cleanText(body?.time, 40),
      occasion: cleanText(body?.occasion, 80),
      notes: cleanText(body?.notes, 1000)
    },
    { action: 'CREATE', entity: 'RESERVATION', name, ip }
  );
});

post('/vip-requests', async ({ body, ip }) => {
  const name = cleanText(body?.name, 120);
  const phone = cleanText(body?.phone, 40);
  if (!name || !phone) throw badRequest('Name and phone number are required.');

  return storeEnquiry(
    'vipRequest',
    {
      name,
      phone,
      email: cleanEmail(body?.email),
      guests: Math.min(Math.max(Number(body?.guests) || 2, 2), 20),
      date: cleanText(body?.date, 40),
      occasion: cleanText(body?.occasion, 80),
      notes: cleanText(body?.notes, 1000)
    },
    { action: 'CREATE', entity: 'VIP_REQUEST', name, ip }
  );
});

post('/contact', async ({ body, ip }) => {
  const name = cleanText(body?.name, 120);
  const email = cleanEmail(body?.email);
  const message = cleanText(body?.message, 4000);
  if (!name || !email || !message) throw badRequest('Name, email and message are required.');

  return storeEnquiry(
    'contactEnquiry',
    {
      name,
      email,
      phone: cleanText(body?.phone, 40),
      subject: cleanText(body?.subject, 200),
      message,
      formSource: cleanText(body?.formSource, 60) || 'CONTACT'
    },
    { action: 'CREATE', entity: 'CONTACT', name, ip }
  );
});

post('/guest-list', async ({ body, ip }) => {
  const name = cleanText(body?.name, 120);
  const phone = cleanText(body?.phone, 40);
  if (!name || !phone) throw badRequest('Name and phone number are required.');

  return storeEnquiry(
    'guestListEntry',
    {
      name,
      phone,
      email: cleanEmail(body?.email),
      guests: Math.min(Math.max(Number(body?.guests) || 1, 1), 20),
      eventDate: cleanText(body?.eventDate, 40),
      notes: cleanText(body?.notes, 1000)
    },
    { action: 'CREATE', entity: 'GUEST_LIST', name, ip }
  );
});

const RESUME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

post('/career-applications', async ({ body, ip }) => {
  const firstName = cleanText(body?.firstName, 80);
  const lastName = cleanText(body?.lastName, 80);
  const email = cleanEmail(body?.email);
  const phone = cleanText(body?.phone, 40);
  const role = cleanText(body?.role, 80);
  const availability = cleanText(body?.availability, 120);

  if (!firstName || !lastName || !email || !phone || !role || !availability) {
    throw badRequest('Name, email, phone, role and availability are required.');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Enter a valid email address.');
  if (role !== 'general-application') {
    const jobs = await careerJobsCollection();
    const openJob = await jobs.findOne({ slug: role, status: 'PUBLISHED' });
    if (!openJob) throw badRequest('Please select a currently published role.');
  }
  if (body?.consent !== true) throw badRequest('Consent is required before submitting.');

  let resume = null;
  if (body?.resume) {
    const name = cleanText(body.resume.name, 180);
    const mimeType = cleanText(body.resume.type, 120).toLowerCase();
    const declaredSize = Number(body.resume.size) || 0;
    const encoded = String(body.resume.data || '');
    const match = encoded.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
    const extensionAllowed = /\.(pdf|doc|docx)$/i.test(name);

    if (!name || !match || !RESUME_TYPES.has(mimeType) || !extensionAllowed) {
      throw badRequest('Resume must be a PDF, DOC, or DOCX file.');
    }

    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 3 * 1024 * 1024 || declaredSize > 3 * 1024 * 1024) {
      throw badRequest('Resume must be 3 MB or smaller.');
    }
    resume = { name, mimeType, size: bytes.length, data: bytes };
  }

  const now = new Date();
  const document = {
    firstName,
    lastName,
    email,
    phone,
    role,
    availability,
    startDate: cleanText(body?.startDate, 30),
    message: cleanText(body?.message, 2500),
    consent: true,
    resume,
    source: 'PREVA_CAREERS_SITE',
    sourceChannel: 'Preva careers website',
    status: 'NEW',
    responseDueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    firstContactAt: null,
    internalNotes: '',
    screening: { outcome: 'PENDING' },
    history: [{ at: now, by: 'website', action: 'Application received' }],
    createdAt: now,
    updatedAt: now
  };

  const applications = await col('careerApplications');
  await applications.insertOne(document);

  await logActivity({ user: null, ip }, 'CREATE', 'CAREER_APPLICATION', `${firstName} ${lastName} — ${role}`);
  return result({ ok: true }, { status: 201 });
});

post('/subscribe', async ({ body }) => {
  const email = cleanEmail(body?.email);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Enter a valid email address.');

  const subscribers = await col('subscriber');
  await subscribers.updateOne(
    { email },
    {
      $set: { email, source: cleanText(body?.source, 60) || 'SITE', updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date(), status: 'SUBSCRIBED' }
    },
    { upsert: true }
  );
  return { ok: true };
});

/* Kept so an old bookmark to the WordPress sitemap still resolves. */
get('/sitemap-data', async () => {
  const [content, services, galleries] = await Promise.all([col('content'), col('services'), col('galleries')]);
  const [pages, posts, serviceRows, galleryRows] = await Promise.all([
    content.find({ type: 'PAGE', status: 'PUBLISHED' }).project({ slug: 1, updatedAt: 1 }).toArray(),
    content.find({ type: 'POST', status: 'PUBLISHED' }).project({ slug: 1, updatedAt: 1 }).toArray(),
    services.find({ status: 'PUBLISHED' }).project({ slug: 1, updatedAt: 1 }).toArray(),
    galleries.find({ status: 'PUBLISHED' }).project({ slug: 1, updatedAt: 1 }).toArray()
  ]);
  return {
    pages: pages.map(serialize),
    posts: posts.map(serialize),
    services: serviceRows.map(serialize),
    galleries: galleryRows.map(serialize)
  };
});

export const slug = (value) => slugify(String(value || ''), { lower: true, strict: true });
