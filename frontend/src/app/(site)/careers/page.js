import CareersLanding from '@/components/careers/CareersLanding';
import { getPublishedCareerJobs } from '@/lib/career-api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Careers at Preva Kitchen',
  description: 'Explore kitchen and hospitality careers at Preva Kitchen in Redford Township, Michigan.',
  alternates: { canonical: '/careers' },
  openGraph: { title: 'Careers at Preva', description: 'Bring your craft. Build your future at Preva in Redford Township.', images: ['/asset/careers/preva-careers-hero.png'] }
};

export default async function CareersPage() {
  const jobs = (await getPublishedCareerJobs()).filter((job) => !/night\s*club|night\s*life|\bclub\b|\bvip\b|bottle|barback|security|door host/i.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`));
  return <CareersLanding jobs={jobs} />;
}
