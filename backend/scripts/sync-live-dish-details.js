import dotenv from 'dotenv';

dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

const SOURCE_ROOT = 'https://prevaclub.com/preva-kitchen-menu';
const SOURCE_PRODUCTS = [
  ['preva-wings', 'preva-wings'],
  ['preva-wings-chilli', 'preva-wings-chilli'],
  ['honey-hot-wings', 'honey-hot'],
  ['buffalo-wings', 'buffalo'],
  ['bbq-wings', 'bbq'],
  ['garlic-parmesan-wings', 'garlic-parmesan'],
  ['lemon-pepper-wings', 'lemon-pepper'],
  ['jerk-wings', 'jerk'],
  ['preva-burger', 'preva-burger'],
  ['preva-double-smash-burger', 'preva-double-smash-burger'],
  ['preva-quesadillas', 'preva-quesadillas'],
  ['chicken-quesadillas', 'chicken-quesadillas'],
  ['steak-quesadilla', 'steak-quesadilla'],
  ['shrimp-quesadillas', 'shrimp-quesadillas'],
  ['beef-quesadillas', 'beef-quesadillas'],
  ['veggie-quesadilla', 'veggie-quesadilla'],
  ['shrimp-tacos', 'shrimp-tacos'],
  ['steak-tacos', 'steak-tacos'],
  ['chicken-tacos', 'chicken-tacos'],
  ['preva-catfish', 'preva-catfish'],
  ['preva-lobster', 'preva-lobster'],
  ['preva-steak-bites', 'preva-steak-bites'],
  ['veggie-pasta', 'veggie-pasta'],
  ['rasta-pasta', 'rasta-pasta'],
  ['house-salad', 'house-salad'],
  ['preva-lamb', 'preva-lamb-chops'],
  ['catfish-bites-with-fries', 'catfish-bites-with-fries'],
  ['preva-mac', 'preva-mac-and-cheese'],
  ['collard-greens-with-turkey-meat', 'collard-greens-with-turkey-meat'],
  ['preva-yams', 'preva-yams'],
  ['fries', 'fries'],
  ['rice-and-peas', 'rice-peas'],
  ['fried-plantains', 'fried-plantains'],
  ['steamed-cabbage', 'steamed-cabbage'],
  ['red-wine-poached-pear', 'red-wine-poached-pear']
];

const SOURCE_IMAGE_OVERRIDES = {
  'preva-burger': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'preva-wings': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'preva-wings-chilli': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp'
};

const NAMED_ENTITIES = {
  amp: '&', apos: "'", quot: '"', nbsp: ' ', lt: '<', gt: '>',
  '#039': "'", '#8211': '–', '#8212': '—', '#8216': '‘', '#8217': '’'
};

function decodeHtml(value = '') {
  return String(value).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, key) => {
    const normalized = key.toLowerCase();
    if (normalized.startsWith('#x')) return String.fromCodePoint(parseInt(normalized.slice(2), 16));
    if (normalized.startsWith('#')) return String.fromCodePoint(parseInt(normalized.slice(1), 10));
    return NAMED_ENTITIES[normalized] ?? entity;
  });
}

function plainText(value = '') {
  return decodeHtml(String(value).replace(/<[^>]+>/g, ' '))
    .replace(/\\?u0026/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'PrevaKitchenContentSync/1.0' },
        signal: AbortSignal.timeout(45000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Could not fetch ${url}: ${lastError?.message || 'unknown error'}`);
}

function extractFaqs(html) {
  const scripts = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const schema = JSON.parse(match[1]);
      const graph = Array.isArray(schema?.['@graph']) ? schema['@graph'] : [schema];
      const faqPage = graph.find((node) => {
        const types = Array.isArray(node?.['@type']) ? node['@type'] : [node?.['@type']];
        return types.includes('FAQPage') && Array.isArray(node?.mainEntity);
      });
      if (!faqPage) continue;
      const faqs = faqPage.mainEntity.map((item) => ({
        q: plainText(item?.name),
        a: plainText(item?.acceptedAnswer?.text)
      })).filter((item) => item.q && item.a);
      if (faqs.length) return faqs;
    } catch {
      // Some WordPress plugins emit non-JSON script tags; inspect the next one.
    }
  }
  return [];
}

function extractAbout(html) {
  const section = html.match(/<section[^>]*class=["'][^"']*pk-about[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1];
  if (!section) return null;
  const title = plainText(section.match(/<h2[^>]*class=["'][^"']*pk-about-title[^"']*["'][^>]*>([\s\S]*?)<\/h2>/i)?.[1]);
  const paragraphs = [...section.matchAll(/<p[^>]*class=["'][^"']*pk-about-par[^"']*["'][^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => plainText(match[1]))
    .filter(Boolean);
  return title && paragraphs.length ? { title, paragraphs } : null;
}

async function readSource([sourceSlug, shopSlug]) {
  const sourceUrl = `${SOURCE_ROOT}/${sourceSlug}/`;
  const html = await fetchWithRetry(sourceUrl);
  const faqs = extractFaqs(html);
  if (faqs.length !== 0 && faqs.length !== 5) {
    throw new Error(`${sourceSlug} returned an incomplete set of ${faqs.length} FAQs.`);
  }
  return { sourceSlug, shopSlug, sourceUrl, faqs, about: extractAbout(html) };
}

const snapshots = [];
for (let index = 0; index < SOURCE_PRODUCTS.length; index += 5) {
  snapshots.push(...await Promise.all(SOURCE_PRODUCTS.slice(index, index + 5).map(readSource)));
}

const { col } = await import('../src/lib/db.js');
const menuItems = await col('menuItems');
const now = new Date();
let aboutCount = 0;
let faqCount = 0;
let faqFallbackCount = 0;

for (const snapshot of snapshots) {
  const update = {
    detailContentSource: snapshot.sourceUrl,
    detailContentSyncedAt: now,
    updatedAt: now
  };
  if (SOURCE_IMAGE_OVERRIDES[snapshot.shopSlug]) {
    update.image = SOURCE_IMAGE_OVERRIDES[snapshot.shopSlug];
  }
  if (snapshot.faqs.length === 5) {
    update.faqs = snapshot.faqs;
    faqCount += 1;
  } else {
    faqFallbackCount += 1;
  }
  if (snapshot.about) {
    update.aboutTitle = snapshot.about.title;
    update.aboutContent = snapshot.about.paragraphs.join('\n\n');
    aboutCount += 1;
  }
  const result = await menuItems.updateOne({ slug: snapshot.shopSlug }, { $set: update });
  if (!result.matchedCount) throw new Error(`Shop product not found for slug: ${snapshot.shopSlug}`);
}

console.log(`Synced exact source FAQs for ${faqCount} products and source About copy for ${aboutCount} products; preserved ${faqFallbackCount} validated FAQ fallback.`);
process.exit(0);
