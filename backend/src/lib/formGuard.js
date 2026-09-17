/**
 * Shared spam / abuse guards for public form endpoints (reservations, contact,
 * career applications). Single Express process on a VPS, so an in-memory Map
 * is enough — no Redis needed at this volume, and it never survives a
 * restart, which is fine for a sliding rate-limit window.
 */

import { tooManyRequests } from '../router.js';

const HONEYPOT_FIELD = 'hp_field';

/** Silently true when a bot filled the hidden trap field a real visitor never sees. */
export function isHoneypotTripped(body) {
  return Boolean(String(body?.[HONEYPOT_FIELD] ?? '').trim());
}

const rateBuckets = new Map(); // key -> array of request timestamps (ms)

/** Throws 429 once an IP exceeds `max` submissions to `routeKey` within `windowMs`. */
export function enforceRateLimit(routeKey, ip, { max = 5, windowMs = 15 * 60 * 1000 } = {}) {
  const key = `${routeKey}:${ip || 'unknown'}`;
  const now = Date.now();
  const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) throw tooManyRequests('Too many submissions from this address. Please try again later.');
  hits.push(now);
  rateBuckets.set(key, hits);
}

const idempotencyCache = new Map(); // key -> { response, expiresAt }
const IDEMPOTENCY_WINDOW_MS = 20 * 1000;

/**
 * Returns the cached response for an identical (ip + form + payload) submission
 * made in the last 20s — guards against double-click / client retry re-inserting
 * the same enquiry and sending duplicate emails.
 */
export function getIdempotentResponse(routeKey, ip, payload) {
  const key = `${routeKey}:${ip || 'unknown'}:${JSON.stringify(payload)}`;
  const cached = idempotencyCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.response;
  return null;
}

export function rememberIdempotentResponse(routeKey, ip, payload, response) {
  const key = `${routeKey}:${ip || 'unknown'}:${JSON.stringify(payload)}`;
  idempotencyCache.set(key, { response, expiresAt: Date.now() + IDEMPOTENCY_WINDOW_MS });
}

// Periodic sweep so both maps never grow unbounded on a long-running process.
setInterval(() => {
  const now = Date.now();
  for (const [key, hits] of rateBuckets) {
    const fresh = hits.filter((t) => now - t < 15 * 60 * 1000);
    if (fresh.length) rateBuckets.set(key, fresh);
    else rateBuckets.delete(key);
  }
  for (const [key, entry] of idempotencyCache) {
    if (entry.expiresAt <= now) idempotencyCache.delete(key);
  }
}, 60 * 1000).unref();
