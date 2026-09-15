# SEO Guardrails — Developer Reference

Preva Kitchen (`frontend/`, Next.js App Router). This is the practical reference
for adding or changing a public page without silently breaking SEO. It
documents the existing infra (built in earlier audit batches — do not rebuild
it) and the automated test suite added in Batch 6 that guards it.

Canonical production domain: `https://prevakitchen.com`.

---

## 1. The metadata infra you must reuse

### `pageMetadata()` — `frontend/src/lib/seo.js`

Every indexable page's `export const metadata` (or `generateMetadata()`
return value) should be built with this, not a hand-rolled object:

```js
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Book a Table in Redford Township, MI | Preva Kitchen',
  description: 'One or two sentences, ~150-160 chars, unique to this page.',
  path: '/reservations',          // root-relative, no trailing slash, no query string
  image: '/asset/.../hero.png',   // optional, defaults to DEFAULT_OG_IMAGE
  type: 'website',                // 'website' | 'article' for blog/job posts
  keywords: ['...'],              // optional array
  noIndex: false                  // true only for utility routes (see §5)
});
```

What it guarantees:
- `title`, `description`, `keywords` pass through as given — **it does not
  invent a fallback title or description if you omit them**, so a missing
  field on the call site is a missing field on the page. This is exactly
  what the automated tests check (§4).
- `alternates.canonical` is set to `path`. Next resolves this to an absolute
  URL using the root layout's `metadataBase` (see §2) — you never write the
  origin yourself here.
- `openGraph` and `twitter` are populated from the same title/description/image,
  with `openGraph.url: path` and `twitter.card` chosen automatically based on
  whether an image is present.
- `robots` is `{ index: true, follow: true, googleBot: {...} }` unless
  `noIndex: true`, in which case it's `{ index: false, follow: false }`.

Do not construct `alternates`, `openGraph`, `twitter`, or `robots` by hand on
a new page — call `pageMetadata()` and only override what's genuinely
page-specific.

### `getCanonicalOrigin()` / `canonicalUrl()` — `frontend/src/lib/site-url.js`

This is the **only** place the site's origin should be resolved from. It is
safe against localhost/staging leaks by construction:

1. `NEXT_PUBLIC_CANONICAL_URL` env var, if set and it parses as a public
   http(s) URL.
2. `NEXT_PUBLIC_SITE_URL` env var, same validation.
3. Any candidate URLs you pass in (e.g. a CMS-stored `settings.siteUrl`),
   same validation, first valid one wins.
4. `DEFAULT_SITE_ORIGIN` (`https://prevakitchen.com`) — always.

"Same validation" = `isPrivateOrLocalHost()` rejects `localhost`, `127.x`,
`10.x`, `192.168.x`, `172.16-31.x`, `0.0.0.0`, and non-`http(s)` protocols.
**A candidate that fails validation is silently skipped, not thrown on** — so
a stale `localhost:3000` saved in CMS settings, or a dev `.env` value leaking
into a build, can never end up in a canonical URL, JSON-LD `@id`, sitemap
entry, or `robots.txt`. This is why every page-level schema builder and
`sitemap.js`/`robots.js` call `getCanonicalOrigin()` instead of reading
`process.env` or `settings.siteUrl` directly.

`metadataBase` (which Next uses to resolve every page's relative
`alternates.canonical` and `openGraph.images` into absolute URLs) is set once,
in `frontend/src/app/(site)/layout.js`:
```js
metadataBase: new URL(getCanonicalOrigin(settings?.siteUrl))
```
You should never need to set `metadataBase` again on an individual page.

---

## 2. Adding JSON-LD to a new page

Two options, in order of preference:

**A. Reuse a generator from `frontend/src/lib/seo-schema.js`** when your page
is one of the types it already covers:
- `generateSiteWideSchema(origin)` — Restaurant/Organization/WebSite graph,
  already included sitewide via the root layout. Don't call this again on a
  leaf page.
- `generateBreadcrumbSchema(items, origin)` — use on every new page for its
  BreadcrumbList node. `items` is `[{ name, url }]`; relative `url`s are
  resolved against `origin`, absolute ones pass through unchanged.
- `generateBlogPostSchema(post, origin)` — blog posts (Article + breadcrumbs
  + auto-detected FAQ/Recipe).
- `generateMenuPageSchema(products, origin)` — the `/menu` listing page.
  **Pass the real product objects (with `priceCents`)** — see the Batch 6 bug
  note below.

**B. Inline a page-specific schema function** when the page needs a type the
generators don't cover (see `about/page.js`, `catering/page.js`,
`accessibility|privacy-policy|terms/page.js`, `reservations/page.js` for the
established pattern):

```js
function myPageSchema(origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${origin}/my-page#webpage`, ... },
      generateBreadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'My Page', url: '/my-page' }], origin)
    ]
  };
}

export default function MyPage() {
  const origin = getCanonicalOrigin();
  const jsonLd = myPageSchema(origin);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MyPageContent />
    </>
  );
}
```

### The `@id` consistency rule (read this before adding a `Restaurant` node)

If your page-level schema embeds a `Restaurant` node — e.g. because the page
wants to reinforce NAP/hours/reservations data — it **must** reuse the
sitewide entity's `@id`:

```js
'@id': `${origin}/#restaurant`
```

**Do not invent a new `@id`** (like `${origin}/reservations#restaurant`) for
it. Google (and any consumer that resolves `@id` references across a page's
graph) treats a different `@id` as a *different* entity — you end up with two
disconnected "restaurants" in the knowledge graph instead of one page
reinforcing the same one.

This is not hypothetical: **Batch 4 of this audit found exactly this bug on
`/reservations`** — the inline `reservationsSchema()` had minted its own
Restaurant `@id` instead of reusing `${origin}/#restaurant`, and it was fixed
by pointing it at the sitewide anchor (see `frontend/src/app/(site)/reservations/page.js`,
`reservationsSchema()`). The Batch 6 test suite locks this in:
`tests/seo/jsonld-schema.test.js` asserts, for every page-level schema
function, that any `Restaurant` node's `@id` equals `${origin}/#restaurant` —
so a regression here fails a test immediately instead of surfacing weeks
later in Search Console.

---

## 3. New-page checklist (copy into your PR description)

```
SEO checklist (Phase 13):
- [ ] Title: unique, ~50-60 chars, includes the primary keyword + "Preva Kitchen" or locale where natural
- [ ] Meta description: unique, ~150-160 chars, includes a call to action
- [ ] Canonical: set via pageMetadata({ path: '/exact-route' }) — root-relative, no query string, no trailing slash
- [ ] Exactly one <h1> on the page (own content or via a shared hero component — verify, don't assume)
- [ ] Focus keyword identified and present in title + H1 + first ~100 words (human judgment, not automated)
- [ ] OG title/description set (via pageMetadata — verify they're not empty)
- [ ] Valid social image: real https asset, correct aspect ratio (1200x630), not a placeholder
- [ ] robots value is correct: index,follow for public pages; noIndex: true for internal/utility/cart/order pages
- [ ] Schema decision made: reuse a seo-schema.js generator, add a page-level inline schema function, or explicitly "no schema needed" — and if a Restaurant node is included, its @id is `${origin}/#restaurant`
- [ ] Internal-link source identified: at least one existing page (nav, footer, or contextual link) links to the new page
- [ ] Sitemap inclusion decision made: added to coreRoutes in sitemap.js (static utility/marketing pages) or confirmed it's covered by the CMS-driven pages/posts/products/jobs loop — noindex pages must NOT be added
```

---

## 4. Running the automated guardrail tests

Framework: **Vitest** (added in Batch 6 — no test framework existed in this
repo before; see §6 for why Vitest specifically).

```bash
cd frontend
npm run test:seo          # single run, CI-friendly (vitest run)
npm run test:seo:watch    # watch mode while developing
```

**Gotcha:** if `npm run test:seo` fails with `vitest: command not found` (or
`npm install` reports installing far fewer packages than expected), your
shell almost certainly has `NODE_ENV=production` set, which makes `npm
install` skip `devDependencies` entirely. Fix once with:
```bash
NODE_ENV=development npm install
```
After that, `npm run test:seo` itself is safe to run under any ambient
`NODE_ENV` — `vitest.config.js` pins `process.env.NODE_ENV = 'test'` (and a
placeholder `BACKEND_URL`) before any test file loads, so the
production-guarded `src/lib/cms.js` / `src/lib/career-api.js` modules never
throw their "BACKEND_URL is required in production" check during a test run.

Test files live in `frontend/tests/`:

| File | Covers |
|---|---|
| `tests/helpers/sourceExtract.js` | Not a test file — shared utility that extracts real `pageMetadata({...})` call args / inline JSON-LD builders / arbitrary `const` statements from page source text and evaluates them against fixture data, without needing a JSX/React render pipeline. |
| `tests/helpers/seoGuardrails.js` | Not a test file — the shared "does this metadata object satisfy the rules" assertion helpers (`assertIndexableMetadata`, `assertNoIndexMetadata`, `assertValidCanonicalPath`, `assertValidJsonLd`, `assertRestaurantIdConsistency`, `assertNoDuplicateTitles`). |
| `tests/helpers/fixtures.js` / `tests/helpers/paths.js` | Not test files — fixture product/job/post data and path resolution helpers. |
| `tests/seo/page-metadata.test.js` | Title/description/canonical/robots/OG/Twitter for the curated static pages (home, menu, contact, careers, about, accessibility, catering, privacy-policy, reservations, terms), the dynamic `menu/[slug]` and `careers/[slug]` routes (via fixture product/job), duplicate-title detection, and noindex routes (checkout, order tracker, preview). |
| `tests/seo/jsonld-schema.test.js` | Every `seo-schema.js` generator (`generateSiteWideSchema`, `generateBreadcrumbSchema`, `generateBlogPostSchema`, `generateMenuPageSchema`) plus every page-level inline schema function (`aboutSchema`, `legalSchema` x3, `cateringSchema`, `reservationsSchema`, the dish-detail `detailSchema`, and the careers `breadcrumbSchema`/`jsonLd`) — asserts JSON.stringify/parse round-trips and the `@id` consistency rule from §2. |
| `tests/seo/sitemap.test.js` | `app/sitemap.js` with mocked `cmsFetch`/`getPublishedCareerJobs`/`getCanonicalOrigin` — no `/checkout`, `/order/`, `/preview`; the 6 legacy duplicate dish slugs never appear; every entry is an absolute https URL on the canonical origin; noIndex/nightlife content filtered; core routes always present; no duplicate URLs. |
| `tests/seo/robots.test.js` | `app/robots.js` disallows the known internal/noindex routes and points `sitemap`/`host` at absolute https URLs. |
| `tests/seo/canonical-origin.test.js` | Unit tests on `getCanonicalOrigin()`/`canonicalUrl()` rejecting localhost/private hosts; a repo-wide static scan of every `page.js`/`layout.js`/`sitemap.js`/`robots.js` plus `lib/seo.js`/`lib/seo-schema.js` for hardcoded localhost/private-IP strings. |
| `tests/seo/business-info.test.js` | `BUSINESS_INFO` (seo-schema.js) and `DEFAULT_SITE_ORIGIN` (site-url.js) required NAP fields are present and well-formed. |
| `tests/seo/h1-heuristic.test.js` | Exactly one `<h1` per curated route, counted across every file that actually contributes markup to that route (including the shared `PageHero` component used by about/accessibility/catering/privacy-policy/reservations/terms). |

**Extending the suite for a new page:** add it to the relevant curated array
(`STATIC_INDEXABLE_PAGES` in `page-metadata.test.js`, the route list in
`h1-heuristic.test.js`, etc.) rather than writing a new one-off test file —
the shared helpers already know how to validate a metadata object or a
JSON-LD payload.

---

## 5. Known noindex routes

These must keep `robots: { index: false, follow: false }` (checked directly,
not via `pageMetadata()`, since they intentionally skip OG/canonical noise):
`/checkout`, `/order/[number]`, `/preview`. `robots.js` also blocks
`/admin`, `/kitchen`, `/display`, `/api/` at the crawler level. If you add a
new internal/utility route, disallow it in `frontend/src/app/robots.js` and
give it `robots: { index: false, follow: false }`, and add it to the
`NOINDEX_PAGES` array in `tests/seo/page-metadata.test.js`.

---

## 6. Why Vitest

No test framework existed in either `frontend/package.json` or
`backend/package.json` before this batch (no `jest`, `vitest`, `playwright`,
`@testing-library/*`, and no `tests/`/`__tests__/` directory). Vitest was
added as a frontend devDependency because:
- It's the lowest-friction option for pure logic/static-source checks like
  these (no browser, no dev server, ESM-native, fast).
- Playwright/Cypress were deliberately avoided for this batch — they need a
  running app and a browser, which is a heavier commitment than "catch
  metadata/schema/sitemap regressions" requires. If a future batch wants true
  rendered-DOM or live-browser checks (see §7), that's the natural next tool
  to add on top of this, not a replacement for it.

---

## 7. What's intentionally OUT of scope for automation

These need a human, not a test:
- **Live Lighthouse / real-browser audits** (actual Core Web Vitals, real
  rendered accessibility tree, real screenshot-based layout checks). The
  H1 test here is a source-text heuristic, not a DOM render — it can't catch
  an H1 that's conditionally rendered only in certain states, or one that's
  visually hidden vs. semantically absent.
- **Content quality / keyword judgment** — whether a title or description is
  actually compelling, whether the focus keyword is the *right* keyword,
  whether copy reads naturally. The suite only checks presence/shape, never
  quality.
- **Business data decisions** — hours, pricing, service area, holiday
  closures, which dishes are featured. `tests/seo/business-info.test.js`
  checks that `BUSINESS_INFO` fields are *present and well-formed*; it has no
  opinion on whether `"17:00"` is the right opening time.
- **Whether a new page actually needs an internal link, and from where** —
  the checklist (§3) has a line item for it, but "does at least one real page
  on the site link here" is a judgment call about navigation/IA, not
  something a unit test should enforce structurally.
- **Visual social-share-card correctness** — the tests confirm an OG image
  URL exists and is well-formed; they don't render it or check it looks right
  in a Twitter/Facebook card preview.
- **CMS-authored content** (blog posts, career listings, CMS pages) — the
  suite tests the *code path* that turns CMS data into metadata/schema (via
  fixtures), not the live CMS data itself. A blog post with a genuinely bad
  title still needs a human editor to catch it.

---

## 8. Pre-deployment wiring

No CI pipeline, pre-commit hook, husky config, or `.github/workflows/`
existed in this repo before this batch, so nothing was wired in
automatically (that would be a workflow change beyond this batch's scope —
see the engagement brief). `npm run test:seo` was added as a script a human
can run locally or opt into wiring up later. To wire it in when you do set up
CI:

```yaml
# .github/workflows/ci.yml (example — this file does not exist yet)
- name: Install frontend deps
  run: npm install
  working-directory: frontend
- name: SEO guardrail tests
  run: npm run test:seo
  working-directory: frontend
```

Or, once a pre-commit tool (husky/lint-staged) is introduced, add `npm run
test:seo --prefix frontend` as an additional (non-blocking, until proven
stable) step.
