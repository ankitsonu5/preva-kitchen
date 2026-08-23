'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { money, useCart } from './ShopProvider';
import SvgIcon from '../SvgIcon';

export default function PosShopDashboard({ products = [], categories = [] }) {
  const cart = useCart();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [fulfilmentMode, setFulfilmentMode] = useState('Delivery');
  const [promoCode, setPromoCode] = useState('TRYNEW');
  const [promoApplied, setPromoApplied] = useState(false);

  // Category icon map uses the shared SVG system for a consistent storefront.
  const CATEGORY_ICONS = {
    'Preva Wings': 'flame',
    'Preva Bites': 'utensils',
    'Pasta': 'utensils',
    'Quesadillas': 'utensils',
    'Tacos': 'utensils',
    'Entrees': 'chef',
    'Sides': 'utensils',
    'Desserts': 'spark',
    'All': 'flame'
  };

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const matchCat = activeCategory === 'All' || item.category === activeCategory;
      const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  // Order Reports Mock / Live data matching the design table
  const [orderReports] = useState([
    { id: 1, customer: 'Jamsed Jhon', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80', orderNum: '01845723200573', address: 'Karang Teagha Hills', amount: '$120.45', status: 'Completed' },
    { id: 2, customer: 'Peter Parker', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=80&q=80', orderNum: '01976854823047', address: 'City Center, CA', amount: '$140.45', status: 'Pending' },
    { id: 3, customer: 'Sarah Connor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80', orderNum: '01889445210923', address: 'Redford Township, MI', amount: '$85.20', status: 'Preparing' }
  ]);

  const deliveryChargeCents = fulfilmentMode === 'Delivery' ? 1000 : 0;
  const promoDiscountCents = promoApplied ? 500 : 0;
  const totalCents = Math.max(0, cart.subtotalCents + deliveryChargeCents - promoDiscountCents);

  return (
    <div className="pos-dashboard-container" style={{ background: '#121212', color: '#F1EDE4', padding: '24px', minHeight: '100vh', fontFamily: 'var(--font-body, system-ui)' }}>
      <div className="pos-app-window" style={{ display: 'grid', gridTemplateColumns: '90px 1fr 380px', gap: '20px', maxWidth: '1600px', margin: '0 auto', background: '#181818', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)', overflow: 'hidden' }}>
        
        {/* ── LEFT SIDEBAR NAVIGATION ── */}
        <aside className="pos-sidebar" style={{ background: '#1E1E1E', padding: '28px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', width: '100%' }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)', display: 'grid', placeItems: 'center', fontSize: '24px', boxShadow: '0 8px 20px rgba(201, 168, 76, 0.3)' }}>
                <SvgIcon name="flame" size={25} />
              </div>
            </Link>

            {/* Navigation Icons */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', alignItems: 'center' }}>
              <Link href="/shop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(255,69,0,0.2) 0%, rgba(201,168,76,0.15) 100%)', border: '1px solid #FF4500', color: '#FF4500', textDecoration: 'none', width: '100%' }}>
                <SvgIcon name="chart" size={20} />
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>Dashboard</span>
              </Link>
              <Link href="/admin/orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '14px', color: '#888', textDecoration: 'none', transition: 'color 0.2s' }}>
                <SvgIcon name="receipt" size={20} />
                <span style={{ fontSize: '10px' }}>Orders</span>
              </Link>
              <Link href="/preva-kitchen" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '14px', color: '#888', textDecoration: 'none' }}>
                <SvgIcon name="location" size={20} />
                <span style={{ fontSize: '10px' }}>Kitchen</span>
              </Link>
              <Link href="/checkout" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '14px', color: '#888', textDecoration: 'none' }}>
                <SvgIcon name="credit-card" size={20} />
                <span style={{ fontSize: '10px' }}>Finance</span>
              </Link>
              <Link href="/admin/login" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 14px', borderRadius: '14px', color: '#888', textDecoration: 'none' }}>
                <SvgIcon name="door" size={20} />
                <span style={{ fontSize: '10px' }}>Admin</span>
              </Link>
            </nav>
          </div>

          {/* Bottom Settings Icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <button aria-label="Settings" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><SvgIcon name="settings" size={19} /></button>
            <button aria-label="Notifications" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><SvgIcon name="bell" size={19} /></button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <main className="pos-main-content" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '28px', overflowY: 'auto' }}>
          
          {/* Top Search Bar */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="Search Restaurant, Food, Cuisine or a Dish"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', height: '54px', padding: '0 60px 0 24px', borderRadius: '27px', background: '#262626', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '14px', outline: 'none' }}
            />
            <button style={{ position: 'absolute', right: '6px', top: '6px', width: '42px', height: '42px', borderRadius: '50%', background: '#333', border: 'none', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <SvgIcon name="search" size={19} />
            </button>
          </div>

          {/* Categories Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff' }}>Categories</h3>
                <span style={{ fontSize: '12px', color: '#FF4500' }}>10+ New Categories added this week</span>
              </div>
              <button style={{ background: '#262626', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}>View More ›</button>
            </div>

            {/* Circular Category Buttons */}
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
              {[{ name: 'All', count: products.length }, ...categories].map((cat) => {
                const catName = typeof cat === 'string' ? cat : cat.name;
                const isSelected = activeCategory === catName;
                const icon = CATEGORY_ICONS[catName] || 'utensils';

                return (
                  <button
                    key={catName}
                    onClick={() => setActiveCategory(catName)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: isSelected ? 'linear-gradient(135deg, #FF4500 0%, #C9A84C 100%)' : '#262626', border: isSelected ? '1px solid #FF4500' : '1px solid rgba(255,255,255,0.05)', padding: '12px 18px', borderRadius: '40px', cursor: 'pointer', transition: 'all 0.25s ease', minWidth: '85px' }}
                  >
                    <span style={{ display: 'grid', placeItems: 'center' }}><SvgIcon name={icon} size={24} /></span>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: isSelected ? '#000' : '#ddd', whiteSpace: 'nowrap' }}>{catName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Popular Dishes Grid */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff' }}>Popular Dishes</h3>
                <span style={{ fontSize: '12px', color: '#FF4500' }}>20+ New dishes added this week</span>
              </div>
              <button style={{ background: '#262626', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}>View More ›</button>
            </div>

            {filteredProducts.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', background: '#222', borderRadius: '16px', color: '#888' }}>
                No dishes found matching your search.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                {filteredProducts.map((product) => {
                  const imageSrc = product.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80';

                  return (
                    <div
                      key={product.id}
                      style={{ background: '#1E1E1E', borderRadius: '20px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.06)', position: 'relative', boxShadow: '0 10px 25px rgba(0,0,0,0.4)', transition: 'transform 0.2s ease' }}
                    >
                      <div style={{ width: '100%', height: '140px', borderRadius: '14px', overflow: 'hidden', marginBottom: '14px', position: 'relative' }}>
                        <img src={imageSrc} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {product.badge && (
                          <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#C9A84C', padding: '4px 10px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold', border: '1px solid #C9A84C' }}>
                            {product.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 6px', color: '#fff' }}>{product.name}</h4>
                        <span style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '10px' }}>Starting From <b style={{ color: '#fff' }}>{money(product.priceCents)}</b></span>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#aaa', marginBottom: '16px' }}>
                          <span>⭐ 4.8</span>
                          <span>1360 Total Sale</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          cart.add({
                            itemId: product.id,
                            name: product.name,
                            image: imageSrc,
                            unitCents: product.priceCents,
                            qty: 1,
                            optionIds: [],
                            optionLabel: '',
                            note: ''
                          });
                        }}
                        style={{ width: '100%', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)', color: '#000', border: 'none', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 6px 15px rgba(201, 168, 76, 0.3)' }}
                      >
                        + Add to Order
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Order Reports Table Section */}
          <div style={{ background: '#1B1B1B', borderRadius: '20px', padding: '22px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: '#fff' }}>Order Reports</h3>
                <span style={{ fontSize: '12px', color: '#FF4500' }}>Wow!! 100+ New order got this week</span>
              </div>
              <button style={{ background: '#262626', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '16px', fontSize: '12px', cursor: 'pointer' }}>View More ›</button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#ccc' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left', color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px' }}>Customer</th>
                  <th style={{ padding: '10px' }}>Order Number</th>
                  <th style={{ padding: '10px' }}>Address</th>
                  <th style={{ padding: '10px' }}>Amount</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {orderReports.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', color: '#fff' }}>
                      <img src={row.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                      {row.customer}
                    </td>
                    <td style={{ padding: '12px 10px', color: '#aaa', fontFamily: 'monospace' }}>{row.orderNum}</td>
                    <td style={{ padding: '12px 10px', color: '#aaa' }}>{row.address}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 'bold', color: '#fff' }}>{row.amount}</td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <span style={{ padding: '4px 12px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: row.status === 'Completed' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(230, 81, 0, 0.2)', color: row.status === 'Completed' ? '#4CAF50' : '#FF9800', border: row.status === 'Completed' ? '1px solid #4CAF50' : '1px solid #FF9800' }}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </main>

        {/* ── RIGHT CART & CHECKOUT SIDEBAR ── */}
        <aside className="pos-right-cart" style={{ background: '#1C1C1C', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            {/* Delivery Address Card */}
            <div style={{ background: '#262626', borderRadius: '16px', padding: '16px', marginBottom: '24px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>DELIVERY ADDRESS</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                <SvgIcon name="location" size={16} /> 13090 Inkster Rd, Redford Township
              </div>
              <span style={{ fontSize: '11px', color: '#FF4500', display: 'block' }}>⏱️ 20 min estimated delivery</span>
            </div>

            {/* Cart Header & Order ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SvgIcon name="cart" size={16} /> Cart
              </h3>
              <span style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace' }}>Order ID: #1099</span>
            </div>

            {/* Mode Selector (Delivery / Dine In / Takeaway) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: '#262626', padding: '4px', borderRadius: '24px', marginBottom: '24px' }}>
              {['Delivery', 'Dine In', 'Takeaway'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFulfilmentMode(mode)}
                  style={{ height: '36px', borderRadius: '20px', border: 'none', background: fulfilmentMode === mode ? 'linear-gradient(135deg, #FF4500 0%, #C9A84C 100%)' : 'transparent', color: fulfilmentMode === mode ? '#000' : '#aaa', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Cart Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '300px', overflowY: 'auto', marginBottom: '24px', paddingRight: '4px' }}>
              {cart.lines.length === 0 ? (
                <div style={{ padding: '30px 10px', textalign: 'center', color: '#666', fontSize: '13px', textAlign: 'center' }}>
                  Your cart is empty. Add dishes from the menu to build your order!
                </div>
              ) : (
                cart.lines.map((line) => (
                  <div key={line.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#242424', padding: '10px 12px', borderRadius: '14px' }}>
                    <img src={line.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=120&q=80'} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b style={{ fontSize: '13px', color: '#fff', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{line.name}</b>
                      <span style={{ fontSize: '11px', color: '#C9A84C' }}>{money(line.unitCents * line.qty)}</span>
                    </div>

                    {/* Quantity Selector (- qty +) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1A1A1A', padding: '4px 8px', borderRadius: '12px' }}>
                      <button onClick={() => cart.setQty(line.key, line.qty - 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>−</button>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>{line.qty}</span>
                      <button onClick={() => cart.setQty(line.key, line.qty + 1)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>+</button>
                    </div>

                    <button onClick={() => cart.remove(line.key)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                  </div>
                ))
              )}
            </div>

            {/* Promotion Code Field */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input
                type="text"
                placeholder="Promotion Code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                style={{ flex: 1, height: '42px', borderRadius: '21px', background: '#262626', border: '1px solid rgba(255,255,255,0.08)', padding: '0 16px', color: '#fff', fontSize: '12px', outline: 'none' }}
              />
              <button
                onClick={() => setPromoApplied(!promoApplied)}
                style={{ height: '42px', padding: '0 18px', borderRadius: '21px', background: promoApplied ? '#2E7D32' : '#333', color: promoApplied ? '#fff' : '#fff', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {promoApplied ? <><SvgIcon name="check" size={14} /> APPLIED</> : 'TRYNEW'}
              </button>
            </div>

            {/* Price Calculations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#aaa', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sub Total</span>
                <b style={{ color: '#fff' }}>{money(cart.subtotalCents)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Delivery Charge</span>
                <b style={{ color: '#fff' }}>{money(deliveryChargeCents)}</b>
              </div>
              {promoApplied && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4CAF50' }}>
                  <span>Discount (TRYNEW)</span>
                  <b>-{money(promoDiscountCents)}</b>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.1)', marginTop: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>TOTAL</span>
                <b style={{ fontSize: '22px', fontWeight: 'bold', color: '#C9A84C' }}>{money(totalCents)}</b>
              </div>
            </div>
          </div>

          {/* Confirm Order Button */}
          <Link
            href="/checkout"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '54px', borderRadius: '27px', background: cart.lines.length === 0 ? '#333' : 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)', color: cart.lines.length === 0 ? '#666' : '#000', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none', textAlign: 'center', marginTop: '20px', pointerEvents: cart.lines.length === 0 ? 'none' : 'auto', boxShadow: cart.lines.length === 0 ? 'none' : '0 8px 25px rgba(201, 168, 76, 0.35)' }}
          >
            Confirm Order
          </Link>
        </aside>

      </div>
    </div>
  );
}
