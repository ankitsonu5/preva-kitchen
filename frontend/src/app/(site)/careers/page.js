import CareersLanding from '@/components/careers/CareersLanding';
import { getPublishedCareerJobs } from '@/lib/career-api';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = pageMetadata({
  title: 'Careers at Preva Kitchen',
  description: 'Explore kitchen and hospitality careers at Preva Kitchen in Redford Township, Michigan.',
  path: '/careers',
  image: '/asset/careers/preva-careers-hero.png',
  keywords: ['Preva Kitchen jobs', 'restaurant jobs Redford MI', 'kitchen careers Redford Township']
});

export default async function CareersPage() {
  const jobs = (await getPublishedCareerJobs()).filter((job) => !/night\s*club|night\s*life|\bclub\b|\bvip\b|bottle|barback|security|door host/i.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`));
  return <CareersLanding jobs={jobs} />;
}
