'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SvgIcon from './SvgIcon';

export default function ActiveOrderFloatingBar() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [closed, setClosed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('preva_active_order');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.orderNumber) {
          setActiveOrder(parsed);
        }
      }
    } catch {
      /* private storage */
    }
  }, []);

  // Poll status occasionally to keep floating badge in sync
  useEffect(() => {
    if (!activeOrder?.orderNumber) return;
    if (['CANCELLED', 'REFUNDED', 'COMPLETED', 'DELIVERED'].includes(activeOrder.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/shop/orders/${activeOrder.orderNumber}`);
        if (res.ok) {
          const fresh = await res.json();
          if (['CANCELLED', 'REFUNDED', 'COMPLETED', 'DELIVERED'].includes(fresh.status)) {
            localStorage.removeItem('preva_active_order');
          } else {
            localStorage.setItem(
              'preva_active_order',
              JSON.stringify({ orderNumber: fresh.orderNumber, status: fresh.status })
            );
          }
          setActiveOrder(fresh);
        }
      } catch {
        /* silent retry */
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeOrder?.orderNumber, activeOrder?.status]);

  if (!activeOrder || closed) return null;
  // Don't show floating bar if user is already on the order tracker page
  if (pathname === `/order/${activeOrder.orderNumber}`) return null;

  const statusLabels = {
    PENDING: { label: 'Confirming Order', icon: 'clock' },
    PAID: { label: 'Order Confirmed', icon: 'check-circle' },
    RECEIVED: { label: 'Order Received', icon: 'check-circle' },
    RECEIVED: { label: 'Kitchen Received', icon: 'inbox' },
    PREPARING: { label: 'In The Kitchen', icon: 'chef' },
    READY: { label: 'Packed & Hot', icon: 'package' },
    ON_THE_WAY: { label: 'Out For Delivery', icon: 'delivery' },
    DELIVERED: { label: 'Delivered', icon: 'party' },
    COMPLETED: { label: 'Completed', icon: 'check-circle' }
  };

  const status = statusLabels[activeOrder.status] || { label: 'Active Order', icon: 'utensils' };

  return (
    <aside
      aria-label="Active live order status"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(20, 20, 24, 0.96) 0%, rgba(10, 10, 14, 0.98) 100%)',
        border: '1px solid rgba(201, 168, 76, 0.6)',
        borderRadius: '50px',
        padding: '10px 18px 10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.85), 0 0 20px rgba(201, 168, 76, 0.25)',
        backdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.4s ease'
      }}
    >
      {/* Pulse dot */}
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: '#199E6C',
          boxShadow: '0 0 10px #199E6C',
          display: 'inline-block',
          flexShrink: 0
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '10px', color: '#C9A84C', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
          Live Order #{activeOrder.orderNumber}
        </span>
        <strong style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><SvgIcon name={status.icon} size={14} /> {status.label}</span>
        </strong>
      </div>

      <Link
        href={`/order/${activeOrder.orderNumber}`}
        style={{
          marginLeft: '4px',
          background: 'linear-gradient(135deg, #C9A84C 0%, #E5C158 100%)',
          color: '#000',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.5px',
          textDecoration: 'none',
          boxShadow: '0 2px 8px rgba(201, 168, 76, 0.4)',
          whiteSpace: 'nowrap'
        }}
      >
        TRACK LIVE →
      </Link>

      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Dismiss active order tracker"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '14px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <SvgIcon name="close" size={15} />
      </button>
    </aside>
  );
}
