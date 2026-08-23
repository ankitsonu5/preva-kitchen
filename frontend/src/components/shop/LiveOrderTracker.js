'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SvgIcon from '../SvgIcon';
import { showSuccess, showToast } from '../../lib/swal';

const STAGES = [
  {
    key: 'RECEIVED',
    match: ['PENDING', 'PAID', 'RECEIVED'],
    icon: 'inbox',
    title: 'Order Confirmed',
    subtitle: 'Kitchen received your order & confirmed payment.'
  },
  {
    key: 'PREPARING',
    match: ['PREPARING'],
    icon: 'chef',
    title: 'In The Kitchen',
    subtitle: 'Chef is crafting your gourmet meal fresh.'
  },
  {
    key: 'READY',
    match: ['READY'],
    icon: 'package',
    title: 'Packed & Hot',
    subtitle: 'Food is quality checked and packed in thermal box.'
  },
  {
    key: 'ON_THE_WAY',
    match: ['ON_THE_WAY'],
    icon: 'delivery',
    title: 'Out For Delivery',
    subtitle: 'Driver is on the way to your delivery address!'
  },
  {
    key: 'COMPLETED',
    match: ['DELIVERED', 'COMPLETED'],
    icon: 'party',
    title: 'Delivered',
    subtitle: 'Order completed successfully! Enjoy your meal.'
  }
];

function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

export default function LiveOrderTracker({ initialOrder }) {
  const [order, setOrder] = useState(initialOrder);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const paid = new URLSearchParams(window.location.search).get('paid') === '1';
    const noticeKey = `preva-paid-notice-${initialOrder?.orderNumber}`;
    if (paid && !window.sessionStorage.getItem(noticeKey)) {
      window.sessionStorage.setItem(noticeKey, 'shown');
      showSuccess('Payment successful', `Order #${initialOrder?.orderNumber} is confirmed. The kitchen has received it.`);
    }
  }, [initialOrder?.orderNumber]);

  // The customer only reaches this tracker for an accepted order, so the saved
  // cart has served its purpose. Also store the active order so customer can
  // track it across the website.
  useEffect(() => {
    try {
      window.localStorage.removeItem('preva.cart.v1');
      if (order?.orderNumber && !['CANCELLED', 'REFUNDED', 'COMPLETED', 'DELIVERED'].includes(order.status)) {
        window.localStorage.setItem('preva_active_order', JSON.stringify({
          orderNumber: order.orderNumber,
          status: order.status
        }));
      }
    } catch {
      /* private browsing */
    }
  }, [order?.orderNumber, order?.status]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Keep the customer view current while the order is active.
  useEffect(() => {
    if (!order?.orderNumber) return;
    if (['CANCELLED', 'REFUNDED', 'COMPLETED', 'DELIVERED'].includes(order.status)) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/shop/orders/${order.orderNumber}`);
        if (res.ok) {
          const fresh = await res.json();
          setOrder(fresh);
          setLastUpdated(new Date());
        }
      } catch (err) {
        /* silent poll retry */
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [order?.orderNumber, order?.status]);

  const currentStatus = order?.status || 'PAID';
  const isDelivery = order?.fulfilment === 'DELIVERY';
  const stages = isDelivery
    ? STAGES
    : STAGES.filter((stage) => stage.key !== 'ON_THE_WAY').map((stage) => (
      stage.key === 'COMPLETED'
        ? { ...stage, title: 'Collected', subtitle: 'Your pickup order has been collected. Enjoy your meal!' }
        : stage
    ));
  const matchedStage = stages.findIndex((stage) => stage.match.includes(currentStatus));
  const activeIndex = matchedStage < 0 ? 0 : matchedStage;
  const progressPercent = Math.min(100, Math.max(15, ((activeIndex + 1) / stages.length) * 100));
  const readyDate = order?.readyAt ? new Date(order.readyAt) : new Date(Date.now() + 25 * 60000);

  if (['CANCELLED', 'REFUNDED'].includes(currentStatus)) {
    const refunded = currentStatus === 'REFUNDED';
    return (
      <div className="ps-status" style={{ maxWidth: 680, margin: '0 auto 80px' }}>
        <div className="ps-status__seal" aria-hidden="true"><SvgIcon name={refunded ? 'rotate-ccw' : 'close'} size={26} /></div>
        <span className="ps-kicker" style={{ textAlign: 'center' }}>Order #{order.orderNumber}</span>
        <h1 className="ps-h1">{refunded ? 'Your order was refunded' : 'This order was cancelled'}</h1>
        <p className="ps-lede" style={{ margin: '18px auto 0' }}>
          {refunded
            ? 'The refund has been confirmed. Your bank may take a few business days to show it on your statement.'
            : 'This order is no longer active. Please contact Preva Kitchen if you need any help.'}
        </p>
        <p style={{ marginTop: 28 }}><Link href="/shop" className="ps-more">Back to the menu</Link></p>
      </div>
    );
  }

  return (
    <div className="ps-live-tracker" style={{ maxWidth: '780px', margin: '0 auto', paddingBottom: '80px' }}>
      
      {/* Top Live Tracker Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1E1E 0%, #121212 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(201, 168, 76, 0.3)',
          padding: 'clamp(20px, 4vw, 32px)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
          marginBottom: '32px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Pulse Live Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase' }}>
            PREVA KITCHEN TRACKER
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(25, 158, 108, 0.15)', padding: '6px 14px', borderRadius: '20px', border: '1px solid rgba(25, 158, 108, 0.4)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#199E6C', boxShadow: '0 0 10px #199E6C', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#199E6C', letterSpacing: '1px' }}>LIVE TRACING</span>
          </div>
        </div>

        {/* Order Number & Title */}
        <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, margin: '0 0 8px 0' }}>
          Order #{order.orderNumber}
        </h1>
        
        <p style={{ color: '#aaaaaa', fontSize: '15px', margin: 0, lineHeight: 1.5 }}>
          {isDelivery
            ? `Delivery order for ${order.customerName || 'our guest'}`
            : 'Pickup at: 13090 Inkster Rd, Redford Township, MI'}
        </p>

        {/* Estimated Arrival Box */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '20px', background: 'rgba(255,255,255,0.03)', padding: '14px 18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div>
            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>ESTIMATED ARRIVAL</span>
            <strong style={{ fontSize: '18px', color: '#C9A84C', fontWeight: 900 }}>
              {readyDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </strong>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>FULFILMENT</span>
            <strong style={{ fontSize: '15px', color: '#ffffff', fontWeight: 800 }}>{order.fulfilment || 'DELIVERY'}</strong>
          </div>
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>PAYMENT STATUS</span>
            <strong style={{ fontSize: '15px', color: '#199E6C', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{order.paymentStatus || 'PAID'} <SvgIcon name="check-circle" size={16} /></strong>
          </div>
        </div>

        {/* Live Animated Progress Bar */}
        <div style={{ marginTop: '24px' }}>
          <div style={{ width: '100%', height: '8px', background: '#262626', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #C9A84C 0%, #E5C158 50%, #199E6C 100%)',
                borderRadius: '4px',
                transition: 'width 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Quick Save & Share Live Tracking Link */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(201, 168, 76, 0.25)',
          borderRadius: '18px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px'
        }}
      >
        <div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
            KEEP OR SHARE YOUR LIVE LINK
          </span>
          <span style={{ fontSize: '13px', color: '#888' }}>
            Save this link to check your order status from your phone anytime.
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard?.writeText(window.location.href);
                setCopied(true);
                showToast('Live order link copied');
                setTimeout(() => setCopied(false), 2500);
              }
            }}
            style={{
              background: copied ? '#199E6C' : '#262626',
              color: copied ? '#ffffff' : '#dddddd',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px 16px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <SvgIcon name={copied ? 'check' : 'copy'} size={15} /> {copied ? 'Link Copied!' : 'Copy Link'}
          </button>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Track my Preva Kitchen Order #${order.orderNumber} live: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'rgba(37, 211, 102, 0.15)',
              color: '#25D366',
              border: '1px solid rgba(37, 211, 102, 0.35)',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <SvgIcon name="message" size={15} /> WhatsApp
          </a>

          <a
            href={`sms:?&body=${encodeURIComponent(`Track my Preva Kitchen Order #${order.orderNumber} live: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.15)',
              padding: '8px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <SvgIcon name="smartphone" size={15} /> SMS
          </a>
        </div>
      </div>

      {/* 5-Stage Live Timeline Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
        {stages.map((stage, idx) => {
          const isDone = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: isCurrent ? 'rgba(201, 168, 76, 0.12)' : isDone ? '#1A1A1A' : '#141414',
                border: isCurrent ? '2px solid #C9A84C' : isDone ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.03)',
                borderRadius: '18px',
                padding: '16px 20px',
                opacity: isDone ? 1 : 0.45,
                transition: 'all 0.3s ease',
                boxShadow: isCurrent ? '0 10px 30px rgba(201, 168, 76, 0.25)' : 'none'
              }}
            >
              {/* Stage Icon Circle */}
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: isCurrent ? '#C9A84C' : isDone ? '#262626' : '#1A1A1A',
                  color: isCurrent ? '#000' : '#fff',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '22px',
                  fontWeight: 900,
                  flexShrink: 0,
                  boxShadow: isCurrent ? '0 0 20px rgba(201, 168, 76, 0.6)' : 'none'
                }}
              >
                <SvgIcon name={stage.icon} size={23} />
              </div>

              {/* Stage Text Details */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: isCurrent ? '#C9A84C' : '#ffffff' }}>
                    {stage.title}
                  </h3>
                  {isCurrent && (
                    <span style={{ fontSize: '10px', background: '#C9A84C', color: '#000', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, letterSpacing: '1px' }}>
                      IN PROGRESS
                    </span>
                  )}
                  {isDone && !isCurrent && (
                    <span style={{ fontSize: '12px', color: '#199E6C', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}><SvgIcon name="check" size={14} /> Done</span>
                  )}
                </div>
                <p style={{ fontSize: '13px', color: '#aaaaaa', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                  {stage.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Receipt Breakdown Card */}
      <div style={{ background: '#1A1A1A', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#C9A84C', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
          ORDER SUMMARY
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
          {(order.lines || []).map((line, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#ddd' }}>
              <span><strong>{line.qty}×</strong> {line.name} {line.options ? <em style={{ fontSize: '12px', color: '#888', display: 'block', fontStyle: 'normal' }}>{line.options}</em> : ''}</span>
              <strong style={{ color: '#fff' }}>{money(line.unitCents * line.qty)}</strong>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#aaa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <b style={{ color: '#fff' }}>{money(order.subtotalCents)}</b>
          </div>
          {order.deliveryCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Delivery Fee</span>
              <b style={{ color: '#fff' }}>{money(order.deliveryCents)}</b>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Sales Tax</span>
            <b style={{ color: '#fff' }}>{money(order.taxCents)}</b>
          </div>
          {order.tipCents > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tip</span>
              <b style={{ color: '#fff' }}>{money(order.tipCents)}</b>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, color: '#C9A84C', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: '4px' }}>
            <span>TOTAL PAID</span>
            <span>{money(order.totalCents)}</span>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link
            href="/shop"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 28px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #C9A84C 0%, #E5C158 100%)',
              color: '#000',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1px',
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(201, 168, 76, 0.3)'
            }}
          >
            ORDER MORE FROM MENU →
          </Link>
        </div>
      </div>
    </div>
  );
}
