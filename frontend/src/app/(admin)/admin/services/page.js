'use client';

import { useEffect, useState } from 'react';
import { Plus, Sparkles, Edit, Trash2 } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader, StatusBadge, EmptyState } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';

const emptyForm = { id: '', title: '', slug: '', excerpt: '', content: '', image: '', icon: '', status: 'DRAFT', sortOrder: 0, seoTitle: '', seoDescription: '' };

export default function ServicesManager() {
  const confirmAction = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const response = await api('/admin/services');
    if (response.ok) setRows(await response.json());
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function edit(row = emptyForm) { setForm({ ...emptyForm, ...row }); setOpen(true); }
  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  async function save(event) {
    event.preventDefault();
    const response = await api(form.id ? `/admin/services/${form.id}` : '/admin/services', { method: form.id ? 'PUT' : 'POST', body: JSON.stringify(form) });
    if (!response.ok) return alert((await response.json().catch(() => null))?.message || 'Could not save service.');
    setOpen(false); await load();
  }
  async function remove(row) {
    if (!await confirmAction({ title: 'Delete service?', description: `${row.title} will be permanently removed.`, confirmLabel: 'Delete service', tone: 'danger' })) return;
    const response = await api(`/admin/services/${row.id}`, { method: 'DELETE' });
    if (response.ok) await load();
  }

  return <Shell>
    <PageHeader eyebrow="Website" title="Services" description="Manage the experiences shown on the public website." icon={Sparkles} actions={<button className="btn" onClick={() => edit()}><Plus size={15} /> New service</button>} />
    {loading ? <div className="panel"><LoadingSkeleton rows={5} /></div> : !rows.length ? <EmptyState title="No services yet" description="Create dining, nightlife or other bookable experiences." action={<button className="btn" onClick={() => edit()}>Create service</button>} /> : <div className="panel" style={{ padding: 0, overflowX: 'auto' }}><table className="table"><thead><tr><th>Service</th><th>Slug</th><th>Status</th><th>Order</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b>{row.title}</b><small style={{ display: 'block' }}>{row.excerpt}</small></td><td>{row.slug}</td><td><StatusBadge status={row.status} /></td><td>{row.sortOrder || 0}</td><td>{new Date(row.updatedAt).toLocaleDateString()}</td><td><div className="table-actions"><button className="btn btn-secondary" onClick={() => edit(row)} title="Edit service"><Edit size={14} /></button><button className="btn btn-danger" onClick={() => remove(row)} title="Delete service"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>}
    {open && <div className="modal-overlay" onClick={() => setOpen(false)}><form className="modal-content" onSubmit={save} onClick={(event) => event.stopPropagation()} style={{ maxWidth: 840 }}><div className="modal-header"><div><h3>{form.id ? 'Edit service' : 'Create service'}</h3><p>Changes appear on the website as soon as the service is published.</p></div><button className="icon-button" type="button" onClick={() => setOpen(false)}>×</button></div><div className="form-grid"><label className="field">Title<input className="input" name="title" value={form.title} onChange={change} required /></label><label className="field">Slug<input className="input" name="slug" value={form.slug} onChange={change} placeholder="generated-from-title" /></label><label className="field field-span">Short description<textarea className="input" name="excerpt" value={form.excerpt} onChange={change} rows="2" /></label><label className="field field-span">Content<textarea className="input" name="content" value={form.content} onChange={change} rows="8" placeholder="HTML content" /></label><label className="field field-span">Image URL<input className="input" name="image" value={form.image} onChange={change} /></label><label className="field">Status<select className="input" name="status" value={form.status} onChange={change}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></label><label className="field">Sort order<input className="input" type="number" name="sortOrder" value={form.sortOrder} onChange={change} /></label><label className="field">SEO title<input className="input" name="seoTitle" value={form.seoTitle} onChange={change} /></label><label className="field">SEO description<input className="input" name="seoDescription" value={form.seoDescription} onChange={change} /></label></div><div className="modal-actions"><button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="btn" type="submit">Save service</button></div></form></div>}
  </Shell>;
}
