import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedCareerJob, getPublishedCareerJobs } from '@/lib/career-api';
import SvgIcon from '@/components/SvgIcon';
import { pageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getPublishedCareerJob(slug);
  if (!job) return {};
  return pageMetadata({
    title: `${job.title} — Redford, MI`,
    description: `${job.title} opening at ${job.department} in Redford Township, Michigan.`,
    path: `/careers/${job.slug}`,
    image: job.image,
    type: 'article',
    keywords: [job.title, `${job.title} Redford MI`, 'Preva Kitchen jobs']
  });
}

export default async function CareerJobPage({ params }) {
  const { slug } = await params;
  const job = await getPublishedCareerJob(slug);
  if (!job) notFound();
  const isBar = job.slug === 'barback-redford';
  const isEntry = ['prep-cook-redford', 'dishwasher-redford', 'janitorial-team-member-redford'].includes(job.slug);
  const trial = ['chef-redford', 'line-cook-redford'].includes(job.slug);
  const related = (await getPublishedCareerJobs()).filter((item) => item.slug !== job.slug).slice(0, 3);
  const postedAt = new Date(job.publishedAt || job.createdAt || job.updatedAt || Date.now());
  const validThrough = new Date();
  validThrough.setDate(validThrough.getDate() + 180);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'JobPosting', title: job.title,
    description: `${job.intro} ${job.responsibilities.join('. ')}`,
    datePosted: postedAt.toISOString().slice(0, 10), validThrough: validThrough.toISOString(),
    employmentType: job.type.includes('Full-time') && job.type.includes('Part-time') ? ['FULL_TIME', 'PART_TIME'] : job.type === 'Full-time' ? 'FULL_TIME' : 'PART_TIME',
    hiringOrganization: { '@type': 'Organization', name: 'Preva Kitchen', sameAs: 'https://prevaclub.com' },
    jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', streetAddress: '13090 Inkster Rd', addressLocality: 'Redford Township', addressRegion: 'MI', postalCode: '48239', addressCountry: 'US' } },
    ...(job.salaryMin > 0 && job.salaryMax >= job.salaryMin ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'USD', value: { '@type': 'QuantitativeValue', minValue: job.salaryMin, maxValue: job.salaryMax, unitText: job.salaryUnit || 'HOUR' } } } : {}),
    directApply: true
  };

  return (
    <div className={`career-reference job-page ${isBar ? 'barback-page' : ''}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="evergreen"><span className="live-dot" /> We are actively hiring for this role on an ongoing basis — apply anytime.</div>
      <main>
        <section className="job-hero"><div className="wrap"><Link className="career-back" href="/careers#openings" aria-label="Back to open roles" title="Back to open roles"><span aria-hidden="true">←</span><span className="career-back-label">Back to roles</span></Link><div className="crumbs"><Link href="/careers">Careers</Link><span>›</span><Link href="/careers#openings">Open roles</Link><span>›</span>{job.title}</div><div className="hero-grid"><div><span className="urgent">{isBar ? 'Urgent · Priority hire' : job.badge}</span><div className="eyebrow job-hero-eyebrow">{job.department} · {job.location}</div><h1>{job.title}</h1><p className="lead">{job.intro}</p><div className="hero-actions-job"><Link className="btn primary" href={`/careers/apply?role=${job.slug}`}>Apply now <span>→</span></Link><a className="text-link" href="#role-details">Explore the role ↓</a></div></div><aside className="quick"><div className="quick-label">Role at a glance</div><div><small>Location</small><strong>{job.location}</strong></div><div><small>Employment</small><strong>{job.type}</strong></div><div><small>Compensation</small><strong>{job.pay}</strong></div><div><small>Schedule</small><strong>{job.schedule}</strong></div><Link className="btn lime" href={`/careers/apply?role=${job.slug}`}>Start your application →</Link><small className="micro">Mobile-friendly · About 3 minutes</small></aside></div></div></section>
        <section className="role-strip"><div className="wrap strip-grid"><div><span>01</span><strong>Fast response</strong><small>We aim to reply within 24 hours.</small></div><div><span>02</span><strong>Real conversation</strong><small>Clear role, schedule, and pay discussion.</small></div><div><span>03</span><strong>Supported start</strong><small>A peer mentor for your first two weeks.</small></div><div><span>04</span><strong>Room to grow</strong><small>30/60/90-day check-ins and development.</small></div></div></section>
        <section id="role-details"><div className="wrap role-intro"><div className={`role-photo ${isBar ? 'night' : ''}`} style={{ backgroundImage: `linear-gradient(0deg,rgba(0,0,0,.82),transparent 55%),url("${job.image}")` }} role="img" aria-label={`${job.title} at ${job.department}`}><div className="photo-caption"><span className="eyebrow">The Preva standard</span><strong>{isBar ? 'Energy, precision, teamwork.' : 'Great service starts behind the scenes.'}</strong></div></div><div className="role-story"><div className="eyebrow">Your impact</div><h2>Be part of the experience people come back for.</h2><p>At Preva, every position shapes the guest experience. You&apos;ll join a team that values preparation, clear communication, dependable execution, and people who step in when the pace picks up.</p><div className="quote-line">“One destination. One standard.”</div></div></div></section>
        <section className="role-content-section"><div className="wrap role-columns"><article className="role-panel"><div className="number">01</div><div className="eyebrow">The work</div><h2>What you&apos;ll do</h2><ul className="check-list">{job.responsibilities.map((item) => <li key={item}><i><SvgIcon name="check" size={15} /></i><span>{item}</span></li>)}</ul></article><article className="role-panel"><div className="number">02</div><div className="eyebrow">Your strengths</div><h2>What you&apos;ll bring</h2><ul className="check-list">{job.qualifications.map((item) => <li key={item}><i><SvgIcon name="check" size={15} /></i><span>{item}</span></li>)}</ul></article></div></section>
        <section className="growth-section"><div className="wrap growth-grid"><div><div className="eyebrow">More than your first shift</div><h2>A role with a path forward.</h2><p>{job.growth}</p><div className="growth-points"><span>Peer mentor</span><span>Hands-on training</span><span>Regular feedback</span></div></div><div className="growth-card"><div className="eyebrow">Your first 90 days</div><div className="milestone"><b>Day 01</b><span>Welcome, paperwork, facility tour, and team introduction.</span></div><div className="milestone"><b>Day 30</b><span>What&apos;s working, what&apos;s difficult, and what support would help.</span></div><div className="milestone"><b>Day 60</b><span>Confidence check, training gaps, and next skills to build.</span></div><div className="milestone"><b>Day 90</b><span>Performance conversation and your next growth goal.</span></div></div></div></section>
        <section className="hiring-section"><div className="wrap"><div className="section-title-center"><div className="eyebrow">Clear from the start</div><h2>What happens after you apply?</h2><p>No unnecessary hoops. No wondering what comes next.</p></div><div className="hire-steps"><article><b>1</b><h3>Apply online</h3><p>Tell us about your availability and experience. Upload your résumé / CV to get started.</p></article><article><b>2</b><h3>Quick screen</h3><p>A short phone or text conversation within our 24-hour response target.</p></article><article><b>3</b><h3>Meet the team</h3><p>A focused {isBar ? '20–30' : '30–45'} minute interview with flexible scheduling.</p></article><article><b>4</b><h3>{trial ? 'Paid trial shift' : 'Clear decision'}</h3><p>{trial ? 'Show your skills in the real environment before a final offer.' : 'References where needed, then a prompt and transparent next step.'}</p></article></div></div></section>
        <section className="job-faq"><div className="wrap faq-grid"><div><div className="eyebrow">Questions, answered</div><h2>Before you apply.</h2><p>Still unsure? Submit an application and our hiring team can discuss the details with you.</p></div><div><details open><summary>Do I need a résumé?</summary><p>Yes. A résumé / CV is required for all applications so our hiring team can understand your background and experience.</p></details><details><summary>How quickly will I hear back?</summary><p>We aim to contact every applicant within 24 hours and schedule qualified candidates within two business days.</p></details><details><summary>Is this an ongoing opening?</summary><p>Yes. Preva maintains an evergreen talent pipeline, so you can apply even when immediate shift availability changes.</p></details></div></div></section>
        <section className="job-final"><div className="wrap final-box"><div><div className="eyebrow">Ready when you are</div><h2>Bring your energy to Preva.</h2><p>13090 Inkster Rd · Redford Township, Michigan</p></div><Link className="btn primary" href={`/careers/apply?role=${job.slug}`}>Apply for {job.title} →</Link></div></section>
        <section className="related"><div className="wrap"><div className="eyebrow">Explore more opportunities</div><h2>Other roles at Preva</h2><div className="related-grid">{related.map((item) => <Link className="related-card" href={`/careers/${item.slug}`} key={item.slug}><small>Redford, MI</small><strong>{item.title}</strong><span>View role →</span></Link>)}</div></div></section>
      </main>
      <Link className="mobile-apply" href={`/careers/apply?role=${job.slug}`}>Apply for {job.title} →</Link>
    </div>
  );
}
