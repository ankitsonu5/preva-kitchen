// Guardrail suite: missing H1 / multiple H1 (Phase 14).
//
// This is a deliberate static/logic-level heuristic, not a DOM render: it
// counts literal `<h1` occurrences in the source text of the file(s) that
// make up each curated route's render tree. No render-testing setup
// (React Testing Library / jsdom) exists in this repo yet, and the task
// explicitly allows a grep-based heuristic here rather than introducing one
// for this batch.
//
// IMPORTANT: several routes get their H1 from a SHARED component
// (`PageHero` in src/components/site-page/PageKit.js), not from the route's
// own page.js/content file. Counting only the leaf file would report a false
// "missing H1" for those routes. Each entry below lists every file that
// actually contributes markup to that route, mirroring the real import
// chain (verified by reading each file's imports).
import { describe, it, expect } from 'vitest';
import { readSource } from '../helpers/sourceExtract.js';
import { srcPath } from '../helpers/paths.js';

function countH1(files) {
  return files.reduce((count, file) => {
    const source = readSource(file);
    const matches = source.match(/<h1[\s>]/g) || [];
    return count + matches.length;
  }, 0);
}

const PAGE_HEROED_FILES = [srcPath('components', 'site-page', 'PageKit.js')];

const ROUTES = [
  {
    label: 'Home (/)',
    files: [srcPath('app', '(site)', 'page.js'), srcPath('components', 'home', 'HomeContent.js')]
  },
  {
    label: 'Menu list (/menu)',
    files: [srcPath('app', '(site)', 'shop', 'page.js'), srcPath('components', 'shop', 'ShopContent.js')]
  },
  {
    label: 'Menu detail (/menu/[slug])',
    files: [srcPath('app', '(site)', 'shop', '[slug]', 'page.js')]
  },
  {
    label: 'Contact (/contact)',
    files: [srcPath('app', '(site)', 'contact', 'page.js'), srcPath('components', 'contact', 'ContactContent.js')]
  },
  {
    label: 'Careers list (/careers)',
    files: [srcPath('app', '(site)', 'careers', 'page.js'), srcPath('components', 'careers', 'CareersLanding.js')]
  },
  {
    label: 'Careers detail (/careers/[slug])',
    files: [srcPath('app', '(site)', 'careers', '[slug]', 'page.js')]
  },
  {
    label: 'Checkout (/checkout, noindex)',
    files: [srcPath('app', '(site)', 'checkout', 'page.js')]
  },
  {
    label: 'Order tracker (/order/[number], noindex)',
    files: [srcPath('app', '(site)', 'order', '[number]', 'page.js')]
  },
  {
    label: 'About (/about)',
    files: [srcPath('components', 'about', 'AboutContent.js'), ...PAGE_HEROED_FILES]
  },
  {
    label: 'Accessibility (/accessibility)',
    files: [srcPath('components', 'legal', 'LegalContent.js'), ...PAGE_HEROED_FILES]
  },
  {
    label: 'Catering (/catering)',
    files: [srcPath('components', 'catering', 'CateringContent.js'), ...PAGE_HEROED_FILES]
  },
  {
    label: 'Privacy policy (/privacy-policy)',
    files: [srcPath('components', 'legal', 'LegalContent.js'), ...PAGE_HEROED_FILES]
  },
  {
    label: 'Reservations (/reservations)',
    files: [srcPath('components', 'reservations', 'ReservationsContent.js'), ...PAGE_HEROED_FILES]
  },
  {
    label: 'Terms (/terms)',
    files: [srcPath('components', 'legal', 'LegalContent.js'), ...PAGE_HEROED_FILES]
  }
];

describe('SEO guardrails: exactly one H1 per curated route', () => {
  for (const { label, files } of ROUTES) {
    it(`${label} renders exactly one <h1>`, () => {
      const count = countH1(files);
      expect(count, `${label}: expected exactly 1 <h1> across [${files.map((f) => f.split('src')[1]).join(', ')}], found ${count}`).toBe(1);
    });
  }
});
