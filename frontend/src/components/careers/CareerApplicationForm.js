'use client';

import { useState } from 'react';
import Link from 'next/link';
import SvgIcon from '../SvgIcon';
import { showError, showSuccess } from '../../lib/swal';

const blank = { firstName: '', lastName: '', email: '', phone: '', role: '', availability: '', startDate: '', message: '', consent: false };

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CareerApplicationForm({ initialRole = '', jobs = [] }) {
  const [form, setForm] = useState({ ...blank, role: initialRole });
  const [resume, setResume] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!resume) throw new Error('Please upload your résumé / CV.');
      if (resume && resume.size > 3 * 1024 * 1024) throw new Error('Résumé must be 3 MB or smaller.');
      const response = await fetch('/api/career-applications', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, resume: resume ? { name: resume.name, type: resume.type, size: resume.size, data: await toDataUrl(resume) } : null })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not send your application.');
      setSuccess(true);
      showSuccess('Application received', 'Thanks for your interest. The Preva Kitchen team aims to follow up within 24 hours.');
    } catch (submitError) {
      setError(submitError.message);
      showError('Application not sent', submitError.message || 'Please check the form and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) return <div className="success success-visible"><div className="check"><SvgIcon name="check" size={28} /></div><h2>Application received.</h2><p>Thanks for your interest. The Preva team aims to follow up within 24 hours.</p><Link className="btn light" href="/careers">Back to careers</Link></div>;

  return (
    <form className="form" onSubmit={submit}>
      <div className="field"><label htmlFor="career-first">First name *</label><input id="career-first" name="firstName" value={form.firstName} onChange={update} required /></div>
      <div className="field"><label htmlFor="career-last">Last name *</label><input id="career-last" name="lastName" value={form.lastName} onChange={update} required /></div>
      <div className="field"><label htmlFor="career-email">Email *</label><input id="career-email" name="email" value={form.email} onChange={update} type="email" required /></div>
      <div className="field"><label htmlFor="career-phone">Phone *</label><input id="career-phone" name="phone" value={form.phone} onChange={update} type="tel" required /></div>
      <div className="field full"><label htmlFor="career-role">Role or future interest *</label><select id="career-role" name="role" value={form.role} onChange={update} required><option value="">Select a role</option>{jobs.map((job) => <option value={job.slug} key={job.slug}>{job.title}</option>)}<option value="general-application">General Application</option></select></div>
      <div className="field"><label htmlFor="career-availability">Availability *</label><select id="career-availability" name="availability" value={form.availability} onChange={update} required><option value="">Select one</option><option>Open availability</option><option>Days</option><option>Evenings</option><option>Weekends</option><option>Flexible / discuss</option></select></div>
      <div className="field"><label htmlFor="career-date">Available start date</label><input id="career-date" name="startDate" value={form.startDate} onChange={update} type="date" /></div>
      <div className="field full"><label htmlFor="career-resume">Résumé / CV *</label><input id="career-resume" type="file" accept=".pdf,.doc,.docx" onChange={(event) => setResume(event.target.files?.[0] || null)} required /></div>
      <div className="field full"><label htmlFor="career-message">Tell us about yourself</label><textarea id="career-message" name="message" value={form.message} onChange={update} placeholder="Experience, preferred shifts, transportation, or why Preva interests you..." /></div>
      <div className="field full"><label className="consent-label"><input name="consent" type="checkbox" checked={form.consent} onChange={update} required />I agree that Preva may contact me about this and future job opportunities. *</label><span className="fine">Your application is stored securely and used only for hiring.</span></div>
      {error && <div className="field full form-error">{error}</div>}
      <div className="field full"><button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application →'}</button></div>
    </form>
  );
}
