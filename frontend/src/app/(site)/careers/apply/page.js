import CareerApplicationForm from '@/components/careers/CareerApplicationForm';
import { getPublishedCareerJobs } from '@/lib/career-api';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Apply to Preva',
  description: 'Apply to join the Preva Kitchen team in Redford, Michigan.',
  alternates: { canonical: '/careers/apply' }
};

export default async function ApplyPage({ searchParams }) {
  const query = await searchParams;
  const jobs = (await getPublishedCareerJobs()).filter((job) => !/night\s*club|night\s*life|\bclub\b|\bvip\b|bottle|barback|security|door host/i.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`));
  const selected = query?.role === 'general-application' || jobs.some((job) => job.slug === query?.role) ? query.role : '';
  return (
    <div className="career-reference apply-page">
      <main>
        <section className="form-hero"><div className="wrap"><div className="eyebrow">Preva Kitchen · Redford</div><h1>Let&apos;s work together.</h1><p className="lead">Apply for a current kitchen role or join our ongoing Metro Detroit talent community. We aim to respond within 24 hours.</p></div></section>
        <div className="wrap form-wrap"><section className="form-card"><CareerApplicationForm initialRole={selected} jobs={jobs} /></section><aside><div className="side-card"><h3>What happens next?</h3><p>Our team reviews your application, completes a quick phone/text screen, and schedules qualified candidates within two business days.</p></div><div className="side-card"><h3>Applying without a résumé?</h3><p>That&apos;s okay for entry-level roles. Complete your contact details and tell us about your availability.</p></div><div className="side-card"><h3>Need help?</h3><p>Hiring contact: Donna Williams<br />donnaw@prevaclub.com<br />586-343-9099</p></div></aside></div>
      </main>
    </div>
  );
}
