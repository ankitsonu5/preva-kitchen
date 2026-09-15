// Fixture data standing in for CMS-fetched records, used to exercise
// dynamic-route metadata/JSON-LD source (menu/[slug], careers/[slug]) without
// hitting the network or importing the (production-guarded) cms.js/career-api.js
// modules.

export const FIXTURE_PRODUCT = {
  id: 'fixture-product-1',
  slug: 'fixture-rasta-pasta',
  name: 'Fixture Rasta Pasta',
  description: 'A creamy jerk-spiced pasta tossed with grilled chicken and peppers.',
  category: 'Pasta',
  tags: ['pasta', 'signature'],
  image: '/asset/home-reference/signature-dishes/Rasta-Pasta.webp',
  price: '$18.00',
  priceCents: 1800,
  available: true,
  servings: '1',
  calories: 890
};

export const FIXTURE_JOB = {
  slug: 'fixture-line-cook-redford',
  title: 'Fixture Line Cook',
  department: 'Kitchen',
  location: 'Redford Township, MI',
  type: 'Full-time',
  pay: '$16-18/hr',
  schedule: 'Evenings, weekends',
  badge: 'Hiring now',
  image: '/asset/careers/preva-careers-hero.png',
  intro: 'Join our kitchen team preparing signature dishes.',
  responsibilities: ['Prep ingredients to spec', 'Run the line during service'],
  qualifications: ['1+ year kitchen experience', 'Reliable transportation'],
  growth: 'Path to sous chef within 18 months.',
  salaryMin: 16,
  salaryMax: 18,
  salaryUnit: 'HOUR',
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

export const FIXTURE_BLOG_POST = {
  slug: 'fixture-blog-post',
  title: 'Fixture Blog Post About Comfort Food',
  seoTitle: '',
  excerpt: 'A short excerpt about comfort food in Redford Township.',
  content: '<h2>What makes it comfort food?</h2><p>' + 'x'.repeat(40) + '</p>',
  author: { name: 'Fixture Author' },
  publishedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  categories: [{ category: { name: 'Culinary Journal' } }],
  tags: [{ tag: { name: 'comfort-food' } }]
};

export const TEST_ORIGIN = 'https://prevakitchen.com';
