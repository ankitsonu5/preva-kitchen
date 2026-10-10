import 'server-only';
import dns from 'node:dns';

/* ══════════════════════════════════════════════════════════════════════════
   Preva Kitchen - Form email validation
   Accepts only addresses whose domain can actually receive mail (has MX
   records), so made-up addresses like name@fakedomain123.com are rejected.
   ══════════════════════════════════════════════════════════════════════════ */

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;
const MISSING_DOMAIN_CODES = new Set(['ENOTFOUND', 'ENODATA', 'NXDOMAIN']);
const DNS_TIMEOUT_MS = 5000;

// Public resolvers first: some routers/ISP resolvers answer unknown domains with
// a slow EREFUSED instead of NXDOMAIN, which would let fake domains slip through.
const resolver = new dns.promises.Resolver({ timeout: 2000, tries: 1 });
resolver.setServers(['1.1.1.1', '8.8.8.8', ...dns.getServers()]);

export const INVALID_EMAIL_MESSAGE = 'Please enter a valid, working email address.';

export async function isValidEmail(email) {
  const value = String(email || '').trim();
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return false;

  const [local, domain] = value.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;

  try {
    const records = await Promise.race([
      resolver.resolveMx(domain.toLowerCase()),
      new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error('DNS timeout'), { code: 'ETIMEOUT' })), DNS_TIMEOUT_MS))
    ]);
    // A "null MX" (single record with an empty exchange) means the domain accepts no mail.
    return records.some((record) => record.exchange && record.exchange !== '.');
  } catch (err) {
    if (MISSING_DOMAIN_CODES.has(err.code)) return false;
    // DNS outage / timeout: don't block a real guest because our lookup failed.
    console.warn('[email-validation] MX lookup failed, allowing address:', err.code || err.message);
    return true;
  }
}
