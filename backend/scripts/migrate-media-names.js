import './env.js';
import { MongoClient } from 'mongodb';
import slugify from 'slugify';

/**
 * Give older uploads a readable URL: /api/media/<id> -> /api/media/<name>.webp
 * and rewrite every reference to the old URL across the database.
 *
 * Dry run by default — prints what would change. Pass --apply to write.
 * The old id URLs keep working afterwards, so nothing breaks mid-way.
 */
const apply = process.argv.includes('--apply');
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(mongoUri);

const MEDIA_EXTENSIONS = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/ogg': 'ogg'
};
const slug = (value) => slugify(String(value || ''), { lower: true, strict: true });
const idUrlPattern = () => /\/api\/media\/([a-f0-9]{24})(?![a-z0-9])/gi;

function isPlain(value) {
  if (Array.isArray(value)) return true;
  if (!value || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Returns the rewritten value, or the same reference when nothing changed.
function rewrite(value, names) {
  if (typeof value === 'string') {
    return value.replace(idUrlPattern(), (match, id) => (names.has(id.toLowerCase()) ? `/api/media/${names.get(id.toLowerCase())}` : match));
  }
  if (!isPlain(value)) return value;
  let changed = false;
  const copy = Array.isArray(value) ? [] : {};
  for (const [key, item] of Object.entries(value)) {
    const next = rewrite(item, names);
    if (next !== item) changed = true;
    copy[key] = next;
  }
  return changed ? copy : value;
}

async function main() {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || undefined);
  const media = db.collection('media');
  console.log(`Database: ${db.databaseName}  Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

  const rows = await media.find({}, { projection: { data: 0 } }).toArray();
  const taken = new Set(rows.map((row) => row.slug).filter(Boolean));
  const names = new Map();
  for (const row of rows) {
    if (row.slug || !String(row.url || '').startsWith('/api/media/')) continue;
    const ext = MEDIA_EXTENSIONS[row.mimeType] || String(row.filename || '').split('.').pop().toLowerCase() || 'bin';
    const base = slug(String(row.filename || row.title || '').replace(/\.[^.]+$/, '')) || 'media';
    let name = `${base}.${ext}`;
    for (let n = 2; taken.has(name); n += 1) name = `${base}-${n}.${ext}`;
    taken.add(name);
    names.set(String(row._id).toLowerCase(), name);
  }

  console.log(`Media to rename: ${names.size}`);
  for (const [id, name] of names) console.log(`  /api/media/${id} -> /api/media/${name}`);

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((item) => item.name)
    .filter((name) => name !== 'media' && !name.startsWith('system.'));

  let referenceCount = 0;
  for (const name of collections) {
    const collection = db.collection(name);
    for await (const doc of collection.find({})) {
      const set = {};
      for (const [key, value] of Object.entries(doc)) {
        if (key === '_id') continue;
        const next = rewrite(value, names);
        if (next !== value) set[key] = next;
      }
      const fields = Object.keys(set);
      if (!fields.length) continue;
      referenceCount += 1;
      console.log(`  ${name} ${doc._id} ${doc.slug || doc.title || doc.name || ''} [${fields.join(', ')}]`);
      if (apply) await collection.updateOne({ _id: doc._id }, { $set: set });
    }
  }
  console.log(`\nDocuments referencing old URLs: ${referenceCount}`);

  if (apply) {
    for (const row of rows) {
      const name = names.get(String(row._id).toLowerCase());
      if (name) await media.updateOne({ _id: row._id }, { $set: { slug: name, url: `/api/media/${name}` } });
    }
    console.log('Done.');
  } else {
    console.log('Dry run only. Re-run with --apply to write these changes.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.close());
