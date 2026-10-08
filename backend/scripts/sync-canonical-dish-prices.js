/**
 * Align the surviving (canonical) dish rows with the prices and names on the
 * live prevaclub.com menu. The old duplicate rows (preva-lamb-chops, ...) are
 * hidden from listings and 301-redirect to these slugs, so these are the rows
 * customers actually see.
 *
 *   node scripts/sync-canonical-dish-prices.js           # dry run, prints the diff
 *   node scripts/sync-canonical-dish-prices.js --apply   # writes the changes
 */
import './env.js';
import { MongoClient } from 'mongodb';

const TARGETS = [
  { slug: 'lamb-chops', name: 'Preva Lamb Chops', priceCents: 3350 },
  { slug: 'lobster-bites', name: 'Preva Lobster', priceCents: 2150 },
  { slug: 'steak-bites', name: 'Preva Steak Bites', priceCents: 1950 },
  { slug: 'mac-and-cheese', name: 'Preva Mac and Cheese', priceCents: 750 },
  { slug: 'collard-greens-turkey', name: 'Collard Greens with Turkey Meat', priceCents: 750 },
  { slug: 'yams', name: 'Preva Yams', priceCents: 750 }
];

// Each canonical row takes its page copy (description, About, FAQs) from the
// duplicate row that was written from the live prevaclub.com page, so the text
// carries the live name and price instead of the old ones.
const COPY_FROM = {
  'lamb-chops': 'preva-lamb-chops',
  'lobster-bites': 'preva-lobster',
  'steak-bites': 'preva-steak-bites',
  'mac-and-cheese': 'preva-mac-and-cheese',
  'collard-greens-turkey': 'collard-greens-with-turkey-meat',
  'yams': 'preva-yams'
};
const COPY_FIELDS = ['description', 'aboutTitle', 'aboutContent', 'faqs', 'pairings', 'allergens', 'servings'];

// Dishes that are not on the live prevaclub.com menu. They are taken off the
// shop (orderable: false); the rows are kept so this can be undone.
const HIDE = ['oxtail-quesadilla', 'rice-and-black-beans'];

const apply = process.argv.includes('--apply');
const uri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
if (!uri) throw new Error('MONGODB_URI is required.');

const client = new MongoClient(uri);
await client.connect();
try {
  const items = client.db(process.env.MONGODB_DB || undefined).collection('menuItems');
  for (const target of TARGETS) {
    const row = await items.findOne({ slug: target.slug });
    if (!row) { console.log(`MISSING  ${target.slug}`); continue; }
    const price = `$${(target.priceCents / 100).toFixed(2)}`;
    console.log(`${target.slug}: "${row.name}" ${row.price || row.priceCents} -> "${target.name}" ${price}`);
    const source = await items.findOne({ slug: COPY_FROM[target.slug] });
    const copy = {};
    if (source) for (const field of COPY_FIELDS) if (source[field] !== undefined) copy[field] = source[field];
    console.log(`  copy ${Object.keys(copy).length} content fields from ${COPY_FROM[target.slug]}${source ? '' : ' (NOT FOUND)'}`);
    if (apply) {
      await items.updateOne(
        { _id: row._id },
        { $set: { name: target.name, priceCents: target.priceCents, price, ...copy, updatedAt: new Date() } }
      );
    }
  }
  for (const slug of HIDE) {
    const row = await items.findOne({ slug });
    console.log(`${slug}: ${row ? `orderable ${row.orderable} -> false` : 'MISSING'}`);
    if (apply && row) await items.updateOne({ _id: row._id }, { $set: { orderable: false, updatedAt: new Date() } });
  }
  console.log(apply ? 'Applied.' : 'Dry run only. Re-run with --apply to write.');
} finally {
  await client.close();
}
