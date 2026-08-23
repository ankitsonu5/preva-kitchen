'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BriefcaseBusiness, CheckCircle2, Clock3, DollarSign, Edit, ExternalLink, Plus, RefreshCw, SearchCheck, Trash2, X } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';

const emptyForm = {
  title: '', slug: '', department: 'Preva Kitchen', location: 'Redford Township, MI',
  badge: 'Ongoing hiring', type: 'Part-time / Full-time', schedule: 'Flexible shifts',
  pay: 'Pay range pending confirmation', intro: '', responsibilities: '', qualifications: '',
  salaryMin: 0, salaryMax: 0, salaryUnit: 'HOUR', growth: '', interview: '', trial: false,
  image: '/asset/careers/preva-team-culture-v2.png', status: 'DRAFT', sortOrder: 0
};
const lines = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean);
const prettyDate = (value) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Not available';

export default function CareerJobsPage() {
  const confirmAction = useConfirm();
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const response = await api('/admin/career-jobs');
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Could not load career jobs.');
      setJobs(Array.isArray(body) ? body : []);
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const update = ({ target }) => setForm((current) => ({ ...current, [target.name]: target.type === 'checkbox' ? target.checked : target.value }));
  const reset = (closeEditor = false) => {
    setEditingId(''); setForm(emptyForm); setError('');
    if (closeEditor) setEditorOpen(false);
  };
  const create = () => { reset(); setEditorOpen(true); };
  const edit = (job) => {
    setEditingId(job.id);
    setForm({ ...emptyForm, ...job, responsibilities: (job.responsibilities || []).join('\n'), qualifications: (job.qualifications || []).join('\n') });
    setEditorOpen(true);
  };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) || 0, salaryMin: Number(form.salaryMin) || 0, salaryMax: Number(form.salaryMax) || 0, responsibilities: lines(form.responsibilities), qualifications: lines(form.qualifications) };
      const response = await api(editingId ? `/admin/career-jobs/${editingId}` : '/admin/career-jobs', { method: editingId ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Could not save this job.');
      reset(true); await load();
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  const remove = async (job) => {
    const approved = await confirmAction({ title: 'Delete career job?', description: `“${job.title}” will be removed from the careers website. Closing it is safer if you may reopen it later.`, confirmLabel: 'Delete job', tone: 'danger' });
    if (!approved) return;
    const response = await api(`/admin/career-jobs/${job.id}`, { method: 'DELETE' });
    if (response.ok) { if (editingId === job.id) reset(true); load(); }
  };

  const missingPay = jobs.filter((job) => Number(job.salaryMin) <= 0 || Number(job.salaryMax) <= 0);
  const published = jobs.filter((job) => job.status === 'PUBLISHED');
  const trialRoles = jobs.filter((job) => job.trial);
  const staleRoles = jobs.filter((job) => Date.now() - new Date(job.updatedAt || job.createdAt).getTime() > 25 * 86400000);

  return <Shell>
    <PageHeader eyebrow="Hiring CMS" title="Career jobs" description="Manage every open role, pay detail, hiring requirement, and public job page from one workspace." icon={BriefcaseBusiness} actions={<>
      <Link className="btn btn-secondary" href="/admin/careers">Hiring dashboard</Link>
      <button className="btn btn-secondary" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button>
      <button className="btn" type="button" onClick={create}><Plus size={15} /> Add role</button>
    </>} />
    {error && <div className="error" style={{ marginBottom: 20 }}>{error}</div>}

    {!loading && missingPay.length > 0 && <div className="career-compliance-alert">
      <div className="career-compliance-icon"><AlertTriangle size={20} /></div>
      <div><strong>Pay details required for {missingPay.length} role{missingPay.length === 1 ? '' : 's'}</strong><p>The hiring playbook requires exact pay ranges on the careers page and in JobPosting search data. Add approved figures before promoting these roles.</p></div>
      <button className="btn btn-secondary" type="button" onClick={() => edit(missingPay[0])}>Review first role</button>
    </div>}

    <div className="cards career-job-stats">
      <StatsCard label="Total roles" value={jobs.length} icon={BriefcaseBusiness} />
      <StatsCard label="Published" value={published.length} icon={CheckCircle2} />
      <StatsCard label="Pay complete" value={`${jobs.length - missingPay.length}/${jobs.length || 0}`} icon={DollarSign} />
      <StatsCard label="Paid trial roles" value={trialRoles.length} icon={SearchCheck} />
      <StatsCard label="Refresh due" value={staleRoles.length} icon={Clock3} />
    </div>

    <section className="panel career-role-panel">
      <div className="panel-heading"><div><h3>Open-role workspace</h3><p>Review publishing, compensation, interview setup, and freshness without opening a long form.</p></div><Link className="btn btn-secondary" href="/careers" target="_blank"><ExternalLink size={14} /> View careers</Link></div>
      {loading ? <LoadingSkeleton rows={6} /> : !jobs.length ? <EmptyState icon={BriefcaseBusiness} title="No career jobs" description="Create the first role to start the hiring pipeline." /> : <div className="career-role-grid">
        {jobs.map((job) => {
          const payReady = Number(job.salaryMin) > 0 && Number(job.salaryMax) > 0;
          const isStale = staleRoles.some((item) => item.id === job.id);
          return <article className={`career-role-card ${!payReady ? 'needs-attention' : ''}`} key={job.id}>
            <div className="career-role-topline"><StatusBadge status={job.status} /><span className="career-role-order">Order {job.sortOrder}</span></div>
            <div className="career-role-title"><div><h4>{job.title}</h4><p>{job.department} · {job.location}</p></div>{String(job.title).toLowerCase().includes('barback') && <span className="career-priority-tag">Urgent</span>}</div>
            <div className="career-role-meta"><span>{job.type}</span><span>{job.schedule}</span></div>
            <div className={`career-pay-status ${payReady ? 'is-ready' : 'is-missing'}`}><DollarSign size={18} /><div><strong>{payReady ? job.pay : 'Exact pay range missing'}</strong><small>{payReady ? `$${job.salaryMin}–$${job.salaryMax} · ${String(job.salaryUnit || '').toLowerCase()}` : 'Required before external promotion'}</small></div></div>
            <div className="career-role-checks">
              <span className={job.trial ? 'complete' : ''}>{job.trial ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{job.trial ? 'Paid trial set' : 'No trial'}</span>
              <span className={isStale ? 'warning' : 'complete'}>{isStale ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{isStale ? 'Refresh due' : `Updated ${prettyDate(job.updatedAt || job.createdAt)}`}</span>
            </div>
            <div className="career-role-actions"><button className="btn" type="button" onClick={() => edit(job)}><Edit size={14} /> Edit role</button>{job.status === 'PUBLISHED' && <Link className="btn btn-secondary" href={`/careers/${job.slug}`} target="_blank" title="View public job"><ExternalLink size={14} /></Link>}<button className="btn btn-danger" type="button" onClick={() => remove(job)} title="Delete role"><Trash2 size={14} /></button></div>
          </article>;
        })}
      </div>}
    </section>

    <section className="panel career-standards-panel">
      <div className="panel-heading"><div><h3>Publishing & hiring standards</h3><p>Quick controls taken from the approved Preva hiring playbooks.</p></div></div>
      <div className="career-standards-grid">
        <div><span>01</span><strong>Publish completely</strong><p>Exact pay, schedule, responsibilities, qualifications, benefits, and permanent URL.</p></div>
        <div><span>02</span><strong>Respond within 24 hours</strong><p>Use a text-first 10-minute screen and record Advance, Hold, or Pass.</p></div>
        <div><span>03</span><strong>Interview quickly</strong><p>Schedule within two business days and keep an evening or weekend option.</p></div>
        <div><span>04</span><strong>Onboard deliberately</strong><p>Assign a mentor, check Barbacks at day 14, then track 30/60/90-day progress.</p></div>
      </div>
    </section>

    {editorOpen && <JobEditor form={form} editingId={editingId} saving={saving} update={update} save={save} close={() => reset(true)} />}
  </Shell>;
}

function JobEditor({ form, editingId, saving, update, save, close }) {
  return <div className="modal-overlay career-job-editor-overlay" onMouseDown={(event) => event.target === event.currentTarget && close()}>
    <form className="modal-content career-job-editor" onSubmit={save} onMouseDown={(event) => event.stopPropagation()}>
      <header className="career-editor-header"><div><span className="eyebrow">Career role editor</span><h2>{editingId ? `Edit ${form.title}` : 'Create a new role'}</h2><p>Complete the public listing and hiring requirements in one place.</p></div><button className="icon-btn" type="button" onClick={close} aria-label="Close editor"><X size={20} /></button></header>
      <div className="career-editor-body">
        <FormSection number="01" title="Role identity" description="Public title, URL, team, and workplace.">
          <Field label="Job title *"><input className="input" name="title" value={form.title} onChange={update} required /></Field>
          <Field label="URL slug"><input className="input" name="slug" value={form.slug} onChange={update} placeholder="Generated from title if empty" /></Field>
          <Field label="Department"><input className="input" name="department" value={form.department} onChange={update} /></Field>
          <Field label="Location"><input className="input" name="location" value={form.location} onChange={update} /></Field>
          <Field label="Badge"><input className="input" name="badge" value={form.badge} onChange={update} /></Field>
          <Field label="Image URL"><input className="input" name="image" value={form.image} onChange={update} /></Field>
        </FormSection>
        <FormSection number="02" title="Employment & compensation" description="Exact approved pay is required for public job search data.">
          {(Number(form.salaryMin) <= 0 || Number(form.salaryMax) <= 0) && <div className="career-form-warning field-wide"><AlertTriangle size={16} /> Add an approved minimum and maximum pay range before publishing or promoting this role.</div>}
          <Field label="Employment type"><input className="input" name="type" value={form.type} onChange={update} /></Field>
          <Field label="Schedule"><input className="input" name="schedule" value={form.schedule} onChange={update} /></Field>
          <Field label="Pay / compensation display" wide><input className="input" name="pay" value={form.pay} onChange={update} /></Field>
          <Field label="Salary minimum"><input className="input" name="salaryMin" type="number" min="0" step="0.01" value={form.salaryMin} onChange={update} /></Field>
          <Field label="Salary maximum"><input className="input" name="salaryMax" type="number" min="0" step="0.01" value={form.salaryMax} onChange={update} /></Field>
          <Field label="Salary period"><select className="input" name="salaryUnit" value={form.salaryUnit} onChange={update}><option value="HOUR">Per hour</option><option value="DAY">Per day</option><option value="WEEK">Per week</option><option value="MONTH">Per month</option><option value="YEAR">Per year</option></select></Field>
        </FormSection>
        <FormSection number="03" title="Role details" description="Use one responsibility or qualification per line.">
          <Field label="Short role overview" wide><textarea className="input" name="intro" value={form.intro} onChange={update} rows={4} /></Field>
          <Field label="Responsibilities"><textarea className="input" name="responsibilities" value={form.responsibilities} onChange={update} rows={7} /></Field>
          <Field label="Qualifications"><textarea className="input" name="qualifications" value={form.qualifications} onChange={update} rows={7} /></Field>
          <Field label="Growth path" wide><textarea className="input" name="growth" value={form.growth} onChange={update} rows={3} /></Field>
        </FormSection>
        <FormSection number="04" title="Interview & publishing" description="Configure the candidate process and website visibility.">
          <Field label="Interview details" wide><input className="input" name="interview" value={form.interview} onChange={update} /></Field>
          <Field label="Visibility"><select className="input" name="status" value={form.status} onChange={update}><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="CLOSED">Closed</option></select></Field>
          <Field label="Display order"><input className="input" name="sortOrder" type="number" value={form.sortOrder} onChange={update} /></Field>
          <label className="career-trial-toggle field-wide"><input name="trial" type="checkbox" checked={form.trial} onChange={update} /><span><strong>Paid trial shift</strong><small>Enable when the role includes a compensated working interview.</small></span></label>
        </FormSection>
      </div>
      <footer className="career-editor-actions"><button className="btn btn-secondary" type="button" onClick={close}>Cancel</button><button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create job'}</button></footer>
    </form>
  </div>;
}

function FormSection({ number, title, description, children }) {
  return <section className="career-form-section"><div className="career-form-section-title"><span>{number}</span><div><h3>{title}</h3><p>{description}</p></div></div><div className="career-form-grid">{children}</div></section>;
}
function Field({ label, wide = false, children }) {
  return <div className={`field ${wide ? 'field-wide' : ''}`}><label>{label}</label>{children}</div>;
}
