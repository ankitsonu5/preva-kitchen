'use client';

import { useState, useEffect } from 'react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';
import { showError, showSuccess, showWarning } from '@/lib/swal';
import { useConfirm } from '@/components/admin/ConfirmDialog';
import { MenuSquare, Plus, Save, Trash2, MapPin } from 'lucide-react';

function normalizeItem(item = {}) {
  const title = item.title || item.label || '';
  const openInNewTab = item.openInNewTab === true || item.target === '_blank';
  return {
    ...item,
    title,
    label: title,
    url: item.url || '',
    openInNewTab,
    target: openInNewTab ? '_blank' : '_self',
    visible: item.visible !== false,
    children: (Array.isArray(item.children) ? item.children : []).map(normalizeItem)
  };
}

function normalizeMenu(menu = {}) {
  return { ...menu, items: (Array.isArray(menu.items) ? menu.items : []).map(normalizeItem) };
}

export default function MenusManager() {
  const confirmAction = useConfirm();
  const [menus, setMenus] = useState([]);
  const [pages, setPages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Menu
  const [selectedMenu, setSelectedMenu] = useState(null);
  
  // Menu Item Editor Fields
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [parentIndex, setParentIndex] = useState('');
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuLocation, setNewMenuLocation] = useState('');
  const [creatingMenu, setCreatingMenu] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [menusRes, pagesRes, catsRes] = await Promise.all([
        api('/admin/menus'),
        api('/admin/content?type=PAGE'),
        api('/admin/categories')
      ]);
      
      if (menusRes.ok) {
        const menusData = (await menusRes.json()).map(normalizeMenu);
        setMenus(menusData);
        if (menusData.length > 0) {
          setSelectedMenu(menusData[0]);
        }
      }
      if (pagesRes.ok) setPages(await pagesRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectMenu = (id) => {
    const m = menus.find(x => String(x.id) === String(id));
    if (m) setSelectedMenu(normalizeMenu(m));
  };

  const createMenu = async (event) => {
    event.preventDefault();
    const name = newMenuName.trim();
    const location = newMenuLocation.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    if (!name || !location) {
      showWarning('Menu details required', 'Enter both a menu name and a location key.');
      return;
    }

    setCreatingMenu(true);
    try {
      const res = await api('/admin/menus', {
        method: 'POST',
        body: JSON.stringify({ name, location, items: [] })
      });
      if (!res.ok) {
        showError('Menu not created', (await res.json().catch(() => null))?.message || 'Please try again.');
        return;
      }

      const created = normalizeMenu(await res.json());
      setMenus((current) => [...current, created].sort((a, b) => a.location.localeCompare(b.location)));
      setSelectedMenu(created);
      setNewMenuName('');
      setNewMenuLocation('');
      showSuccess('Menu created', `${created.name} is ready for navigation links.`);
    } catch (error) {
      console.error(error);
      showError('Menu not created', 'The server could not be reached. Please try again.');
    } finally {
      setCreatingMenu(false);
    }
  };

  const deleteMenu = async () => {
    if (!selectedMenu) return;
    if (!await confirmAction({
      title: `Delete "${selectedMenu.name}"?`,
      description: 'This menu and all its links will be permanently removed.',
      confirmLabel: 'Delete menu',
      tone: 'danger'
    })) return;
    const res = await api(`/admin/menus/${selectedMenu.id}`, { method: 'DELETE' });
    if (!res.ok) {
      showError('Menu not deleted', 'Please try again.');
      return;
    }
    const remaining = menus.filter((menu) => menu.id !== selectedMenu.id);
    setMenus(remaining);
    setSelectedMenu(remaining[0] || null);
  };

  const addCustomLink = (e) => {
    e.preventDefault();
    if (!selectedMenu) return;
    
    const newItem = {
      title: itemTitle,
      url: itemUrl,
      openInNewTab: Boolean(openInNewTab),
      visible: true
    };
    
    setSelectedMenu(prev => {
      if (parentIndex === '') return { ...prev, items: [...prev.items, newItem] };
      const items = [...prev.items];
      const index = Number(parentIndex);
      items[index] = { ...items[index], children: [...(items[index].children || []), newItem] };
      return { ...prev, items };
    });
    
    setItemTitle('');
    setItemUrl('');
    setOpenInNewTab(false);
    setParentIndex('');
  };

  const addPageLink = (page) => {
    if (!selectedMenu) return;
    
    const newItem = {
      title: page.title,
      url: `/${page.slug}`,
      openInNewTab: false,
      visible: true
    };
    
    setSelectedMenu(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const addCategoryLink = (cat) => {
    if (!selectedMenu) return;
    
    const newItem = {
      title: cat.name,
      url: `/blog?category=${cat.slug}`,
      openInNewTab: false,
      visible: true
    };
    
    setSelectedMenu(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const deleteItem = (index) => {
    setSelectedMenu(prev => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index)
    }));
  };

  const moveItem = (index, direction) => {
    if (!selectedMenu) return;
    const items = [...selectedMenu.items];
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    
    const temp = items[index];
    items[index] = items[target];
    items[target] = temp;
    
    setSelectedMenu(prev => ({ ...prev, items }));
  };

  const toggleItemVisibility = (index) => {
    setSelectedMenu(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], visible: !items[index].visible };
      return { ...prev, items };
    });
  };

  const updateItem = (index, changes) => {
    setSelectedMenu((current) => {
      const items = [...current.items];
      items[index] = normalizeItem({ ...items[index], ...changes });
      return { ...current, items };
    });
  };

  const saveMenu = async () => {
    if (!selectedMenu) return;
    try {
      const res = await api(`/admin/menus/${selectedMenu.id}`, {
        method: 'PUT',
        body: JSON.stringify(selectedMenu)
      });
      if (res.ok) {
        // Refresh local menus array
        const updated = normalizeMenu(await res.json());
        setMenus((current) => current.map(m => m.id === updated.id ? updated : m));
        setSelectedMenu(updated);
        showSuccess('Menu saved', `${updated.name} navigation has been updated.`);
      } else {
        showError('Menu not saved', 'Please review the menu and try again.');
      }
    } catch (err) {
      console.error(err);
      showError('Menu not saved', 'The server could not be reached. Please try again.');
    }
  };

  return (
    <Shell>
      <PageHeader eyebrow="Appearance" title="Menus" description="Create and organize header, footer, and custom navigation menus." icon={MenuSquare} actions={selectedMenu && <button className="btn" onClick={saveMenu}><Save size={15} /> Save changes</button>} />

      {loading ? (
        <div className="panel"><p>Loading menus...</p></div>
      ) : (
        <div className="menu-manager-page">
          {/* Menu Selector Tab Bar */}
          <div className="panel menu-manager-toolbar">
            <div className="menu-manager-toolbar-copy">
              <span>Navigation workspace</span>
              <strong>{selectedMenu?.name || 'No menu selected'}</strong>
              <small>{selectedMenu ? `${selectedMenu.items?.length || 0} navigation links · ${selectedMenu.location}` : 'Create your first menu below to get started.'}</small>
            </div>

            <label className="menu-manager-select">
              Menu to edit
              <select
                className="select"
                value={selectedMenu?.id || ''}
                onChange={(e) => selectMenu(e.target.value)}
                disabled={!menus.length}
              >
                {!menus.length && <option value="">No menus created yet</option>}
                {menus.map(m => (
                  <option key={m.id} value={m.id}>{m.name} — {m.location}</option>
                ))}
              </select>
            </label>

            {selectedMenu && (
              <button type="button" className="btn btn-action-delete menu-delete-button" onClick={deleteMenu}>
                <Trash2 size={14} /> Delete menu
              </button>
            )}
          </div>

          <form className="panel menu-create-panel" onSubmit={createMenu}>
            <div className="menu-create-intro">
              <span><MapPin size={18} /></span>
              <div>
                <strong>Create a new menu</strong>
                <small>Use a simple location key such as header, footer or mobile.</small>
              </div>
            </div>
            <label className="menu-create-field">
              New menu name
              <input className="input" value={newMenuName} onChange={(event) => setNewMenuName(event.target.value)} placeholder="e.g. Event Navigation" required />
            </label>
            <label className="menu-create-field">
              Menu location
              <input className="input" value={newMenuLocation} onChange={(event) => setNewMenuLocation(event.target.value)} placeholder="e.g. events" required />
            </label>
            <button className="btn menu-create-button" type="submit" disabled={creatingMenu}>
              <Plus size={15} /> {creatingMenu ? 'Creating...' : 'Create menu'}
            </button>
          </form>

          {selectedMenu ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }} className="editor-layout">
              {/* Left Column: Add Links Sources */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Add Custom URL Link */}
                <form className="panel" onSubmit={addCustomLink} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h4 style={{ margin: '0 0 10px', color: '#fff' }}>Add Custom Link</h4>
                  
                  <label>Label</label>
                  <input className="input" value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} required placeholder="e.g. VIP Reservation" />

                  <label>URL (Absolute or Relative)</label>
                  <input className="input" value={itemUrl} onChange={(e) => setItemUrl(e.target.value)} required placeholder="e.g. /#vip" />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: '6px 0 12px' }}>
                    <input type="checkbox" checked={openInNewTab} onChange={(e) => setOpenInNewTab(e.target.checked)} />
                    Open link in new tab
                  </label>

                  <label>Parent item (optional)</label>
                  <select className="input" value={parentIndex} onChange={(e) => setParentIndex(e.target.value)}>
                    <option value="">Top level</option>
                    {(selectedMenu?.items || []).map((item, index) => <option value={index} key={`${item.title}-${index}`}>{item.title}</option>)}
                  </select>

                  <button className="btn" type="submit" style={{ width: '100%' }}>Add to Menu</button>
                </form>

                {/* Add Site Pages */}
                <div className="panel">
                  <h4 style={{ margin: '0 0 10px', color: '#fff' }}>Pages</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {pages.length > 0 ? (
                      pages.map(page => (
                        <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.9rem', color: '#cfd8dc' }}>{page.title}</span>
                          <button type="button" className="btn btn-action-add" onClick={() => addPageLink(page)}>+</button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>No pages available.</span>
                    )}
                  </div>
                </div>

                {/* Add Categories */}
                <div className="panel">
                  <h4 style={{ margin: '0 0 10px', color: '#fff' }}>Categories</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {categories.length > 0 ? (
                      categories.map(cat => (
                        <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                          <span style={{ fontSize: '0.9rem', color: '#cfd8dc' }}>{cat.name}</span>
                          <button type="button" className="btn btn-action-add" onClick={() => addCategoryLink(cat)}>+</button>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: '#666', fontSize: '0.85rem' }}>No categories available.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Menu Hierarchy & Sorting */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                  Menu Structure: {selectedMenu.name}
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedMenu.items && selectedMenu.items.length > 0 ? (
                    selectedMenu.items.map((item, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '1fr auto', 
                          gap: '12px', 
                          background: item.visible !== false ? 'rgba(255,255,255,0.02)' : 'rgba(255,122,122,0.03)', 
                          padding: '12px 16px', 
                          borderRadius: '6px', 
                          border: item.visible !== false ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,122,122,0.1)'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <input className="input" aria-label="Menu item label" value={item.title} onChange={(event) => updateItem(idx, { title: event.target.value, label: event.target.value })} />
                          <input className="input" aria-label="Menu item URL" value={item.url} onChange={(event) => updateItem(idx, { url: event.target.value })} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#90a4ae', fontSize: '0.82rem' }}>
                            <input type="checkbox" checked={item.openInNewTab} onChange={(event) => updateItem(idx, { openInNewTab: event.target.checked })} />
                            Open in new tab
                          </label>
                          {(item.children || []).map((child, childIndex) => <span key={`${child.title}-${childIndex}`} style={{ fontSize: '0.78rem', color: '#c5a059', margin: '5px 0 0 16px' }}>↳ {child.title} · {child.url}</span>)}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button type="button" className={`btn ${item.visible !== false ? 'btn-action-hide' : 'btn-action-show'}`} onClick={() => toggleItemVisibility(idx)}>
                            {item.visible !== false ? 'Hide' : 'Show'}
                          </button>
                          <button type="button" className="btn btn-action-arrow" disabled={idx === 0} onClick={() => moveItem(idx, -1)}>▲</button>
                          <button type="button" className="btn btn-action-arrow" disabled={idx === selectedMenu.items.length - 1} onClick={() => moveItem(idx, 1)}>▼</button>
                          <button type="button" className="btn btn-action-delete" onClick={() => deleteItem(idx)}>✕</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ border: '2px dashed rgba(255,255,255,0.05)', padding: '40px', borderRadius: '6px', textAlign: 'center', color: '#666' }}>
                      Menu is empty. Add pages or links from the left column.
                    </div>
                  )}
                </div>
                
                {selectedMenu.items && selectedMenu.items.length > 0 && (
                  <button className="btn" onClick={saveMenu} style={{ marginTop: '16px', alignSelf: 'start' }}>
                    Save Menu Structure
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Shell>
  );
}
