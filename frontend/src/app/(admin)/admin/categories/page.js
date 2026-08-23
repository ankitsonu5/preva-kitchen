'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { FolderTree, Edit, Trash2 } from 'lucide-react';

export default function CategoriesManager() {
  const confirmAction = useConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  
  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editParentCategoryId, setEditParentCategoryId] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/categories');
      if (res.ok) setCategories(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name, slug, description, parentCategoryId })
      });
      if (res.ok) {
        setName('');
        setSlug('');
        setDescription('');
        setParentCategoryId('');
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not create category.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditSlug(item.slug || '');
    setEditDescription(item.description || '');
    setEditParentCategoryId(item.parentCategoryId || '');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await api(`/admin/categories/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          description: editDescription,
          parentCategoryId: editParentCategoryId
        })
      });
      if (res.ok) {
        setEditingItem(null);
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not save category details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategory = async (cat) => {
    if (cat.count > 0) {
      alert(`Cannot delete category "${cat.name}": It has ${cat.count} posts assigned to it.`);
      return;
    }
    if (!await confirmAction({ title: 'Delete category?', description: `“${cat.name}” will be permanently removed if it is not assigned to content.`, confirmLabel: 'Delete category', tone: 'danger' })) return;
    
    try {
      const res = await api(`/admin/categories/${cat.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchCategories();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not delete category.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Shell>
      <PageHeader eyebrow="Taxonomy" title="Categories" description="Organize posts into structured content collections." icon={FolderTree} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="editor-layout">
        {/* Left side: Create category form */}
        <form className="panel" onSubmit={createCategory} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Add New Category</h3>
          
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Nightlife" />

          <label>Slug (optional)</label>
          <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. nightlife" />

          <label>Description</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" placeholder="Category purpose details..." />

          <label>Parent Category</label>
          <select className="input" value={parentCategoryId} onChange={(e) => setParentCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button className="btn" type="submit" style={{ marginTop: '10px' }}>Add Category</button>
        </form>

        {/* Right side: Categories table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            className="input" 
            placeholder="Search categories..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ margin: 0, maxWidth: '300px' }}
          />

          {loading ? (
            <p>Loading categories...</p>
          ) : filteredCategories.length === 0 ? (
            <p>No categories found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Description</th>
                    <th>Posts count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <b style={{ color: '#fff' }}>{c.name}</b>
                        {c.parentCategoryId && (
                          <div style={{ fontSize: '0.75rem', color: '#90a4ae' }}>
                            Sub-category of: {categories.find(x => x.id === c.parentCategoryId)?.name || 'Unknown'}
                          </div>
                        )}
                      </td>
                      <td>{c.slug}</td>
                      <td>{c.description || <span style={{ color: '#666' }}>—</span>}</td>
                      <td style={{ fontWeight: 'bold', color: c.count > 0 ? '#c5a059' : '#888' }}>{c.count}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => startEdit(c)} title="Edit category"><Edit size={14} /></button>
                          <button type="button" className="btn btn-danger" onClick={() => deleteCategory(c)} title="Delete category"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Category Edit Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Edit Category</h3>
            
            <label>Name</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />

            <label>Slug</label>
            <input className="input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />

            <label>Description</label>
            <textarea className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows="3" />

            <label>Parent Category</label>
            <select className="input" value={editParentCategoryId} onChange={(e) => setEditParentCategoryId(e.target.value)}>
              <option value="">None</option>
              {categories.filter(c => c.id !== editingItem.id).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn" type="submit">Save Changes</button>
              <button className="btn" type="button" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => setEditingItem(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </Shell>
  );
}
