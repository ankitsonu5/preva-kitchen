/**
 * Save each dish's own Uber Eats / DoorDash / Grubhub item link, so "Buy Now"
 * opens that dish on the app instead of the whole restaurant page.
 * Fill scripts/dish-delivery-links.json first (blank entries are skipped).
 *
 *   node scripts/set-dish-delivery-links.js           # dry run
 *   node scripts/set-dish-delivery-links.js --apply   # writes
 */
import './env.js';
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

const apply = process.argv.includes('--apply');
const file = new URL('./dish-delivery-links.json', import.meta.url);
const links = JSON.parse(fs.readFileSync(file, 'utf8'));

const FIELDS = { uberEats: 'uberEatsUrl', doorDash: 'doorDashUrl', grubhub: 'grubhubUrl' };
const HOSTS = { uberEats: /(^|\.)(order\.store|ubereats\.com)$/i, doorDash: /(^|\.)doordash\.com$/i, grubhub: /(^|\.)grubhub\.com$/i };

const client = new MongoClient(String(process.env.MONGODB_URI || '').trim());
await client.connect();
try {
  const items = client.db(process.env.MONGODB_DB || undefined).collection('menuItems');
  for (const [slug, entry] of Object.entries(links)) {
    if (slug.startsWith('_')) continue;
    const set = {};
    for (const [key, field] of Object.entries(FIELDS)) {
      const value = String(entry[key] || '').trim();
      if (!value) continue;
      let host = '';
      try { host = new URL(value).hostname; } catch { /* invalid */ }
      if (!HOSTS[key].test(host)) { console.log(`SKIP ${slug}.${key}: not a valid ${key} link`); continue; }
      set[field] = value;
    }
    if (!Object.keys(set).length) continue;
    const row = await items.findOne({ slug });
    if (!row) { console.log(`MISSING ${slug}`); continue; }
    console.log(`${slug}: ${Object.keys(set).join(', ')}`);
    if (apply) await items.updateOne({ _id: row._id }, { $set: { ...set, updatedAt: new Date() } });
  }
  console.log(apply ? 'Applied.' : 'Dry run only. Re-run with --apply to write.');
} finally {
  await client.close();
}
