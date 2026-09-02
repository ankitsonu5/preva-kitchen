import './env.js';
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const migrationScriptPath = fileURLToPath(import.meta.url);
const scriptDirectory = path.dirname(migrationScriptPath);
const repositoryRoot = path.resolve(scriptDirectory, '..', '..');
const assetRoot = path.join(repositoryRoot, 'frontend', 'public', 'asset', 'prevaclub');
const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/preva';
const client = new MongoClient(mongoUri);

const imagePatternSource = String.raw`https?:\/\/(?:www\.)?prevaclub\.com\/[^\s"'<>\\)]+?\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?[^\s"'<>\\)]*)?`;
const imagePattern = () => new RegExp(imagePatternSource, 'gi');
const textExtensions = new Set(['.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.html', '.md']);
const skippedDirectories = new Set(['.git', 'node_modules']);
const unavailableSourceFallbacks = new Map([
  [
    'https://prevaclub.com/wp-content/uploads/2024/09/preva-logo.png',
    {
      diskPath: path.join(repositoryRoot, 'frontend', 'public', 'asset', 'preva-logo.png'),
      publicUrl: '/asset/preva-logo.png',
      filename: 'preva-logo.png'
    }
  ],
  [
    'https://prevaclub.com/wp-content/uploads/2026/01/Preva_Interior_HighRes-6.jpg',
    {
      diskPath: path.join(repositoryRoot, 'frontend', 'public', 'asset', 'home-reference', 'preva-restaurant-hero.png'),
      publicUrl: '/asset/home-reference/preva-restaurant-hero.png',
      filename: 'preva-restaurant-hero.png'
    }
  ]
]);

function cleanRemoteUrl(value) {
  return String(value).replace(/&amp;/gi, '&');
}

function localAssetFor(remoteUrl) {
  const parsed = new URL(cleanRemoteUrl(remoteUrl));
  const segments = decodeURIComponent(parsed.pathname)
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/[<>:"|?*]/g, '-'));
  const diskPath = path.join(assetRoot, ...segments);
  const publicUrl = `/asset/prevaclub/${segments.map(encodeURIComponent).join('/')}`;
  return { diskPath, publicUrl, filename: segments.at(-1) || 'image' };
}

function collectImageUrls(value, output) {
  if (typeof value === 'string') {
    for (const match of value.matchAll(imagePattern())) output.add(cleanRemoteUrl(match[0]));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, output);
    return;
  }
  if (!value || value.constructor !== Object) return;
  for (const item of Object.values(value)) collectImageUrls(item, output);
}

function replaceImageUrls(value, availableAssets, changed) {
  if (typeof value === 'string') {
    return value.replace(imagePattern(), (match) => {
      const asset = availableAssets.get(cleanRemoteUrl(match));
      if (!asset) return match;
      changed.value = true;
      return asset.publicUrl;
    });
  }
  if (Array.isArray(value)) return value.map((item) => replaceImageUrls(item, availableAssets, changed));
  if (!value || value.constructor !== Object) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, replaceImageUrls(item, availableAssets, changed)])
  );
}

async function sourceFiles(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && (skippedDirectories.has(entry.name) || entry.name.startsWith('.next'))) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (fullPath.startsWith(assetRoot)) continue;
      await sourceFiles(fullPath, output);
    } else if (fullPath !== migrationScriptPath && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(fullPath);
    }
  }
  return output;
}

async function fileExists(filename) {
  try {
    return (await stat(filename)).size > 0;
  } catch {
    return false;
  }
}

async function downloadImage(remoteUrl, asset) {
  if (await fileExists(asset.diskPath)) return { ok: true, reused: true };
  await mkdir(path.dirname(asset.diskPath), { recursive: true });
  const response = await fetch(remoteUrl, {
    headers: { accept: 'image/*', 'user-agent': 'Preva-Kitchen-Asset-Migration/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) throw new Error(`unexpected ${contentType || 'content type'}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('empty response');
  const temporaryPath = `${asset.diskPath}.download`;
  await writeFile(temporaryPath, bytes);
  try {
    await rename(temporaryPath, asset.diskPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  return { ok: true, reused: false };
}

function titleFromFilename(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function mimeTypeFor(filename) {
  const extension = path.extname(filename).toLowerCase();
  return ({
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml'
  })[extension] || 'application/octet-stream';
}

const files = await sourceFiles(repositoryRoot);
const remoteUrls = new Set();
const fileContents = new Map();

for (const filename of files) {
  const content = await readFile(filename, 'utf8');
  fileContents.set(filename, content);
  collectImageUrls(content, remoteUrls);
}

await client.connect();

try {
  const db = client.db(process.env.MONGODB_DB || undefined);
  const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray()).map((item) => item.name);
  const documentsByCollection = new Map();

  for (const name of collectionNames) {
    const documents = await db.collection(name).find({}).toArray();
    documentsByCollection.set(name, documents);
    for (const document of documents) collectImageUrls(document, remoteUrls);
  }

  const assetsByRemoteUrl = new Map(
    [...remoteUrls].map((remoteUrl) => [remoteUrl, localAssetFor(remoteUrl)])
  );
  const availableAssets = new Map();
  let downloaded = 0;
  let reused = 0;
  const failures = [];
  for (const remoteUrl of remoteUrls) {
    const fallback = unavailableSourceFallbacks.get(remoteUrl);
    if (fallback && await fileExists(fallback.diskPath)) {
      availableAssets.set(remoteUrl, fallback);
      reused += 1;
    }
  }
  const entries = [...assetsByRemoteUrl.entries()].filter(([remoteUrl]) => !availableAssets.has(remoteUrl));

  console.log(`Found ${remoteUrls.size} unique prevaclub image URLs.`);
  for (let index = 0; index < entries.length; index += 6) {
    const batch = entries.slice(index, index + 6);
    await Promise.all(batch.map(async ([remoteUrl, asset]) => {
      try {
        const result = await downloadImage(remoteUrl, asset);
        availableAssets.set(remoteUrl, asset);
        if (result.reused) reused += 1;
        else downloaded += 1;
      } catch (error) {
        failures.push({ remoteUrl, message: error.message });
      }
    }));
    console.log(`Processed ${Math.min(index + batch.length, entries.length)}/${entries.length} images.`);
  }

  let changedFiles = 0;
  for (const [filename, content] of fileContents) {
    const changed = { value: false };
    const next = replaceImageUrls(content, availableAssets, changed);
    if (changed.value && next !== content) {
      await writeFile(filename, next, 'utf8');
      changedFiles += 1;
    }
  }

  let changedDocuments = 0;
  for (const [name, documents] of documentsByCollection) {
    const collection = db.collection(name);
    for (const document of documents) {
      const changed = { value: false };
      const next = replaceImageUrls(document, availableAssets, changed);
      if (!changed.value) continue;
      const { _id, ...fields } = next;
      await collection.updateOne({ _id: document._id }, { $set: fields });
      changedDocuments += 1;
    }
  }

  const media = db.collection('media');
  let registeredMedia = 0;
  for (const asset of new Map([...availableAssets.values()].map((item) => [item.publicUrl, item])).values()) {
    const existing = await media.findOne({ url: asset.publicUrl });
    if (existing) continue;
    const details = await stat(asset.diskPath);
    const now = new Date();
    await media.insertOne({
      filename: asset.filename,
      title: titleFromFilename(asset.filename),
      altText: titleFromFilename(asset.filename),
      caption: 'Migrated Preva Kitchen image',
      description: 'Local Preva Kitchen website asset',
      mimeType: mimeTypeFor(asset.filename),
      size: details.size,
      fileSize: details.size,
      url: asset.publicUrl,
      importedAsset: true,
      createdAt: now,
      updatedAt: now
    });
    registeredMedia += 1;
  }

  console.log(JSON.stringify({
    discovered: remoteUrls.size,
    downloaded,
    reused,
    failed: failures.length,
    changedFiles,
    changedDocuments,
    registeredMedia
  }, null, 2));

  if (failures.length) {
    for (const failure of failures) console.error(`${failure.remoteUrl} - ${failure.message}`);
    process.exitCode = 1;
  }
} finally {
  await client.close();
}
