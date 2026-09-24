'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Power, RefreshCw, Search, Settings2, X } from 'lucide-react';

const buttonStyle = {
  height: 40,
  padding: '0 14px',
  borderRadius: 8,
  background: '#1c1c28',
  color: '#ddd',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 13,
  fontWeight: 800,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  touchAction: 'manipulation',
  userSelect: 'none'
};

export default function KdsOperationsPanel({ authToken = '', onUnauthorized }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const response = await fetch(`/api${path}`, { ...options, headers, cache: 'no-store' });
    if (response.status === 401 && onUnauthorized) onUnauthorized();
    return response;
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await request('/shop/kitchen-operations');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Could not load kitchen controls.');
      setData(payload);
    } catch (loadError) {
      setError(loadError.message || 'Could not load kitchen controls.');
    } finally {
      setLoading(false);
    }
  };

  const show = () => {
    setOpen(true);
    if (!data) load();
  };

  const updateSettings = async (update, key) => {
    setSaving(key);
    setError('');
    try {
      const response = await request('/shop/kitchen-operations', {
        method: 'PATCH',
        body: JSON.stringify(update)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Could not update kitchen settings.');
      setData((current) => ({ ...current, settings: payload.settings }));
    } catch (saveError) {
      setError(saveError.message || 'Could not update kitchen settings.');
    } finally {
      setSaving('');
    }
  };

  const updateItem = async (item, update, key) => {
    setSaving(key);
    setError('');
    try {
      const response = await request(`/shop/kitchen-menu-items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(update)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || 'Could not update menu item.');
      setData((current) => ({
        ...current,
        items: current.items.map((one) => one.id === item.id ? { ...one, ...payload.item } : one)
      }));
    } catch (saveError) {
      setError(saveError.message || 'Could not update menu item.');
    } finally {
      setSaving('');
    }
  };

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.items || [];
    return (data?.items || []).filter((item) =>
      `${item.name} ${item.category} ${item.station}`.toLowerCase().includes(term)
    );
  }, [data?.items, search]);

  const settings = data?.settings;

  const overlay = open ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50000,
        background: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        justifyContent: 'flex-end',
        touchAction: 'manipulation'
      }}
      onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
    >
      <aside
        style={{
          width: 'min(620px, 100vw)',
          height: '100vh',
          background: '#101018',
          borderLeft: '1px solid rgba(201, 168, 76, 0.35)',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          color: '#f5f5f5',
          zIndex: 50001
        }}
      >
        <header
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #292938',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#13131d',
            flexShrink: 0
          }}
        >
          <div>
            <strong style={{ display: 'block', fontSize: 17, color: '#f0d080' }}>Kitchen controls</strong>
            <span style={{ color: '#9292a5', fontSize: 12 }}>Ordering, capacity, sold-out items and station routing</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{ ...buttonStyle, width: 40, height: 40, padding: 0, justifyContent: 'center' }}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ ...buttonStyle, width: 40, height: 40, padding: 0, justifyContent: 'center' }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div
          style={{
            overflowY: 'auto',
            padding: 20,
            display: 'grid',
            gap: 18,
            flex: 1,
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 9,
                background: 'rgba(239,68,68,.12)',
                border: '1px solid rgba(239,68,68,.35)',
                color: '#fca5a5',
                fontSize: 13
              }}
            >
              <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
              {error}
            </div>
          )}

          {loading && !data ? (
            <div style={{ color: '#aaa', padding: 20, textAlign: 'center' }}>Loading kitchen controls…</div>
          ) : settings && (
            <>
              <section style={{ padding: 16, borderRadius: 12, background: '#171721', border: '1px solid #2a2a38' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>Online ordering</strong>
                    <span style={{ fontSize: 12, color: '#9292a5' }}>
                      {settings.orderingEnabled ? 'Customers can place new orders.' : 'New checkouts are currently paused.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(saving)}
                    onClick={() => updateSettings({ orderingEnabled: !settings.orderingEnabled }, 'ordering')}
                    style={{
                      ...buttonStyle,
                      height: 42,
                      background: settings.orderingEnabled ? 'rgba(16,185,129,.18)' : 'rgba(239,68,68,.22)',
                      color: settings.orderingEnabled ? '#6ee7b7' : '#fca5a5',
                      border: `1px solid ${settings.orderingEnabled ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.4)'}`
                    }}
                  >
                    <Power size={15} />
                    {saving === 'ordering' ? 'Saving…' : settings.orderingEnabled ? 'Accepting orders' : 'Paused'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
                  {[
                    ['pickupEnabled', 'Pickup'],
                    ['deliveryEnabled', 'Delivery']
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      disabled={Boolean(saving)}
                      onClick={() => updateSettings({ [key]: !settings[key] }, key)}
                      style={{
                        ...buttonStyle,
                        height: 42,
                        justifyContent: 'center',
                        background: settings[key] ? '#183228' : '#2c1b20',
                        color: settings[key] ? '#86efac' : '#fca5a5',
                        border: `1px solid ${settings[key] ? '#166534' : '#7f1d1d'}`
                      }}
                    >
                      {settings[key] && <Check size={14} />} {label}: {settings[key] ? 'ON' : 'OFF'}
                    </button>
                  ))}
                </div>
              </section>

              <section style={{ padding: 16, borderRadius: 12, background: '#171721', border: '1px solid #2a2a38' }}>
                <strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>Quoted preparation time</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['pickupMinutes', 'Pickup'],
                    ['deliveryMinutes', 'Delivery']
                  ].map(([key, label]) => (
                    <label key={key} style={{ fontSize: 12, color: '#aaa' }}>
                      {label}
                      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <input
                          type="number"
                          min="10"
                          max="180"
                          value={settings[key]}
                          onChange={(event) => setData((current) => ({
                            ...current,
                            settings: { ...current.settings, [key]: Number(event.target.value) }
                          }))}
                          style={{
                            width: '100%',
                            background: '#0d0d14',
                            border: '1px solid #343445',
                            color: '#fff',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 14
                          }}
                        />
                        <button
                          type="button"
                          disabled={Boolean(saving)}
                          onClick={() => updateSettings({ [key]: settings[key] }, key)}
                          style={{ ...buttonStyle, height: 40 }}
                        >
                          Save
                        </button>
                      </div>
                    </label>
                  ))}
                </div>
              </section>

              <section style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: 14 }}>Menu availability & station</strong>
                    <span style={{ fontSize: 12, color: '#9292a5' }}>86 an item immediately or route future orders.</span>
                  </div>
                  <label style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 12, color: '#777' }} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search menu"
                      style={{
                        background: '#0d0d14',
                        border: '1px solid #343445',
                        color: '#fff',
                        borderRadius: 8,
                        padding: '9px 10px 9px 32px',
                        width: 190,
                        fontSize: 13
                      }}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {visibleItems.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) 130px 95px',
                        gap: 8,
                        alignItems: 'center',
                        padding: '10px 12px',
                        borderRadius: 9,
                        background: '#171721',
                        border: '1px solid #292938'
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                          {item.name}
                        </strong>
                        <span style={{ color: '#79798d', fontSize: 11 }}>{item.category}</span>
                      </div>
                      <select
                        value={item.station}
                        disabled={Boolean(saving)}
                        onChange={(event) => updateItem(item, { station: event.target.value }, `station-${item.id}`)}
                        style={{
                          background: '#0d0d14',
                          border: '1px solid #343445',
                          color: '#ddd',
                          borderRadius: 7,
                          padding: '8px 8px',
                          fontSize: 12
                        }}
                      >
                        {(data.stations || []).map((station) => (
                          <option key={station} value={station}>{station}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={Boolean(saving)}
                        onClick={() => updateItem(item, { available: !item.available }, `available-${item.id}`)}
                        style={{
                          ...buttonStyle,
                          height: 36,
                          justifyContent: 'center',
                          background: item.available ? '#183228' : '#3a1c22',
                          color: item.available ? '#86efac' : '#fca5a5',
                          border: `1px solid ${item.available ? '#166534' : '#7f1d1d'}`
                        }}
                      >
                        {saving === `available-${item.id}` ? '…' : item.available ? 'Available' : '86’d'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={show}
        style={buttonStyle}
        title="Pause ordering, adjust prep times, and manage sold-out items"
      >
        <Settings2 size={15} />
        <span>Controls</span>
      </button>

      {mounted && overlay && typeof document !== 'undefined'
        ? createPortal(overlay, document.body)
        : null}
    </>
  );
}
