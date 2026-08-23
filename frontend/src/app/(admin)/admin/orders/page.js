'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChefHat, Clock3, DollarSign, Download, ExternalLink,
  FileSpreadsheet, FileText, MapPin, PackageCheck, RefreshCw, Search,
  Settings2, ShoppingBag, Truck, Undo2, X
} from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader, StatsCard, StatusBadge } from '@/components/admin/AdminUI';
import { api, getUser } from '@/lib/admin-api';
import { useConfirm } from '@/components/admin/ConfirmDialog';

const FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'PENDING', label: 'Awaiting payment' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'PAID', label: 'Confirmed (legacy)' },
  { key: 'PREPARING', label: 'Preparing' },
  { key: 'READY', label: 'Ready' },
  { key: 'ON_THE_WAY', label: 'On the way' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'REFUNDED', label: 'Refunded' },
  { key: '', label: 'All' }
];

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);

const dateTime = (value) =>
  value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const clock = (value) =>
  value ? new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—';

function nextStep(order) {
  if (!order) return null;
  if (order.status === 'PENDING') return { status: 'CANCELLED', label: 'Cancel pending order', danger: true };
  if (order.status === 'PAID' || order.status === 'RECEIVED') return { status: 'PREPARING', label: 'Start cooking' };
  if (order.status === 'PREPARING') return { status: 'READY', label: 'Mark ready' };
  if (order.status === 'READY' && order.fulfilment === 'DELIVERY') {
    return { status: 'ON_THE_WAY', label: 'Send for delivery' };
  }
  if (order.status === 'READY') return { status: 'COMPLETED', label: 'Mark collected' };
  if (order.status === 'ON_THE_WAY') return { status: 'DELIVERED', label: 'Mark delivered' };
  if (order.status === 'DELIVERED') return { status: 'COMPLETED', label: 'Close order' };
  return null;
}

function countFor(summary, key) {
  if (!summary) return 0;
  if (key === 'open') return summary.open || 0;
  if (!key) return summary.total || 0;
  return summary.counts?.[key] || 0;
}

const DEFAULT_SETTINGS = {
  orderingEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  taxPercent: '6',
  deliveryFee: '4.99',
  freeDeliveryOver: '50.00',
  minOrder: '15.00',
  pickupMinutes: '25',
  deliveryMinutes: '45',
  tipPresets: '15, 18, 20',
  closedMessage: 'Online ordering is closed right now.'
};

export default function OrdersPage() {
  const confirmAction = useConfirm();
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('open');
  const [fulfilment, setFulfilment] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [payments, setPayments] = useState(null);
  const [user, setUser] = useState(null);
  const [selected, setSelected] = useState(null);
  const [processing, setProcessing] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shopForm, setShopForm] = useState(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);

  const canManagePayments = ['SUPER_ADMIN', 'ADMIN'].includes(user?.role);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filter === 'open') params.set('open', 'true');
    else if (filter) params.set('status', filter);
    if (fulfilment) params.set('fulfilment', fulfilment);
    if (search) params.set('search', search);
    const query = params.toString();
    return query ? `?${query}` : '';
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
      setError('Could not load orders. Check that the API and database are reachable.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [queryString]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      api('/admin/payment-status').then((response) => (response.ok ? response.json() : null)),
      api('/admin/settings').then((response) => (response.ok ? response.json() : null)),
      getUser()
    ]).then(([paymentState, settings, currentUser]) => {
      setPayments(paymentState);
      setUser(currentUser);
      if (settings) {
        setShopForm({
          orderingEnabled: settings.shopOrderingEnabled !== false,
          pickupEnabled: settings.shopPickupEnabled !== false,
          deliveryEnabled: settings.shopDeliveryEnabled !== false,
          taxPercent: String((Number(settings.shopTaxRate ?? 0.06) * 100).toFixed(2)).replace(/\.00$/, ''),
          deliveryFee: (Number(settings.shopDeliveryFeeCents ?? 499) / 100).toFixed(2),
          freeDeliveryOver: (Number(settings.shopFreeDeliveryOverCents ?? 5000) / 100).toFixed(2),
          minOrder: (Number(settings.shopMinOrderCents ?? 1500) / 100).toFixed(2),
          pickupMinutes: String(settings.shopPickupMinutes ?? 25),
          deliveryMinutes: String(settings.shopDeliveryMinutes ?? 45),
          tipPresets: (settings.shopTipPresets || [15, 18, 20]).join(', '),
          closedMessage: settings.shopClosedMessage || DEFAULT_SETTINGS.closedMessage
        });
      }
    }).catch(() => setPayments(null));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => load({ silent: true }), 15000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelected(null);
        setSettingsOpen(false);
      }
    };
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
    if (step.danger && !await confirmAction({
      title: `Cancel Order #${order.orderNumber}?`,
      description: 'This pending order will be cancelled. This action cannot be undone.',
      confirmLabel: 'Yes, cancel order',
      tone: 'danger'
    })) return;
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

  const refund = async (order) => {
    const paidCents = Number(order.payment?.amountCents || order.totalCents) || 0;
    const refundedCents = Number(order.payment?.refundedCents) || 0;
    const refundableCents = Math.max(0, paidCents - refundedCents);
    if (!await confirmAction({
      title: `Refund ${money(refundableCents)}?`,
      description: `Order #${order.orderNumber} — Stripe will refund the remaining card payment. This cannot be undone.`,
      confirmLabel: 'Yes, issue refund',
      tone: 'danger'
    })) return;
    setProcessing(order.id);
    setError('');
    const response = await api(`/admin/orders/${order.id}/refund`, { method: 'POST', body: '{}' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data?.message || 'That refund did not go through.');
    else {
      setNotice(`Refund requested for order #${order.orderNumber}. Stripe confirmation is pending.`);
      setTimeout(() => load({ silent: true }), 1500);
    }
    setProcessing('');
  };

  const exportOrders = (format) => {
    const params = new URLSearchParams({ format });
    if (filter === 'open') params.set('open', 'true');
    else if (filter) params.set('status', filter);
    if (fulfilment) params.set('fulfilment', fulfilment);
    if (search) params.set('search', search);
    window.open(`/api/admin/orders/export?${params.toString()}`, '_blank');
  };

  const saveOrderingSettings = async (event) => {
    event.preventDefault();
    const tipPresets = shopForm.tipPresets.split(',').map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100).slice(0, 6);
    const dollars = (value) => Math.max(0, Math.round((Number(value) || 0) * 100));
    const payload = {
      shopOrderingEnabled: shopForm.orderingEnabled,
      shopPickupEnabled: shopForm.pickupEnabled,
      shopDeliveryEnabled: shopForm.deliveryEnabled,
      shopTaxRate: Math.min(100, Math.max(0, Number(shopForm.taxPercent) || 0)) / 100,
      shopDeliveryFeeCents: dollars(shopForm.deliveryFee),
      shopFreeDeliveryOverCents: dollars(shopForm.freeDeliveryOver),
      shopMinOrderCents: dollars(shopForm.minOrder),
      shopPickupMinutes: Math.max(1, Math.round(Number(shopForm.pickupMinutes) || 25)),
      shopDeliveryMinutes: Math.max(1, Math.round(Number(shopForm.deliveryMinutes) || 45)),
      shopTipPresets: tipPresets.length ? tipPresets : [15, 18, 20],
      shopClosedMessage: shopForm.closedMessage.trim() || DEFAULT_SETTINGS.closedMessage
    };
    setSavingSettings(true);
    setError('');
    const response = await api('/admin/settings', { method: 'PUT', body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data?.message || 'Could not save ordering settings.');
    else {
      setNotice('Online ordering settings saved. Checkout will use them immediately.');
      setSettingsOpen(false);
    }
    setSavingSettings(false);
  };

  return (
    <Shell>
      <PageHeader icon={ChefHat} eyebrow="Online ordering" title="Orders" description="Live kitchen queue, fulfilment tracking, payments and ordering controls."
        actions={<>{canManagePayments && <button className="btn ghost" onClick={() => setSettingsOpen(true)}><Settings2 size={15} /> Settings</button>}<button className="btn ghost" onClick={() => exportOrders('csv')}><Download size={15} /> CSV</button><button className="btn ghost" onClick={() => exportOrders('xlsx')}><FileSpreadsheet size={15} /> Excel</button><button className="btn ghost" onClick={() => exportOrders('pdf')}><FileText size={15} /> PDF</button><button className="btn ghost" onClick={() => load({ silent: true })} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh</button></>}
      />

      <div className="order-stats">
        <StatsCard label="Open queue" value={summary?.open ?? '—'} helper="Needs kitchen action" icon={Clock3} tone="warning" />
        <StatsCard label="Orders today" value={summary?.todayOrders ?? '—'} helper="Paid orders today" icon={ShoppingBag} />
        <StatsCard label="Revenue today" value={summary ? money(summary.todayRevenueCents) : '—'} helper="Paid order value" icon={DollarSign} tone="success" />
        <StatsCard label="Fulfilled" value={summary ? (summary.counts?.DELIVERED || 0) + (summary.counts?.COMPLETED || 0) : '—'} helper="Delivered or collected" icon={CheckCircle2} tone="success" />
      </div>

      {payments && !payments.ready && <PaymentAlert tone="warn" message={payments.message} />}
      {payments?.ready && !payments.webhookReady && <PaymentAlert tone="error" message={payments.message} />}
      {payments?.mode === 'test' && payments.webhookReady && <div className="alert order-alert">Stripe test mode is active. No real money moves until live keys are configured.</div>}
      {error && <div className="alert error order-alert">{error}</div>}
      {notice && <div className="alert order-alert" onClick={() => setNotice('')} role="status">{notice}</div>}

      <div className="order-toolbar panel">
        <label className="order-search"><Search size={16} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search order, customer, phone or email" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><X size={14} /></button>}</label>
        <select className="input order-fulfilment" value={fulfilment} onChange={(event) => setFulfilment(event.target.value)} aria-label="Fulfilment filter"><option value="">Pickup & delivery</option><option value="PICKUP">Pickup only</option><option value="DELIVERY">Delivery only</option></select>
      </div>

      <div className="order-filters" role="tablist" aria-label="Order status">
        {FILTERS.map((option) => <button key={option.key || 'all'} className={`btn ${filter === option.key ? '' : 'ghost'}`} onClick={() => setFilter(option.key)} role="tab" aria-selected={filter === option.key}>{option.label}<span>{countFor(summary, option.key)}</span></button>)}
      </div>

      {loading ? <LoadingSkeleton rows={6} /> : orders.length === 0 ? <div className="panel"><EmptyState icon={ChefHat} title="No matching orders" description="Try another status, fulfilment type or search term." /></div> : (
        <div className="panel order-table-wrap"><table className="table order-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Ready by</th><th>Status</th><th>Payment</th><th>Total</th><th>Action</th></tr></thead><tbody>
          {orders.map((order) => {
            const step = nextStep(order);
            const itemCount = (order.lines || []).reduce((total, line) => total + (Number(line.qty) || 0), 0);
            return <tr key={order.id} onClick={() => openOrder(order)} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && openOrder(order)}>
              <td><strong>#{order.orderNumber}</strong><small>{dateTime(order.createdAt)}</small></td>
              <td><strong>{order.customer?.name || 'Guest'}</strong><small>{order.customer?.phone || 'No phone'}</small></td>
              <td><strong>{itemCount} item{itemCount === 1 ? '' : 's'}</strong><small>{(order.lines || []).map((line) => `${line.qty}× ${line.name}`).join(', ')}</small></td>
              <td>{clock(order.readyAt)}</td><td><StatusBadge status={order.status} /><small>{order.fulfilment}</small></td>
              <td><StatusBadge status={order.payment?.status || 'UNPAID'} />{order.payment?.mode === 'test' && <small>test mode</small>}</td>
              <td><strong>{money(order.totalCents)}</strong></td>
              <td onClick={(event) => event.stopPropagation()}>{step ? <button className={`btn ${step.danger ? 'btn-danger' : ''}`} disabled={processing === order.id} onClick={() => advance(order)}>{step.label}</button> : <button className="btn ghost" onClick={() => openOrder(order)}>View</button>}</td>
            </tr>;
          })}
        </tbody></table></div>
      )}

      {selected && <OrderDetails order={selected} processing={processing === selected.id} canRefund={canManagePayments && selected.payment?.provider === 'stripe' && ['PAID', 'PARTIALLY_REFUNDED'].includes(selected.payment?.status) && (Number(selected.payment?.amountCents || selected.totalCents) - Number(selected.payment?.refundedCents || 0) > 0)} onClose={() => setSelected(null)} onAdvance={() => advance(selected)} onRefund={() => refund(selected)} />}
      {settingsOpen && <OrderingSettings form={shopForm} setForm={setShopForm} saving={savingSettings} onClose={() => setSettingsOpen(false)} onSave={saveOrderingSettings} />}
    </Shell>
  );
}

function PaymentAlert({ tone, message }) {
  return <div className={`alert ${tone} order-alert`}><AlertTriangle size={17} /><span>{message}</span></div>;
}

function OrderDetails({ order, processing, canRefund, onClose, onAdvance, onRefund }) {
  const step = nextStep(order);
  return <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><article className="modal-content order-detail-modal" role="dialog" aria-modal="true" aria-labelledby="order-detail-title">
    <header className="order-detail-header"><div><span>ORDER</span><h2 id="order-detail-title">#{order.orderNumber}</h2><p>{dateTime(order.createdAt)} · {order.fulfilment}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
    <div className="order-detail-status">
      <StatusBadge status={order.status} />
      <StatusBadge status={order.payment?.status || 'UNPAID'} />
      {step && (
        <button
          className={`btn ${step.danger ? 'btn-danger' : ''}`}
          style={{ marginLeft: 10, padding: '6px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          onClick={onAdvance}
          disabled={processing}
        >
          {step.status === 'ON_THE_WAY' ? <Truck size={14} /> : <PackageCheck size={14} />}
          {processing ? 'Saving…' : step.label}
        </button>
      )}
      <strong>{money(order.totalCents)}</strong>
    </div>
    <div className="order-detail-grid"><section><h3>Customer</h3><b>{order.customer?.name || 'Guest'}</b><a href={`tel:${order.customer?.phone || ''}`}>{order.customer?.phone || 'No phone'}</a>{order.customer?.email && <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>}</section><section><h3>Fulfilment</h3><b>{order.fulfilment}</b><span><Clock3 size={14} /> Ready by {clock(order.readyAt)}</span>{order.fulfilment === 'DELIVERY' && <span><MapPin size={14} /> {order.customer?.address}{order.customer?.postcode ? `, ${order.customer.postcode}` : ''}</span>}</section></div>
    {(order.customer?.note || (order.lines || []).some((line) => line.note)) && <div className="order-note"><strong>Kitchen note</strong>{order.customer?.note && <p>{order.customer.note}</p>}{(order.lines || []).filter((line) => line.note).map((line) => <p key={line.itemId}><b>{line.name}:</b> {line.note}</p>)}</div>}
    <section className="order-items"><h3>Items</h3>{(order.lines || []).map((line, index) => <div key={`${line.itemId}-${index}`}><span><b>{line.qty}×</b> {line.name}{line.options && <small>{line.options}</small>}</span><strong>{money(line.unitCents * line.qty)}</strong></div>)}</section>
    <div className="order-totals"><span>Subtotal <b>{money(order.subtotalCents)}</b></span><span>Delivery <b>{order.deliveryCents ? money(order.deliveryCents) : 'Free'}</b></span><span>Tax <b>{money(order.taxCents)}</b></span><span>Tip <b>{money(order.tipCents)}</b></span><strong>Total <b>{money(order.totalCents)}</b></strong></div>
    {order.statusHistory?.length > 0 && <section className="order-history"><h3>Status history</h3>{order.statusHistory.map((event, index) => <span key={`${event.status}-${index}`}><StatusBadge status={event.status} /><small>{dateTime(event.at)}{event.by ? ` · ${event.by}` : ''}</small></span>)}</section>}
    <footer className="modal-actions order-detail-actions"><a className="btn ghost" href={`/order/${order.orderNumber}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Customer view</a>{canRefund && <button className="btn btn-danger" onClick={onRefund} disabled={processing}><Undo2 size={14} /> Refund</button>}{step && <button className={`btn ${step.danger ? 'btn-danger' : ''}`} onClick={onAdvance} disabled={processing}>{step.status === 'ON_THE_WAY' ? <Truck size={14} /> : <PackageCheck size={14} />}{processing ? 'Saving…' : step.label}</button>}</footer>
  </article></div>;
}

function OrderingSettings({ form, setForm, saving, onClose, onSave }) {
  const field = (key) => ({ value: form[key], onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value })) });
  const check = (key) => ({ checked: form[key], onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.checked })) });
  return <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal-content order-settings-modal" onSubmit={onSave} role="dialog" aria-modal="true" aria-labelledby="ordering-settings-title">
    <header className="order-detail-header"><div><span>CHECKOUT</span><h2 id="ordering-settings-title">Ordering settings</h2><p>Changes apply to customer quotes and checkout immediately.</p></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button></header>
    <div className="order-switches"><label><input type="checkbox" {...check('orderingEnabled')} /> Online ordering</label><label><input type="checkbox" {...check('pickupEnabled')} /> Pickup</label><label><input type="checkbox" {...check('deliveryEnabled')} /> Delivery</label></div>
    <div className="form-grid"><label className="field">Minimum order ($)<input className="input" type="number" min="0" step="0.01" {...field('minOrder')} /></label><label className="field">Sales tax (%)<input className="input" type="number" min="0" max="100" step="0.01" {...field('taxPercent')} /></label><label className="field">Delivery fee ($)<input className="input" type="number" min="0" step="0.01" {...field('deliveryFee')} /></label><label className="field">Free delivery over ($)<input className="input" type="number" min="0" step="0.01" {...field('freeDeliveryOver')} /></label><label className="field">Pickup estimate (minutes)<input className="input" type="number" min="1" step="1" {...field('pickupMinutes')} /></label><label className="field">Delivery estimate (minutes)<input className="input" type="number" min="1" step="1" {...field('deliveryMinutes')} /></label><label className="field-span">Tip presets (%)<input className="input" placeholder="15, 18, 20" {...field('tipPresets')} /></label><label className="field-span">Closed message<textarea className="input" rows="3" maxLength="300" {...field('closedMessage')} /></label></div>
    <footer className="modal-actions"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></footer>
  </form></div>;
}
