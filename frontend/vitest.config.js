// Vitest config for the SEO guardrail test suite (Batch 6 SEO/QA audit).
//
// Scope: these are logic/static-level tests, not a full app test harness.
// They import pure lib modules (src/lib/seo.js, seo-schema.js, site-url.js,
// sitemap.js) directly and validate metadata/JSON-LD produced from real page
// source files via lightweight source extraction (see tests/helpers). No
// browser, no Next.js dev server, no React render tree is required.
import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Some lib modules (src/lib/cms.js, src/lib/career-api.js) throw at import
// time when NODE_ENV=production and BACKEND_URL is unset — a safety check
// meant for real production boots, not test runs. Tests that need those
// modules mock them with vi.mock(); this is a defensive fallback in case a
// module is ever imported unmocked.
process.env.NODE_ENV = 'test';
process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    passWithNoTests: false
  }
});
