'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChefHat, Clock3, LayoutGrid, Monitor, Plus, RefreshCw, Settings2, UtensilsCrossed } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { EmptyState, LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);

function elapsed(createdAt) {
  if (!createdAt) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const STATUS_STYLE = {
  empty: { bg: 'var(--bg-surface-2)', border: 'var(--border)', label: 'Empty', color: 'var(--ink-muted)' },
  active: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.5)', label: 'In progress', color: '#f59e0b' },
  unpaid: { bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.6)', label: 'Unpaid', color: '#ef4444' }
};

export default function TableStatusPage() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError('');
    const response = await api('/shop/dine-in-tables');
    if (response.ok) {
      const data = await response.json();
      setTables(data.tables || []);
    } else {
      setError('Could not load table status.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(() => load({ silent: true }), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const markPaid = async (row) => {
    if (row.orderCount !== 1) return;
    const method = window.prompt('Payment method (cash or card):', 'cash');
    if (!method) return;
    const clean = method.trim().toLowerCase();
    if (!['cash', 'card'].includes(clean)) return window.alert('Enter "cash" or "card".');
    setProcessing(row.table);
    const response = await api(`/shop/dine-in-orders/${row.orderIds[0]}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ method: clean })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data?.message || 'Could not mark this table paid.');
    }
    setProcessing('');
    load({ silent: true });
  };

  const empty = tables.filter((t) => t.status === 'empty').length;
  const active = tables.filter((t) => t.status === 'active').length;
  const unpaid = tables.filter((t) => t.status === 'unpaid').length;

  return (
    <Shell>
      <PageHeader
        icon={LayoutGrid}
        eyebrow="Kitchen Display"
        title="Table Status"
        description="Every configured table at a glance — empty, in progress, or waiting on payment."
        actions={<>
          <Link href="/admin/kds" className="btn" style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a96e 100%)', color: '#000', fontWeight: 800, textDecoration: 'none' }}>
            <Monitor size={16} /> Live Display
          </Link>
          <Link href="/admin/kds/take-order" className="btn ghost"><UtensilsCrossed size={15} /> Take Order</Link>
          <Link href="/admin/kds/orders" className="btn ghost"><ChefHat size={15} /> KDS Orders</Link>
          <Link href="/admin/kds/settings" className="btn ghost"><Settings2 size={15} /> KDS Settings</Link>
          <button className="btn ghost" type="button" onClick={() => load({ silent: true })} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} /> Refresh
          </button>
        </>}
      />

      {error && <div className="alert error order-alert">{error}</div>}

      {loading ? <LoadingSkeleton rows={4} cards /> : !tables.length ? (
        <EmptyState
          icon={LayoutGrid}
          title="No tables configured yet"
          description="Add at least one table in KDS Settings first."
          action={<Link href="/admin/kds/settings" className="btn">Go to KDS Settings</Link>}
        />
      ) : (
        <>
          <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: '0 0 14px' }}>
            {empty} empty · {active} in progress · {unpaid} unpaid
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {tables.map((row) => {
              const style = STATUS_STYLE[row.status];
              return (
                <div key={row.table} style={{ padding: 14, borderRadius: 12, background: style.bg, border: `1.5px solid ${style.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: 16 }}>Table {row.table}</strong>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: style.color }}>{style.label}</span>
                  </div>

                  {row.status === 'empty' ? (
                    <Link href={`/admin/kds/take-order?table=${encodeURIComponent(row.table)}`} className="btn btn-secondary" style={{ justifyContent: 'center', fontSize: 12, padding: '6px 10px' }}>
                      <Plus size={13} /> New order
                    </Link>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Clock3 size={12} /> {elapsed(row.oldestCreatedAt)} · {row.itemCount} item{row.itemCount === 1 ? '' : 's'}
                        {row.orderCount > 1 && ` · ${row.orderCount} orders`}
                      </div>
                      <strong style={{ color: 'var(--gold)', fontSize: 14 }}>{money(row.totalCents)}</strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link href={`/admin/kds/take-order?table=${encodeURIComponent(row.table)}`} className="btn ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '5px 8px' }}>
                          Add round
                        </Link>
                        {row.status === 'unpaid' && row.orderCount === 1 && (
                          <button
                            type="button"
                            className="btn btn-danger"
                            disabled={processing === row.table}
                            onClick={() => markPaid(row)}
                            style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '5px 8px' }}
                          >
                            {processing === row.table ? '…' : 'Mark paid'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Shell>
  );
}
