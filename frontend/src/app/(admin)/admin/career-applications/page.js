'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, CalendarClock, Download, Eye, FileCheck2, RefreshCw, Save, Search } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

const statuses = ['NEW', 'SCREENING', 'REVIEWING', 'INTERVIEW', 'REFERENCE_CHECK', 'OFFERED', 'HIRED', 'ONBOARDING', 'HOLD', 'PASSED', 'ARCHIVED'];
const tabs = ['Overview', 'Screening', 'Interview', 'References', 'Onboarding', 'History'];
const emptyScreening = { outcome: 'PENDING', contactedAt: '', transportation: '', payAligned: '', competency: '', notes: '' };
const emptyInterview = { scheduledAt: '', interviewer: '', format: 'In person', durationMinutes: 30, score: 0, notes: '', trialShiftAt: '', trialOutcome: '' };
const emptyReferences = { consent: false, status: 'NOT_STARTED', count: 0, wouldRehire: '', notes: '' };
const emptyCheckin = { dueAt: '', completedAt: '', notes: '' };
const emptyOnboarding = { startDate: '', mentor: '', paperwork: { i9: false, w4: false, michiganNewHire: false, handbook: false }, checkins: { day14: emptyCheckin, day30: emptyCheckin, day60: emptyCheckin, day90: emptyCheckin } };

const toInputDate = (value, dateOnly = false) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, dateOnly ? 10 : 16);
};

const normalizeCandidate = (row) => ({
  ...row,
  internalNotes: row.internalNotes || '', sourceChannel: row.sourceChannel || row.source || 'Preva careers website', nextActionAt: toInputDate(row.nextActionAt),
  screening: { ...emptyScreening, ...(row.screening || {}), contactedAt: toInputDate(row.screening?.contactedAt) },
  interview: { ...emptyInterview, ...(row.interview || {}), scheduledAt: toInputDate(row.interview?.scheduledAt), trialShiftAt: toInputDate(row.interview?.trialShiftAt) },
  references: { ...emptyReferences, ...(row.references || {}) },
  onboarding: {
    ...emptyOnboarding, ...(row.onboarding || {}), startDate: toInputDate(row.onboarding?.startDate, true),
    paperwork: { ...emptyOnboarding.paperwork, ...(row.onboarding?.paperwork || {}) },
    checkins: Object.fromEntries(['day14', 'day30', 'day60', 'day90'].map((key) => [key, { ...emptyCheckin, ...(row.onboarding?.checkins?.[key] || {}), dueAt: toInputDate(row.onboarding?.checkins?.[key]?.dueAt, true), completedAt: toInputDate(row.onboarding?.checkins?.[key]?.completedAt, true) }]))
  }
});
const candidateName = (row) => `${row.firstName || ''} ${row.lastName || ''}`.trim();
const isOverdue = (row) => row.status === 'NEW' && row.responseDueAt && new Date(row.responseDueAt) < new Date();

export default function CareerApplicationsPage() {
  const [rows, setRows] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(''), [search, setSearch] = useState(''), [statusFilter, setStatusFilter] = useState(''), [priority, setPriority] = useState('');
  const [selected, setSelected] = useState(null), [activeTab, setActiveTab] = useState('Overview');
  const [roleNames, setRoleNames] = useState({ 'general-application': 'General application' });

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [response, jobsResponse] = await Promise.all([api('/admin/career-applications'), api('/career-jobs')]);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Could not load career applications.');
      const applications = Array.isArray(body) ? body : []; setRows(applications);
      if (jobsResponse.ok) { const jobs = await jobsResponse.json(); setRoleNames({ 'general-application': 'General application', ...Object.fromEntries((Array.isArray(jobs) ? jobs : []).map((job) => [job.slug, job.title])) }); }
      const params = new URLSearchParams(window.location.search);
      if (params.get('status')) setStatusFilter(params.get('status'));
      if (params.get('priority')) setPriority(params.get('priority'));
      const candidate = applications.find((row) => row.id === params.get('candidate'));
      if (candidate) setSelected(normalizeCandidate(candidate));
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => rows.filter((row) => {
    const term = search.trim().toLowerCase();
    const haystack = `${candidateName(row)} ${row.email} ${row.phone} ${roleNames[row.role] || row.role} ${row.sourceChannel || ''}`.toLowerCase();
    return (!statusFilter || row.status === statusFilter) && (priority !== 'overdue' || isOverdue(row)) && (!term || haystack.includes(term));
  }), [rows, search, statusFilter, priority, roleNames]);

  const updateSelected = (path, value) => setSelected((current) => { const next = structuredClone(current); let target = next; path.slice(0, -1).forEach((key) => { target = target[key]; }); target[path.at(-1)] = value; return next; });

  const saveCandidate = async () => {
    if (!selected) return; setSaving(true); setError('');
    try {
      const response = await api(`/admin/career-applications/${selected.id}`, { method: 'PATCH', body: JSON.stringify({ status: selected.status, internalNotes: selected.internalNotes, sourceChannel: selected.sourceChannel, nextActionAt: selected.nextActionAt, screening: selected.screening, interview: selected.interview, references: selected.references, onboarding: selected.onboarding }) });
      const body = await response.json().catch(() => null); if (!response.ok) throw new Error(body?.message || 'Could not save the candidate record.');
      setSelected(normalizeCandidate(body)); setRows((current) => current.map((row) => row.id === body.id ? body : row));
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };

  const updateStatus = async (row, status) => {
    const response = await api(`/admin/career-applications/${row.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); if (!response.ok) return;
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, status, firstContactAt: item.firstContactAt || new Date().toISOString() } : item));
    setSelected((current) => current?.id === row.id ? { ...current, status, firstContactAt: current.firstContactAt || new Date().toISOString() } : current);
  };

  const downloadResume = async (row) => { const response = await api(`/admin/career-applications/${row.id}/resume`); if (!response.ok) return; const blob = await response.blob(), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = row.resume?.name || 'resume'; link.click(); URL.revokeObjectURL(url); };
  const exportCsv = () => { const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`; const lines = [['Applied', 'Name', 'Email', 'Phone', 'Role', 'Availability', 'Status', 'Source'], ...visible.map((row) => [row.createdAt, candidateName(row), row.email, row.phone, roleNames[row.role] || row.role, row.availability, row.status, row.sourceChannel || row.source])]; const blob = new Blob([lines.map((line) => line.map(quote).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = `preva-career-pipeline-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); };
  const scheduleOnboarding = (startDate) => { if (!startDate) { updateSelected(['onboarding', 'startDate'], ''); return; } const dates = {}; for (const [key, days] of Object.entries({ day14: 14, day30: 30, day60: 60, day90: 90 })) { const date = new Date(`${startDate}T12:00:00`); date.setDate(date.getDate() + days); dates[key] = date.toISOString().slice(0, 10); } setSelected((current) => ({ ...current, onboarding: { ...current.onboarding, startDate, checkins: Object.fromEntries(Object.entries(current.onboarding.checkins).map(([key, checkin]) => [key, { ...checkin, dueAt: dates[key] }])) } })); };

  return <Shell>
    <PageHeader eyebrow="Hiring pipeline" title="Career applications" description="Search the retained candidate database and run every hiring stage from one record." icon={BriefcaseBusiness} actions={<><button className="btn btn-secondary" type="button" onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="btn" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button></>} />
    {error && <div className="error" style={{ marginBottom: 20 }}>{error}</div>}
    <div className="panel ats-pipeline-panel"><div className="ats-toolbar"><div className="ats-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search applicant, email, phone, role or source" /></div><select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status.replaceAll('_', ' ')}</option>)}</select><select className="input" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All response times</option><option value="overdue">Overdue 24-hour response</option></select><span className="ats-result-count">{visible.length} candidate{visible.length === 1 ? '' : 's'}</span></div>
      {loading ? <LoadingSkeleton rows={7} /> : !visible.length ? <EmptyState icon={BriefcaseBusiness} title="No applications found" description="New career applications will appear here automatically." /> : <div style={{ overflowX: 'auto' }}><table className="table ats-table"><thead><tr><th>Applied / SLA</th><th>Candidate</th><th>Role</th><th>Availability</th><th>Status</th><th>Resume</th><th>Action</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} className={isOverdue(row) ? 'ats-overdue-row' : ''}><td>{new Date(row.createdAt).toLocaleDateString()}<br />{isOverdue(row) ? <small className="ats-overdue"><AlertTriangle size={12} /> Overdue</small> : row.firstContactAt ? <small className="ats-contacted"><FileCheck2 size={12} /> Contacted</small> : <small>Due {row.responseDueAt ? new Date(row.responseDueAt).toLocaleString() : 'within 24h'}</small>}</td><td><strong>{candidateName(row)}</strong><br /><small>{row.email}<br />{row.phone}</small></td><td>{roleNames[row.role] || row.role}<br /><small>{row.sourceChannel || row.source}</small></td><td>{row.availability}</td><td><select className="input ats-status-select" value={row.status} onChange={(event) => updateStatus(row, event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></td><td>{row.resume ? <button type="button" className="btn btn-secondary" onClick={() => downloadResume(row)}><Download size={14} /> Resume</button> : <small>No file</small>}</td><td><button className="btn btn-secondary" type="button" onClick={() => { setSelected(normalizeCandidate(row)); setActiveTab('Overview'); }}><Eye size={14} /> Open</button></td></tr>)}</tbody></table></div>}
    </div>

    {selected && <div className="modal-overlay ats-modal-overlay" onClick={() => setSelected(null)}><div className="modal-content ats-candidate-modal" onClick={(event) => event.stopPropagation()}>
      <div className="ats-modal-head"><div><span>{roleNames[selected.role] || selected.role}</span><h2>{candidateName(selected)}</h2><p>{selected.email} · {selected.phone} · Applied {new Date(selected.createdAt).toLocaleString()}</p></div><div><StatusBadge status={selected.status} /><button className="btn btn-secondary" onClick={() => setSelected(null)} type="button">Close</button></div></div>
      <div className="segmented-tabs ats-tabs">{tabs.map((tab) => <button className={`btn ${activeTab !== tab ? 'inactive-kind' : ''}`} key={tab} type="button" onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
      <div className="ats-tab-content">
        {activeTab === 'Overview' && <div className="ats-form-grid"><Field label="Pipeline status"><select className="input" value={selected.status} onChange={(event) => updateSelected(['status'], event.target.value)}>{statuses.map((status) => <option key={status}>{status.replaceAll('_', ' ')}</option>)}</select></Field><Field label="Source channel"><input className="input" value={selected.sourceChannel} onChange={(event) => updateSelected(['sourceChannel'], event.target.value)} /></Field><Field label="Next follow-up"><input className="input" type="datetime-local" value={selected.nextActionAt} onChange={(event) => updateSelected(['nextActionAt'], event.target.value)} /></Field><Field label="Availability"><div className="ats-readonly">{selected.availability || 'Not provided'}</div></Field><Field label="Applicant message" wide><div className="ats-readonly ats-message">{selected.message || 'No message provided.'}</div></Field><Field label="Internal hiring notes" wide><textarea className="input" rows={7} value={selected.internalNotes} onChange={(event) => updateSelected(['internalNotes'], event.target.value)} placeholder="Private notes, follow-up context, cross-role fit…" /></Field></div>}
        {activeTab === 'Screening' && <div className="ats-form-grid"><Field label="Screen outcome"><select className="input" value={selected.screening.outcome} onChange={(event) => updateSelected(['screening', 'outcome'], event.target.value)}>{['PENDING', 'ADVANCE', 'HOLD', 'PASS'].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Contacted at"><input className="input" type="datetime-local" value={selected.screening.contactedAt} onChange={(event) => updateSelected(['screening', 'contactedAt'], event.target.value)} /></Field><Field label="Transportation"><input className="input" value={selected.screening.transportation} onChange={(event) => updateSelected(['screening', 'transportation'], event.target.value)} /></Field><Field label="Pay alignment"><input className="input" value={selected.screening.payAligned} onChange={(event) => updateSelected(['screening', 'payAligned'], event.target.value)} /></Field><Field label="Competency answer" wide><textarea className="input" rows={4} value={selected.screening.competency} onChange={(event) => updateSelected(['screening', 'competency'], event.target.value)} /></Field><Field label="Screening notes" wide><textarea className="input" rows={6} value={selected.screening.notes} onChange={(event) => updateSelected(['screening', 'notes'], event.target.value)} /></Field></div>}
        {activeTab === 'Interview' && <div className="ats-form-grid"><Field label="Interview date & time"><input className="input" type="datetime-local" value={selected.interview.scheduledAt} onChange={(event) => updateSelected(['interview', 'scheduledAt'], event.target.value)} /></Field><Field label="Interviewer"><input className="input" value={selected.interview.interviewer} onChange={(event) => updateSelected(['interview', 'interviewer'], event.target.value)} /></Field><Field label="Format"><select className="input" value={selected.interview.format} onChange={(event) => updateSelected(['interview', 'format'], event.target.value)}><option>In person</option><option>Phone</option><option>Video</option><option>Paid trial shift</option></select></Field><Field label="Duration (minutes)"><input className="input" type="number" min="10" max="180" value={selected.interview.durationMinutes} onChange={(event) => updateSelected(['interview', 'durationMinutes'], event.target.value)} /></Field><Field label="Overall score (1–5)"><input className="input" type="number" min="0" max="5" step="0.5" value={selected.interview.score} onChange={(event) => updateSelected(['interview', 'score'], event.target.value)} /></Field><Field label="Trial shift"><input className="input" type="datetime-local" value={selected.interview.trialShiftAt} onChange={(event) => updateSelected(['interview', 'trialShiftAt'], event.target.value)} /></Field><Field label="Structured interview notes" wide><textarea className="input" rows={7} value={selected.interview.notes} onChange={(event) => updateSelected(['interview', 'notes'], event.target.value)} /></Field><Field label="Trial shift outcome" wide><textarea className="input" rows={3} value={selected.interview.trialOutcome} onChange={(event) => updateSelected(['interview', 'trialOutcome'], event.target.value)} /></Field></div>}
        {activeTab === 'References' && <div className="ats-form-grid"><Field label="Written consent"><label className="ats-check"><input type="checkbox" checked={selected.references.consent} onChange={(event) => updateSelected(['references', 'consent'], event.target.checked)} /> Candidate consent received</label></Field><Field label="Check status"><select className="input" value={selected.references.status} onChange={(event) => updateSelected(['references', 'status'], event.target.value)}>{['NOT_STARTED', 'IN_PROGRESS', 'COMPLETE', 'NOT_REQUIRED'].map((value) => <option key={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field><Field label="References completed"><input className="input" type="number" min="0" max="10" value={selected.references.count} onChange={(event) => updateSelected(['references', 'count'], event.target.value)} /></Field><Field label="Would rehire?"><select className="input" value={selected.references.wouldRehire} onChange={(event) => updateSelected(['references', 'wouldRehire'], event.target.value)}><option value="">Not answered</option><option>Yes</option><option>No</option><option>Mixed / unclear</option></select></Field><Field label="Reference notes" wide><textarea className="input" rows={8} value={selected.references.notes} onChange={(event) => updateSelected(['references', 'notes'], event.target.value)} /></Field></div>}
        {activeTab === 'Onboarding' && <div className="ats-onboarding"><div className="ats-form-grid"><Field label="Start date"><input className="input" type="date" value={selected.onboarding.startDate} onChange={(event) => scheduleOnboarding(event.target.value)} /></Field><Field label="Peer mentor"><input className="input" value={selected.onboarding.mentor} onChange={(event) => updateSelected(['onboarding', 'mentor'], event.target.value)} /></Field></div><div className="ats-paperwork"><strong>Day-one paperwork</strong>{[['i9', 'I-9'], ['w4', 'W-4'], ['michiganNewHire', 'Michigan new-hire report'], ['handbook', 'Handbook acknowledgement']].map(([key, label]) => <label className="ats-check" key={key}><input type="checkbox" checked={selected.onboarding.paperwork[key]} onChange={(event) => updateSelected(['onboarding', 'paperwork', key], event.target.checked)} /> {label}</label>)}</div><div className="ats-checkin-grid">{[['day14', '14-day'], ['day30', '30-day'], ['day60', '60-day'], ['day90', '90-day']].map(([key, label]) => <div className="ats-checkin" key={key}><strong>{label} check-in</strong><label>Due<input className="input" type="date" value={selected.onboarding.checkins[key].dueAt} onChange={(event) => updateSelected(['onboarding', 'checkins', key, 'dueAt'], event.target.value)} /></label><label>Completed<input className="input" type="date" value={selected.onboarding.checkins[key].completedAt} onChange={(event) => updateSelected(['onboarding', 'checkins', key, 'completedAt'], event.target.value)} /></label><textarea className="input" rows={3} value={selected.onboarding.checkins[key].notes} onChange={(event) => updateSelected(['onboarding', 'checkins', key, 'notes'], event.target.value)} placeholder="Notes" /></div>)}</div></div>}
        {activeTab === 'History' && <div className="ats-history">{[...(selected.history || [])].reverse().map((item, index) => <div key={`${item.at}-${index}`}><i /><div><strong>{item.action}</strong><span>{item.by || 'System'} · {new Date(item.at).toLocaleString()}</span></div></div>)}{!selected.history?.length && <EmptyState icon={CalendarClock} title="No history yet" description="Candidate updates will be recorded here." />}</div>}
      </div>
      <div className="ats-modal-actions"><div>{selected.resume && <button type="button" className="btn btn-secondary" onClick={() => downloadResume(selected)}><Download size={14} /> Download resume</button>}</div><button className="btn" type="button" disabled={saving} onClick={saveCandidate}><Save size={15} /> {saving ? 'Saving…' : 'Save candidate record'}</button></div>
    </div></div>}
  </Shell>;
}

function Field({ label, children, wide = false }) { return <label className={wide ? 'ats-field ats-field-wide' : 'ats-field'}><span>{label}</span>{children}</label>; }
