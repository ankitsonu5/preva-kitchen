// Shared assertions for "does this page's metadata object satisfy the SEO
// guardrail rules". One place to update the rules; every page-level test
// applies the same checks instead of re-deriving them per file.
//
// These assertions operate on the actual Next.js Metadata object shape
// produced by `pageMetadata()` (frontend/src/lib/seo.js) — title,
// description, alternates.canonical, openGraph, twitter, robots.

import { expect } from 'vitest';

const ROOT_PATH = '/';

/**
 * A canonical `path` (as stored in metadata.alternates.canonical BEFORE
 * Next's metadataBase resolves it to an absolute URL — see seo.js) must be
 * root-relative, have no query string, and no trailing slash except "/".
 */
export function assertValidCanonicalPath(canonicalPath, { label = 'page' } = {}) {
  expect(canonicalPath, `${label}: missing alternates.canonical`).toBeTruthy();
  expect(typeof canonicalPath, `${label}: canonical must be a string`).toBe('string');
  expect(canonicalPath.startsWith('/'), `${label}: canonical "${canonicalPath}" must start with "/"`).toBe(true);
  expect(canonicalPath.includes('?'), `${label}: canonical "${canonicalPath}" must not contain a query string`).toBe(false);
  if (canonicalPath !== ROOT_PATH) {
    expect(canonicalPath.endsWith('/'), `${label}: canonical "${canonicalPath}" must not have a trailing slash`).toBe(false);
  }
}

/**
 * A resolved absolute URL (e.g. after new URL(path, origin)) must be https
 * and must never point at localhost / a private host.
 */
export function assertValidAbsoluteUrl(url, { label = 'url' } = {}) {
  expect(url, `${label}: missing URL`).toBeTruthy();
  let parsed;
  expect(() => { parsed = new URL(url); }, `${label}: "${url}" is not a valid absolute URL`).not.toThrow();
  expect(parsed.protocol, `${label}: "${url}" must use https:`).toBe('https:');
  expect(
    isLocalOrPrivateHost(parsed.hostname),
    `${label}: "${url}" resolves to a localhost/private host (${parsed.hostname})`
  ).toBe(false);
}

export function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  if (!host) return true;
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.localhost')) return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true;
  const private172 = host.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;
  return false;
}

/**
 * Full guardrail check for a page that SHOULD be indexed: title, description,
 * canonical, robots index:true, and OG/Twitter presence.
 */
export function assertIndexableMetadata(metadata, { label = 'page' } = {}) {
  expect(metadata, `${label}: metadata object is missing`).toBeTruthy();

  expect(metadata.title, `${label}: missing title`).toBeTruthy();
  expect(String(metadata.title).trim().length, `${label}: title is empty`).toBeGreaterThan(0);

  expect(metadata.description, `${label}: missing meta description`).toBeTruthy();
  expect(
    String(metadata.description).trim().length,
    `${label}: description is too short to be useful (<20 chars)`
  ).toBeGreaterThan(20);

  assertValidCanonicalPath(metadata.alternates?.canonical, { label });

  expect(metadata.robots?.index, `${label}: expected robots.index === true (page should be indexable)`).toBe(true);
  expect(metadata.robots?.follow, `${label}: expected robots.follow === true`).toBe(true);

  expect(metadata.openGraph?.title, `${label}: missing openGraph.title`).toBeTruthy();
  expect(metadata.openGraph?.description, `${label}: missing openGraph.description`).toBeTruthy();
  expect(metadata.openGraph?.url, `${label}: missing openGraph.url`).toBeTruthy();

  expect(metadata.twitter?.card, `${label}: missing twitter.card`).toBeTruthy();
  expect(metadata.twitter?.title, `${label}: missing twitter.title`).toBeTruthy();
  expect(metadata.twitter?.description, `${label}: missing twitter.description`).toBeTruthy();
}

/**
 * Guardrail check for a page that SHOULD NOT be indexed (checkout, order
 * tracker, preview): robots must explicitly disable index+follow.
 */
export function assertNoIndexMetadata(metadata, { label = 'page' } = {}) {
  expect(metadata, `${label}: metadata object is missing`).toBeTruthy();
  expect(metadata.robots?.index, `${label}: expected robots.index === false`).toBe(false);
  expect(metadata.robots?.follow, `${label}: expected robots.follow === false`).toBe(false);
}

/**
 * Given a list of { label, metadata } entries, assert no two indexable pages
 * share an exact title (weak duplicate-title check — exact string match only,
 * on purpose: titles that merely share a brand suffix are fine).
 */
export function assertNoDuplicateTitles(entries) {
  const seen = new Map();
  for (const { label, metadata } of entries) {
    const title = metadata?.title;
    if (!title) continue;
    const existing = seen.get(title);
    expect(existing, `Duplicate title "${title}" used by both "${existing}" and "${label}"`).toBeUndefined();
    seen.set(title, label);
  }
}

/** Assert a JSON-LD object serializes and round-trips cleanly. */
export function assertValidJsonLd(schema, { label = 'schema' } = {}) {
  expect(schema, `${label}: schema is null/undefined`).toBeTruthy();
  let json;
  expect(() => { json = JSON.stringify(schema); }, `${label}: JSON.stringify threw`).not.toThrow();
  expect(json, `${label}: serialized to empty JSON`).toBeTruthy();
  let parsed;
  expect(() => { parsed = JSON.parse(json); }, `${label}: JSON.parse threw on serialized schema`).not.toThrow();
  return parsed;
}

/**
 * Assert every node in a JSON-LD graph that represents the sitewide
 * Restaurant entity uses the canonical `${origin}/#restaurant` @id, per the
 * Batch 4 "duplicate entity" bug (see SEO_GUARDRAILS.md). Pass the graph
 * array (schema['@graph']) and the expected origin.
 */
export function assertRestaurantIdConsistency(graphNodes, origin, { label = 'schema' } = {}) {
  const restaurantNodes = (graphNodes || []).filter((n) => n && n['@type'] === 'Restaurant');
  for (const node of restaurantNodes) {
    expect(node['@id'], `${label}: Restaurant node missing @id`).toBeTruthy();
    expect(
      node['@id'],
      `${label}: Restaurant @id must reference the sitewide entity "${origin}/#restaurant", not invent a new one`
    ).toBe(`${origin}/#restaurant`);
  }
}
