'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatusBadge } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { BookOpen, Copy, Edit, Eye, FilePlus2, FileText, Plus, SlidersHorizontal, Trash2, X, Check, Save } from 'lucide-react';

function ContentList() {
  const confirmAction = useConfirm();
  const q = useSearchParams();
  const type = q.get('type') === 'PAGE' ? 'PAGE' : 'POST';

  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters & Search
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Quick Edit State
  const [quickEditId, setQuickEditId] = useState(null);
  const [quickForm, setQuickForm] = useState({
    title: '',
    slug: '',
    status: 'PUBLISHED',
    excerpt: '',
    categoryIds: []
  });
  const [quickSaving, setQuickSaving] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api(`/admin/content?type=${type}&includeTrash=true`);
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      } else {
        setError('Failed to load content.');
      }
    } catch {
      setError('Could not connect to API server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api('/admin/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRows();
    fetchCategories();
    setSelectedIds([]);
    setCurrentPage(1);
    setQuickEditId(null);
  }, [type]);

  const deleteItem = async (item) => {
    const permanent = item.status === 'TRASH';
    if (!await confirmAction({ title: permanent ? 'Delete permanently?' : 'Move to trash?', description: permanent ? 'This item will be permanently deleted and cannot be recovered.' : 'You can restore this item later from the Trash filter.', confirmLabel: permanent ? 'Delete permanently' : 'Move to trash', tone: 'danger' })) return;
    const res = await api(`/admin/content/${item.id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' });
    if (res.ok) {
      if (permanent) setRows(rows.filter((row) => row.id !== item.id));
      else setRows(rows.map((row) => row.id === item.id ? { ...row, status: 'TRASH' } : row));
      setSelectedIds(selectedIds.filter(x => x !== item.id));
      if (quickEditId === item.id) setQuickEditId(null);
    } else {
      alert('Could not delete item.');
    }
  };

  const restoreItem = async (item) => {
    const res = await api(`/admin/content/${item.id}/restore`, { method: 'PATCH' });
    if (res.ok) setRows(rows.map((row) => row.id === item.id ? { ...row, status: 'DRAFT' } : row));
    else alert('Could not restore item.');
  };

  const duplicateItem = async (item) => {
    if (!await confirmAction({ title: 'Duplicate this item?', description: `A draft copy of “${item.title}” will be created.`, confirmLabel: 'Create duplicate', tone: 'default' })) return;
    try {
      const payload = {
        type: item.type,
        title: `Copy of ${item.title}`,
        slug: `${item.slug}-copy-${Math.round(Math.random() * 1000)}`,
        excerpt: item.excerpt,
        content: item.content,
        status: 'DRAFT',
        featuredImage: item.featuredImage,
        seoTitle: item.seoTitle,
        seoDescription: item.seoDescription,
        focusKeyword: item.focusKeyword,
        categoryIds: (item.categories || []).map(c => c.category?.id || c.id).filter(Boolean),
        tagIds: (item.tags || []).map(t => t.tag?.id || t.id).filter(Boolean)
      };
      
      const res = await api('/admin/content', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Duplicated successfully!');
        fetchRows();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not duplicate content.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Edit Handlers
  const startQuickEdit = (item) => {
    setQuickEditId(item.id);
    const catIds = (item.categories || []).map(c => c.category?.id || c.id || c).filter(Boolean);
    setQuickForm({
      title: item.title || '',
      slug: item.slug || '',
      status: item.status || 'PUBLISHED',
      excerpt: item.excerpt || '',
      categoryIds: catIds
    });
  };

  const cancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickForm({ title: '', slug: '', status: 'PUBLISHED', excerpt: '', categoryIds: [] });
  };

  const handleQuickSave = async (item) => {
    if (!quickForm.title.trim()) return alert('Title cannot be empty.');
    if (!quickForm.slug.trim()) return alert('Slug cannot be empty.');
    
    setQuickSaving(true);
    try {
      const payload = {
        ...item,
        title: quickForm.title.trim(),
        slug: quickForm.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        status: quickForm.status,
        excerpt: quickForm.excerpt,
        categoryIds: quickForm.categoryIds
      };

      const res = await api(`/admin/content/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updated = await res.json();
        setRows(rows.map(r => r.id === item.id ? { ...r, ...updated, ...payload } : r));
        setQuickEditId(null);
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not quick update content.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating content.');
    } finally {
      setQuickSaving(false);
    }
  };

  const toggleQuickCategory = (catId) => {
    setQuickForm(prev => {
      const exists = prev.categoryIds.includes(catId);
      return {
        ...prev,
        categoryIds: exists ? prev.categoryIds.filter(id => id !== catId) : [...prev.categoryIds, catId]
      };
    });
  };

  // Bulk operations
  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return alert('No items selected.');
    if (!await confirmAction({ title: 'Apply bulk action?', description: `${selectedIds.length} selected item${selectedIds.length === 1 ? '' : 's'} will be updated.`, confirmLabel: 'Apply action', tone: action === 'delete' ? 'danger' : 'default' })) return;
    
    let successCount = 0;
    for (const id of selectedIds) {
      try {
        if (action === 'delete') {
          const res = await api(`/admin/content/${id}`, { method: 'DELETE' });
          if (res.ok) successCount++;
        } else if (action === 'publish' || action === 'draft') {
          const item = rows.find(r => r.id === id);
          if (item) {
            const res = await api(`/admin/content/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                ...item,
                status: action === 'publish' ? 'PUBLISHED' : 'DRAFT'
              })
            });
            if (res.ok) successCount++;
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    
    alert(`Bulk action completed! Successfully updated ${successCount} items.`);
    setSelectedIds([]);
    fetchRows();
  };

  const handlePreview = async (item) => {
    try {
      const tokenRes = await api(`/admin/content/${item.id}/preview-token`, { method: 'POST' });
      if (tokenRes.ok) {
        const { token } = await tokenRes.json();
        let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!siteUrl && typeof window !== 'undefined') {
          siteUrl = window.location.origin;
        }
        if (!siteUrl) siteUrl = 'https://prevakitchen.com';
        window.open(`${siteUrl}/preview?token=${encodeURIComponent(token)}`, '_blank', 'noopener,noreferrer');
      } else {
        alert('Could not generate preview token.');
      }
    } catch (err) {
      console.error(err);
      alert('Error launching preview.');
    }
  };

  // Selection helpers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredRows.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter(x => x !== id));
    }
  };

  // Apply filters
  const filteredRows = rows.filter((r) => {
    const matchesSearch = !search || 
      (r.title && r.title.toLowerCase().includes(search.toLowerCase())) ||
      (r.slug && r.slug.toLowerCase().includes(search.toLowerCase()));
      
    const matchesStatus = !statusFilter || r.status === statusFilter;
    
    const matchesCategory = !categoryFilter || 
      (r.categories && r.categories.some(c => c.category?.id === categoryFilter || c.id === categoryFilter));

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);
  const currentItems = filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <Shell>
      <PageHeader
        title={type === 'POST' ? 'Posts' : 'Pages'}
        description={`Create, organize and publish ${type === 'POST' ? 'stories and updates' : 'website pages'}.`}
        icon={type === 'POST' ? BookOpen : FileText}
        actions={
          <a className="btn" href={`/admin/content/edit?type=${type}`}>
            <Plus size={15} /> Add {type === 'POST' ? 'post' : 'page'}
          </a>
        }
      />

      {error ? <div className="notice notice-danger">{error}</div> : null}

      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <input 
          type="text" 
          placeholder="Search by title or slug..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          className="input"
          style={{ width: '280px', margin: 0 }}
        />

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select"
          style={{ width: '160px', margin: 0 }}
        >
          <option value="">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="ARCHIVED">Archived</option>
          <option value="TRASH">Trash</option>
        </select>

        {type === 'POST' && (
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="select"
            style={{ width: '180px', margin: 0 }}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        {/* Bulk Action Buttons */}
        {selectedIds.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#90a4ae' }}>Bulk Actions:</span>
            <button type="button" className="btn btn-danger" onClick={() => handleBulkAction('delete')}>
              Delete
            </button>
            <button type="button" className="btn" onClick={() => handleBulkAction('publish')}>
              Publish
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => handleBulkAction('draft')}>
              Move to Draft
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton count={6} height={44} />
      ) : filteredRows.length === 0 ? (
        <div className="panel">
          <EmptyState 
            icon={type === 'POST' ? BookOpen : FileText} 
            title={`No ${type === 'POST' ? 'posts' : 'pages'} found`} 
            description="Try adjusting the current filters or create a new item." 
            action={
              <a className="btn" href={`/admin/content/edit?type=${type}`}>
                <FilePlus2 size={15} /> Create new
              </a>
            } 
          />
        </div>
      ) : (
        <>
          <div className="panel table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll} 
                      checked={filteredRows.length > 0 && selectedIds.length === filteredRows.length} 
                    />
                  </th>
                  <th>Title</th>
                  <th>Author</th>
                  {type === 'POST' && <th>Categories</th>}
                  {type === 'POST' && <th>Tags</th>}
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((x) => (
                  <>
                    <tr 
                      key={x.id} 
                      style={{ 
                        background: quickEditId === x.id ? 'rgba(198, 161, 91, 0.08)' : undefined,
                        transition: 'background 180ms ease'
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.includes(x.id)} 
                          onChange={(e) => handleSelectRow(x.id, e.target.checked)}
                        />
                      </td>
                      <td>
                        <b style={{ color: '#fff', fontSize: '0.98rem' }}>{x.title}</b>
                        <br />
                        <small style={{ color: '#9a8f7e', fontFamily: 'var(--font-roboto), Arial, sans-serif' }}>/{x.slug}</small>
                        <div className="row-actions" style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '0.78rem' }}>
                          <a href={`/admin/content/edit?id=${x.id}&type=${type}`} style={{ color: '#c6a15b', textDecoration: 'none', fontWeight: 600 }}>Edit</a>
                          <span style={{ color: '#444' }}>|</span>
                          <button 
                            type="button" 
                            onClick={() => quickEditId === x.id ? cancelQuickEdit() : startQuickEdit(x)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#dfc07e', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            {quickEditId === x.id ? 'Close Quick Edit' : 'Quick Edit'}
                          </button>
                          <span style={{ color: '#444' }}>|</span>
                          <button 
                            type="button" 
                            onClick={() => deleteItem(x)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#e06c75', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            Trash
                          </button>
                          <span style={{ color: '#444' }}>|</span>
                          <button 
                            type="button" 
                            onClick={() => handlePreview(x)}
                            style={{ background: 'none', border: 'none', padding: 0, color: '#9a8f7e', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}
                          >
                            Preview
                          </button>
                        </div>
                      </td>
                      <td>{x.author ? x.author.name : 'Unknown'}</td>
                      {type === 'POST' && (
                        <td>
                          {(x.categories || []).map(c => c.category?.name || c.name).join(', ') || <span style={{ color: '#666' }}>—</span>}
                        </td>
                      )}
                      {type === 'POST' && (
                        <td>
                          {(x.tags || []).map(t => t.tag?.name || t.name).join(', ') || <span style={{ color: '#666' }}>—</span>}
                        </td>
                      )}
                      <td>
                        <StatusBadge status={x.status} />
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#9a8f7e' }}>{new Date(x.updatedAt).toLocaleString()}</span>
                      </td>
                      <td>
                        <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                          {x.status === 'TRASH' ? (
                            <button type="button" className="btn btn-secondary" title="Restore" onClick={() => restoreItem(x)}>Restore</button>
                          ) : (
                            <>
                              <button 
                                type="button" 
                                className={`btn ${quickEditId === x.id ? '' : 'btn-secondary'}`} 
                                style={quickEditId === x.id ? { background: 'var(--gold)', color: '#000', borderColor: 'var(--gold)' } : {}}
                                title="Quick Edit" 
                                onClick={() => quickEditId === x.id ? cancelQuickEdit() : startQuickEdit(x)}
                              >
                                <SlidersHorizontal size={14} />
                              </button>
                              <button type="button" className="btn btn-secondary" title="Preview" onClick={() => handlePreview(x)}><Eye size={14} /></button>
                              <a href={`/admin/content/edit?id=${x.id}&type=${type}`} className="btn btn-secondary" title="Full Edit"><Edit size={14} /></a>
                              <button type="button" className="btn btn-secondary" title="Duplicate" onClick={() => duplicateItem(x)}><Copy size={14} /></button>
                            </>
                          )}
                          <button type="button" className="btn btn-danger" title={x.status === 'TRASH' ? 'Delete Permanently' : 'Trash'} onClick={() => deleteItem(x)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>

                    {/* Ultra-Polished WordPress-style Inline Quick Edit Drawer */}
                    {quickEditId === x.id && (
                      <tr 
                        key={`quick-${x.id}`} 
                        className="quick-edit-tr"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelQuickEdit();
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleQuickSave(x);
                        }}
                      >
                        <td colSpan={type === 'POST' ? 8 : 6} style={{ padding: '22px 26px' }}>
                          {/* Header Banner */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                background: 'rgba(198, 161, 91, 0.15)', 
                                color: 'var(--gold)', 
                                fontWeight: 800, 
                                fontSize: '0.78rem', 
                                letterSpacing: '0.08em', 
                                textTransform: 'uppercase',
                                border: '1px solid rgba(198, 161, 91, 0.3)'
                              }}>
                                <SlidersHorizontal size={13} /> QUICK EDIT
                              </span>
                              <span style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600 }}>
                                Editing “{x.title}”
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#9a8f7e' }}>
                              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-roboto), Arial, sans-serif' }}>Ctrl + Enter</span> to save
                              <span style={{ opacity: 0.4 }}>•</span>
                              <span style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-roboto), Arial, sans-serif' }}>Esc</span> to cancel
                            </div>
                          </div>

                          {/* Form 3-Column Glass Layout */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
                            
                            {/* Card 1: Title & Slug */}
                            <div className="quick-edit-card">
                              <div className="quick-edit-card-header">
                                <Edit size={13} /> General Info
                              </div>

                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                                Title <span style={{ color: 'var(--gold)' }}>*</span>
                              </label>
                              <input 
                                type="text" 
                                className="input" 
                                value={quickForm.title} 
                                onChange={(e) => setQuickForm({ ...quickForm, title: e.target.value })} 
                                placeholder="Enter title..."
                                style={{ width: '100%', margin: '0 0 14px', background: 'rgba(0,0,0,0.3)' }}
                                autoFocus
                              />

                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                                Slug / URL Identifier <span style={{ color: 'var(--gold)' }}>*</span>
                              </label>
                              <div style={{ position: 'relative' }}>
                                <input 
                                  type="text" 
                                  className="input" 
                                  value={quickForm.slug} 
                                  onChange={(e) => setQuickForm({ ...quickForm, slug: e.target.value })} 
                                  placeholder="url-slug"
                                  style={{ width: '100%', margin: 0, paddingLeft: '24px', background: 'rgba(0,0,0,0.3)', fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '0.85rem' }}
                                />
                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9a8f7e', fontSize: '0.85rem', pointerEvents: 'none' }}>/</span>
                              </div>
                              <small style={{ color: '#7a7062', fontSize: '0.74rem', marginTop: '6px', display: 'block' }}>
                                Preview: /{quickForm.slug || 'slug'}
                              </small>
                            </div>

                            {/* Card 2: Status & Excerpt */}
                            <div className="quick-edit-card">
                              <div className="quick-edit-card-header">
                                <BookOpen size={13} /> Status & Summary
                              </div>

                              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '5px' }}>
                                Publishing Status
                              </label>
                              <select 
                                className="select" 
                                value={quickForm.status} 
                                onChange={(e) => setQuickForm({ ...quickForm, status: e.target.value })} 
                                style={{ width: '100%', margin: '0 0 14px', background: 'rgba(0,0,0,0.3)' }}
                              >
                                <option value="PUBLISHED">🟢 Published (Live)</option>
                                <option value="DRAFT">📝 Draft (Private)</option>
                                <option value="SCHEDULED">⏰ Scheduled</option>
                                <option value="ARCHIVED">📦 Archived</option>
                              </select>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
                                  Excerpt (Summary)
                                </label>
                                <span style={{ fontSize: '0.72rem', color: '#7a7062' }}>
                                  {quickForm.excerpt?.length || 0} chars
                                </span>
                              </div>
                              <textarea 
                                className="input" 
                                rows={2} 
                                value={quickForm.excerpt} 
                                onChange={(e) => setQuickForm({ ...quickForm, excerpt: e.target.value })} 
                                placeholder="Brief summary for listings and SEO meta..."
                                style={{ width: '100%', margin: 0, resize: 'vertical', minHeight: '62px', background: 'rgba(0,0,0,0.3)', fontSize: '0.84rem' }}
                              />
                            </div>

                            {/* Card 3: Categories (if Post) or Meta (if Page) */}
                            <div className="quick-edit-card">
                              {type === 'POST' ? (
                                <>
                                  <div className="quick-edit-card-header" style={{ justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <FileText size={13} /> Categories ({quickForm.categoryIds.length})
                                    </span>
                                    {categories.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allSelected = quickForm.categoryIds.length === categories.length;
                                          setQuickForm({
                                            ...quickForm,
                                            categoryIds: allSelected ? [] : categories.map(c => c.id)
                                          });
                                        }}
                                        style={{ background: 'none', border: 'none', color: 'var(--gold-light)', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}
                                      >
                                        {quickForm.categoryIds.length === categories.length ? 'Clear all' : 'Select all'}
                                      </button>
                                    )}
                                  </div>

                                  <div className="quick-edit-category-list">
                                    {categories.length === 0 ? (
                                      <span style={{ fontSize: '0.8rem', color: '#7a7062', padding: '8px 0' }}>No categories created yet</span>
                                    ) : (
                                      categories.map(c => {
                                        const isChecked = quickForm.categoryIds.includes(c.id);
                                        return (
                                          <label 
                                            key={c.id} 
                                            className={`quick-edit-category-item ${isChecked ? 'active' : ''}`}
                                          >
                                            <input 
                                              type="checkbox" 
                                              checked={isChecked} 
                                              onChange={() => toggleQuickCategory(c.id)} 
                                              style={{ accentColor: 'var(--gold)', width: '14px', height: '14px' }}
                                            />
                                            <span style={{ flex: 1 }}>{c.name}</span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="quick-edit-card-header">
                                    <FileText size={13} /> Page Information
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: '#9a8f7e', padding: '6px 0' }}>
                                    <div>
                                      <span style={{ color: '#7a7062', display: 'block', fontSize: '0.75rem' }}>Author:</span>
                                      <span style={{ color: '#fff', fontWeight: 500 }}>{x.author?.name || 'Admin'}</span>
                                    </div>
                                    <div>
                                      <span style={{ color: '#7a7062', display: 'block', fontSize: '0.75rem' }}>Last Modified:</span>
                                      <span style={{ color: '#fff', fontWeight: 500 }}>{new Date(x.updatedAt).toLocaleString()}</span>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                      <a 
                                        href={`/admin/content/edit?id=${x.id}&type=${type}`}
                                        style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <Edit size={12} /> Open in full page editor →
                                      </a>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick Edit Action Buttons Footer */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            gap: '12px', 
                            marginTop: '20px', 
                            paddingTop: '16px', 
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            flexWrap: 'wrap'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#9a8f7e' }}>
                              Quickly updates metadata without reloading or overwriting post body.
                            </div>

                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={cancelQuickEdit}
                                disabled={quickSaving}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                              >
                                <X size={14} /> Cancel
                              </button>
                              <button 
                                type="button" 
                                className="btn" 
                                onClick={() => handleQuickSave(x)}
                                disabled={quickSaving}
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: '7px', 
                                  background: 'linear-gradient(135deg, #dfc07e 0%, #c6a15b 100%)', 
                                  color: '#0e0c0a', 
                                  fontWeight: 700,
                                  boxShadow: '0 4px 14px rgba(198, 161, 91, 0.25)',
                                  padding: '8px 18px'
                                }}
                              >
                                <Check size={15} /> {quickSaving ? 'Saving Changes...' : type === 'POST' ? 'Update Post' : 'Update Page'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="btn" 
                disabled={currentPage === 1} 
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', color: '#90a4ae' }}>Page {currentPage} of {totalPages}</span>
              <button 
                className="btn" 
                disabled={currentPage === totalPages} 
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

export default function ContentPage() {
  return (
    <Suspense fallback={<LoadingSkeleton count={6} height={44} />}>
      <ContentList />
    </Suspense>
  );
}
