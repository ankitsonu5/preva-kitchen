export const DEFAULT_SITE_ORIGIN = 'https://prevakitchen.com';

function isPrivateOrLocalHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0' || host.endsWith('.localhost')) return true;
  if (/^127(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^10(?:\.\d{1,3}){3}$/.test(host)) return true;
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(host)) return true;

  const private172 = host.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/);
  return Boolean(private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31);
}

function publicOrigin(value) {
  if (!value) return null;

  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol) || isPrivateOrLocalHost(url.hostname)) return null;
    return url.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

/**
 * Canonicals must never inherit a localhost/private URL accidentally saved in
 * CMS settings or deployment variables. Explicit public environment values
 * win, followed by a validated CMS candidate and the production domain.
 */
export function getCanonicalOrigin(...candidates) {
  return (
    publicOrigin(process.env.NEXT_PUBLIC_CANONICAL_URL) ||
    publicOrigin(process.env.NEXT_PUBLIC_SITE_URL) ||
    candidates.map(publicOrigin).find(Boolean) ||
    DEFAULT_SITE_ORIGIN
  );
}

export function canonicalUrl(path = '/', ...candidates) {
  return new URL(path, `${getCanonicalOrigin(...candidates)}/`).toString();
}
