'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChefHat, Check, ClipboardList, Minus, Monitor, Plus, Search, Send, Settings2, Trash2, UtensilsCrossed, X
} from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { InlineLoader, PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((Number(cents) || 0) / 100);

function cartKey(itemId, optionIds) {
  return `${itemId}|${[...optionIds].sort().join(',')}`;
}

function TakeOrderScreen() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [cart, setCart] = useState([]);
  const [orderNote, setOrderNote] = useState('');
  const [pickerItem, setPickerItem] = useState(null);
  const [pickerSelection, setPickerSelection] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [tipMode, setTipMode] = useState('none');
  const [customTip, setCustomTip] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    const [opsRes, productsRes] = await Promise.all([api('/shop/kitchen-operations'), api('/shop/products')]);
    if (opsRes.ok) {
      const ops = await opsRes.json();
    }
    if (productsRes.ok) setProducts(await productsRes.json());
    if (!opsRes.ok || !productsRes.ok) setError('Could not load the menu. Refresh to try again.');
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => {
    const names = Array.from(new Set(products.map((item) => item.category || 'Others'))).sort();
    return ['ALL', ...names];
  }, [products]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((item) => {
      if (item.available === false) return false;
      if (activeCategory !== 'ALL' && (item.category || 'Others') !== activeCategory) return false;
      if (term && !`${item.name} ${item.category}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [products, search, activeCategory]);

  const addToCart = (product, optionIds, optionLabel, unitCents) => {
    const key = cartKey(product.id, optionIds);
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => (line.key === key ? { ...line, qty: line.qty + 1 } : line));
      return [...current, { key, itemId: product.id, name: product.name, qty: 1, optionIds, optionLabel, unitCents }];
    });
  };

  const openPicker = (product) => {
    if (!product.optionGroups?.length) return addToCart(product, [], '', product.priceCents);
    setPickerItem(product);
    setPickerSelection({});
  };

  const togglePickerOption = (group, optionId) => {
    setPickerSelection((current) => {
      const picked = new Set(current[group.id] || []);
      if (group.type === 'radio') return { ...current, [group.id]: [optionId] };
      if (picked.has(optionId)) picked.delete(optionId);
      else {
        if (group.maxPick > 0 && picked.size >= group.maxPick) return current;
        picked.add(optionId);
      }
      return { ...current, [group.id]: Array.from(picked) };
    });
  };

  const confirmPicker = () => {
    const missing = (pickerItem.optionGroups || []).find((group) => group.required && !(pickerSelection[group.id]?.length));
    if (missing) return setError(`Choose a ${String(missing.label || 'option').toLowerCase()} for ${pickerItem.name}.`);
    setError('');

    const optionIds = [];
    const labels = [];
    let optionCents = 0;
    for (const group of pickerItem.optionGroups || []) {
      for (const optionId of pickerSelection[group.id] || []) {
        const option = group.options.find((one) => one.id === optionId);
        if (!option) continue;
        optionIds.push(optionId);
        labels.push(option.label);
        optionCents += option.priceCents;
      }
    }
    addToCart(pickerItem, optionIds, labels.join(', '), pickerItem.priceCents + optionCents);
    setPickerItem(null);
    setPickerSelection({});
  };

  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const changeQty = (key, delta) => {
    setCart((current) => current
      .map((line) => (line.key === key ? { ...line, qty: line.qty + delta } : line))
      .filter((line) => line.qty > 0));
  };

  const removeLine = (key) => setCart((current) => current.filter((line) => line.key !== key));

  const overStockedLines = useMemo(() => cart.filter((line) => {
    const stock = productsById.get(line.itemId)?.stockRemaining;
    return stock !== undefined && line.qty > stock;
  }), [cart, productsById]);

  const subtotalCents = cart.reduce((sum, line) => sum + line.unitCents * line.qty, 0);

  const tipCents = tipMode === 'none' ? 0
    : tipMode === 'custom' ? Math.max(0, Math.round((Number(customTip) || 0) * 100))
    : Math.round(subtotalCents * tipMode / 100);

  const submit = async () => {
    if (!guestName.trim()) return setError('Enter the guest name first.');
    if (!cart.length) return setError('Add at least one item to the order.');
    if (overStockedLines.length) return setError(`${overStockedLines[0].name} only has ${productsById.get(overStockedLines[0].itemId)?.stockRemaining} left — lower the quantity.`);
    setSubmitting(true);
    setError('');
    const response = await api('/shop/dine-in-orders', {
      method: 'POST',
      body: JSON.stringify({
        customerName: guestName.trim(),
        lines: cart.map((line) => ({ itemId: line.itemId, qty: line.qty, optionIds: line.optionIds })),
        note: orderNote.trim(),
        tipCents
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.message || 'Could not send this order to the kitchen.');
    } else {
      setNotice({ orderNumber: data.orderNumber, guestName: guestName.trim() });
      setCart([]);
      setGuestName('');
      setOrderNote('');
      setTipMode('none');
      setCustomTip('');
    }
    setSubmitting(false);
  };

  return (
    <Shell>
      <PageHeader
        icon={UtensilsCrossed}
        eyebrow="Kitchen Display"
        title="Take Order"
        description="Enter a dine-in order for a guest — it goes straight to the kitchen, no online checkout needed."
        actions={<>
          <Link href="/admin/kds" className="btn" style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a96e 100%)', color: '#000', fontWeight: 800, textDecoration: 'none' }}>
            <Monitor size={16} /> Live Display
          </Link>
          <Link href="/admin/kds/orders" className="btn ghost"><ChefHat size={15} /> KDS Orders</Link>
          <Link href="/admin/kds/settings" className="btn ghost"><Settings2 size={15} /> KDS Settings</Link>
        </>}
      />

      {error && <div className="alert error order-alert">{error}</div>}
      {notice && (
        <div className="alert order-alert" role="status">
          <Check size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Order #{notice.orderNumber} sent to the kitchen for {notice.guestName}.
          <Link href="/admin/kds" style={{ marginLeft: 10, fontWeight: 700 }}>View on Live Display</Link>
          <button type="button" onClick={() => setNotice(null)} style={{ float: 'right', background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
        </div>
      )}

      {loading ? (
        <div className="panel"><InlineLoader label="Loading the menu…" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 20, alignItems: 'start' }}>
          <div className="panel" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
              <label className="order-search" style={{ flex: '1 1 220px' }}>
                <Search size={16} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search menu" />
              </label>
              <select className="input" value={activeCategory} onChange={(event) => setActiveCategory(event.target.value)} style={{ maxWidth: 220 }}>
                {categories.map((name) => <option key={name} value={name}>{name === 'ALL' ? 'All categories' : name}</option>)}
              </select>
            </div>

            {!visibleProducts.length ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>No menu items match.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                {visibleProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => openPicker(product)}
                    style={{
                      textAlign: 'left', padding: '10px', borderRadius: 10,
                      background: 'var(--bg-surface-2)', border: '1px solid var(--border)',
                      color: 'var(--ink)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4
                    }}
                  >
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '4 / 3', borderRadius: 8, overflow: 'hidden',
                      background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4
                    }}>
                      {product.image ? (
                        <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UtensilsCrossed size={22} color="var(--ink-dim)" />
                      )}
                      {product.stockRemaining !== undefined && (
                        <span style={{
                          position: 'absolute', top: 6, left: 6, fontSize: 10, fontWeight: 800,
                          padding: '2px 6px', borderRadius: 999, background: 'var(--danger)', color: '#fff'
                        }}>
                          {product.stockRemaining} left
                        </span>
                      )}
                    </div>
                    <strong style={{ fontSize: 13.5 }}>{product.name}</strong>
                    <small style={{ color: 'var(--ink-muted)' }}>{product.category}</small>
                    <span style={{ color: 'var(--gold)', fontWeight: 700, marginTop: 4 }}>{money(product.priceCents)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 18, position: 'sticky', top: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="field">
                Guest name
                <input className="input" value={guestName} onChange={(event) => setGuestName(event.target.value)} maxLength={120} placeholder="Name for this order" />
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--ink-muted)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <ClipboardList size={15} /> Order ({cart.reduce((sum, line) => sum + line.qty, 0)})
            </div>

            {!cart.length ? (
              <p style={{ color: 'var(--ink-muted)', fontSize: 13, margin: 0 }}>No items added yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                {cart.map((line) => {
                  const stock = productsById.get(line.itemId)?.stockRemaining;
                  const overStocked = stock !== undefined && line.qty > stock;
                  return (
                    <div key={line.key} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', borderRadius: 8, background: 'var(--bg-surface-2)', border: `1px solid ${overStocked ? 'var(--danger)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: 13 }}>{line.name}</strong>
                          {line.optionLabel && <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{line.optionLabel}</div>}
                          <div style={{ fontSize: 12, color: 'var(--gold)', marginTop: 2 }}>{money(line.unitCents * line.qty)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                          <button type="button" className="icon-button" onClick={() => changeQty(line.key, -1)} aria-label="Decrease quantity"><Minus size={12} /></button>
                          <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700 }}>{line.qty}</span>
                          <button type="button" className="icon-button" onClick={() => changeQty(line.key, 1)} aria-label="Increase quantity"><Plus size={12} /></button>
                          <button type="button" className="icon-button" onClick={() => removeLine(line.key)} aria-label="Remove item"><Trash2 size={12} /></button>
                        </div>
                      </div>
                      {overStocked && <small style={{ color: 'var(--danger)', fontWeight: 700 }}>Only {stock} left in stock</small>}
                    </div>
                  );
                })}
              </div>
            )}

            <label className="field">
              Kitchen note (optional)
              <textarea className="input" rows="2" maxLength="300" value={orderNote} onChange={(event) => setOrderNote(event.target.value)} placeholder="Allergies, rush, etc." />
            </label>

            <div className="field">
              Tip
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                {[['none', 'No tip'], [15, '15%'], [18, '18%'], [20, '20%'], ['custom', 'Custom']].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTipMode(value)}
                    className={`btn ${tipMode === value ? '' : 'ghost'}`}
                    style={{ padding: '5px 12px', fontSize: 12 }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tipMode === 'custom' && (
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customTip}
                  onChange={(event) => setCustomTip(event.target.value)}
                  placeholder="Tip amount ($)"
                  style={{ marginTop: 8 }}
                />
              )}
              {tipCents > 0 && <small style={{ color: 'var(--gold)', display: 'block', marginTop: 6 }}>Tip: {money(tipCents)}</small>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-muted)' }}>
                <span>Subtotal</span>
                <span>{money(subtotalCents)}</span>
              </div>
              {tipCents > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-muted)' }}>
                  <span>Tip</span>
                  <span>{money(tipCents)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
                <span>Total (est.)</span>
                <span>{money(subtotalCents + tipCents)}</span>
              </div>
            </div>
            <small style={{ color: 'var(--ink-muted)', marginTop: -8 }}>Tax is added by the kitchen when the order is sent.</small>

            <button type="button" className="btn" disabled={submitting || !cart.length || Boolean(overStockedLines.length)} onClick={submit} style={{ justifyContent: 'center' }}>
              <Send size={15} /> {submitting ? 'Sending…' : 'Send to kitchen'}
            </button>
          </div>
        </div>
      )}

      {pickerItem && (
        <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && setPickerItem(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div><h3>{pickerItem.name}</h3><p>{money(pickerItem.priceCents)}</p></div>
              <button className="icon-button" type="button" onClick={() => setPickerItem(null)} aria-label="Close">×</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {(pickerItem.optionGroups || []).map((group) => (
                <div key={group.id}>
                  <strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                    {group.label}{group.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                  </strong>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {group.options.map((option) => {
                      const checked = (pickerSelection[group.id] || []).includes(option.id);
                      return (
                        <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: checked ? 'var(--gold-dim)' : 'var(--bg-surface-2)', border: `1px solid ${checked ? 'var(--border-gold)' : 'var(--border)'}`, cursor: 'pointer' }}>
                          <input
                            type={group.type === 'radio' ? 'radio' : 'checkbox'}
                            name={group.id}
                            checked={checked}
                            onChange={() => togglePickerOption(group, option.id)}
                          />
                          <span style={{ flex: 1 }}>{option.label}</span>
                          {option.priceCents > 0 && <span>+{money(option.priceCents)}</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn ghost" onClick={() => setPickerItem(null)}>Cancel</button>
              <button type="button" className="btn" onClick={confirmPicker}><Plus size={14} /> Add to order</button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

export default function TakeOrderPage() {
  return (
    <Suspense fallback={null}>
      <TakeOrderScreen />
    </Suspense>
  );
}
