'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import SvgIcon from '../SvgIcon';

const STORAGE_KEY = 'preva.cart.v1';
const CartContext = createContext(null);

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside <ShopProvider>');
  return cart;
}

export function money(cents) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents || 0) / 100);
}

function lineKey(itemId, optionIds, note) {
  return [itemId, [...(optionIds || [])].sort().join('+'), note || ''].join('|');
}

export function ShopProvider({ children }) {
  const [lines, setLines] = useState([]);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setLines(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const add = useCallback((line) => {
    const key = lineKey(line.itemId, line.optionIds, line.note);
    setLines((previous) => {
      const existing = previous.find((l) => l.key === key);
      if (existing) {
        return previous.map((l) => (l.key === key ? { ...l, qty: Math.min(l.qty + line.qty, 30) } : l));
      }
      return [...previous, { ...line, key }];
    });
    setOpen(true);
  }, []);

  const setQty = useCallback((key, qty) => {
    setLines((previous) =>
      qty <= 0
        ? previous.filter((l) => l.key !== key)
        : previous.map((l) => (l.key === key ? { ...l, qty: Math.min(qty, 30) } : l))
    );
  }, []);

  const remove = useCallback((key) => setLines((p) => p.filter((l) => l.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      hydrated,
      count: lines.reduce((total, l) => total + l.qty, 0),
      subtotalCents: lines.reduce((total, l) => total + l.unitCents * l.qty, 0),
      add,
      setQty,
      remove,
      clear,
      open: () => setOpen(true),
      close: () => setOpen(false),
      isOpen: open
    }),
    [lines, hydrated, open, add, setQty, remove, clear]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
      <CartButton />
    </CartContext.Provider>
  );
}

function CartButton() {
  const cart = useCart();
  const show = cart.hydrated && cart.count > 0 && !cart.isOpen;

  if (!show) return null;

  /* Swiggy flow: the sticky bar goes straight to the cart PAGE, where items
     can be edited with steppers and the bill is quoted by the server. The
     drawer still exists for a quick glance (tap the left side), but "VIEW
     CART" means the cart, not a popup. */
  return (
    <div className="ps-swiggy-mobile-cart-bar">
      <div className="ps-swiggy-cart-info" onClick={cart.open} style={{ cursor: 'pointer' }}>
        <span className="ps-swiggy-badge"><SvgIcon name="cart" size={15} /> {cart.count} {cart.count === 1 ? 'ITEM' : 'ITEMS'}</span>
        <b className="ps-swiggy-subtotal">{money(cart.subtotalCents)}</b>
      </div>
      <Link href="/checkout" className="ps-swiggy-cart-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        VIEW CART →
      </Link>
    </div>
  );
}

/**
 * The cart drawer.
 *
 * It shows only numbers that are true right now: the items and their subtotal.
 * Delivery, tax and tip depend on choices the customer has not made yet, so
 * those are added on the checkout page where the server quotes them — the old
 * drawer invented a flat $10 delivery fee and a $5 promo the server had never
 * heard of, so its total never matched what checkout actually charged.
 */
function CartDrawer() {
  const cart = useCart();

  return (
    <div className="ps">
      <div className="ps-scrim" data-open={cart.isOpen ? '1' : '0'} onClick={cart.close} />
      <aside
        className="ps-drawer"
        data-open={cart.isOpen ? '1' : '0'}
        aria-label="Your order"
        aria-hidden={!cart.isOpen}
        style={{
          background: '#1E1E1E',
          padding: '20px',
          width: '420px',
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexShrink: 0 }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SvgIcon name="cart" size={20} /> YOUR ORDER
            </h3>
            <button onClick={cart.close} aria-label="Close cart" style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}><SvgIcon name="close" size={20} /></button>
          </div>

          <div style={{ background: '#262626', borderRadius: '16px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
              <SvgIcon name="location" size={17} /> Preva Kitchen — 13090 Inkster Rd, Redford Township, MI
            </div>
            <div style={{ fontSize: '12px', color: '#888' }}>
              Pickup or delivery — you choose on the next step.
            </div>
          </div>

          {/* Items — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px', margin: '4px 0 14px' }}>
            {cart.lines.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: '#888', fontSize: '13px' }}>
                Your cart is empty. Add dishes from the menu to build your order!
              </div>
            ) : (
              cart.lines.map((line) => (
                <div key={line.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#242424', padding: '10px 12px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
                  {line.image ? (
                    <img src={line.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#1A1A1A', display: 'grid', placeItems: 'center', color: '#C9A84C' }}><BagIcon /></span>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '13px', color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.name}</b>
                    {line.optionLabel ? (
                      <span style={{ fontSize: '11px', color: '#888', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.optionLabel}</span>
                    ) : null}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <button onClick={() => cart.setQty(line.key, line.qty - 1)} aria-label={`Remove one ${line.name}`} style={{ background: '#1A1A1A', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '12px' }}>−</button>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff' }}>{line.qty}</span>
                      <button onClick={() => cart.setQty(line.key, line.qty + 1)} aria-label={`Add one ${line.name}`} style={{ background: '#1A1A1A', border: 'none', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: '12px' }}>+</button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#C9A84C' }}>{money(line.unitCents * line.qty)}</span>
                    <button onClick={() => cart.remove(line.key)} title="Remove item" aria-label={`Remove ${line.name}`} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><SvgIcon name="trash" size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer — honest numbers only */}
        <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px', background: '#1E1E1E' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#aaa', marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff' }}>Subtotal</span>
              <b style={{ fontSize: '22px', fontWeight: 'bold', color: '#C9A84C' }}>{money(cart.subtotalCents)}</b>
            </div>
            <span style={{ fontSize: '11px', color: '#777' }}>
              Delivery, tax and tip are calculated at checkout.
            </span>
          </div>

          <Link
            href="/checkout"
            onClick={cart.close}
            aria-disabled={cart.lines.length === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '48px',
              borderRadius: '24px',
              background: cart.lines.length === 0 ? '#333' : 'linear-gradient(135deg, #C9A84C 0%, #E5C158 50%, #9B782B 100%)',
              color: cart.lines.length === 0 ? '#666' : '#000000',
              fontWeight: 'bold',
              fontSize: '14px',
              textDecoration: 'none',
              textAlign: 'center',
              pointerEvents: cart.lines.length === 0 ? 'none' : 'auto',
              boxShadow: cart.lines.length === 0 ? 'none' : '0 8px 25px rgba(201, 168, 76, 0.4)'
            }}
          >
            Go to Checkout
          </Link>
        </div>
      </aside>
    </div>
  );
}

function BagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 7h14l-1.2 12.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" />
    </svg>
  );
}
