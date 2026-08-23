'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, BriefcaseBusiness, CalendarClock, CheckCircle2,
  ClipboardCheck, Clock3, Inbox, Megaphone, MessageSquareText,
  RefreshCw, ShieldCheck, UserCheck, UserPlus, UsersRound
} from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

function candidateName(row) {
  return `${row.firstName || ''} ${row.lastName || ''}`.trim();
}

function formatDate(value, withTime = false) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

export default function CareersDashboardPage() {
  const [data, setData] = useState(null);
  const [roles, setRoles] = useState({ 'general-application': 'General application' });
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, jobsResponse] = await Promise.all([
        api('/admin/careers/dashboard'),
        api('/career-jobs')
      ]);
      const dashboard = await dashboardResponse.json().catch(() => null);
      if (!dashboardResponse.ok) throw new Error(dashboard?.message || 'Could not load the hiring dashboard.');
      setData(dashboard);
      if (jobsResponse.ok) {
        const jobs = await jobsResponse.json();
        setJobs(Array.isArray(jobs) ? jobs : []);
        setRoles({
          'general-application': 'General application',
          ...Object.fromEntries((Array.isArray(jobs) ? jobs : []).map((job) => [job.slug, job.title]))
        });
      }
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, []);

  const jobsMissingPay = jobs.filter((job) => Number(job.salaryMin) <= 0 || Number(job.salaryMax) <= 0);

  return (
    <Shell>
      <PageHeader
        eyebrow="Donna's hiring workspace"
        title="Hiring dashboard"
        description="One operating view for the 24-hour response target, interviews, offers, hires, and onboarding."
        icon={UsersRound}
        actions={<><Link className="btn btn-secondary" href="/admin/career-jobs"><BriefcaseBusiness size={15} /> Manage roles</Link><button className="btn" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button></>}
      />

      {error && <div className="error" style={{ marginBottom: 20 }}>{error}</div>}
      {loading ? <LoadingSkeleton cards rows={6} /> : data ? (
        <>
          {data.counts.overdue > 0 && (
            <div className="ats-alert ats-alert-danger">
              <AlertTriangle size={19} />
              <div><strong>{data.counts.overdue} application{data.counts.overdue === 1 ? '' : 's'} passed the 24-hour response target.</strong><span>Contact these candidates first and record the screening outcome.</span></div>
              <Link className="btn" href="/admin/career-applications?priority=overdue">Review now</Link>
            </div>
          )}
          {data.counts.staleJobs > 0 && (
            <div className="ats-alert"><Clock3 size={19} /><div><strong>{data.counts.staleJobs} published role{data.counts.staleJobs === 1 ? '' : 's'} need a content refresh.</strong><span>The hiring playbook recommends a small update every 15–30 days.</span></div><Link className="btn btn-secondary" href="/admin/career-jobs">Refresh roles</Link></div>
          )}

          {jobsMissingPay.length > 0 && (
            <div className="ats-alert"><AlertTriangle size={19} /><div><strong>{jobsMissingPay.length} role{jobsMissingPay.length === 1 ? '' : 's'} still need approved pay ranges.</strong><span>Exact compensation is required on public listings and JobPosting search data.</span></div><Link className="btn btn-secondary" href="/admin/career-jobs">Complete pay</Link></div>
          )}

          <div className="cards ats-stats">
            <StatsCard label="New applications" value={data.counts.new} helper={`${data.counts.overdue} outside 24-hour target`} icon={Inbox} tone="warning" href="/admin/career-applications?status=NEW" />
            <StatsCard label="Active pipeline" value={data.counts.active} helper={`${data.counts.total} total retained`} icon={UsersRound} href="/admin/career-applications" />
            <StatsCard label="Interview / checks" value={data.counts.interviewing} helper="Candidates in final evaluation" icon={CalendarClock} tone="info" href="/admin/career-applications?status=INTERVIEW" />
            <StatsCard label="Hired" value={data.counts.hired} helper="Ready for onboarding" icon={UserCheck} tone="success" href="/admin/career-applications?status=HIRED" />
            <StatsCard label="Onboarding" value={data.counts.onboarding} helper="Mentor and check-in tracking" icon={CheckCircle2} tone="success" href="/admin/career-applications?status=ONBOARDING" />
            <StatsCard label="Published roles" value={data.counts.publishedJobs} helper="Evergreen career pages" icon={BriefcaseBusiness} href="/admin/career-jobs" />
          </div>

          <section className="panel ats-playbook-panel">
            <div className="panel-heading"><div><h3>Daily hiring workflow</h3><p>The response and decision timeline from the approved operations binder.</p></div><Link href="/admin/career-applications">Open candidate pipeline</Link></div>
            <div className="ats-playbook-flow">
              <div><span>01</span><Megaphone size={18} /><strong>Source</strong><small>Evergreen posts, referrals, and role-specific channels.</small></div>
              <div><span>02</span><MessageSquareText size={18} /><strong>Screen in 24h</strong><small>10-minute text-first screen: Advance, Hold, or Pass.</small></div>
              <div><span>03</span><CalendarClock size={18} /><strong>Interview in 2 days</strong><small>Keep an evening or weekend interview option available.</small></div>
              <div><span>04</span><ShieldCheck size={18} /><strong>Check references</strong><small>Written consent, two references for Chef, then decide in 1 day.</small></div>
              <div><span>05</span><UserPlus size={18} /><strong>Onboard & retain</strong><small>Assign a mentor and record 14/30/60/90-day check-ins.</small></div>
            </div>
          </section>

          <section className="ats-priority-section">
            <div className="ats-section-heading"><div><span>Role playbooks</span><h3>Recruiting priorities</h3></div><p>Channel and evaluation guidance by role.</p></div>
            <div className="ats-priority-grid">
              <article className="is-urgent"><div><span>Urgent hire</span><BriefcaseBusiness size={18} /></div><h4>Barback</h4><p>Sponsored Indeed, nightlife groups, referrals, and same/next-day interviews.</p><small>Day-14 onboarding check required</small></article>
              <article><div><span>Leadership</span><UserCheck size={18} /></div><h4>Chef</h4><p>Recruiter and network sourcing, 45–60 minute interview, paid trial, two references.</p><small>Written 30/60/90 expectations</small></article>
              <article><div><span>Skilled kitchen</span><ClipboardCheck size={18} /></div><h4>Line Cook</h4><p>Culinary pipelines, 30–45 minute interview, paid trial, and one station first.</p><small>Visible pay drives qualified applicants</small></article>
              <article><div><span>Always on</span><UsersRound size={18} /></div><h4>Dishwasher & Janitorial</h4><p>Continuous sourcing, referral focus, short interviews, and safety training.</p><small>Show internal growth paths</small></article>
            </div>
          </section>

          <div className="dashboard-grids ats-dashboard-grid">
            <section className="panel">
              <div className="panel-heading"><div><h3>Needs attention</h3><p>Applications waiting beyond the response target</p></div><Link href="/admin/career-applications?priority=overdue">Open pipeline</Link></div>
              {data.urgent.length ? <div className="ats-list">{data.urgent.map((row) => <Link className="ats-list-row" href={`/admin/career-applications?candidate=${row.id}`} key={row.id}><span className="ats-avatar">{row.firstName?.[0]}{row.lastName?.[0]}</span><div><strong>{candidateName(row)}</strong><small>{roles[row.role] || row.role} · Applied {formatDate(row.createdAt)}</small></div><StatusBadge status="OVERDUE" /></Link>)}</div> : <EmptyState icon={CheckCircle2} title="Response target is clear" description="No new applications are currently overdue." />}
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h3>Next 7 days</h3><p>Scheduled candidate interviews</p></div><Link href="/admin/career-applications?status=INTERVIEW">All interviews</Link></div>
              {data.upcomingInterviews.length ? <div className="ats-list">{data.upcomingInterviews.map((row) => <Link className="ats-list-row" href={`/admin/career-applications?candidate=${row.id}`} key={row.id}><span className="ats-avatar"><CalendarClock size={16} /></span><div><strong>{candidateName(row)}</strong><small>{formatDate(row.interview?.scheduledAt, true)} · {roles[row.role] || row.role}</small></div></Link>)}</div> : <EmptyState icon={CalendarClock} title="No interviews scheduled" description="Schedule interviews from a candidate record." />}
            </section>

            <section className="panel ats-recent-panel">
              <div className="panel-heading"><div><h3>Recent applications</h3><p>Newest candidates across every role</p></div><Link href="/admin/career-applications">View all</Link></div>
              {data.recent.length ? <div style={{ overflowX: 'auto' }}><table className="table"><thead><tr><th>Candidate</th><th>Role</th><th>Applied</th><th>Status</th></tr></thead><tbody>{data.recent.map((row) => <tr key={row.id}><td><Link className="ats-candidate-link" href={`/admin/career-applications?candidate=${row.id}`}>{candidateName(row)}</Link><br /><small>{row.email}</small></td><td>{roles[row.role] || row.role}</td><td>{formatDate(row.createdAt, true)}</td><td><StatusBadge status={row.status} /></td></tr>)}</tbody></table></div> : <EmptyState icon={Inbox} title="No applications yet" description="Website applications will appear here automatically." />}
            </section>

            <section className="panel">
              <div className="panel-heading"><div><h3>Pipeline by role</h3><p>Retained application database</p></div></div>
              {data.byRole.length ? <div className="ats-role-bars">{data.byRole.map((item) => { const max = Math.max(...data.byRole.map((row) => row.count), 1); return <div key={item.role}><div><span>{roles[item.role] || item.role}</span><strong>{item.count}</strong></div><i><b style={{ width: `${Math.max(8, item.count / max * 100)}%` }} /></i></div>; })}</div> : <EmptyState icon={BriefcaseBusiness} title="Pipeline is empty" description="Application totals by role will appear here." />}
            </section>
          </div>
        </>
      ) : null}
    </Shell>
  );
}
