'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChefHat, Clock3, LayoutGrid, Monitor, PackageCheck, RefreshCw, Search, Settings2, Timer, Truck, X } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

const FILTERS = [
  { key: 'KDS', label: 'Active queue' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'ON_THE_WAY', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' }
];

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);

const dateTime = (value) =>
  value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const clock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

function nextStep(order) {
  if (!order) return null;
  if (order.status === 'PAID' || order.status === 'RECEIVED') return { status: 'PREPARING', label: 'Start cooking' };
  if (order.status === 'PREPARING') return { status: 'READY', label: 'Mark ready' };
  if (order.status === 'READY' && order.fulfilment === 'DELIVERY') return { status: 'ON_THE_WAY', label: 'Send for delivery' };
  if (order.status === 'READY') return { status: 'COMPLETED', label: order.fulfilment === 'DINE_IN' ? 'Mark served' : 'Mark collected' };
  if (order.status === 'ON_THE_WAY') return { status: 'DELIVERED', label: 'Mark delivered' };
  if (order.status === 'DELIVERED') return { status: 'COMPLETED', label: 'Close order' };
  return null;
}

export default function KdsOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('KDS');
  const [fulfilment, setFulfilment] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('status', filter);
    params.set('sort', filter === 'KDS' ? 'fifo' : 'desc');
    if (fulfilment) params.set('fulfilment', fulfilment);
    if (search) params.set('search', search);
    return `?${params.toString()}`;
  }, [filter, fulfilment, search]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        api(`/admin/orders${queryString}`),
        api('/admin/orders-summary')
      ]);
      if (!ordersResponse.ok || !summaryResponse.ok) throw new Error('load failed');
      const [rows, totals] = await Promise.all([ordersResponse.json(), summaryResponse.json()]);
      setOrders(rows);
      setSummary(totals);
    } catch {
      setError('Could not load kitchen orders. Check that the API and database are reachable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const openOrder = async (order) => {
    setSelected(order);
    const response = await api(`/admin/orders/${order.id}`);
    if (response.ok) setSelected(await response.json());
  };

  const updateOrder = (fresh) => {
    setOrders((previous) => previous.map((order) => (order.id === fresh.id ? fresh : order)));
    setSelected((current) => (current?.id === fresh.id ? fresh : current));
  };

  const advance = async (order) => {
    const step = nextStep(order);
    if (!step || processing) return;
    setProcessing(order.id);
    setError('');
    const response = await api(`/admin/orders/${order.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: step.status })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data?.message || 'That status change did not save.');
    else {
      updateOrder(data);
      setNotice(`Order #${order.orderNumber} moved to ${step.status.replaceAll('_', ' ')}.`);
      await load({ silent: true });
    }
    setProcessing('');
  };

  return (
    <Shell>
      <PageHeader
        icon={ChefHat}
        eyebrow="Kitchen Display"
        title="KDS Orders"
        description="Kitchen-facing order history and fulfilment tracking, separate from the live cooking screen."
        actions={<>
          <Link href="/admin/kds" className="btn" style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a96e 100%)', color: '#000', fontWeight: 800, textDecoration: 'none' }}>
            <Monitor size={16} /> Live Display
          </Link>
          <Link href="/admin/kds/tables" className="btn ghost"><LayoutGrid size={15} /> Table Status</Link>
          <Link href="/admin/kds/settings" className="btn ghost"><Settings2 size={15} /> KDS Settings</Link>
          <button className="btn ghost" type="button" onClick={() => load({ silent: true })} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </>}
      />

      <div className="order-stats">
        <StatsCard label="Active queue" value={summary?.open ?? '—'} helper="Needs kitchen action" icon={Clock3} tone="warning" />
        <StatsCard label="Preparing now" value={summary?.counts?.PREPARING ?? '—'} helper="Currently cooking" icon={ChefHat} />
        <StatsCard label="Ready now" value={summary?.counts?.READY ?? '—'} helper="Waiting on pickup/handoff" icon={PackageCheck} tone="success" />
        <StatsCard label="On the way" value={summary?.counts?.ON_THE_WAY ?? '—'} helper="Out for delivery" icon={Truck} />
      </div>

      <div className="order-stats">
        <StatsCard label="Completed today" value={summary?.completedToday ?? '—'} helper="Picked up, delivered or served" icon={CheckCircle2} tone="success" />
        <StatsCard label="Avg cook time" value={summary?.avgPrepMinutes != null ? `${summary.avgPrepMinutes}m` : '—'} helper="Preparing → Ready, all-time" icon={Timer} />
        <StatsCard label="Running late" value={summary?.slaBreaches ?? '—'} helper="Active tickets past their ready-by time" icon={AlertTriangle} tone={summary?.slaBreaches ? 'warning' : 'default'} />
      </div>

      {error && <div className="alert error order-alert">{error}</div>}
      {notice && <div className="alert order-alert" onClick={() => setNotice('')} role="status">{notice}</div>}

      <div className="order-toolbar panel">
        <label className="order-search">
          <Search size={16} />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search order, customer or phone" />
          {searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><X size={14} /></button>}
        </label>
        <select className="input order-fulfilment" value={fulfilment} onChange={(event) => setFulfilment(event.target.value)} aria-label="Fulfilment filter">
          <option value="">Pickup & delivery</option>
          <option value="PICKUP">Pickup only</option>
          <option value="DELIVERY">Delivery only</option>
        </select>
      </div>

      <div className="order-filters" role="tablist" aria-label="Kitchen status">
        {FILTERS.map((option) => (
          <button key={option.key} className={`btn ${filter === option.key ? '' : 'ghost'}`} onClick={() => setFilter(option.key)} role="tab" aria-selected={filter === option.key}>
            {option.label}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton rows={6} /> : orders.length === 0 ? (
        <div className="panel"><EmptyState icon={ChefHat} title="No matching orders" description="Try another status, fulfilment type or search term." /></div>
      ) : (
        <div className="panel order-table-wrap">
          <table className="table order-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Ready by</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
            <tbody>
              {orders.map((order) => {
                const step = nextStep(order);
                const itemCount = (order.lines || []).reduce((total, line) => total + (Number(line.qty) || 0), 0);
                return (
                  <tr key={order.id} onClick={() => openOrder(order)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openOrder(order)}>
                    <td><strong>#{order.orderNumber}</strong><small>{dateTime(order.createdAt)}</small></td>
                    <td><strong>{order.customer?.name || 'Guest'}</strong><small>{order.customer?.phone || 'No phone'}</small></td>
                    <td><strong>{itemCount} item{itemCount === 1 ? '' : 's'}</strong><small>{(order.lines || []).map((line) => `${line.qty}× ${line.name}`).join(', ')}</small></td>
                    <td>
                      {clock(order.readyAt)}
                      {order.isScheduled && <small style={{ color: '#C9A84C', display: 'block', fontWeight: 600 }}>📅 Scheduled</small>}
                    </td>
                    <td><StatusBadge status={order.status} /><small>{order.fulfilment}</small></td>
                    <td><strong>{money(order.totalCents)}</strong></td>
                    <td onClick={(event) => event.stopPropagation()}>
                      {step ? (
                        <button className="btn" disabled={processing === order.id} onClick={() => advance(order)}>
                          {processing === order.id ? 'Saving…' : step.label}
                        </button>
                      ) : (
                        <button className="btn ghost" onClick={() => openOrder(order)}>View</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <article className="modal-content order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="kds-order-detail-title">
            <header className="order-detail-header">
              <div><span>ORDER</span><h2 id="kds-order-detail-title">#{selected.orderNumber}</h2><p>{dateTime(selected.createdAt)} · {selected.fulfilment}</p></div>
              <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Close"><X size={18} /></button>
            </header>
            <div className="order-detail-status">
              <StatusBadge status={selected.status} />
              {nextStep(selected) && (
                <button
                  className="btn"
                  style={{ marginLeft: 10, padding: '6px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => advance(selected)}
                  disabled={processing === selected.id}
                >
                  {nextStep(selected).status === 'ON_THE_WAY' ? <Truck size={14} /> : <PackageCheck size={14} />}
                  {processing === selected.id ? 'Saving…' : nextStep(selected).label}
                </button>
              )}
              <strong>{money(selected.totalCents)}</strong>
            </div>
            <div className="order-detail-grid">
              <section>
                <h3>Customer</h3>
                <b>{selected.customer?.name || 'Guest'}</b>
                <a href={`tel:${selected.customer?.phone || ''}`}>{selected.customer?.phone || 'No phone'}</a>
              </section>
              <section>
                <h3>Fulfilment</h3>
                <b>{selected.fulfilment}</b>
                {selected.isScheduled && selected.scheduledAt ? (
                  <span style={{ color: '#C9A84C', fontWeight: 600 }}>📅 Scheduled for {dateTime(selected.scheduledAt)}</span>
                ) : (
                  <span><Clock3 size={14} /> Ready by {clock(selected.readyAt)}</span>
                )}
                {selected.fulfilment === 'DELIVERY' && <span>{selected.customer?.address}{selected.customer?.postcode ? `, ${selected.customer.postcode}` : ''}</span>}
              </section>
            </div>
            {(selected.customer?.note || (selected.lines || []).some((line) => line.note)) && (
              <div className="order-note">
                <strong>Kitchen note</strong>
                {selected.customer?.note && <p>{selected.customer.note}</p>}
                {(selected.lines || []).filter((line) => line.note).map((line) => <p key={line.itemId}><b>{line.name}:</b> {line.note}</p>)}
              </div>
            )}
            <section className="order-items">
              <h3>Items</h3>
              {(selected.lines || []).map((line, index) => (
                <div key={`${line.itemId}-${index}`}><span><b>{line.qty}×</b> {line.name}{line.options && <small>{line.options}</small>}</span><strong>{money(line.unitCents * line.qty)}</strong></div>
              ))}
            </section>
            {selected.statusHistory?.length > 0 && (
              <section className="order-history">
                <h3>Status history</h3>
                {selected.statusHistory.map((event, index) => (
                  <span key={`${event.status}-${index}`}><StatusBadge status={event.status} /><small>{dateTime(event.at)}{event.by ? ` · ${event.by}` : ''}</small></span>
                ))}
              </section>
            )}
          </article>
        </div>
      )}
    </Shell>
  );
}
