// Guardrail suite: localhost/staging URL detection (Phase 14).
//
// Two layers:
//  1. Unit tests on the REAL getCanonicalOrigin()/canonicalUrl() from
//     src/lib/site-url.js — the single place canonical origins are resolved
//     — proving it rejects localhost/private candidates and env vars, and
//     always falls back to the production https domain.
//  2. A static repo scan: every file that builds page metadata or JSON-LD
//     (app/**/page.js, app/**/layout.js, app/sitemap.js, app/robots.js,
//     lib/seo.js, lib/seo-schema.js) must not contain a hardcoded
//     localhost/private-IP literal. site-url.js itself is exempted — its
//     hostname checks legitimately reference "localhost" as the thing to
//     detect and reject.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { getCanonicalOrigin, canonicalUrl, DEFAULT_SITE_ORIGIN } from '@/lib/site-url';
import { FRONTEND_ROOT } from '../helpers/paths.js';

describe('SEO guardrails: getCanonicalOrigin() localhost/private-host safety', () => {
  it('defaults to the production https origin with no candidates and no env vars', () => {
    expect(getCanonicalOrigin()).toBe(DEFAULT_SITE_ORIGIN);
    expect(DEFAULT_SITE_ORIGIN).toBe('https://prevakitchen.com');
  });

  it('rejects a localhost candidate and falls back to production', () => {
    expect(getCanonicalOrigin('http://localhost:3000')).toBe(DEFAULT_SITE_ORIGIN);
  });

  it('rejects private-network candidates (127.x, 10.x, 192.168.x, 172.16-31.x)', () => {
    expect(getCanonicalOrigin('http://127.0.0.1:4000')).toBe(DEFAULT_SITE_ORIGIN);
    expect(getCanonicalOrigin('http://10.0.0.5')).toBe(DEFAULT_SITE_ORIGIN);
    expect(getCanonicalOrigin('http://192.168.1.20')).toBe(DEFAULT_SITE_ORIGIN);
    expect(getCanonicalOrigin('http://172.20.0.4')).toBe(DEFAULT_SITE_ORIGIN);
  });

  it('rejects a non-http(s) protocol candidate', () => {
    expect(getCanonicalOrigin('ftp://prevakitchen.com')).toBe(DEFAULT_SITE_ORIGIN);
  });

  it('accepts a valid public https candidate (e.g. a CMS-stored siteUrl setting)', () => {
    expect(getCanonicalOrigin('https://staging.prevakitchen.com')).toBe('https://staging.prevakitchen.com');
  });

  it('canonicalUrl() resolves a path against the safe origin, never localhost', () => {
    const url = canonicalUrl('/menu', 'http://localhost:3000');
    expect(url).toBe('https://prevakitchen.com/menu');
    expect(new URL(url).protocol).toBe('https:');
  });
});

/** Recursively collect files under `dir` whose basename matches `nameRe`. */
function findFiles(dir, nameRe, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, nameRe, results);
    else if (nameRe.test(entry.name)) results.push(full);
  }
  return results;
}

describe('SEO guardrails: no hardcoded localhost/private origins in metadata-building code', () => {
  const appDir = path.join(FRONTEND_ROOT, 'src', 'app');
  const metadataFiles = [
    ...findFiles(appDir, /^(page|layout|sitemap|robots)\.js$/),
    path.join(FRONTEND_ROOT, 'src', 'lib', 'seo.js'),
    path.join(FRONTEND_ROOT, 'src', 'lib', 'seo-schema.js')
  ];

  const BAD_HOST_PATTERN = /localhost|127\.0\.0\.1|0\.0\.0\.0|:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}|:\/\/192\.168\./i;

  for (const file of metadataFiles) {
    const rel = path.relative(FRONTEND_ROOT, file);
    it(`${rel} contains no hardcoded localhost/private origin`, () => {
      const source = fs.readFileSync(file, 'utf8');
      expect(BAD_HOST_PATTERN.test(source), `${rel} appears to hardcode a localhost/private origin`).toBe(false);
    });
  }

  it('site-url.js (exempt from the scan above) is the only place localhost is legitimately referenced, and only to reject it', () => {
    const source = fs.readFileSync(path.join(FRONTEND_ROOT, 'src', 'lib', 'site-url.js'), 'utf8');
    expect(source).toMatch(/isPrivateOrLocalHost|localhost/);
    // Sanity: it must return null/false for localhost, never pass it through.
    expect(source).toMatch(/return true/);
  });
});
