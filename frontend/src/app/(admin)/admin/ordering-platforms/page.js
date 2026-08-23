'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Plus, ShoppingCart, Upload, Edit, Trash2 } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';

const emptyForm = {
  id: '',
  name: '',
  providerKey: '',
  description: '',
  logo: '',
  availability: 'BOTH',
  url: '',
  isActive: true,
  sortOrder: 0
};

export default function OrderingPlatformsManager() {
  const confirmAction = useConfirm();
  const fileInputRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  async function load() {
    setLoading(true);
    const response = await api('/admin/ordering-platforms');
    if (response.ok) setRows(await response.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function edit(row = emptyForm) {
    setForm({ ...emptyForm, ...row, isActive: row.isActive ?? true });
    setOpen(true);
  }

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function uploadLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return alert('Logo must be smaller than 5MB.');

    setUploading(true);
    const data = new FormData();
    data.append('files', file);
    const response = await api('/admin/media/upload', { method: 'POST', body: data });
    if (response.ok) {
      const uploaded = await response.json();
      setForm((current) => ({ ...current, logo: uploaded[0]?.url || current.logo }));
    } else {
      alert((await response.json().catch(() => null))?.message || 'Logo upload failed.');
    }
    setUploading(false);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const response = await api(form.id ? `/admin/ordering-platforms/${form.id}` : '/admin/ordering-platforms', {
      method: form.id ? 'PUT' : 'POST',
      body: JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) || 0 })
    });
    setSaving(false);
    if (!response.ok) return alert((await response.json().catch(() => null))?.message || 'Could not save ordering platform.');
    setOpen(false);
    await load();
  }

  async function remove(row) {
    const approved = await confirmAction({
      title: 'Delete ordering platform?',
      description: `${row.name} will be permanently removed from the Order Online popup.`,
      confirmLabel: 'Delete platform',
      tone: 'danger'
    });
    if (!approved) return;
    const response = await api(`/admin/ordering-platforms/${row.id}`, { method: 'DELETE' });
    if (response.ok) await load();
  }

  return (
    <Shell>
      <PageHeader
        eyebrow="Website"
        title="Ordering Platforms"
        description="Manage the pickup and delivery services displayed in the global Order Online popup."
        icon={ShoppingCart}
        actions={<button className="btn" type="button" onClick={() => edit()}><Plus size={15} /> Add platform</button>}
      />

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : !rows.length ? (
        <EmptyState
          icon={ShoppingCart}
          title="No ordering platforms yet"
          description="Add DoorDash, Uber Eats, direct ordering, or a call-to-order option."
          action={<button className="btn" type="button" onClick={() => edit()}>Add first platform</button>}
        />
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead><tr><th>Platform</th><th>Availability</th><th>Status</th><th>Sort order</th><th>Ordering URL</th><th>Actions</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div className="ordering-logo-preview">
                        {row.logo ? <img src={row.logo} alt="" /> : <span>{row.name?.charAt(0)}</span>}
                      </div>
                      <div><b>{row.name}</b><small style={{ display: 'block' }}>{row.description}</small></div>
                    </div>
                  </td>
                  <td><span className="badge">{row.availability}</span></td>
                  <td><StatusBadge status={row.isActive ? 'ACTIVE' : 'DISABLED'} /></td>
                  <td>{row.sortOrder || 0}</td>
                  <td><span className="ordering-url-cell" title={row.url}>{row.url}</span></td>
                  <td><div className="table-actions"><button className="btn btn-secondary" type="button" onClick={() => edit(row)} title="Edit platform"><Edit size={14} /></button><button className="btn btn-danger" type="button" onClick={() => remove(row)} title="Delete platform"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <form className="modal-content" onSubmit={save} style={{ maxWidth: 780 }}>
            <div className="modal-header">
              <div><h3>{form.id ? 'Edit ordering platform' : 'Add ordering platform'}</h3><p>Only active platforms appear on the public website.</p></div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>

            <div className="form-grid">
              <label className="field">Platform name<input className="input" name="name" value={form.name} onChange={change} placeholder="DoorDash" required /></label>
              <label className="field">Provider key<input className="input" name="providerKey" value={form.providerKey} onChange={change} placeholder="generated-from-name" /></label>
              <label className="field field-span">Short description<textarea className="input" name="description" value={form.description} onChange={change} rows="2" placeholder="Pickup or delivery through this platform." /></label>
              <label className="field">Availability<select className="input" name="availability" value={form.availability} onChange={change}><option value="PICKUP">Pickup</option><option value="DELIVERY">Delivery</option><option value="BOTH">Pickup & Delivery</option></select></label>
              <label className="field">Sort order<input className="input" name="sortOrder" type="number" value={form.sortOrder} onChange={change} /></label>
              <label className="field field-span">Ordering URL<input className="input" name="url" type="text" value={form.url} onChange={change} placeholder="https://… or tel:+13132863586" required /></label>

              <div className="field field-span">
                <span>Platform logo</span>
                <div className="ordering-logo-field">
                  <div className="ordering-logo-large">
                    {form.logo ? <img src={form.logo} alt="Platform logo preview" /> : <ImagePlus size={25} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <input className="input" name="logo" value={form.logo} onChange={change} placeholder="Logo URL or upload an image" />
                    <button className="btn btn-secondary" type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ marginTop: 8 }}>
                      <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload logo'}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadLogo} hidden />
                  </div>
                </div>
              </div>

              <label className="ordering-active-toggle field-span">
                <input name="isActive" type="checkbox" checked={form.isActive} onChange={change} />
                <span><b>Active platform</b><small>Show this option in the Order Online popup.</small></span>
              </label>
            </div>

            <div className="modal-actions"><button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save platform'}</button></div>
          </form>
        </div>
      )}
    </Shell>
  );
}
