// Guardrail suite: missing required business configuration (Phase 14).
//
// Guards against someone accidentally deleting/blanking a required NAP
// (Name/Address/Phone) field on BUSINESS_INFO in seo-schema.js, or breaking
// the production default in site-url.js — both would silently corrupt
// Restaurant/LocalBusiness JSON-LD and the sitewide canonical origin without
// throwing anywhere.
import { describe, it, expect } from 'vitest';
import { BUSINESS_INFO } from '@/lib/seo-schema';
import { DEFAULT_SITE_ORIGIN } from '@/lib/site-url';

function expectNonEmptyString(value, label) {
  expect(typeof value, `${label} must be a string`).toBe('string');
  expect(value.trim().length, `${label} must not be empty`).toBeGreaterThan(0);
}

describe('SEO guardrails: BUSINESS_INFO required NAP fields', () => {
  it('has non-empty top-level identity fields', () => {
    expectNonEmptyString(BUSINESS_INFO.name, 'BUSINESS_INFO.name');
    expectNonEmptyString(BUSINESS_INFO.legalName, 'BUSINESS_INFO.legalName');
    expectNonEmptyString(BUSINESS_INFO.url, 'BUSINESS_INFO.url');
    expectNonEmptyString(BUSINESS_INFO.logo, 'BUSINESS_INFO.logo');
    expectNonEmptyString(BUSINESS_INFO.image, 'BUSINESS_INFO.image');
    expectNonEmptyString(BUSINESS_INFO.telephone, 'BUSINESS_INFO.telephone');
    expectNonEmptyString(BUSINESS_INFO.email, 'BUSINESS_INFO.email');
    expectNonEmptyString(BUSINESS_INFO.priceRange, 'BUSINESS_INFO.priceRange');
  });

  it('url and logo/image are absolute https URLs', () => {
    for (const key of ['url', 'logo', 'image']) {
      const value = BUSINESS_INFO[key];
      expect(() => new URL(value), `BUSINESS_INFO.${key} "${value}" is not an absolute URL`).not.toThrow();
      expect(new URL(value).protocol, `BUSINESS_INFO.${key} must use https`).toBe('https:');
    }
  });

  it('telephone is E.164-ish (starts with +, digits only after)', () => {
    expect(BUSINESS_INFO.telephone).toMatch(/^\+1-\d{3}-\d{3}-\d{4}$/);
  });

  it('email looks like a valid address', () => {
    expect(BUSINESS_INFO.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('has a complete postal address', () => {
    const addr = BUSINESS_INFO.address;
    expect(addr, 'BUSINESS_INFO.address is missing').toBeTruthy();
    for (const field of ['streetAddress', 'addressLocality', 'addressRegion', 'postalCode', 'addressCountry']) {
      expectNonEmptyString(addr[field], `BUSINESS_INFO.address.${field}`);
    }
    expect(addr['@type']).toBe('PostalAddress');
  });

  it('has valid geo coordinates', () => {
    const geo = BUSINESS_INFO.geo;
    expect(geo, 'BUSINESS_INFO.geo is missing').toBeTruthy();
    expect(geo['@type']).toBe('GeoCoordinates');
    expect(Number.isFinite(Number(geo.latitude)), 'geo.latitude must be numeric').toBe(true);
    expect(Number.isFinite(Number(geo.longitude)), 'geo.longitude must be numeric').toBe(true);
    expect(Number(geo.latitude)).toBeGreaterThan(-90);
    expect(Number(geo.latitude)).toBeLessThan(90);
    expect(Number(geo.longitude)).toBeGreaterThan(-180);
    expect(Number(geo.longitude)).toBeLessThan(180);
  });

  it('has at least one opening-hours specification with day/open/close set', () => {
    expect(Array.isArray(BUSINESS_INFO.openingHoursSpecification)).toBe(true);
    expect(BUSINESS_INFO.openingHoursSpecification.length).toBeGreaterThan(0);
    for (const spec of BUSINESS_INFO.openingHoursSpecification) {
      expect(spec['@type']).toBe('OpeningHoursSpecification');
      expect(Array.isArray(spec.dayOfWeek) && spec.dayOfWeek.length > 0, 'dayOfWeek must be a non-empty array').toBe(true);
      expect(spec.opens).toMatch(/^\d{2}:\d{2}$/);
      expect(spec.closes).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('has at least one sameAs social profile URL', () => {
    expect(Array.isArray(BUSINESS_INFO.sameAs)).toBe(true);
    expect(BUSINESS_INFO.sameAs.length).toBeGreaterThan(0);
    for (const url of BUSINESS_INFO.sameAs) {
      expect(() => new URL(url), `sameAs entry "${url}" is not a valid URL`).not.toThrow();
    }
  });

  it('lists at least one cuisine', () => {
    expect(Array.isArray(BUSINESS_INFO.servesCuisine)).toBe(true);
    expect(BUSINESS_INFO.servesCuisine.length).toBeGreaterThan(0);
  });
});

describe('SEO guardrails: site-url.js required production configuration', () => {
  it('DEFAULT_SITE_ORIGIN is set to the real production https domain', () => {
    expectNonEmptyString(DEFAULT_SITE_ORIGIN, 'DEFAULT_SITE_ORIGIN');
    const parsed = new URL(DEFAULT_SITE_ORIGIN);
    expect(parsed.protocol).toBe('https:');
    expect(parsed.hostname).toBe('prevakitchen.com');
  });
});
