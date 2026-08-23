'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CareersLanding({ jobs = [] }) {
  const [filter, setFilter] = useState('all');
  const kitchenJobs = jobs.filter((job) => !/night\s*club|night\s*life|\bclub\b|\bvip\b|bottle|barback|security|door host/i.test(`${job.department || ''} ${job.title || ''} ${job.slug || ''}`));
  const filtered = kitchenJobs.filter((job) => filter === 'all' || `${job.department.toLowerCase()} ${['prep-cook-redford', 'dishwasher-redford', 'janitorial-team-member-redford'].includes(job.slug) ? 'entry' : ''}`.includes(filter));

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    }), { threshold: .12 });
    document.querySelectorAll('.career-reference .reveal').forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="career-reference home" id="top">
      <main>
        <section className="home-hero">
          <div className="wrap hero-inner"><div className="hero-copy-home"><div className="gold-rule" /><div className="eyebrow">Preva Kitchen · Redford, Michigan</div><h1>Bring your craft.<em>Build your future.</em></h1><p>Join a chef-driven kitchen team where preparation, consistency and genuine hospitality come together every day.</p><div className="hero-actions-home"><a className="btn primary" href="#openings">Explore open roles ↓</a><Link className="btn light" href="/careers/apply?role=general-application">Join our talent community</Link></div><div className="hero-meta"><div><strong>{kitchenJobs.length} roles</strong>Hiring now</div><div><strong>24 hours</strong>Response target</div><div><strong>One team</strong>Room to grow</div></div></div></div>
          <div className="scroll-cue">Scroll to discover</div>
        </section>

        <section className="home-intro"><div className="wrap intro-grid reveal"><div><div className="eyebrow">Your next move</div><h2>Hospitality with momentum.</h2></div><div><p className="intro-copy">Every service is built on teamwork—cooks, dish, prep and guest-facing professionals working to one clear kitchen standard.</p><div className="intro-values"><div><b>Clarity</b><span>Know the role, schedule, and next step.</span></div><div><b>Support</b><span>Mentoring through your first two weeks.</span></div><div><b>Growth</b><span>Feedback and paths to build new skills.</span></div></div></div></div></section>

        <section className="openings" id="openings"><div className="wrap"><div className="openings-head reveal"><div><div className="eyebrow">Current opportunities</div><h2>Find your role.</h2></div><p>We keep an evergreen talent pipeline for Preva Kitchen. Apply for today—or for what comes next.</p></div><div className="role-filter">{[['all', 'All roles'], ['kitchen', 'Kitchen'], ['entry', 'No experience required']].map(([key, label]) => <button className={filter === key ? 'active' : ''} data-filter={key} key={key} onClick={() => setFilter(key)} type="button">{label}</button>)}</div><div className="home-jobs">{filtered.map((job, index) => <Link className="home-job" href={`/careers/${job.slug}`} key={job.slug}><span className="job-no">0{index + 1}</span><div><span className="ongoing">Ongoing hiring</span><div className="eyebrow job-dept">{job.department}</div><h3>{job.title}</h3><span className="job-cta">Explore the role</span></div><div className="job-meta"><span>⌖ Redford, MI</span><span>◷ {job.type}</span><span>{job.schedule}</span></div></Link>)}</div></div></section>

        <section className="life" id="life"><div className="wrap life-grid reveal"><div className="life-image" role="img" aria-label="Hospitality team preparing together before evening service"><div className="image-label"><span className="eyebrow">Behind every experience</span><strong>A team that has your back.</strong></div></div><div className="life-copy"><div className="eyebrow">Life at Preva</div><h2>Do work that gets noticed.</h2><p>Great service begins long before the doors open. We set clear expectations, train side-by-side, and create space for dependable people to grow.</p><div className="perks"><div className="perk"><b>Peer mentoring</b><small>Support during your first two weeks.</small></div><div className="perk"><b>Clear check-ins</b><small>30/60/90-day conversations.</small></div><div className="perk"><b>Cross-training</b><small>Build skills across roles and stations.</small></div><div className="perk"><b>Real feedback</b><small>Know what&apos;s working and what&apos;s next.</small></div></div><Link className="btn light" href="/careers/apply">Tell us about yourself →</Link></div></div></section>

        <section className="process-home" id="process"><div className="wrap"><div className="process-head reveal"><div className="eyebrow">Respectful from the start</div><h2>A faster hiring process.</h2><p>No unnecessary hoops and no wondering what comes next.</p></div><div className="process-row reveal"><article className="process-step"><span>01</span><h3>Apply online</h3><p>A mobile-friendly form that takes about three minutes.</p></article><article className="process-step"><span>02</span><h3>Quick screen</h3><p>A short text or phone conversation within our response target.</p></article><article className="process-step"><span>03</span><h3>Meet the team</h3><p>A focused interview with flexible scheduling options.</p></article><article className="process-step"><span>04</span><h3>Clear next step</h3><p>Prompt feedback, references where needed, and a transparent decision.</p></article></div></div></section>

        <section className="home-cta"><div className="wrap cta-lux reveal"><div><div className="eyebrow">Open-ended opportunity</div><h2>Don&apos;t see your perfect role?</h2><p>Join our talent community and we&apos;ll keep your application for future openings.</p></div><Link className="btn primary" href="/careers/apply?role=general-application">Submit a general application →</Link></div></section>
      </main>
    </div>
  );
}
