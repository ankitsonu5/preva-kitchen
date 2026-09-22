'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Boxes, ChefHat, Clock, LayoutGrid, Monitor, Plus, Power, RefreshCw, Settings2, UtensilsCrossed, X } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, FormSection, InlineLoader, PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

function NameChipsEditor({ items, disabled, placeholder, onAdd, onRemove }) {
  const [draft, setDraft] = useState('');
  const submit = () => {
    const name = draft.trim();
    if (!name) return;
    onAdd(name);
    setDraft('');
  };
  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {(items || []).map((name) => (
          <span key={name} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 8px 6px 12px', borderRadius: 999,
            background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
            color: 'var(--ink)', fontSize: 13, fontWeight: 600
          }}>
            {name}
            <button
              type="button"
              onClick={() => onRemove(name)}
              disabled={disabled}
              aria-label={`Remove ${name}`}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--ink-muted)', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
        <input
          className="input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={placeholder}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submit(); } }}
        />
        <button type="button" className="btn btn-secondary" onClick={submit} disabled={disabled || !draft.trim()}>
          <Plus size={14} /> Add
        </button>
      </div>
    </>
  );
}

function MenuItemRow({ item, stations, saving, onPatchItem }) {
  const [stockDraft, setStockDraft] = useState(String(item.stockCount ?? 0));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '10px 12px', borderRadius: 9, background: 'var(--bg-surface-2)', border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 140px 110px', gap: 10, alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</strong>
          <small style={{ color: 'var(--ink-muted)' }}>{item.category}</small>
        </div>
        <select
          className="input"
          value={item.station}
          disabled={Boolean(saving)}
          onChange={(event) => onPatchItem(item, { station: event.target.value }, `station-${item.id}`)}
        >
          {(stations || []).map((station) => <option key={station} value={station}>{station}</option>)}
        </select>
        <button
          type="button"
          className={`btn ${item.available ? 'btn-secondary' : 'btn-danger'}`}
          disabled={Boolean(saving)}
          onClick={() => onPatchItem(item, { available: !item.available }, `available-${item.id}`)}
        >
          {saving === `available-${item.id}` ? '…' : item.available ? 'Available' : "86'd"}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-muted)', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(item.trackInventory)}
            disabled={Boolean(saving)}
            onChange={(event) => onPatchItem(item, { trackInventory: event.target.checked }, `track-${item.id}`)}
          />
          Track stock
        </label>
        {item.trackInventory && (
          <>
            <input
              className="input"
              type="number"
              min="0"
              value={stockDraft}
              onChange={(event) => setStockDraft(event.target.value)}
              style={{ width: 90, padding: '5px 8px' }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              disabled={Boolean(saving)}
              onClick={() => onPatchItem(item, { stockCount: Number(stockDraft) }, `stock-${item.id}`)}
              style={{ padding: '5px 10px', fontSize: 12 }}
            >
              {saving === `stock-${item.id}` ? 'Saving…' : 'Save stock'}
            </button>
            <span style={{ fontSize: 11, color: item.stockCount <= 3 ? 'var(--danger)' : 'var(--ink-dim)' }}>
              {item.stockCount} left
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default function KdsSettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [closedMessage, setClosedMessage] = useState('');
  const [prepMinutes, setPrepMinutes] = useState({ pickupMinutes: '', deliveryMinutes: '' });

  const load = async () => {
    setLoading(true);
    setError('');
    const response = await api('/shop/kitchen-operations');
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.message || 'Could not load kitchen settings.');
    } else {
      setData(payload);
      setClosedMessage(payload.settings?.closedMessage || '');
      setPrepMinutes({
        pickupMinutes: String(payload.settings?.pickupMinutes ?? ''),
        deliveryMinutes: String(payload.settings?.deliveryMinutes ?? '')
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const patchSettings = async (update, key) => {
    setSaving(key);
    setError('');
    setNotice('');
    const response = await api('/shop/kitchen-operations', { method: 'PATCH', body: JSON.stringify(update) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.message || 'Could not save that kitchen setting.');
    } else {
      setData((current) => ({
        ...current,
        settings: payload.settings,
        ...(payload.stations ? { stations: payload.stations } : {}),
        ...(payload.tables ? { tables: payload.tables } : {})
      }));
      setNotice('Saved. The change applies to both kitchen screens immediately.');
    }
    setSaving('');
    return response.ok;
  };

  const patchItem = async (item, update, key) => {
    setSaving(key);
    setError('');
    const response = await api(`/shop/kitchen-menu-items/${item.id}`, { method: 'PATCH', body: JSON.stringify(update) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.message || 'Could not update that menu item.');
    } else {
      setData((current) => ({
        ...current,
        items: current.items.map((one) => (one.id === item.id ? { ...one, ...payload.item } : one))
      }));
    }
    setSaving('');
  };

  const addStation = (name) => {
    if (!data) return;
    if ((data.stations || []).some((station) => station.toLowerCase() === name.toLowerCase())) return;
    patchSettings({ stations: [...(data.stations || []), name] }, 'stations');
  };

  const removeStation = (station) => {
    const remaining = (data.stations || []).filter((one) => one !== station);
    if (!remaining.length) {
      setError('Keep at least one kitchen station.');
      return;
    }
    patchSettings({ stations: remaining }, 'stations');
  };

  const addTable = (name) => {
    if (!data) return;
    if ((data.tables || []).some((table) => table.toLowerCase() === name.toLowerCase())) return;
    patchSettings({ tables: [...(data.tables || []), name] }, 'tables');
  };

  const removeTable = (tableName) => {
    const remaining = (data.tables || []).filter((one) => one !== tableName);
    if (!remaining.length) {
      setError('Keep at least one table.');
      return;
    }
    patchSettings({ tables: remaining }, 'tables');
  };

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data?.items || [];
    return (data?.items || []).filter((item) => `${item.name} ${item.category} ${item.station}`.toLowerCase().includes(term));
  }, [data?.items, search]);

  const settings = data?.settings;

  return (
    <Shell>
      <PageHeader
        icon={Settings2}
        eyebrow="Kitchen Display"
        title="KDS Settings"
        description="Pause ordering, set prep times, manage stations and tables, and route menu items — everything the kitchen screens read from."
        actions={<>
          <Link href="/admin/kds" className="btn" style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a96e 100%)', color: '#000', fontWeight: 800, textDecoration: 'none' }}>
            <Monitor size={16} /> Live Display
          </Link>
          <Link href="/admin/kds/orders" className="btn ghost"><ChefHat size={15} /> KDS Orders</Link>
          <Link href="/admin/kds/take-order" className="btn ghost"><UtensilsCrossed size={15} /> Take Order</Link>
          <Link href="/admin/kds/tables" className="btn ghost"><LayoutGrid size={15} /> Table Status</Link>
          <button className="btn ghost" type="button" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </>}
      />

      {error && <div className="alert error order-alert">{error}</div>}
      {notice && <div className="alert order-alert" onClick={() => setNotice('')} role="status">{notice}</div>}

      {loading && !data ? (
        <div className="panel"><InlineLoader label="Loading kitchen settings…" /></div>
      ) : !settings ? (
        <EmptyState icon={ChefHat} title="Could not load kitchen settings" description="Refresh to try again." />
      ) : (
        <>
          <FormSection title="Ordering & pause" description="Turn the kitchen on or off for new orders — takes effect on the next checkout." icon={Power}>
            <div className="order-switches">
              <label>
                <input type="checkbox" checked={settings.orderingEnabled} disabled={Boolean(saving)}
                  onChange={() => patchSettings({ orderingEnabled: !settings.orderingEnabled }, 'orderingEnabled')} />
                Accepting orders
              </label>
              <label>
                <input type="checkbox" checked={settings.pickupEnabled} disabled={Boolean(saving)}
                  onChange={() => patchSettings({ pickupEnabled: !settings.pickupEnabled }, 'pickupEnabled')} />
                Pickup
              </label>
              <label>
                <input type="checkbox" checked={settings.deliveryEnabled} disabled={Boolean(saving)}
                  onChange={() => patchSettings({ deliveryEnabled: !settings.deliveryEnabled }, 'deliveryEnabled')} />
                Delivery
              </label>
            </div>
            <div className="form-grid">
              <label className="field field-span">
                Closed message
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <textarea className="input" rows="2" maxLength="300" value={closedMessage} onChange={(event) => setClosedMessage(event.target.value)} />
                  <button type="button" className="btn btn-secondary" disabled={Boolean(saving) || !closedMessage.trim()}
                    onClick={() => patchSettings({ closedMessage: closedMessage.trim() }, 'closedMessage')}>
                    {saving === 'closedMessage' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </label>
            </div>
          </FormSection>

          <FormSection title="Quoted prep time" description="How long checkout tells customers to expect, in minutes." icon={Clock}>
            <div className="form-grid">
              {[
                ['pickupMinutes', 'Pickup'],
                ['deliveryMinutes', 'Delivery']
              ].map(([key, label]) => (
                <label key={key} className="field">
                  {label}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input"
                      type="number"
                      min="10"
                      max="180"
                      value={prepMinutes[key]}
                      onChange={(event) => setPrepMinutes((current) => ({ ...current, [key]: event.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={Boolean(saving)}
                      onClick={() => patchSettings({ [key]: Number(prepMinutes[key]) }, key)}
                    >
                      {saving === key ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </label>
              ))}
            </div>
          </FormSection>

          <FormSection title="Stations" description="Names cooks route tickets to — Grill, Fryer, Pantry, Expo, or your own." icon={ChefHat}>
            <NameChipsEditor
              items={data.stations}
              disabled={Boolean(saving)}
              placeholder="New station name"
              onAdd={addStation}
              onRemove={removeStation}
            />
          </FormSection>

          <FormSection title="Tables" description="Dine-in tables staff can pick from when taking an order at the restaurant." icon={LayoutGrid}>
            <NameChipsEditor
              items={data.tables}
              disabled={Boolean(saving)}
              placeholder="New table name (e.g. 12 or Patio 3)"
              onAdd={addTable}
              onRemove={removeTable}
            />
          </FormSection>

          <FormSection title="Menu availability, routing & inventory" description="86 an item immediately, assign it to a station, or track a stock count that auto-86s the item at zero." icon={Boxes}>
            <label className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
              <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu items" />
            </label>
            <div style={{ display: 'grid', gap: 8 }}>
              {visibleItems.map((item) => (
                <MenuItemRow key={item.id} item={item} stations={data.stations} saving={saving} onPatchItem={patchItem} />
              ))}
              {!visibleItems.length && <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No menu items match your search.</p>}
            </div>
          </FormSection>
        </>
      )}
    </Shell>
  );
}
