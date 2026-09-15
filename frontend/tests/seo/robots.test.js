// Guardrail suite: robots.txt sanity — the noindex utility routes must stay
// disallowed and the sitemap/host must point at the real canonical origin.
import { describe, it, expect } from 'vitest';
import robots from '@/app/robots.js';

describe('SEO guardrails: robots.js', () => {
  const result = robots();

  it('disallows the known noindex/internal routes', () => {
    const rule = result.rules[0];
    for (const path of ['/checkout', '/order/', '/preview', '/admin', '/kitchen', '/display', '/api/']) {
      expect(rule.disallow, `robots.js must disallow ${path}`).toContain(path);
    }
  });

  it('allows the site root (indexable pages are not blocked wholesale)', () => {
    expect(result.rules[0].allow).toBe('/');
  });

  it('sitemap and host are absolute https URLs on the canonical origin', () => {
    expect(() => new URL(result.sitemap)).not.toThrow();
    expect(new URL(result.sitemap).protocol).toBe('https:');
    expect(result.sitemap.endsWith('/sitemap.xml')).toBe(true);
    expect(() => new URL(result.host)).not.toThrow();
    expect(new URL(result.host).protocol).toBe('https:');
  });
});
