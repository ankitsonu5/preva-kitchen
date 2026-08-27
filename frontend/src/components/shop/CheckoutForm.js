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
 * an "Add more items" escape back to the menu, then delivery details, tip,
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
  const [tipPercent, setTipPercent] = useState(settings.tipPresets?.[1] ?? 18);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '', postcode: '', note: '' });
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const payload = useMemo(
    () => ({
      fulfilment,
      // The API recalculates the tip from its own trusted subtotal and accepts
      // only percentages configured by the restaurant.
      tipPercent,
      lines: cart.lines.map((line) => ({
        itemId: line.itemId,
        qty: line.qty,
        optionIds: line.optionIds,
        note: line.note
      }))
    }),
    [cart.lines, cart.subtotalCents, fulfilment, tipPercent]
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

    if (!customer.name || !customer.phone) {
      const message = 'Please add your name and phone number so the kitchen can reach you.';
      setError(message);
      showWarning('Contact details required', message);
      const nameEl = document.getElementById('ck-name');
      if (nameEl) {
        nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameEl.focus();
      }
      return;
    }
    if (fulfilment === 'DELIVERY' && !customer.address) {
      const message = 'Please add a delivery address.';
      setError(message);
      showWarning('Delivery address required', message);
      const addrEl = document.getElementById('ck-address');
      if (addrEl) {
        addrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        addrEl.focus();
      }
      return;
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
          href="/shop"
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
          href="/shop"
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

      {/* ── pickup / delivery ──────────────────────────────────────────── */}
      <Card>
        <b style={{ display: 'block', fontSize: 12, color: '#8a8a8a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
          How would you like it
        </b>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'PICKUP', label: 'Pickup', sub: `~${settings.pickupMinutes} min`, enabled: settings.pickupEnabled },
            { key: 'DELIVERY', label: 'Delivery', sub: `~${settings.deliveryMinutes} min`, enabled: settings.deliveryEnabled }
          ].map((mode) => (
            <button
              key={mode.key}
              type="button"
              disabled={!mode.enabled}
              aria-pressed={fulfilment === mode.key}
              onClick={() => setFulfilment(mode.key)}
              style={{
                padding: '12px 10px',
                borderRadius: 12,
                cursor: mode.enabled ? 'pointer' : 'not-allowed',
                border: fulfilment === mode.key ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.12)',
                background: fulfilment === mode.key ? 'rgba(201,168,76,0.1)' : 'transparent',
                color: '#fff',
                opacity: mode.enabled ? 1 : 0.4,
                textAlign: 'left'
              }}
            >
              <b style={{ display: 'block', fontSize: 13.5 }}>{mode.label}</b>
              <span style={{ fontSize: 11.5, color: '#8a8a8a' }}>{mode.sub}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* ── contact & address ──────────────────────────────────────────── */}
      <Card>
        <b style={{ display: 'block', fontSize: 12, color: '#8a8a8a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
          Your details
        </b>
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input id="ck-name" required maxLength={120} placeholder="Name" {...field('name')} style={inputStyle} />
            <input id="ck-phone" required type="tel" maxLength={40} placeholder="Phone" {...field('phone')} style={inputStyle} />
          </div>
          <input id="ck-email" type="email" maxLength={180} placeholder="Email — for the receipt (optional)" {...field('email')} style={inputStyle} />
          {fulfilment === 'DELIVERY' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
              <input id="ck-address" required maxLength={240} placeholder="Delivery address" {...field('address')} style={inputStyle} />
              <input id="ck-postcode" inputMode="numeric" maxLength={12} placeholder="ZIP" {...field('postcode')} style={inputStyle} />
            </div>
          )}
        </div>
      </Card>

      {/* ── tip ────────────────────────────────────────────────────────── */}
      <Card>
        <b style={{ display: 'block', fontSize: 12, color: '#8a8a8a', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 10 }}>
          Tip the team
        </b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0, ...(settings.tipPresets || [15, 18, 20])].map((percent) => (
            <button
              key={percent}
              type="button"
              aria-pressed={tipPercent === percent}
              onClick={() => setTipPercent(percent)}
              style={{
                padding: '8px 18px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                border: tipPercent === percent ? '1.5px solid #C9A84C' : '1px solid rgba(255,255,255,0.15)',
                background: tipPercent === percent ? 'rgba(201,168,76,0.12)' : 'transparent',
                color: tipPercent === percent ? '#C9A84C' : '#bbb'
              }}
            >
              {percent === 0 ? 'None' : `${percent}%`}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11.5, color: '#777', marginTop: 10, marginBottom: 0 }}>
          Tips go to the kitchen and front of house. Calculated on the food, not on tax or delivery.
        </p>
      </Card>

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
        {(quote?.tipCents ?? 0) > 0 && <BillRow label="Tip" value={money(quote.tipCents)} />}
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
