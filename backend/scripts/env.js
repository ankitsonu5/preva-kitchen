import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

/**
 * Load configuration the same way Next does.
 *
 * `import 'dotenv/config'` reads .env and nothing else, but Next reads
 * .env.local first and treats it as the higher priority. A script that only
 * looked at .env would silently connect to the wrong database — falling back
 * to localhost while the app itself talks to Atlas — and the failure would
 * look like "my data disappeared" rather than "wrong connection string".
 *
 * Later files do not overwrite values already set, which matches Next's order.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const files = process.env.NODE_ENV === 'production' ? ['.env'] : ['.env.local', '.env'];

for (const file of files) {
  const full = path.join(root, file);
  if (existsSync(full)) dotenv.config({ path: full });
}
