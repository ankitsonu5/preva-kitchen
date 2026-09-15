// Resolves paths into frontend/src relative to this helpers directory, so
// tests work regardless of the shell's current working directory.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const FRONTEND_ROOT = path.resolve(HERE, '..', '..');
export const SRC_ROOT = path.join(FRONTEND_ROOT, 'src');

export function srcPath(...segments) {
  return path.join(SRC_ROOT, ...segments);
}
