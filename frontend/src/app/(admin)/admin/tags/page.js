'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { Tag as TagIcon, Edit, Trash2 } from 'lucide-react';

export default function TagsManager() {
  const confirmAction = useConfirm();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  
  // Editing state
  const [editingItem, setEditingItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/tags');
      if (res.ok) setTags(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const createTag = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/admin/tags', {
        method: 'POST',
        body: JSON.stringify({ name, slug })
      });
      if (res.ok) {
        setName('');
        setSlug('');
        fetchTags();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not create tag.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditSlug(item.slug || '');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await api(`/admin/tags/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editName, slug: editSlug })
      });
      if (res.ok) {
        setEditingItem(null);
        fetchTags();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not save tag details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTag = async (tag) => {
    if (!await confirmAction({ title: 'Delete tag?', description: `“${tag.name}” will be removed from all assigned content.`, confirmLabel: 'Delete tag', tone: 'danger' })) return;
    try {
      const res = await api(`/admin/tags/${tag.id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTags();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not delete tag.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <PageHeader eyebrow="Taxonomy" title="Tags" description="Create flexible labels that make content easier to discover." icon={TagIcon} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="editor-layout">
        {/* Left side: Create tag form */}
        <form className="panel" onSubmit={createTag} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'start' }}>
          <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Add New Tag</h3>
          
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. VIP Saturday" />

          <label>Slug (optional)</label>
          <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. vip-saturday" />

          <button className="btn" type="submit" style={{ marginTop: '10px' }}>Add Tag</button>
        </form>

        {/* Right side: Tags table */}
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            className="input" 
            placeholder="Search tags..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ margin: 0, maxWidth: '300px' }}
          />

          {loading ? (
            <p>Loading tags...</p>
          ) : filteredTags.length === 0 ? (
            <p>No tags found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Posts count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTags.map((t) => (
                    <tr key={t.id}>
                      <td><b style={{ color: '#fff' }}>{t.name}</b></td>
                      <td>{t.slug}</td>
                      <td style={{ fontWeight: 'bold', color: t.count > 0 ? '#c5a059' : '#888' }}>{t.count}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn btn-secondary" onClick={() => startEdit(t)} title="Edit tag"><Edit size={14} /></button>
                          <button type="button" className="btn btn-danger" onClick={() => deleteTag(t)} title="Delete tag"><Trash2 size={14} /></button>
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

      {/* Tag Edit Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Edit Tag</h3>
            
            <label>Name</label>
            <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} required />

            <label>Slug</label>
            <input className="input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />

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
