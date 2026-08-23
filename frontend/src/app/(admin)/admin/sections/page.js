'use client';

import { useState, useEffect, useRef } from 'react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';
import { ArrowDown, ArrowUp, ImageIcon, LayoutGrid, Plus, Trash2, Upload, Video } from 'lucide-react';

const DEFAULT_HERO_MEDIA = [
  { type: 'image', url: '/asset/hero/preva-feast-hero.jpg', alt: 'Preva Kitchen feast and signature serving tower', position: 'center' },
  { type: 'image', url: '/asset/hero/preva-steak-hero.jpg', alt: 'Grilled steak platter with fresh salad at Preva Kitchen', position: 'right center' },
  { type: 'image', url: '/asset/hero/preva-burger-hero.jpg', alt: 'Preva Kitchen signature sliders with fresh toppings', position: 'center' }
];

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const BUILT_IN_SECTIONS = [
  {
    key: 'home_hero',
    title: 'Home — Hero Slider',
    visible: true,
    sortOrder: 10,
    data: {
      headline: 'BOLD FLAVOR.\nMADE FRESH.',
      subhead: 'Chef-driven comfort food in Redford.',
      supportingText: '',
      media: DEFAULT_HERO_MEDIA
    }
  },
  {
    key: 'home_order',
    title: 'Home — Order Online',
    visible: true,
    sortOrder: 45,
    data: {
      eyebrow: 'ORDER ONLINE',
      title: 'Preva Kitchen, Ready When You Are',
      description: 'Choose pickup or delivery and enjoy Preva Kitchen wherever the day takes you. Browse the direct menu or select your preferred ordering platform.',
      primaryLabel: 'Choose Order Option',
      secondaryLabel: 'View Online Menu',
      image: '/asset/hero/preva-pasta-hero.jpg'
    }
  }
];

function includeBuiltInSections(rows) {
  const existing = new Set(rows.map((section) => section.key));
  return [...rows, ...BUILT_IN_SECTIONS.filter((section) => !existing.has(section.key))];
}

export default function SectionsManager() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState(null);
  
  // Dynamic fields state
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionVisible, setSectionVisible] = useState(true);
  const [sectionData, setSectionData] = useState({});
  const [uploadingHero, setUploadingHero] = useState(false);
  const heroUploadRef = useRef(null);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/sections');
      if (res.ok) setSections(includeBuiltInSections(await res.json()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, []);

  const startEditing = (sec) => {
    setEditingSection(sec);
    setSectionTitle(sec.title || '');
    setSectionVisible(sec.visible !== false);
    const data = { ...(sec.data || {}) };
    if (sec.key === 'home_hero') {
      data.media = Array.isArray(data.media) && data.media.length ? data.media : DEFAULT_HERO_MEDIA;
    }
    setSectionData(data);
  };

  const handleFieldChange = (key, value) => {
    setSectionData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleListChange = (index, field, value) => {
    const list = [...(sectionData.list || [])];
    list[index] = { ...list[index], [field]: value };
    setSectionData(prev => ({ ...prev, list }));
  };

  const removeListItem = (index) => {
    const list = (sectionData.list || []).filter((_, idx) => idx !== index);
    setSectionData(prev => ({ ...prev, list }));
  };

  const addListItem = () => {
    const sample = sectionData.list?.[0] || { name: '', text: '' };
    const list = [...(sectionData.list || []), Object.fromEntries(Object.keys(sample).map((key) => [key, '']))];
    setSectionData(prev => ({ ...prev, list }));
  };

  const addHeroMedia = (type = 'image') => {
    setSectionData((current) => ({
      ...current,
      media: [...(current.media || []), { type, url: '', alt: '', poster: '', position: 'center' }]
    }));
  };

  const updateHeroMedia = (index, field, value) => {
    setSectionData((current) => ({
      ...current,
      media: (current.media || []).map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  };

  const removeHeroMedia = (index) => {
    setSectionData((current) => ({ ...current, media: (current.media || []).filter((_, itemIndex) => itemIndex !== index) }));
  };

  const moveHeroMedia = (index, direction) => {
    setSectionData((current) => {
      const media = [...(current.media || [])];
      const target = index + direction;
      if (target < 0 || target >= media.length) return current;
      [media[index], media[target]] = [media[target], media[index]];
      return { ...current, media };
    });
  };

  const uploadHeroMedia = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return alert('Choose an image or MP4/WEBM/OGG video.');
    const maxBytes = isVideo ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
    if (file.size > maxBytes) return alert(isVideo ? 'Video must be 25 MB or smaller.' : 'Image must be 8 MB or smaller.');

    setUploadingHero(true);
    try {
      const response = await api('/admin/media/upload', {
        method: 'POST',
        body: JSON.stringify({ files: [{ name: file.name, type: file.type, size: file.size, data: await toDataUrl(file) }] })
      });
      const uploaded = await response.json().catch(() => null);
      if (!response.ok) throw new Error(uploaded?.message || 'Media upload failed.');
      const item = Array.isArray(uploaded) ? uploaded[0] : uploaded;
      if (item?.url) {
        setSectionData((current) => ({
          ...current,
          media: [...(current.media || []), { type: isVideo ? 'video' : 'image', url: item.url, alt: item.altText || file.name.replace(/\.[^.]+$/, ''), poster: '', position: 'center' }]
        }));
      }
    } catch (error) {
      alert(error.message || 'Media upload failed.');
    } finally {
      setUploadingHero(false);
    }
  };

  const saveSection = async (e) => {
    e.preventDefault();
    if (!editingSection) return;
    
    try {
      const res = await api(`/admin/sections/${editingSection.key}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: sectionTitle,
          visible: sectionVisible,
          data: sectionData,
          sortOrder: editingSection.sortOrder
        })
      });
      if (res.ok) {
        alert('Section content saved successfully!');
        setEditingSection(null);
        fetchSections();
      } else {
        alert('Could not save section changes.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Shell>
      <PageHeader eyebrow="Website" title="Content sections" description="Manage homepage copy, highlights and section visibility." icon={LayoutGrid} />

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="editor-layout">
          {/* Left Column: Sections List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {sections.map(sec => (
              <div 
                key={sec.key} 
                className={`panel ${editingSection?.key === sec.key ? 'active-section-card' : ''}`}
                onClick={() => startEditing(sec)}
                style={{ 
                  cursor: 'pointer', 
                  padding: '16px', 
                  borderLeft: editingSection?.key === sec.key ? '4px solid #c5a059' : '1px solid rgba(255,255,255,0.06)',
                  background: editingSection?.key === sec.key ? 'rgba(255,255,255,0.04)' : ''
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <b style={{ color: '#fff', fontSize: '1rem' }}>{sec.title}</b>
                  <span className={`badge ${sec.visible !== false ? 'badge-published' : 'badge-trash'}`} style={{ fontSize: '0.7rem' }}>
                    {sec.visible !== false ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <small style={{ color: '#90a4ae', display: 'block', marginTop: '6px' }}>Key: {sec.key}</small>
              </div>
            ))}
          </div>

          {/* Right Column: Custom Field Editor */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {editingSection ? (
              <form onSubmit={saveSection} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  Edit Copy: {editingSection.title}
                </h3>
                
                <label>Admin Label</label>
                <input className="input" value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} required />

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '10px 0' }}>
                  <input type="checkbox" checked={sectionVisible} onChange={(e) => setSectionVisible(e.target.checked)} />
                  Section Visible on Frontend
                </label>

                <h4 style={{ color: '#c5a059', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px', margin: '16px 0 6px' }}>Section Content Fields</h4>

                {editingSection.key === 'home_hero' && (
                  <div style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid rgba(197,160,89,.28)', borderRadius: 12, background: 'rgba(197,160,89,.045)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <div><b style={{ color: '#fff' }}>Hero Slider Media</b><small style={{ display: 'block', color: '#90a4ae', marginTop: 4 }}>Images rotate every 5 seconds. Videos play once, then advance.</small></div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => addHeroMedia('image')}><Plus size={14} /> Image URL</button>
                        <button type="button" className="btn btn-secondary" onClick={() => addHeroMedia('video')}><Video size={14} /> Video URL</button>
                        <button type="button" className="btn" onClick={() => heroUploadRef.current?.click()} disabled={uploadingHero}><Upload size={14} /> {uploadingHero ? 'Uploading…' : 'Upload File'}</button>
                        <input ref={heroUploadRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg" onChange={uploadHeroMedia} hidden />
                      </div>
                    </div>

                    {(sectionData.media || []).length ? (sectionData.media || []).map((item, index) => (
                      <div key={`${item.url}-${index}`} style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr) auto', gap: 12, padding: 12, borderRadius: 10, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.07)' }}>
                        <div style={{ aspectRatio: '16/9', borderRadius: 8, overflow: 'hidden', background: '#090909', display: 'grid', placeItems: 'center', color: '#777' }}>
                          {item.url ? (item.type === 'video' ? <video src={item.url} poster={item.poster || undefined} muted preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: item.position || 'center' }} />) : (item.type === 'video' ? <Video size={28} /> : <ImageIcon size={28} />)}
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                            <select className="input" value={item.type || 'image'} onChange={(e) => updateHeroMedia(index, 'type', e.target.value)} style={{ margin: 0 }}><option value="image">Image</option><option value="video">Video</option></select>
                            <input className="input" value={item.url || ''} onChange={(e) => updateHeroMedia(index, 'url', e.target.value)} placeholder="Media URL" style={{ margin: 0 }} />
                          </div>
                          <input className="input" value={item.alt || ''} onChange={(e) => updateHeroMedia(index, 'alt', e.target.value)} placeholder="Accessible description / label" style={{ margin: 0 }} />
                          {item.type === 'video' ? <input className="input" value={item.poster || ''} onChange={(e) => updateHeroMedia(index, 'poster', e.target.value)} placeholder="Optional poster image URL" style={{ margin: 0 }} /> : <select className="input" value={item.position || 'center'} onChange={(e) => updateHeroMedia(index, 'position', e.target.value)} style={{ margin: 0 }}><option value="center">Crop: Center</option><option value="left center">Crop: Left</option><option value="right center">Crop: Right</option><option value="center top">Crop: Top</option><option value="center bottom">Crop: Bottom</option></select>}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <button type="button" className="btn btn-secondary" onClick={() => moveHeroMedia(index, -1)} disabled={index === 0} title="Move up"><ArrowUp size={14} /></button>
                          <button type="button" className="btn btn-secondary" onClick={() => moveHeroMedia(index, 1)} disabled={index === sectionData.media.length - 1} title="Move down"><ArrowDown size={14} /></button>
                          <button type="button" className="btn btn-danger" onClick={() => removeHeroMedia(index)} title="Remove"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    )) : <div style={{ color: '#90a4ae', padding: 14, textAlign: 'center' }}>No hero media yet. Upload a file or add a URL.</div>}
                  </div>
                )}
                
                {/* Dynamically render text inputs for fields */}
                {Object.entries(sectionData).map(([key, val]) => {
                  if (editingSection.key === 'home_hero' && ['media', 'slides', 'videoUrl'].includes(key)) return null;
                  if (key === 'list' && Array.isArray(val)) {
                    return (
                      <div key={key} style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <label style={{ margin: 0 }}>Repeatable items</label>
                          <button type="button" className="btn" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={addListItem}>
                            + Add item
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {val.map((item, idx) => (
                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(item).map(([field, fieldValue]) => (
                                  <label key={field} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                                    {field}
                                    {field === 'text' || field === 'caption' ? (
                                      <textarea className="input" rows="2" value={fieldValue || ''} onChange={(e) => handleListChange(idx, field, e.target.value)} style={{ margin: 0, padding: '6px 10px', fontSize: '0.85rem' }} />
                                    ) : (
                                      <input className="input" value={fieldValue || ''} onChange={(e) => handleListChange(idx, field, e.target.value)} style={{ margin: 0, padding: '6px 10px', fontSize: '0.85rem' }} />
                                    )}
                                  </label>
                                ))}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <button type="button" className="btn btn-danger" onClick={() => removeListItem(idx)} title="Remove item"><Trash2 size={14} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  
                  if (key === 'slides' && Array.isArray(val)) {
                    // Slides url array representation
                    return (
                      <div key={key}>
                        <label>Hero Background Images (comma separated URLs)</label>
                        <textarea 
                          className="input" 
                          rows="3" 
                          value={val.join(', ')} 
                          onChange={(e) => handleFieldChange(key, e.target.value.split(',').map(s => s.trim()))} 
                          placeholder="https://example.com/slide1.jpg, https://example.com/slide2.jpg"
                        />
                      </div>
                    );
                  }

                  // Standard textareas for multi-line text, standard input for single-line text
                  const isMultiline = String(val).includes('\n') || key.toLowerCase().includes('desc') || key === 'supportingText';
                  return (
                    <div key={key}>
                      <label style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</label>
                      {isMultiline ? (
                        <textarea 
                          className="input" 
                          rows="4" 
                          value={val} 
                          onChange={(e) => handleFieldChange(key, e.target.value)} 
                        />
                      ) : (
                        <input 
                          className="input" 
                          value={val} 
                          onChange={(e) => handleFieldChange(key, e.target.value)} 
                        />
                      )}
                    </div>
                  );
                })}

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button className="btn" type="submit">Save Section Content</button>
                  <button className="btn" type="button" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => setEditingSection(null)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#90a4ae' }}>
                Select a homepage section from the left column to edit its dynamic copywriting and visibility settings.
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
