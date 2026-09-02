'use client';

import { useState, useEffect, useRef } from 'react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { api } from '@/lib/admin-api';
import { Grid2X2, Images, List, Upload, Edit, Trash2, Copy } from 'lucide-react';

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function MediaLibrary() {
  const confirmAction = useConfirm();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  const fileInputRef = useRef(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await api('/admin/media');
      if (res.ok) {
        const data = await res.json();
        setMedia(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const fileSelectChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files) => {
    const validFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 3 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Max size is 3MB.`);
        continue;
      }
      if (!file.type.startsWith('image/')) {
        alert(`File ${file.name} is not an image.`);
        continue;
      }
      validFiles.push(file);
    }
    if (!validFiles.length) return;
    
    setUploading(true);
    try {
      const uploaded = [];
      // Upload separately so several valid files cannot exceed the API body limit.
      for (const file of validFiles) {
        const res = await api('/admin/media/upload', {
          method: 'POST',
          body: JSON.stringify({ files: [{ name: file.name, type: file.type, size: file.size, data: await toDataUrl(file) }] })
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.message || `Failed to upload ${file.name}.`);
        uploaded.push(...(Array.isArray(data) ? data : []));
      }
      setMedia((prev) => [...uploaded, ...prev]);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Network upload failure.');
    } finally {
      setUploading(false);
    }
  };

  const saveDetails = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    try {
      const res = await api(`/admin/media/${selectedItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: selectedItem.title,
          altText: selectedItem.altText,
          caption: selectedItem.caption,
          description: selectedItem.description
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setMedia(media.map(item => item.id === updated.id ? updated : item));
        setSelectedItem(null);
      } else {
        alert('Could not save details.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteMedia = async (id) => {
    if (!await confirmAction({ title: 'Delete media permanently?', description: 'This file will be removed from storage and cannot be recovered.', confirmLabel: 'Delete media', tone: 'danger' })) return;
    try {
      const res = await api(`/admin/media/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setMedia(media.filter(item => item.id !== id));
        setSelectedItem(null);
      } else {
        alert('Could not delete media record.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyUrlToClipboard = (url) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('File URL copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy. URL: ' + url);
    });
  };

  const filteredMedia = media.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.altText && item.altText.toLowerCase().includes(term)) ||
      (item.url && item.url.toLowerCase().includes(term))
    );
  });

  return (
    <Shell>
      <PageHeader
        eyebrow="Assets"
        title="Media Library"
        description="Upload, organize and reuse images across your website."
        icon={Images}
        actions={<>
          <button className="btn btn-secondary" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List size={15} /> : <Grid2X2 size={15} />} {viewMode === 'grid' ? 'List view' : 'Grid view'}
          </button>
          <button className="btn" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Upload media</button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={fileSelectChange} 
            multiple 
            accept="image/*" 
            style={{ display: 'none' }} 
          />
        </>}
      />

      {/* Drag & Drop Uploader Area */}
      <div 
        className="panel drag-drop-zone"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{ borderColor: dragActive ? '#c5a059' : '', background: dragActive ? 'rgba(197, 160, 89, 0.05)' : '', marginBottom: '24px' }}
      >
        <p style={{ margin: '0 0 10px', fontSize: '1.1rem', color: dragActive ? '#c5a059' : '#fff' }}>
          {uploading ? 'Uploading files...' : dragActive ? 'Drop images here!' : 'Drag & drop images here or click to browse'}
        </p>
        <span style={{ color: '#90a4ae', fontSize: '0.85rem' }}>Maximum upload file size: 5 MB. Supported formats: JPG, PNG, GIF, WEBP, SVG</span>
      </div>

      {/* Search and Filters */}
      <div className="panel" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '24px', padding: '16px' }}>
        <div style={{ flex: 1 }}>
          <input 
            className="input" 
            placeholder="Search media files by title..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={{ margin: 0 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={5} /></div>
      ) : filteredMedia.length === 0 ? (
        <div className="panel"><EmptyState icon={Images} title="No media found" description="Upload an image or change your search to see media here." action={<button className="btn" onClick={() => fileInputRef.current.click()}><Upload size={15} /> Upload media</button>} /></div>
      ) : viewMode === 'grid' ? (
        /* Grid Display Mode */
        <div className="media-grid">
          {filteredMedia.map((item) => (
            <div 
              key={item.id} 
              className={`media-card ${selectedItem?.id === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedItem(item)}
            >
              <img src={item.url} alt={item.altText || item.title || 'Media file'} loading="lazy" />
            </div>
          ))}
        </div>
      ) : (
        /* List Display Mode */
        <div className="panel" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Thumbnail</th>
                <th>Title</th>
                <th>File URL</th>
                <th>File Size</th>
                <th>Upload Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map((item) => (
                <tr key={item.id}>
                  <td>
                    <img 
                      src={item.url} 
                      alt="" 
                      loading="lazy"
                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }} 
                      onClick={() => setSelectedItem(item)}
                    />
                  </td>
                  <td>
                    <b style={{ color: '#fff' }}>{item.title || 'Untitled'}</b>
                    <br />
                    <small style={{ color: '#90a4ae' }}>{item.mimeType}</small>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#90a4ae', background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>{item.url}</span>
                  </td>
                  <td>{item.fileSize ? (item.fileSize / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(item)} title="Edit details"><Edit size={14} /></button>
                      <button type="button" className="btn btn-secondary" onClick={() => copyUrlToClipboard(item.url)} title="Copy URL"><Copy size={14} /></button>
                      <button type="button" className="btn btn-danger" onClick={() => deleteMedia(item.id)} title="Delete image"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail & Edit Sidebar Popup Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Image Preview Block */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ aspectRatio: '1.2', background: '#000', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={selectedItem.url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '0.8rem', color: '#90a4ae' }}>
                <p style={{ margin: '4px 0' }}><strong>File name:</strong> {selectedItem.filename || 'N/A'}</p>
                <p style={{ margin: '4px 0' }}><strong>File type:</strong> {selectedItem.mimeType}</p>
                <p style={{ margin: '4px 0' }}><strong>File size:</strong> {selectedItem.fileSize ? (selectedItem.fileSize / 1024).toFixed(2) + ' KB' : 'N/A'}</p>
              </div>
              <button 
                type="button" 
                className="btn" 
                onClick={() => copyUrlToClipboard(selectedItem.url)}
                style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}
              >
                Copy URL
              </button>
            </div>

            {/* Editing Form Block */}
            <form onSubmit={saveDetails} style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 16px', color: '#fff' }}>Image Metadata</h3>
              
              <label>Title</label>
              <input 
                className="input" 
                value={selectedItem.title || ''} 
                onChange={(e) => setSelectedItem({ ...selectedItem, title: e.target.value })} 
                required
              />

              <label>Alternative Text (Alt)</label>
              <input 
                className="input" 
                value={selectedItem.altText || ''} 
                onChange={(e) => setSelectedItem({ ...selectedItem, altText: e.target.value })} 
              />

              <label>Caption</label>
              <textarea 
                className="input" 
                rows="2" 
                value={selectedItem.caption || ''} 
                onChange={(e) => setSelectedItem({ ...selectedItem, caption: e.target.value })} 
              />

              <label>Description</label>
              <textarea 
                className="input" 
                rows="3" 
                value={selectedItem.description || ''} 
                onChange={(e) => setSelectedItem({ ...selectedItem, description: e.target.value })} 
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                <button type="submit" className="btn">Save Details</button>
                <button type="button" className="btn btn-danger" onClick={() => deleteMedia(selectedItem.id)}>Delete Permanently</button>
                <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.06)', color: '#fff' }} onClick={() => setSelectedItem(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
