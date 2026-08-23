'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { Plus, GalleryHorizontalEnd, Edit, Trash2 } from 'lucide-react';

export default function GalleriesManager() {
  const confirmAction = useConfirm();
  const [galleries, setGalleries] = useState([]);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal toggles
  const [editorOpen, setEditorOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState('cover'); // 'cover' or 'images'
  
  // Gallery Form State
  const [form, setForm] = useState({
    id: null,
    title: '',
    slug: '',
    description: '',
    coverImage: '',
    status: 'DRAFT',
    images: [] // items: { url: '', altText: '', caption: '', sortOrder: 0 }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gRes, mRes] = await Promise.all([
        api('/admin/galleries'),
        api('/admin/media')
      ]);
      if (gRes.ok) setGalleries(await gRes.json());
      if (mRes.ok) setMedia(await mRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewEditor = () => {
    setForm({
      id: null,
      title: '',
      slug: '',
      description: '',
      coverImage: '',
      status: 'DRAFT',
      images: []
    });
    setEditorOpen(true);
  };

  const openEditEditor = (g) => {
    setForm({
      id: g.id,
      title: g.title || '',
      slug: g.slug || '',
      description: g.description || '',
      coverImage: g.coverImage || '',
      status: g.status || 'DRAFT',
      images: g.images || []
    });
    setEditorOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addMediaToGallery = (url) => {
    if (mediaPickerTarget === 'cover') {
      setForm(prev => ({ ...prev, coverImage: url }));
    } else {
      setForm(prev => ({
        ...prev,
        images: [
          ...prev.images,
          { url, altText: '', caption: '', sortOrder: prev.images.length }
        ]
      }));
    }
    setMediaPickerOpen(false);
  };

  const removeImage = (index) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index)
    }));
  };

  const updateImageMeta = (index, field, value) => {
    setForm(prev => {
      const images = [...prev.images];
      images[index] = { ...images[index], [field]: value };
      return { ...prev, images };
    });
  };

  // Move items in array for sorting
  const moveImage = (index, direction) => {
    setForm(prev => {
      const images = [...prev.images];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= images.length) return prev;
      
      // Swap items
      const temp = images[index];
      images[index] = images[targetIndex];
      images[targetIndex] = temp;
      
      // Reassign sortOrder
      return {
        ...prev,
        images: images.map((img, idx) => ({ ...img, sortOrder: idx }))
      };
    });
  };

  const saveGallery = async (e) => {
    e.preventDefault();
    const isNew = !form.id;
    const url = isNew ? '/admin/galleries' : `/admin/galleries/${form.id}`;
    const method = isNew ? 'POST' : 'PUT';
    
    try {
      const res = await api(url, {
        method,
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setEditorOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.message || 'Could not save gallery.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteGallery = async (id) => {
    if (!await confirmAction({ title: 'Delete gallery?', description: 'The gallery will be permanently removed. Media library files will remain available.', confirmLabel: 'Delete gallery', tone: 'danger' })) return;
    try {
      const res = await api(`/admin/galleries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        alert('Could not delete gallery.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Shell>
      <PageHeader eyebrow="Assets" title="Galleries" description="Curate media into polished, reusable visual collections." icon={GalleryHorizontalEnd} actions={<button className="btn" onClick={openNewEditor}><Plus size={15} /> New gallery</button>} />

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : galleries.length === 0 ? (
        <div className="panel"><p>No galleries found. Click Add New Gallery to get started.</p></div>
      ) : (
        <div className="panel" style={{ overflowX: 'auto', padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Cover</th>
                <th>Title</th>
                <th>Slug</th>
                <th>Total Images</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {galleries.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.coverImage ? (
                      <img src={g.coverImage} alt="" style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '60px', height: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                    )}
                  </td>
                  <td>
                    <b style={{ color: '#fff' }}>{g.title}</b>
                    <br />
                    <small style={{ color: '#90a4ae' }}>{g.description?.substring(0, 50) || 'No description'}</small>
                  </td>
                  <td>{g.slug}</td>
                  <td>{g.images?.length || 0} images</td>
                  <td>
                    <span className={`badge ${g.status === 'PUBLISHED' ? 'badge-published' : 'badge-draft'}`}>
                      {g.status}
                    </span>
                  </td>
                  <td>{new Date(g.updatedAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => openEditEditor(g)} title="Edit gallery"><Edit size={14} /></button>
                      <button type="button" className="btn btn-danger" onClick={() => deleteGallery(g.id)} title="Delete gallery"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Editor Modal Sheet */}
      {editorOpen && (
        <div className="modal-overlay" onClick={() => setEditorOpen(false)}>
          <form className="modal-content" onClick={(e) => e.stopPropagation()} onSubmit={saveGallery} style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', height: '90vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>{form.id ? 'Edit Gallery' : 'Create Gallery'}</h3>
              <button type="button" onClick={() => setEditorOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', paddingRight: '6px' }}>
              {/* Main settings column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label>Gallery Title</label>
                <input className="input" name="title" value={form.title} onChange={handleInputChange} required />

                <label>Slug (optional)</label>
                <input className="input" name="slug" value={form.slug} onChange={handleInputChange} placeholder="auto-generated-from-title" />

                <label>Description</label>
                <textarea className="input" name="description" rows="2" value={form.description} onChange={handleInputChange} />

                {/* Gallery Images List with Sorting */}
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ margin: 0 }}>Gallery Images ({form.images.length})</label>
                    <button type="button" className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => { setMediaPickerTarget('images'); setMediaPickerOpen(true); }}>
                      + Add Image
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {form.images.length > 0 ? (
                      form.images.map((img, idx) => (
                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <img src={img.url} alt="" style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input 
                              className="input" 
                              placeholder="Alt text" 
                              value={img.altText || ''} 
                              onChange={(e) => updateImageMeta(idx, 'altText', e.target.value)} 
                              style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}
                            />
                            <input 
                              className="input" 
                              placeholder="Caption" 
                              value={img.caption || ''} 
                              onChange={(e) => updateImageMeta(idx, 'caption', e.target.value)} 
                              style={{ margin: 0, padding: '4px 8px', fontSize: '0.8rem' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '4px' }}>
                            <button type="button" className="btn btn-action-arrow" disabled={idx === 0} onClick={() => moveImage(idx, -1)}>▲</button>
                            <button type="button" className="btn btn-action-arrow" disabled={idx === form.images.length - 1} onClick={() => moveImage(idx, 1)}>▼</button>
                            <button type="button" className="btn btn-action-delete" onClick={() => removeImage(idx)}>✕</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ border: '2px dashed rgba(255,255,255,0.05)', padding: '30px', textAlign: 'center', color: '#666', borderRadius: '6px' }}>
                        No images added yet. Click + Add Image to insert.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Config column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                  <label>Status</label>
                  <select className="input" name="status" value={form.status} onChange={handleInputChange}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                  <button className="btn" type="submit" style={{ width: '100%' }}>Save Gallery</button>
                </div>

                <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}>
                  <label>Cover Image</label>
                  {form.coverImage ? (
                    <div style={{ position: 'relative', aspectRatio: '1.5', background: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={form.coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => setForm(prev => ({ ...prev, coverImage: '' }))}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.7rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ border: '2px dashed rgba(255,255,255,0.05)', padding: '15px', textAlign: 'center', color: '#666', fontSize: '0.8rem', borderRadius: '4px' }}>
                      No cover selected
                    </div>
                  )}
                  <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => { setMediaPickerTarget('cover'); setMediaPickerOpen(true); }}>
                    Choose Cover
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Media Picker Modal Overlay */}
      {mediaPickerOpen && (
        <div className="modal-overlay" onClick={() => setMediaPickerOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', height: '70vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Choose Image</h3>
              <button onClick={() => setMediaPickerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {media.length > 0 ? (
                media.map(item => (
                  <div key={item.id} className="media-card" onClick={() => addMediaToGallery(item.url)}>
                    <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))
              ) : (
                <p style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>No media uploads found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
