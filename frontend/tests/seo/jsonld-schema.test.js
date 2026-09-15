// Guardrail suite: JSON-LD validity (Phase 14 "invalid JSON-LD" check).
//
// Two categories:
//  1. The reusable generator functions in src/lib/seo-schema.js — called
//     directly, as real exported functions.
//  2. Page-level inline schema builders (about/accessibility/catering/
//     privacy-policy/reservations/terms/careers) — the `function xSchema(origin)`
//     (or inline `const jsonLd = {...}` for careers) is extracted from the
//     real page source text and executed (see tests/helpers/sourceExtract.js),
//     exercising the actual production template strings.
//
// Every case asserts JSON.stringify/JSON.parse round-trips without throwing,
// and — per the Batch 4 finding on /reservations (a page-level schema had
// invented a second, mismatched @id for the Restaurant entity instead of
// reusing the sitewide `${origin}/#restaurant` anchor, which breaks Google's
// ability to merge the entity across pages) — that any embedded Restaurant
// node reuses the sitewide @id. See SEO_GUARDRAILS.md for the full rule.
import { describe, it, expect } from 'vitest';
import {
  generateSiteWideSchema,
  generateBreadcrumbSchema,
  generateBlogPostSchema,
  generateMenuPageSchema,
  BUSINESS_INFO
} from '@/lib/seo-schema';
import {
  readSource,
  extractFunctionSource,
  extractConstValue,
  callExtractedFunction,
  evalExpression
} from '../helpers/sourceExtract.js';
import { srcPath } from '../helpers/paths.js';
import { FIXTURE_PRODUCT, FIXTURE_JOB, FIXTURE_BLOG_POST, TEST_ORIGIN } from '../helpers/fixtures.js';
import { assertValidJsonLd, assertRestaurantIdConsistency } from '../helpers/seoGuardrails.js';

describe('SEO guardrails: seo-schema.js generators', () => {
  it('generateSiteWideSchema produces valid, round-trippable JSON-LD with the canonical Restaurant @id', () => {
    const schema = generateSiteWideSchema(TEST_ORIGIN);
    const parsed = assertValidJsonLd(schema, { label: 'generateSiteWideSchema' });
    expect(parsed['@context']).toBe('https://schema.org');
    assertRestaurantIdConsistency(parsed['@graph'], TEST_ORIGIN, { label: 'generateSiteWideSchema' });

    const org = parsed['@graph'].find((n) => n['@type'] === 'Organization');
    expect(org['@id']).toBe(`${TEST_ORIGIN}/#organization`);
    const site = parsed['@graph'].find((n) => n['@type'] === 'WebSite');
    expect(site['@id']).toBe(`${TEST_ORIGIN}/#website`);
    expect(site.publisher['@id']).toBe(`${TEST_ORIGIN}/#organization`);
  });

  it('generateBreadcrumbSchema builds a valid ListItem graph and resolves relative URLs against origin', () => {
    const schema = generateBreadcrumbSchema(
      [{ name: 'Home', url: '/' }, { name: 'Menu', url: '/menu' }],
      TEST_ORIGIN
    );
    assertValidJsonLd(schema, { label: 'generateBreadcrumbSchema' });
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[1].item).toBe(`${TEST_ORIGIN}/menu`);
  });

  it('generateBreadcrumbSchema passes through already-absolute URLs unchanged', () => {
    const schema = generateBreadcrumbSchema(
      [{ name: 'External', url: 'https://example.com/x' }],
      TEST_ORIGIN
    );
    expect(schema.itemListElement[0].item).toBe('https://example.com/x');
  });

  it('generateBlogPostSchema produces valid JSON-LD for a fixture post', () => {
    const schema = generateBlogPostSchema(FIXTURE_BLOG_POST, TEST_ORIGIN);
    const parsed = assertValidJsonLd(schema, { label: 'generateBlogPostSchema' });
    const article = parsed['@graph'].find((n) => n['@type'] === 'BlogPosting');
    expect(article).toBeTruthy();
    expect(article.headline).toBe(FIXTURE_BLOG_POST.title);
    expect(article.isPartOf['@id']).toBe(`${TEST_ORIGIN}/#website`);
  });

  it('generateBlogPostSchema returns null (not a throw) for a missing post', () => {
    expect(generateBlogPostSchema(null, TEST_ORIGIN)).toBeNull();
  });

  it('generateMenuPageSchema produces valid JSON-LD for a fixture product list', () => {
    const schema = generateMenuPageSchema([FIXTURE_PRODUCT], TEST_ORIGIN);
    const parsed = assertValidJsonLd(schema, { label: 'generateMenuPageSchema' });
    const menu = parsed['@graph'].find((n) => n['@type'] === 'Menu');
    expect(menu.hasMenuItem).toHaveLength(1);
    expect(menu.hasMenuItem[0].name).toBe(FIXTURE_PRODUCT.name);
    expect(menu.hasMenuItem[0].offers.price).toBe('18.00');
  });
});

/** Extract `function fnName(origin) {...}` from a page file and run it. */
function runPageSchemaFunction(filePath, fnName, extraScope = {}) {
  const source = readSource(filePath);
  const fnSrc = extractFunctionSource(source, fnName);
  expect(fnSrc, `expected function ${fnName}(origin) {...} in ${filePath}`).toBeTruthy();
  return callExtractedFunction(fnSrc, fnName, [TEST_ORIGIN], {
    generateBreadcrumbSchema,
    BUSINESS_INFO,
    ...extraScope
  });
}

const PAGE_SCHEMA_FUNCTIONS = [
  { label: 'about', file: srcPath('app', '(site)', 'about', 'page.js'), fnName: 'aboutSchema' },
  { label: 'accessibility', file: srcPath('app', '(site)', 'accessibility', 'page.js'), fnName: 'legalSchema' },
  { label: 'privacy-policy', file: srcPath('app', '(site)', 'privacy-policy', 'page.js'), fnName: 'legalSchema' },
  { label: 'terms', file: srcPath('app', '(site)', 'terms', 'page.js'), fnName: 'legalSchema' },
  { label: 'reservations', file: srcPath('app', '(site)', 'reservations', 'page.js'), fnName: 'reservationsSchema' }
];

describe('SEO guardrails: page-level inline JSON-LD (6 new pages)', () => {
  for (const { label, file, fnName } of PAGE_SCHEMA_FUNCTIONS) {
    it(`${label} page schema is valid JSON-LD and reuses the sitewide Restaurant @id if present`, () => {
      const schema = runPageSchemaFunction(file, fnName);
      const parsed = assertValidJsonLd(schema, { label });
      assertRestaurantIdConsistency(parsed['@graph'], TEST_ORIGIN, { label });
    });
  }

  it('catering page schema is valid JSON-LD (needs deliveryAreas in scope)', () => {
    const file = srcPath('app', '(site)', 'catering', 'page.js');
    const source = readSource(file);
    const deliveryAreasSrc = extractConstValue(source, 'deliveryAreas');
    expect(deliveryAreasSrc, 'expected const deliveryAreas = [...] in catering/page.js').toBeTruthy();
    const deliveryAreas = evalExpression(deliveryAreasSrc);

    const schema = runPageSchemaFunction(file, 'cateringSchema', { deliveryAreas });
    const parsed = assertValidJsonLd(schema, { label: 'catering' });
    assertRestaurantIdConsistency(parsed['@graph'], TEST_ORIGIN, { label: 'catering' });

    const service = parsed['@graph'].find((n) => n['@type'] === 'Service');
    expect(service.areaServed).toHaveLength(deliveryAreas.length);
  });

  it('reservations page schema Restaurant @id matches the sitewide entity (Batch 4 regression guard)', () => {
    // This is the exact bug Batch 4 found and fixed: the inline reservations
    // schema had minted its own Restaurant @id instead of reusing
    // `${origin}/#restaurant`. Assert it explicitly here (in addition to the
    // generic loop above) so a regression fails with an unambiguous message.
    const schema = runPageSchemaFunction(
      srcPath('app', '(site)', 'reservations', 'page.js'),
      'reservationsSchema'
    );
    const restaurant = schema['@graph'].find((n) => n['@type'] === 'Restaurant');
    expect(restaurant['@id']).toBe(`${TEST_ORIGIN}/#restaurant`);
  });
});

describe('SEO guardrails: dish detail page inline JSON-LD (menu/[slug])', () => {
  it('shop/[slug] detailSchema is valid JSON-LD for a fixture product', () => {
    const file = srcPath('app', '(site)', 'shop', '[slug]', 'page.js');
    const source = readSource(file);
    const detailSchemaSrc = extractConstValue(source, 'detailSchema');
    expect(detailSchemaSrc, 'expected const detailSchema = {...} in shop/[slug]/page.js').toBeTruthy();

    const product = FIXTURE_PRODUCT;
    const faqs = [{ q: 'Is it spicy?', a: 'Mild by default; ask for extra heat.' }];
    const siteOrigin = TEST_ORIGIN;
    const slug = product.slug;
    const productUrl = `${siteOrigin}/menu/${encodeURIComponent(slug)}`;

    const schema = evalExpression(detailSchemaSrc, {
      product,
      faqs,
      siteOrigin,
      slug,
      productUrl,
      generateBreadcrumbSchema,
      encodeURIComponent
    });

    const parsed = assertValidJsonLd(schema, { label: 'menu/[slug] detailSchema' });
    const productNode = parsed['@graph'].find((n) => n['@type'] === 'Product');
    expect(productNode.name).toBe(product.name);
    expect(productNode.offers.price).toBe('18.00');
    const faqNode = parsed['@graph'].find((n) => n['@type'] === 'FAQPage');
    expect(faqNode.mainEntity).toHaveLength(1);
  });
});

describe('SEO guardrails: careers page inline JSON-LD', () => {
  it('careers list breadcrumbSchema is valid JSON-LD', () => {
    const file = srcPath('app', '(site)', 'careers', 'page.js');
    const source = readSource(file);
    const breadcrumbSchemaSrc = extractConstValue(source, 'breadcrumbSchema');
    expect(breadcrumbSchemaSrc, 'expected const breadcrumbSchema = {...} in careers/page.js').toBeTruthy();
    const schema = evalExpression(breadcrumbSchemaSrc, { origin: TEST_ORIGIN, generateBreadcrumbSchema });
    assertValidJsonLd(schema, { label: 'careers list breadcrumbSchema' });
  });

  it('careers/[slug] JobPosting jsonLd is valid JSON-LD for a fixture job', () => {
    const file = srcPath('app', '(site)', 'careers', '[slug]', 'page.js');
    const source = readSource(file);
    const jsonLdSrc = extractConstValue(source, 'jsonLd');
    expect(jsonLdSrc, 'expected const jsonLd = {...} in careers/[slug]/page.js').toBeTruthy();

    const job = FIXTURE_JOB;
    const postedAt = new Date(job.publishedAt);
    const validThrough = new Date(postedAt);
    validThrough.setDate(validThrough.getDate() + 180);

    const schema = evalExpression(jsonLdSrc, { job, postedAt, validThrough });
    const parsed = assertValidJsonLd(schema, { label: 'careers/[slug] JobPosting' });
    expect(parsed['@type']).toBe('JobPosting');
    expect(parsed.title).toBe(job.title);
    expect(parsed.baseSalary.value.minValue).toBe(job.salaryMin);
  });
});
