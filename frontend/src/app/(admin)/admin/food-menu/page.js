'use client';

import { useEffect, useState } from 'react';
import { Plus, ListTree, Upload, Trash2, Edit, ExternalLink } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader, EmptyState } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';

const categories = [
  'Preva Wings',
  'Preva Burger',
  'Quesadillas',
  'Tacos',
  'Preva Bites',
  'Pasta',
  'Salads',
  'Entrées',
  'Sides',
  'Dessert',
  'Others'
];

const emptyForm = {
  id: '',
  name: '',
  slug: '',
  price: '',
  description: '',
  category: 'Preva Wings',
  image: '',
  tags: '',
  pairings: '',
  uberEatsUrl: '',
  doorDashUrl: '',
  grubhubUrl: '',
  available: true,
  featured: false,
  servings: '1 Person',
  showServings: false,
  sortOrder: 10
};

export default function FoodMenuManager() {
  const confirmAction = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('All');

  async function load() {
    setLoading(true);
    const response = await api('/admin/menu-items');
    if (response.ok) {
      setRows(await response.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function edit(row = emptyForm) {
    setForm({
      ...emptyForm,
      ...row,
      tags: Array.isArray(row.tags) ? row.tags.join(', ') : (row.tags || ''),
      pairings: Array.isArray(row.pairings) ? row.pairings.join(', ') : (row.pairings || '')
    });
    setOpen(true);
  }

  function change(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function uploadImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return alert('Image must be smaller than 5MB.');

    setUploading(true);
    const data = new FormData();
    data.append('files', file);
    const response = await api('/admin/media/upload', { method: 'POST', body: data });
    if (response.ok) {
      const uploaded = await response.json();
      setForm((current) => ({ ...current, image: uploaded[0]?.url || current.image }));
    } else {
      alert((await response.json().catch(() => null))?.message || 'Image upload failed.');
    }
    setUploading(false);
  }

  async function save(event) {
    event.preventDefault();
    const payload = {
      ...form,
      sortOrder: Number(form.sortOrder) || 10,
      tags: typeof form.tags === 'string' ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : form.tags,
      pairings: typeof form.pairings === 'string' ? form.pairings.split(',').map(p => p.trim()).filter(Boolean) : form.pairings
    };

    const response = await api(form.id ? `/admin/menu-items/${form.id}` : '/admin/menu-items', {
      method: form.id ? 'PUT' : 'POST',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      return alert((await response.json().catch(() => null))?.message || 'Could not save menu item.');
    }
    setOpen(false);
    await load();
    alert(form.id ? 'Menu item updated successfully!' : 'Menu item created successfully! Its dedicated details page is now live.');
  }

  async function remove(row) {
    if (!await confirmAction({
      title: 'Delete menu item?',
      description: `"${row.name}" and its public details page will be removed from the restaurant menu.`,
      confirmLabel: 'Delete item',
      tone: 'danger'
    })) return;

    const response = await api(`/admin/menu-items/${row.id}`, { method: 'DELETE' });
    if (response.ok) {
      await load();
      alert('Menu item deleted successfully!');
    }
  }

  const filteredRows = activeTab === 'All' 
    ? rows 
    : rows.filter(r => r.category === activeTab);

  const previewSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-dish';

  return (
    <Shell>
      <PageHeader
        eyebrow="Kitchen & Restaurant"
        title="Restaurant Food Menu & Details Pages"
        description="Every dish added here automatically generates its dedicated public details page, SEO tags, delivery channels, and FAQ section."
        icon={ListTree}
        actions={<button className="btn" onClick={() => edit()}><Plus size={15} /> Add new dish</button>}
      />

      {/* Category Tabs */}
      <div className="segmented-tabs" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All', ...categories].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn ${activeTab === cat ? '' : 'inactive-kind'}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : !filteredRows.length ? (
        <EmptyState
          title="No menu items found"
          description={activeTab === 'All' ? "Start adding signature dishes. Each dish gets a dedicated details page automatically." : `No items added under "${activeTab}" category yet.`}
          action={activeTab === 'All' ? <button className="btn" onClick={() => edit()}><Plus size={15} /> Add new dish</button> : null}
        />
      ) : (
        <div className="panel" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Image</th>
                <th>Dish Info & Public URL</th>
                <th>Category</th>
                <th>Price</th>
                <th>Tags</th>
                <th>Status</th>
                <th>Sort Order</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const dishSlug = row.slug || row.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                return (
                  <tr key={row.id}>
                    <td>
                      {row.image ? (
                        <img
                          src={row.image}
                          alt={row.name}
                          style={{ width: '54px', height: '54px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                      ) : (
                        <div style={{ width: '54px', height: '54px', background: 'var(--surface-raised)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--ink-muted)' }}>
                          🍲
                        </div>
                      )}
                    </td>
                    <td>
                      <b style={{ color: 'var(--ink)', fontSize: '14px' }}>{row.name}</b>
                      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <a
                          href={`/menu/${dishSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Open public dish details page"
                        >
                          <span>/menu/{dishSlug}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                      {row.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-muted)', maxWidth: '420px', whiteSpace: 'normal' }}>
                          {row.description}
                        </p>
                      )}
                    </td>
                    <td><span className="badge">{row.category}</span></td>
                    <td>
                      <code style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontWeight: 600, color: 'var(--accent)', fontSize: '13px' }}>{row.price}</code>
                    </td>
                    <td>
                      {row.tags && row.tags.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '160px' }}>
                          {(Array.isArray(row.tags) ? row.tags : row.tags.split(',')).map((t, i) => (
                            <span key={i} style={{ fontSize: '10px', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: '4px', color: 'var(--ink-muted)' }}>
                              {t.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${row.available ? 'badge-published' : 'badge-trash'}`}>
                        {row.available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>{row.sortOrder || 0}</td>
                    <td>
                      <div className="table-actions">
                        <a
                          href={`/menu/${dishSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                          title="View Public Details Page"
                          style={{ padding: '6px 8px' }}
                        >
                          <ExternalLink size={14} />
                        </a>
                        <button className="btn btn-secondary" onClick={() => edit(row)} title="Edit item">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger" onClick={() => remove(row)} title="Delete item">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <form className="modal-content" onSubmit={save} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3>{form.id ? 'Edit Menu Dish' : 'Add New Menu Dish'}</h3>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  A public details page will be automatically active at: <code style={{ color: 'var(--accent)' }}>/menu/{previewSlug}</code>
                </p>
              </div>
              <button className="icon-button" type="button" onClick={() => setOpen(false)}>×</button>
            </div>

            <div className="form-grid">
              <label className="field field-span">
                Dish Name *
                <input className="input" name="name" value={form.name} onChange={change} required placeholder="e.g. Rasta Pasta, Truffle Steak Bites" />
              </label>

              <label className="field">
                Custom URL Slug (optional)
                <input className="input" name="slug" value={form.slug || ''} onChange={change} placeholder={`e.g. ${previewSlug}`} />
              </label>

              <label className="field">
                Price *
                <input className="input" name="price" value={form.price} onChange={change} required placeholder="e.g. $22.00" />
              </label>

              <label className="field">
                Category *
                <select className="input" name="category" value={form.category} onChange={change}>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                Sort Order
                <input className="input" type="number" name="sortOrder" value={form.sortOrder} onChange={change} />
              </label>

              <label className="field field-span">
                Description (Ingredients, flavor profile, chef notes)
                <textarea className="input" name="description" value={form.description} onChange={change} rows="3" placeholder="Describe the flavors, spices, preparation style..." />
              </label>

              <div className="field field-span">
                <label>Dish Photo (High Resolution WebP/JPG)</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '4px' }}>
                  {form.image && (
                    <img
                      src={form.image}
                      alt="Preview"
                      style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)' }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                    <input className="input" name="image" value={form.image} onChange={change} placeholder="Paste live image URL or upload image below..." style={{ marginBottom: 0 }} />
                    <label className="btn btn-secondary" style={{ display: 'inline-flex', width: 'fit-content', cursor: 'pointer', gap: '8px', margin: 0, padding: '8px 14px' }}>
                      <Upload size={14} />
                      {uploading ? 'Uploading...' : 'Upload Image File'}
                      <input type="file" accept="image/*" onChange={uploadImage} disabled={uploading} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              <label className="field field-span">
                Dietary & Highlight Tags (comma separated)
                <input className="input" name="tags" value={form.tags || ''} onChange={change} placeholder="e.g. spicy, contains gluten, contains dairy, chef special, popular" />
              </label>

              <label className="field field-span">
                Suggested Pairings (comma separated dish names)
                <input className="input" name="pairings" value={form.pairings || ''} onChange={change} placeholder="e.g. Preva Quesadillas, Mac & Cheese, House Salad" />
              </label>

              <label className="field">
                Custom Uber Eats Link (optional)
                <input className="input" name="uberEatsUrl" value={form.uberEatsUrl || ''} onChange={change} placeholder="https://www.order.store/..." />
              </label>

              <label className="field">
                Custom DoorDash Link (optional)
                <input className="input" name="doorDashUrl" value={form.doorDashUrl || ''} onChange={change} placeholder="https://www.doordash.com/..." />
              </label>

              <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                <input type="checkbox" name="available" checked={form.available} onChange={change} />
                Dish is Active and Visible to Public
              </label>

              <label className="field" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                <input type="checkbox" name="featured" checked={Boolean(form.featured)} onChange={change} />
                Feature as Chef&rsquo;s Special Dish
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn" type="submit" disabled={uploading}>
                Save &amp; Publish Details Page
              </button>
            </div>
          </form>
        </div>
      )}
    </Shell>
  );
}
