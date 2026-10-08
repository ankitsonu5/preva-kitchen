/**
 * The standalone "Preva Burger" is not on our menu, but some dishes' FAQ and
 * About copy still suggest it as a pairing. Point those mentions at the
 * Preva Double Smash Burger instead.
 *
 *   node scripts/remove-preva-burger-mentions.js           # dry run
 *   node scripts/remove-preva-burger-mentions.js --apply   # writes
 */
import './env.js';
import { MongoClient } from 'mongodb';

const apply = process.argv.includes('--apply');
const DOUBLE = 'Preva Double Smash Burger';

function fix(text) {
  return String(text)
    .replace(/Preva Burger, Preva Double Smash Burger/g, DOUBLE)
    .replace(/, Preva Burger and Preva Double Smash Burger/g, ` and ${DOUBLE}`)
    .replace(/Preva Burger(?! section)/g, DOUBLE);
}

const client = new MongoClient(String(process.env.MONGODB_URI || '').trim());
await client.connect();
try {
  const items = client.db(process.env.MONGODB_DB || undefined).collection('menuItems');
  for (const row of await items.find({}).toArray()) {
    if (row.slug === 'preva-burger') { console.log('NOTE: a preva-burger row exists'); continue; }
    const set = {};
    if (typeof row.aboutContent === 'string' && fix(row.aboutContent) !== row.aboutContent) set.aboutContent = fix(row.aboutContent);
    if (typeof row.description === 'string' && fix(row.description) !== row.description) set.description = fix(row.description);
    if (Array.isArray(row.faqs)) {
      const faqs = row.faqs.map((faq) => ({ ...faq, q: fix(faq.q), a: fix(faq.a) }));
      if (JSON.stringify(faqs) !== JSON.stringify(row.faqs)) set.faqs = faqs;
    }
    if (Array.isArray(row.pairings) && row.pairings.includes('Preva Burger')) {
      set.pairings = [...new Set(row.pairings.map((name) => (name === 'Preva Burger' ? DOUBLE : name)))];
    }
    if (!Object.keys(set).length) continue;
    console.log(`${row.slug}: update ${Object.keys(set).join(', ')}`);
    for (const key of ['aboutContent', 'faqs']) {
      if (set[key]) console.log('   ', JSON.stringify(set[key]).match(/.{0,60}Double Smash Burger.{0,50}/)?.[0]);
    }
    if (apply) await items.updateOne({ _id: row._id }, { $set: { ...set, updatedAt: new Date() } });
  }
  console.log(apply ? 'Applied.' : 'Dry run only. Re-run with --apply to write.');
} finally {
  await client.close();
}
