'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, ListTree, Upload, Trash2, Edit, ExternalLink, FolderTree, Search, FileText } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader, EmptyState } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api, uploadMediaFile } from '@/lib/admin-api';
import { CANONICAL_CATEGORIES, mergeMenuCategories } from '@/lib/menu-categories';

const NEW_CATEGORY = '__new__';

const emptyCategory = { id: '', name: '', image: '', sortOrder: 100 };

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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managedCategories, setManagedCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [categoryUploading, setCategoryUploading] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState('');

  async function load() {
    setLoading(true);
    const [response, categoryResponse] = await Promise.all([
      api('/admin/menu-items'),
      api('/admin/menu-categories')
    ]);
    if (response.ok) {
      setRows(await response.json());
    }
    if (categoryResponse.ok) {
      setManagedCategories(await categoryResponse.json());
    }
    setLoading(false);
  }

  const categories = useMemo(() => mergeMenuCategories(managedCategories, rows), [managedCategories, rows]);

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
    setNewCategoryName('');
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
    const response = await uploadMediaFile(file);
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
    let category = form.category;
    if (category === NEW_CATEGORY) {
      category = newCategoryName.trim();
      if (!category) return alert('Enter a name for the new category.');
      const existing = categories.find((name) => name.toLowerCase() === category.toLowerCase());
      if (existing) {
        category = existing;
      } else {
        const created = await api('/admin/menu-categories', {
          method: 'POST',
          body: JSON.stringify({ name: category, sortOrder: nextCategorySort() })
        });
        if (!created.ok) {
          return alert((await created.json().catch(() => null))?.message || 'Could not create the category.');
        }
      }
    }

    // priceCents comes along with an edited row; drop it so the price typed
    // in the form is the one that gets saved.
    const { priceCents, ...rest } = form;
    const payload = {
      ...rest,
      category,
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

  async function setVisibility(type, target, isVisible) {
    const key = type === 'item' ? `item:${target.id}` : `category:${target.name}`;
    setVisibilitySaving(key);
    try {
      const response = await api('/admin/menu-visibility', {
        method: 'PATCH',
        body: JSON.stringify({
          type,
          ...(type === 'item' ? { id: target.id } : { name: target.name }),
          isVisible
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Could not update visibility.');
      if (type === 'item') {
        setRows((current) => current.map((row) => row.id === target.id ? { ...row, isVisible } : row));
      } else {
        setManagedCategories((current) => {
          const found = current.some((category) => category.name === target.name);
          return found
            ? current.map((category) => category.name === target.name ? { ...category, isVisible } : category)
            : [{ id: data.id, name: target.name, slug: target.name, image: '', sortOrder: 0, isVisible }, ...current];
        });
      }
      alert(`${type === 'item' ? 'Menu item' : 'Category'} is now ${isVisible ? 'Visible' : 'Hidden'}.`);
    } catch (error) {
      alert(error.message || 'Could not update visibility.');
    } finally {
      setVisibilitySaving('');
    }
  }

  function nextCategorySort() {
    const highest = Math.max(
      (CANONICAL_CATEGORIES.length - 1) * 10,
      ...managedCategories.map((category) => Number(category.sortOrder) || 0)
    );
    return highest + 10;
  }

  /* ── Category manager ── */

  function editCategory(category) {
    setCategoryForm(category
      ? { ...emptyCategory, ...category }
      : { ...emptyCategory, sortOrder: nextCategorySort() });
  }

  async function uploadCategoryImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Please choose an image file.');
    if (file.size > 5 * 1024 * 1024) return alert('Image must be smaller than 5MB.');

    setCategoryUploading(true);
    const response = await uploadMediaFile(file);
    if (response.ok) {
      const uploaded = await response.json();
      setCategoryForm((current) => ({ ...current, image: uploaded[0]?.url || current.image }));
    } else {
      alert((await response.json().catch(() => null))?.message || 'Image upload failed.');
    }
    setCategoryUploading(false);
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryForm.name.trim()) return alert('A category name is required.');
    const response = await api(categoryForm.id ? `/admin/menu-categories/${categoryForm.id}` : '/admin/menu-categories', {
      method: categoryForm.id ? 'PUT' : 'POST',
      body: JSON.stringify({
        name: categoryForm.name,
        image: categoryForm.image,
        sortOrder: Number(categoryForm.sortOrder) || 0
      })
    });
    if (!response.ok) {
      return alert((await response.json().catch(() => null))?.message || 'Could not save the category.');
    }
    editCategory(null);
    await load();
  }

  async function removeCategory(category) {
    const count = rows.filter((row) => row.category === category.name).length;
    if (category.name === 'Others' && count > 0) {
      return alert('Move dishes out of Others before deleting this category.');
    }
    if (!await confirmAction({
      title: 'Delete category?',
      description: count
        ? `"${category.name}" has ${count} dish${count === 1 ? '' : 'es'}. They will be moved to Others, not deleted.`
        : `"${category.name}" will be removed from the category list.`,
      confirmLabel: 'Delete category',
      tone: 'danger'
    })) return;

    const path = category.id
      ? `/admin/menu-categories/${category.id}`
      : `/admin/menu-categories/by-name/${encodeURIComponent(category.name)}`;
    const response = await api(path, { method: 'DELETE' });
    if (!response.ok) {
      return alert((await response.json().catch(() => null))?.message || 'Could not delete the category.');
    }
    const result = await response.json().catch(() => null);
    await load();
    if (result?.movedDishes) {
      alert(`Category deleted. ${result.movedDishes} dish${result.movedDishes === 1 ? ' was' : 'es were'} moved to Others.`);
    }
  }

  // Search runs across every category: name, slug, description, category,
  // price and tags all match.
  const query = search.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    if (activeTab !== 'All' && row.category !== activeTab) return false;
    if (statusFilter === 'available' && !row.available) return false;
    if (statusFilter === 'unavailable' && row.available) return false;
    if (statusFilter === 'featured' && !row.featured) return false;
    if (statusFilter === 'visible' && row.isVisible === false) return false;
    if (statusFilter === 'hidden' && row.isVisible !== false) return false;
    if (!query) return true;
    const tags = Array.isArray(row.tags) ? row.tags.join(' ') : (row.tags || '');
    return [row.name, row.slug, row.description, row.category, row.price, tags]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });

  const countFor = (cat) => (cat === 'All' ? rows.length : rows.filter((row) => row.category === cat).length);

  const previewSlug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-dish';

  return (
    <Shell>
      <PageHeader
        eyebrow="Kitchen & Restaurant"
        title="Restaurant Food Menu & Details Pages"
        description="Every dish added here automatically generates its dedicated public details page, SEO tags, delivery channels, and FAQ section."
        icon={ListTree}
        actions={(
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={() => { editCategory(null); setCategoriesOpen(true); }}>
              <FolderTree size={15} /> Manage categories
            </button>
            <button className="btn" onClick={() => edit()}><Plus size={15} /> Add new dish</button>
          </div>
        )}
      />

      {/* Search & Filters */}
      <div className="panel" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px', padding: '12px' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-muted)' }} />
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); if (event.target.value) setActiveTab('All'); }}
            placeholder="Search all dishes by name, category, tag, price..."
            style={{ margin: 0, paddingLeft: '34px', width: '100%' }}
            aria-label="Search dishes"
          />
        </div>
        <select className="input" value={activeTab} onChange={(event) => setActiveTab(event.target.value)} style={{ margin: 0, flex: '0 1 200px' }} aria-label="Filter by category">
          <option value="All">All categories ({rows.length})</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat} ({countFor(cat)})</option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ margin: 0, flex: '0 1 170px' }} aria-label="Filter by status">
          <option value="all">All statuses</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
          <option value="featured">Chef&rsquo;s specials</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        {(search || activeTab !== 'All' || statusFilter !== 'all') && (
          <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setActiveTab('All'); setStatusFilter('all'); }}>
            Clear
          </button>
        )}
        <span style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
          {filteredRows.length} of {rows.length} dishes
        </span>
      </div>

      {/* Category Tabs */}
      <div className="segmented-tabs" style={{ marginBottom: '20px', flexWrap: 'wrap' }}>
        {['All', ...categories.filter((cat) => countFor(cat) > 0)].map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn ${activeTab === cat ? '' : 'inactive-kind'}`}
            onClick={() => setActiveTab(cat)}
          >
            {cat} <span style={{ opacity: 0.6 }}>({countFor(cat)})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : !filteredRows.length ? (
        <EmptyState
          title="No menu items found"
          description={query || statusFilter !== 'all'
            ? 'No dishes match this search or filter.'
            : activeTab === 'All' ? "Start adding signature dishes. Each dish gets a dedicated details page automatically." : `No items added under "${activeTab}" category yet.`}
          action={activeTab === 'All' && !query && statusFilter === 'all' ? <button className="btn" onClick={() => edit()}><Plus size={15} /> Add new dish</button> : null}
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
                <th>Visibility</th>
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
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${row.isVisible === false ? 'badge-trash' : 'badge-published'}`}>
                          {row.isVisible === false ? 'Hidden' : 'Visible'}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={visibilitySaving === `item:${row.id}`}
                          onClick={() => setVisibility('item', row, row.isVisible === false)}
                        >
                          {visibilitySaving === `item:${row.id}` ? 'Saving…' : row.isVisible === false ? 'Unhide' : 'Hide'}
                        </button>
                      </div>
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
                        <Link
                          href={`/admin/menu-details?id=${row.id}`}
                          className="btn btn-secondary"
                          title="Edit details page (About, FAQs, delivery links)"
                          style={{ padding: '6px 8px' }}
                        >
                          <FileText size={14} />
                        </Link>
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
                  <option value={NEW_CATEGORY}>+ Add new category...</option>
                </select>
                {form.category === NEW_CATEGORY && (
                  <input
                    className="input"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="New category name, e.g. Drinks"
                    style={{ marginTop: '6px' }}
                    autoFocus
                    required
                  />
                )}
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
                Available to order
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

      {/* Category Manager Modal */}
      {categoriesOpen && (
        <div className="modal-overlay" onClick={() => setCategoriesOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h3>Menu Categories</h3>
                <p style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                  Set a category&rsquo;s photo and sort number to control its position on the menu and homepage. Hide or show it any time; deleting a category moves its dishes to Others.
                </p>
              </div>
              <button className="icon-button" type="button" onClick={() => setCategoriesOpen(false)}>×</button>
            </div>

            <form onSubmit={saveCategory} className="form-grid" style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '10px', marginBottom: '16px' }}>
              <label className="field">
                {categoryForm.id ? 'Category name' : 'New category name'} *
                <input className="input" value={categoryForm.name} onChange={(e) => setCategoryForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Drinks" required />
              </label>
              <label className="field">
                Sort order
                <input className="input" type="number" value={categoryForm.sortOrder} onChange={(e) => setCategoryForm((c) => ({ ...c, sortOrder: e.target.value }))} />
                <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Lower numbers appear first. Built-in categories default to 0, 10, 20 ... 90.</span>
              </label>
              <div className="field field-span">
                <label>Category photo (round image on /menu)</label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                  {categoryForm.image && (
                    <img src={categoryForm.image} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '50%', border: '1px solid var(--border)' }} />
                  )}
                  <input className="input" value={categoryForm.image} onChange={(e) => setCategoryForm((c) => ({ ...c, image: e.target.value }))} placeholder="Paste image URL or upload" style={{ margin: 0, flex: 1 }} />
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', cursor: 'pointer', gap: '6px', margin: 0, padding: '8px 12px' }}>
                    <Upload size={14} />
                    {categoryUploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" onChange={uploadCategoryImage} disabled={categoryUploading} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
              <div className="field field-span" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                {categoryForm.id && (
                  <button type="button" className="btn btn-secondary" onClick={() => editCategory(null)}>Cancel edit</button>
                )}
                <button type="submit" className="btn" disabled={categoryUploading}>
                  {categoryForm.id ? 'Update category' : <><Plus size={14} /> Save category</>}
                </button>
              </div>
            </form>

            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '56px' }}>Photo</th>
                    <th>Category</th>
                    <th>Dishes</th>
                    <th>Visibility</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((name) => {
                    const saved = managedCategories.find((category) => category.name === name);
                    const builtIn = CANONICAL_CATEGORIES.indexOf(name);
                    return (
                      <tr key={name}>
                        <td>
                          {saved?.image ? (
                            <img src={saved.image} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Default</span>
                          )}
                        </td>
                        <td>
                          <b>{name}</b>
                          {!saved && <div style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>{builtIn !== -1 ? 'Built-in' : 'Used by a dish'}</div>}
                        </td>
                        <td>{countFor(name)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`badge ${saved?.isVisible === false ? 'badge-trash' : 'badge-published'}`}>
                              {saved?.isVisible === false ? 'Hidden' : 'Visible'}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={visibilitySaving === `category:${name}`}
                              onClick={() => setVisibility('category', { name }, saved?.isVisible === false)}
                            >
                              {visibilitySaving === `category:${name}` ? 'Saving…' : saved?.isVisible === false ? 'Unhide' : 'Hide'}
                            </button>
                          </div>
                        </td>
                        <td>{saved ? (saved.sortOrder || 0) : (builtIn !== -1 ? builtIn * 10 : '—')}</td>
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              title={saved ? 'Edit category' : 'Customize photo and order'}
                              onClick={() => editCategory(saved || { ...emptyCategory, name, sortOrder: builtIn !== -1 ? builtIn * 10 : nextCategorySort() })}
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              title="Delete category"
                              onClick={() => removeCategory(saved || { name })}
                            >
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
          </div>
        </div>
      )}
    </Shell>
  );
}
