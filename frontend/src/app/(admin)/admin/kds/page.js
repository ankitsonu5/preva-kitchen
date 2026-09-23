'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, ListTree, Settings2, UtensilsCrossed } from 'lucide-react';
import { api, getUser } from '@/lib/admin-api';
import { useKdsBoard } from '@/lib/kds/useKdsBoard';
import KdsBoard from '@/components/kds/KdsBoard';

/**
 * Admin KDS prefers the session-authenticated `/admin/orders` routes and
 * falls back to the public kitchen-terminal endpoints if that admin session
 * isn't available (e.g. token expired mid-shift). Item checklist and station
 * assignment only exist as terminal endpoints, but the admin session cookie
 * satisfies their auth check too (see verifyKitchenAuth in shop.js), so
 * those go straight there.
 */
function createAdminClient() {
  const parseError = async (res, fallback) => {
    const data = await res.json().catch(() => ({}));
    return new Error(data?.message || fallback);
  };

  return {
    fetchActive: async () => {
      let res = await fetch('/api/shop/kitchen-tickets', { cache: 'no-store' });
      if (!res.ok) res = await api('/admin/orders?status=KDS&sort=fifo&limit=150');
      if (!res.ok) throw new Error('Could not fetch active orders');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    fetchRecalls: async () => {
      let res = await fetch('/api/shop/kitchen-recalls', { cache: 'no-store' });
      if (!res.ok) res = await api('/admin/orders?status=COMPLETED&limit=20');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    updateStatus: async (orderId, status, details) => {
      let res = await api(`/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...details })
      });
      if (!res.ok) {
        res = await fetch(`/api/shop/kitchen-tickets/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, ...details })
        });
      }
      if (!res.ok) throw await parseError(res, 'Failed to update order');
    },
    fire: async (orderId) => {
      const res = await fetch(`/api/shop/kitchen-tickets/${orderId}/fire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw await parseError(res, 'Could not fire scheduled order');
      return res.json();
    },
    // The admin session cookie already satisfies verifyKitchenAuth() on the
    // terminal endpoints (see shop.js), so these can call them directly.
    toggleItem: async (orderId, idx, checked) => {
      const res = await fetch(`/api/shop/kitchen-tickets/${orderId}/items/${idx}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked })
      });
      if (!res.ok) throw await parseError(res, 'Could not update item');
    },
    assign: async (orderId, station, assignee) => {
      const res = await fetch(`/api/shop/kitchen-tickets/${orderId}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, assignee })
      });
      if (!res.ok) throw await parseError(res, 'Could not assign ticket');
      const data = await res.json();
      return data.assignment;
    },
    assignDriver: async (orderId, name, phone) => {
      const res = await fetch(`/api/shop/kitchen-tickets/${orderId}/driver`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone })
      });
      if (!res.ok) throw await parseError(res, 'Could not assign driver');
      return (await res.json()).driver;
    },
    markPaid: async (orderId, method, details) => {
      const res = await fetch(`/api/shop/dine-in-orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, ...details })
      });
      if (!res.ok) throw await parseError(res, 'Could not mark this order paid');
      return res.json();
    }
  };
}

function kdsNavLinkStyle() {
  return {
    height: '36px',
    padding: '0 12px',
    borderRadius: '8px',
    background: '#1c1c28',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#c9a96e',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 700,
    boxSizing: 'border-box'
  };
}

const BackToAdminLink = (
  <Link href="/admin/orders" title="Back to Orders Dashboard" style={kdsNavLinkStyle()}>
    <ArrowLeft size={16} />
    <span>Admin</span>
  </Link>
);

const KdsHeaderRight = (
  <>
    <Link href="/admin/kds/take-order" title="Take Order — enter a dine-in order for a table" style={kdsNavLinkStyle()}>
      <UtensilsCrossed size={15} />
      <span>Take Order</span>
    </Link>
    <Link href="/admin/kds/tables" title="Table Status — which tables are empty, active or unpaid" style={kdsNavLinkStyle()}>
      <LayoutGrid size={15} />
      <span>Tables</span>
    </Link>
    <Link href="/admin/kds/orders" title="KDS Orders — kitchen order history" style={kdsNavLinkStyle()}>
      <ListTree size={15} />
      <span>Orders</span>
    </Link>
    <Link href="/admin/kds/settings" title="KDS Settings — pause ordering, prep times, stations" style={kdsNavLinkStyle()}>
      <Settings2 size={15} />
      <span>Settings</span>
    </Link>
  </>
);

export default function AdminKdsPage() {
  const [client] = useState(createAdminClient);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isKdsManager, setIsKdsManager] = useState(null);

  const board = useKdsBoard({ client, soundStorageKey: 'preva_kds_sound', sseUrl: '/api/shop/kitchen-events' });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    getUser().then((user) => setIsKdsManager(user?.role === 'KDS_MANAGER'));
  }, []);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <KdsBoard
      board={board}
      badgeLabel="ADMIN KDS"
      headerLeft={isKdsManager === false ? BackToAdminLink : null}
      headerRight={KdsHeaderRight}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
    />
  );
}
