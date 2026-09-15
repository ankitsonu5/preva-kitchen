// Guardrail suite: title / description / canonical / robots / OG / Twitter
// for a curated, representative set of public routes (Phase 14: missing
// titles, missing descriptions, missing/invalid canonicals, missing OG/Twitter,
// correct index/noindex behaviour, duplicate titles).
//
// Static pages: the real `pageMetadata({...})` call is extracted from the
// page's source text (see tests/helpers/sourceExtract.js) and evaluated, then
// run through the REAL `pageMetadata()` from src/lib/seo.js — so this tests
// the actual production metadata builder against the actual source text, not
// a hand-copied fixture.
//
// Dynamic pages (menu/[slug], careers/[slug]): same technique, but the
// extracted args reference a `product`/`job` variable that in production
// comes from a CMS fetch. We supply fixture data for that variable so the
// real template logic (title interpolation, path building, keyword lists)
// still runs for real.
import { describe, it, expect } from 'vitest';
import { pageMetadata } from '@/lib/seo';
import { readSource, extractCallArgs, extractConstValue, extractStatementSource, evalExpression } from '../helpers/sourceExtract.js';
import { srcPath } from '../helpers/paths.js';
import { FIXTURE_PRODUCT, FIXTURE_JOB } from '../helpers/fixtures.js';
import {
  assertIndexableMetadata,
  assertNoIndexMetadata,
  assertValidCanonicalPath,
  assertNoDuplicateTitles
} from '../helpers/seoGuardrails.js';

/** Extract `pageMetadata({...})` args from a page file and resolve real metadata. */
function metadataFromPageMetadataCall(filePath, scope = {}) {
  const source = readSource(filePath);
  const argsSrc = extractCallArgs(source, 'pageMetadata');
  if (!argsSrc) throw new Error(`No pageMetadata(...) call found in ${filePath}`);
  const args = evalExpression(argsSrc, scope);
  return pageMetadata(args);
}

/** Extract a plain `export const metadata = {...}` literal (no pageMetadata wrapper). */
function metadataFromLiteral(filePath, scope = {}) {
  const source = readSource(filePath);
  const literalSrc = extractConstValue(source, 'metadata');
  if (!literalSrc) throw new Error(`No literal "const metadata = {...}" found in ${filePath}`);
  return evalExpression(literalSrc, scope);
}

const STATIC_INDEXABLE_PAGES = [
  { label: 'Home (/)', file: srcPath('app', '(site)', 'page.js') },
  { label: 'Menu list (/menu)', file: srcPath('app', '(site)', 'shop', 'page.js') },
  { label: 'Contact (/contact)', file: srcPath('app', '(site)', 'contact', 'layout.js') },
  { label: 'Careers list (/careers)', file: srcPath('app', '(site)', 'careers', 'page.js') },
  { label: 'About (/about)', file: srcPath('app', '(site)', 'about', 'page.js') },
  { label: 'Accessibility (/accessibility)', file: srcPath('app', '(site)', 'accessibility', 'page.js') },
  { label: 'Catering (/catering)', file: srcPath('app', '(site)', 'catering', 'page.js') },
  { label: 'Privacy policy (/privacy-policy)', file: srcPath('app', '(site)', 'privacy-policy', 'page.js') },
  { label: 'Reservations (/reservations)', file: srcPath('app', '(site)', 'reservations', 'page.js') },
  { label: 'Terms (/terms)', file: srcPath('app', '(site)', 'terms', 'page.js') }
];

describe('SEO guardrails: static indexable pages', () => {
  for (const { label, file } of STATIC_INDEXABLE_PAGES) {
    it(`${label} has complete, valid metadata`, () => {
      const metadata = metadataFromPageMetadataCall(file);
      assertIndexableMetadata(metadata, { label });
    });
  }

  it('no two static indexable pages share an exact <title>', () => {
    const entries = STATIC_INDEXABLE_PAGES.map(({ label, file }) => ({
      label,
      metadata: metadataFromPageMetadataCall(file)
    }));
    assertNoDuplicateTitles(entries);
  });

  it('each static page canonical path matches its expected route', () => {
    const expected = {
      'Home (/)': '/',
      'Menu list (/menu)': '/menu',
      'Contact (/contact)': '/contact',
      'Careers list (/careers)': '/careers',
      'About (/about)': '/about',
      'Accessibility (/accessibility)': '/accessibility',
      'Catering (/catering)': '/catering',
      'Privacy policy (/privacy-policy)': '/privacy-policy',
      'Reservations (/reservations)': '/reservations',
      'Terms (/terms)': '/terms'
    };
    for (const { label, file } of STATIC_INDEXABLE_PAGES) {
      const metadata = metadataFromPageMetadataCall(file);
      expect(metadata.alternates.canonical, label).toBe(expected[label]);
    }
  });
});

describe('SEO guardrails: dynamic indexable pages (fixture data)', () => {
  it('menu/[slug] product page produces valid metadata for a fixture product', () => {
    // menu/[slug]/page.js re-exports generateMetadata from shop/[slug]/page.js
    // (legacy /shop/:path* permanently redirects to /menu/:path*, see
    // next.config.mjs — shop/[slug] is the implementation, /menu is canonical).
    const file = srcPath('app', '(site)', 'shop', '[slug]', 'page.js');
    const source = readSource(file);

    // generateMetadata() computes `description` in a statement above the
    // pageMetadata({...}) call (a ternary on product.description) — extract
    // and evaluate that first so the real formula runs against fixture data,
    // then make it available when evaluating the pageMetadata() args.
    const descriptionSrc = extractStatementSource(source, 'description');
    expect(descriptionSrc, 'expected a "const description = ...;" statement in shop/[slug]/page.js').toBeTruthy();
    const description = evalExpression(descriptionSrc, { product: FIXTURE_PRODUCT });

    const argsSrc = extractCallArgs(source, 'pageMetadata');
    expect(argsSrc, 'expected a pageMetadata({...}) call in shop/[slug]/page.js').toBeTruthy();

    const args = evalExpression(argsSrc, {
      product: FIXTURE_PRODUCT,
      slug: FIXTURE_PRODUCT.slug,
      description,
      encodeURIComponent
    });
    const metadata = pageMetadata(args);

    assertIndexableMetadata(metadata, { label: 'menu/[slug] (fixture product)' });
    assertValidCanonicalPath(metadata.alternates.canonical, { label: 'menu/[slug]' });
    expect(metadata.alternates.canonical).toBe(`/menu/${FIXTURE_PRODUCT.slug}`);
    expect(metadata.title).toContain(FIXTURE_PRODUCT.name);
  });

  it('careers/[slug] job page produces valid metadata for a fixture job', () => {
    const file = srcPath('app', '(site)', 'careers', '[slug]', 'page.js');
    const source = readSource(file);
    const argsSrc = extractCallArgs(source, 'pageMetadata');
    expect(argsSrc, 'expected a pageMetadata({...}) call in careers/[slug]/page.js').toBeTruthy();

    const args = evalExpression(argsSrc, { job: FIXTURE_JOB });
    const metadata = pageMetadata(args);

    assertIndexableMetadata(metadata, { label: 'careers/[slug] (fixture job)' });
    expect(metadata.alternates.canonical).toBe(`/careers/${FIXTURE_JOB.slug}`);
    expect(metadata.title).toContain(FIXTURE_JOB.title);
  });
});

const NOINDEX_PAGES = [
  { label: 'Checkout (/checkout)', file: srcPath('app', '(site)', 'checkout', 'page.js') },
  { label: 'Order tracker (/order/[number])', file: srcPath('app', '(site)', 'order', '[number]', 'page.js') },
  { label: 'Preview (/preview)', file: srcPath('app', '(site)', 'preview', 'page.js') }
];

describe('SEO guardrails: known noindex routes', () => {
  for (const { label, file } of NOINDEX_PAGES) {
    it(`${label} explicitly sets robots noindex,nofollow`, () => {
      const metadata = metadataFromLiteral(file);
      assertNoIndexMetadata(metadata, { label });
    });
  }
});

describe('SEO guardrails: indexable pages never accidentally noindex', () => {
  for (const { label, file } of STATIC_INDEXABLE_PAGES) {
    it(`${label} is not accidentally noindex`, () => {
      const metadata = metadataFromPageMetadataCall(file);
      expect(metadata.robots?.index, label).not.toBe(false);
    });
  }
});
