'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { money, useCart } from './ShopProvider';
import SvgIcon from '../SvgIcon';
import { showError, showToast, showWarning } from '../../lib/swal';

/**
 * The cart + checkout page, laid out the way Swiggy's mobile-web cart flow
 * works: restaurant strip on top, editable item rows with quantity steppers,
 * an "Add more items" escape back to the menu, then delivery details,
 * and a Bill Details card — with a sticky "Proceed to Pay" bar pinned to the
 * bottom on mobile.
 *
 * The money logic is unchanged from before: every number in Bill Details
 * comes back from /api/shop/quote, so the page shows what the server will
 * actually charge. The browser never invents a price.
 */

const GOLD = 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)';

/* ── small building blocks ────────────────────────────────────────────── */

function Stepper({ qty, onMinus, onPlus }) {
  const button = {
    width: 30,
    height: 30,
    border: 'none',
    background: 'transparent',
    color: '#C9A84C',
    fontSize: 16,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'grid',
    placeItems: 'center'
  };
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid rgba(201,168,76,0.55)',
        borderRadius: 8,
        background: 'rgba(201,168,76,0.06)',
        overflow: 'hidden'
      }}
    >
      <button type="button" onClick={onMinus} aria-label="Decrease quantity" style={button}>−</button>
      <span style={{ minWidth: 28, textAlign: 'center', fontSize: 13, fontWeight: 800, color: '#C9A84C' }}>{qty}</span>
      <button type="button" onClick={onPlus} aria-label="Increase quantity" style={button}>+</button>
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: '#1A1A1A',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        ...style
      }}
    >
      {children}
    </div>
  );
}

function BillRow({ label, value, muted, strike }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: muted ? '#8a8a8a' : '#ddd', padding: '5px 0' }}>
      <span>{label}</span>
      <span style={{ textDecoration: strike ? 'line-through' : 'none' }}>{value}</span>
    </div>
  );
}

/* ── the page ─────────────────────────────────────────────────────────── */

export default function CheckoutForm({ settings, cancelledOrderNumber = '' }) {
  const cart = useCart();
  const router = useRouter();
  const checkoutAttemptRef = useRef('');

  const [fulfilment, setFulfilment] = useState(settings.pickupEnabled ? 'PICKUP' : 'DELIVERY');
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', postcode: '', note: '' });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'PICKUP' | 'DELIVERY' | null

  // Schedule state
  const [scheduling, setScheduling] = useState('ASAP'); // 'ASAP' | 'SCHEDULED'
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Date bounds: today → +7 days (local time, not UTC)
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const maxDateStr = useMemo(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const payload = useMemo(
    () => ({
      fulfilment,
      scheduledAt:
        fulfilment === 'PICKUP' && scheduling === 'SCHEDULED' && scheduleDate && scheduleTime
          ? `${scheduleDate}T${scheduleTime}:00`
          : null,
      lines: cart.lines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        optionIds: line.optionIds,
        note: line.note
      }))
    }),
    [cart.lines, cart.subtotalCents, fulfilment, scheduling, scheduleDate, scheduleTime]
  );

  // Re-quote whenever the order changes — including every stepper tap.
  useEffect(() => {
    if (!cart.hydrated || cart.lines.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    setError('');

    (async () => {
      try {
        const response = await fetch('/api/shop/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setQuote(null);
          setError(data?.message || 'We could not price that order.');
          return;
        }
        setQuote(data);
      } catch {
        if (!cancelled) setError('We could not reach the kitchen. Check your connection and try again.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [payload, cart.hydrated, cart.lines.length]);

  const field = (key) => ({
    value: customer[key],
    onChange: (event) => setCustomer((previous) => ({ ...previous, [key]: event.target.value }))
  });

  const submit = async (event) => {
    if (event) event.preventDefault();
    if (busy) return;

    if (fulfilment === 'DELIVERY' && (!customer.address || !customer.address.trim())) {
      setActiveModal('DELIVERY');
      const message = 'Please add your delivery address.';
      setError(message);
      showWarning('Delivery address required', message);
      return;
    }

    if (!customer.name?.trim() || !customer.phone?.trim()) {
      setActiveModal(fulfilment);
      const message = 'Please add your name and phone number so the kitchen can reach you.';
      setError(message);
      showWarning('Contact details required', message);
      return;
    }

    if (fulfilment === 'PICKUP' && scheduling === 'SCHEDULED') {
      if (!scheduleDate || !scheduleTime) {
        setActiveModal('PICKUP');
        const message = 'Please select a date and time for your scheduled order.';
        setError(message);
        showWarning('Schedule required', message);
        return;
      }
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`);
      const minAllowed = new Date(Date.now() + 25 * 60 * 1000);
      if (isNaN(scheduledAt.getTime()) || scheduledAt < minAllowed) {
        setActiveModal(fulfilment);
        const message = 'Please schedule at least 25 minutes from now.';
        setError(message);
        showWarning('Too soon to schedule', message);
        return;
      }
      const hour = scheduledAt.getHours();
      if (hour < 11 || hour >= 22) {
        setActiveModal(fulfilment);
        const message = 'Please pick a time between 11:00 AM and 10:00 PM (kitchen hours).';
        setError(message);
        showWarning('Outside kitchen hours', message);
        return;
      }
    }

    setBusy(true);
    setError('');

    if (!checkoutAttemptRef.current) {
      checkoutAttemptRef.current = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }

    try {
      const response = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, customer, checkoutAttemptId: checkoutAttemptRef.current })
      });

      let data = {};
      try {
        data = await response.json();
      } catch (parseErr) {
        data = { message: 'Could not complete order. Please try again.' };
      }

      if (!response.ok) {
        const message = data?.message || 'We could not place that order.';
        setError(message);
        showError('Order not placed', message);
        checkoutAttemptRef.current = '';
        setBusy(false);
        return;
      }

      if (data.url?.startsWith('http')) {
        // Off to Stripe checkout page.
        showToast('Opening secure Stripe payment', 'info');
        window.location.href = data.url;
      } else {
        // Direct order confirmation
        cart.clear();
        showToast('Order placed successfully');
        router.push(data.url || `/order/${data.orderNumber}`);
      }
    } catch (err) {
      const message = err?.message || 'Something interrupted the connection. Please try again.';
      setError(message);
      showError('Connection interrupted', message);
      setBusy(false);
    }
  };

  if (!cart.hydrated) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: '#aaa' }}>
        <p style={{ fontSize: 14, color: '#888' }}>Loading your cart...</p>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 24px',
          maxWidth: 480,
          margin: '0 auto',
          background: '#1A1A1A',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 15px 35px rgba(0,0,0,0.5)'
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(201,168,76,0.12)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
            color: '#C9A84C'
          }}
        >
          <SvgIcon name="cart" size={38} />
        </div>
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Your cart is empty</h2>
        <p style={{ fontSize: 14, color: '#8a8a8a', marginBottom: 28, lineHeight: 1.6 }}>
          Good food is waiting! Explore delicious dishes from Preva Kitchen.
        </p>
        <Link
          href="/menu"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 36px',
            background: GOLD,
            color: '#000',
            fontWeight: 800,
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 13.5,
            letterSpacing: '0.5px',
            boxShadow: '0 8px 24px rgba(201,168,76,0.3)'
          }}
        >
          BROWSE MENU →
        </Link>
      </div>
    );
  }

  const total = quote?.totalCents ?? null;

  return (
    <form onSubmit={submit} style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 110 }}>
      {cancelledOrderNumber && (
        <div role="status" style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', color: '#ead28d', borderRadius: 12, padding: '12px 14px', fontSize: 13, lineHeight: 1.55, marginBottom: 12 }}>
          Payment for order #{cancelledOrderNumber} was cancelled. Nothing was charged and your cart is still here.
        </div>
      )}
      {error && (
        <div role="alert" style={{ background: 'rgba(198,40,40,0.12)', border: '1px solid rgba(198,40,40,0.4)', color: '#ff9d9d', borderRadius: 12, padding: '12px 14px', fontSize: 13, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* ── restaurant strip ───────────────────────────────────────────── */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 46, height: 46, borderRadius: 10, background: 'rgba(201,168,76,0.12)', display: 'grid', placeItems: 'center', color: '#C9A84C' }}><SvgIcon name="utensils" size={22} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', color: '#fff', fontSize: 14 }}>Preva Kitchen</b>
          <span style={{ fontSize: 11.5, color: '#8a8a8a' }}>13090 Inkster Rd, Redford Township, MI</span>
        </div>
      </Card>

      {/* ── items with steppers ────────────────────────────────────────── */}
      <Card style={{ padding: '6px 16px' }}>
        {cart.lines.map((line, index) => (
          <div
            key={line.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 0',
              borderBottom: index === cart.lines.length - 1 ? 'none' : '1px dashed rgba(255,255,255,0.08)'
            }}
          >
            {/* Dish Thumbnail Image (compact, not too big) */}
            {line.image ? (
              <img
                src={line.image}
                alt={line.name}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  objectFit: 'cover',
                  flexShrink: 0,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#111'
                }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 10,
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  color: '#C9A84C'
                }}
              >
                <SvgIcon name="utensils" size={20} />
              </span>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {line.name}
              </span>
              {line.optionLabel ? (
                <span style={{ display: 'block', fontSize: 11.5, color: '#8a8a8a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {line.optionLabel}
                </span>
              ) : null}
            </div>

            <Stepper
              qty={line.qty}
              onMinus={() => cart.setQty(line.key, line.qty - 1)}
              onPlus={() => cart.setQty(line.key, line.qty + 1)}
            />

            <span style={{ minWidth: 64, textAlign: 'right', fontSize: 13.5, fontWeight: 700, color: '#fff' }}>
              {money(line.unitCents * line.qty)}
            </span>
          </div>
        ))}

        <Link
          href="/menu"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 0', fontSize: 13, fontWeight: 700, color: '#C9A84C', textDecoration: 'none', borderTop: '1px dashed rgba(255,255,255,0.08)' }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> Add more items
        </Link>
      </Card>

      {/* ── note for the kitchen ───────────────────────────────────────── */}
      <Card style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
        <span aria-hidden="true" style={{ color: '#C9A84C' }}><SvgIcon name="receipt" size={18} /></span>
        <input
          id="ck-note"
          placeholder="Any cooking requests? (optional)"
          maxLength={500}
          {...field('note')}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#ddd', fontSize: 13 }}
        />
      </Card>

      {/* ── fulfillment method summary card ─────────────────────────────── */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <b style={{ fontSize: 11, color: '#8a8a8a', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Fulfillment Method
          </b>
          <span style={{ fontSize: 11, color: '#C9A84C', fontWeight: 600 }}>
            Click to configure
          </span>
        </div>

        {/* 2 Primary Mode Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            disabled={!settings.pickupEnabled}
            onClick={() => {
              setFulfilment('PICKUP');
              setActiveModal('PICKUP');
            }}
            style={{
              padding: '13px 14px',
              borderRadius: 12,
              cursor: settings.pickupEnabled ? 'pointer' : 'not-allowed',
              border: fulfilment === 'PICKUP' ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
              background: fulfilment === 'PICKUP' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
              color: '#fff',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#C9A84C', display: 'inline-flex', alignItems: 'center' }}>
                <SvgIcon name="pickup" size={18} strokeWidth={2} />
              </span>
              <b style={{ fontSize: 14 }}>Pickup</b>
            </div>
            <span style={{ fontSize: 12, color: '#8a8a8a', display: 'block', paddingLeft: 26 }}>
              ~{settings.pickupMinutes} min · Preva Kitchen
            </span>
          </button>

          <button
            type="button"
            disabled={!settings.deliveryEnabled}
            onClick={() => {
              setFulfilment('DELIVERY');
              setScheduling('ASAP');
              setActiveModal('DELIVERY');
            }}
            style={{
              padding: '13px 14px',
              borderRadius: 12,
              cursor: settings.deliveryEnabled ? 'pointer' : 'not-allowed',
              border: fulfilment === 'DELIVERY' ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
              background: fulfilment === 'DELIVERY' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
              color: '#fff',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ color: '#C9A84C', display: 'inline-flex', alignItems: 'center' }}>
                <SvgIcon name="delivery" size={18} strokeWidth={2} />
              </span>
              <b style={{ fontSize: 14 }}>Delivery</b>
            </div>
            <span style={{ fontSize: 12, color: '#8a8a8a', display: 'block', paddingLeft: 26 }}>
              ~{settings.deliveryMinutes} min · To doorstep
            </span>
          </button>
        </div>

        {/* Selected Mode Summary / Edit Box */}
        <div
          onClick={() => setActiveModal(fulfilment)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') setActiveModal(fulfilment); }}
          style={{
            background: 'rgba(201,168,76,0.04)',
            border: '1px solid rgba(201,168,76,0.22)',
            borderRadius: 12,
            padding: '12px 14px',
            cursor: 'pointer',
            transition: 'background 0.2s ease'
          }}
        >
          {fulfilment === 'DELIVERY' ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: '#C9A84C' }}><SvgIcon name="location" size={15} /></span>
                  <b style={{ fontSize: 13, color: '#fff' }}>Delivering to:</b>
                </div>
                <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600, textDecoration: 'underline' }}>
                  {customer.address ? 'Edit address & details ✏️' : '+ Enter delivery address'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: customer.address ? '#eee' : '#888', margin: '0 0 8px 22px', lineHeight: 1.4 }}>
                {customer.address ? `${customer.address}${customer.postcode ? `, ${customer.postcode}` : ''}` : 'No address set yet — click to add'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginLeft: 22, fontSize: 12, color: '#8a8a8a' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SvgIcon name="zap" size={13} style={{ color: '#C9A84C' }} />
                  Arrives in ~{settings.deliveryMinutes} min
                </span>
                {customer.name && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <SvgIcon name="phone" size={13} style={{ color: '#C9A84C' }} />
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ color: '#C9A84C' }}><SvgIcon name="pickup" size={15} /></span>
                  <b style={{ fontSize: 13, color: '#fff' }}>Pickup Order:</b>
                </div>
                <span style={{ fontSize: 12, color: '#C9A84C', fontWeight: 600, textDecoration: 'underline' }}>
                  {customer.name ? 'Edit details ✏️' : '+ Set timing & contact'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#ddd', margin: '0 0 8px 22px', lineHeight: 1.4 }}>
                Preva Kitchen · 13090 Inkster Rd, Redford Township, MI
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginLeft: 22, fontSize: 12, color: '#8a8a8a' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <SvgIcon name={scheduling === 'SCHEDULED' ? 'calendar' : 'zap'} size={13} style={{ color: '#C9A84C' }} />
                  {scheduling === 'SCHEDULED' && scheduleDate && scheduleTime
                    ? `Scheduled: ${scheduleDate} @ ${scheduleTime}`
                    : `Right Away (~${settings.pickupMinutes} min)`}
                </span>
                {customer.name ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <SvgIcon name="phone" size={13} style={{ color: '#C9A84C' }} />
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </span>
                ) : (
                  <span style={{ color: '#C9A84C' }}>⚠️ Contact name &amp; phone required</span>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ── POPUP MODAL FOR PICKUP / DELIVERY DETAILS ────────────────────── */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveModal(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#161616',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 500,
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
              padding: '22px 20px 20px',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(201,168,76,0.12)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#C9A84C',
                    flexShrink: 0
                  }}
                >
                  <SvgIcon name={activeModal === 'DELIVERY' ? 'delivery' : 'pickup'} size={22} strokeWidth={2} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#fff' }}>
                    {activeModal === 'DELIVERY' ? 'Delivery Details' : 'Pickup Details'}
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8a8a8a' }}>
                    {activeModal === 'DELIVERY'
                      ? 'Where and when would you like your food delivered?'
                      : 'When will you collect your order at Preva Kitchen?'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#aaa',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  transition: 'all 0.2s ease'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gap: 16 }}>
              {/* SECTION 1: Address for Delivery, or Store info for Pickup */}
              {activeModal === 'DELIVERY' ? (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 700 }}>
                    <SvgIcon name="location" size={13} strokeWidth={2} />
                    Delivery Address
                  </label>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      id="modal-address"
                      required
                      maxLength={240}
                      placeholder="Street address, apartment, suite *"
                      value={customer.address}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, address: e.target.value }))}
                      style={inputStyle}
                    />
                    <input
                      id="modal-postcode"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="ZIP Code (optional)"
                      value={customer.postcode}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, postcode: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(201,168,76,0.06)',
                    border: '1px solid rgba(201,168,76,0.2)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                  }}
                >
                  <span style={{ color: '#C9A84C' }}><SvgIcon name="location" size={20} /></span>
                  <div>
                    <b style={{ display: 'block', fontSize: 13, color: '#fff' }}>Preva Kitchen Counter Pickup</b>
                    <span style={{ fontSize: 12, color: '#aaa' }}>13090 Inkster Rd, Redford Township, MI</span>
                  </div>
                </div>
              )}

              {/* SECTION 2: Timing — ONLY for Pickup. Delivery is always ASAP */}
              {activeModal === 'PICKUP' ? (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 700 }}>
                    <SvgIcon name="clock" size={13} strokeWidth={2} />
                    Pickup Timing
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setScheduling('ASAP')}
                      style={{
                        padding: '11px 12px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: scheduling === 'ASAP' ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
                        background: scheduling === 'ASAP' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                        color: '#fff',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ color: '#C9A84C' }}><SvgIcon name="zap" size={16} strokeWidth={2} /></span>
                        <b style={{ fontSize: 13 }}>Right Away</b>
                      </div>
                      <span style={{ fontSize: 11.5, color: '#8a8a8a', display: 'block', paddingLeft: 23 }}>
                        Ready in ~{settings.pickupMinutes} min
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setScheduling('SCHEDULED')}
                      style={{
                        padding: '11px 12px',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        border: scheduling === 'SCHEDULED' ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
                        background: scheduling === 'SCHEDULED' ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                        color: '#fff',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                        <span style={{ color: '#C9A84C' }}><SvgIcon name="calendar" size={16} strokeWidth={2} /></span>
                        <b style={{ fontSize: 13 }}>Schedule</b>
                      </div>
                      <span style={{ fontSize: 11.5, color: '#8a8a8a', display: 'block', paddingLeft: 23 }}>
                        Pick date &amp; time
                      </span>
                    </button>
                  </div>

                  {/* Sub-inputs for Schedule (Only for Pickup) */}
                  {scheduling === 'SCHEDULED' && (
                    <div style={{ marginTop: 10, padding: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
                        <div>
                          <label htmlFor="modal-date" style={{ display: 'block', fontSize: 11, color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 4 }}>
                            Date
                          </label>
                          <input
                            id="modal-date"
                            type="date"
                            min={todayStr}
                            max={maxDateStr}
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            style={{ ...inputStyle, height: 40, colorScheme: 'dark' }}
                          />
                        </div>
                        <div>
                          <label htmlFor="modal-time" style={{ display: 'block', fontSize: 11, color: '#8a8a8a', textTransform: 'uppercase', marginBottom: 4 }}>
                            Time
                          </label>
                          <input
                            id="modal-time"
                            type="time"
                            min="11:00"
                            max="22:00"
                            step="1800"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                            style={{ ...inputStyle, height: 40, colorScheme: 'dark' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: '#7a7a7a', margin: 0 }}>
                        💡 Min 25m advance notice · Kitchen hours: 11:00 AM – 10:00 PM
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10
                  }}
                >
                  <span style={{ color: '#C9A84C' }}><SvgIcon name="zap" size={17} strokeWidth={2} /></span>
                  <div>
                    <b style={{ display: 'block', fontSize: 12.5, color: '#fff' }}>Instant Delivery</b>
                    <span style={{ fontSize: 11.5, color: '#8a8a8a' }}>
                      Dispatched as soon as ready · Arrives in ~{settings.deliveryMinutes} mins
                    </span>
                  </div>
                </div>
              )}

              {/* SECTION 3: Contact Info */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8, fontWeight: 700 }}>
                  <SvgIcon name="phone" size={13} strokeWidth={2} />
                  Your Contact Details
                </label>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input
                      id="modal-name"
                      required
                      maxLength={120}
                      placeholder="Your Name *"
                      value={customer.name}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                      style={inputStyle}
                    />
                    <input
                      id="modal-phone"
                      required
                      type="tel"
                      maxLength={40}
                      placeholder="Phone Number *"
                      value={customer.phone}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <input
                    id="modal-email"
                    type="email"
                    maxLength={180}
                    placeholder="Email — for receipt (optional)"
                    value={customer.email}
                    onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Confirm / Save button */}
              <button
                type="button"
                onClick={() => {
                  if (activeModal === 'DELIVERY' && (!customer.address || !customer.address.trim())) {
                    showWarning('Address needed', 'Please enter your delivery address.');
                    return;
                  }
                  if (!customer.name?.trim() || !customer.phone?.trim()) {
                    showWarning('Contact needed', 'Please enter your name and phone number.');
                    return;
                  }
                  if (activeModal === 'PICKUP' && scheduling === 'SCHEDULED') {
                    if (!scheduleDate || !scheduleTime) {
                      showWarning('Time needed', 'Please pick a date and time for your schedule.');
                      return;
                    }
                  }
                  setActiveModal(null);
                }}
                style={{
                  marginTop: 6,
                  height: 48,
                  borderRadius: 12,
                  border: 'none',
                  background: GOLD,
                  color: '#000',
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: '0.5px',
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(201,168,76,0.3)'
                }}
              >
                CONFIRM {activeModal === 'DELIVERY' ? 'DELIVERY' : 'PICKUP'} DETAILS ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── bill details ───────────────────────────────────────────────── */}
      <Card>
        <b style={{ display: 'block', fontSize: 12, color: '#8a8a8a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>
          Bill details
        </b>
        <BillRow label="Item total" value={money(quote?.subtotalCents ?? cart.subtotalCents)} />
        {fulfilment === 'DELIVERY' && (
          <BillRow
            label="Delivery fee"
            value={quote ? (quote.deliveryCents > 0 ? money(quote.deliveryCents) : 'FREE') : '—'}
            muted={quote?.deliveryCents === 0}
          />
        )}
        <BillRow label="Taxes" value={quote ? money(quote.taxCents) : '—'} />
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', marginTop: 8, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
          <b style={{ fontSize: 14, color: '#fff' }}>To pay</b>
          <b style={{ fontSize: 16, color: '#C9A84C' }}>{total !== null ? money(total) : '—'}</b>
        </div>
      </Card>

      {/* ── payment note — cards live on Stripe, not here ──────────────── */}
      <Card style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span aria-hidden="true" style={{ color: '#C9A84C' }}><SvgIcon name="lock" size={18} /></span>
        <p style={{ fontSize: 12, color: '#8a8a8a', margin: 0, lineHeight: 1.7 }}>
          <b style={{ color: '#bbb' }}>Secured by Stripe.</b> Proceeding takes you to Stripe&rsquo;s payment page —
          card, Apple&nbsp;Pay and Google&nbsp;Pay all work there. Your card never touches this website
          and nothing is charged until you confirm.
        </p>
      </Card>

      {/* ── sticky pay bar ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1100,
          background: 'rgba(14,14,14,0.97)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(201,168,76,0.25)',
          padding: '12px 16px calc(12px + env(safe-area-inset-bottom))'
        }}
      >
        <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 10.5, color: '#8a8a8a', letterSpacing: '1px' }}>TO PAY</span>
            <b style={{ fontSize: 18, color: '#fff' }}>{total !== null ? money(total) : '…'}</b>
          </div>
          <button
            type="submit"
            disabled={busy || !quote}
            style={{
              flex: 2,
              height: 50,
              border: 'none',
              borderRadius: 12,
              background: busy || !quote ? '#3a3a3a' : GOLD,
              color: busy || !quote ? '#777' : '#000',
              fontSize: 13.5,
              fontWeight: 900,
              letterSpacing: '1px',
              cursor: busy || !quote ? 'not-allowed' : 'pointer',
              boxShadow: busy || !quote ? 'none' : '0 8px 22px rgba(201,168,76,0.35)'
            }}
          >
            {busy ? 'PLACING ORDER…' : 'PROCEED TO PAY →'}
          </button>
        </div>
      </div>
    </form>
  );
}

const inputStyle = {
  height: 44,
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#111',
  color: '#eee',
  fontSize: 13,
  padding: '0 13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};
