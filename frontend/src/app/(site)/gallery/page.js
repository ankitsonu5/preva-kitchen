"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

export const ALL_GALLERY_IMAGES = [
  {
    id: 1,
    title: 'Lavish Lamb Tower',
    category: 'dishes',
    tag: 'CHEF SIGNATURE',
    desc: 'Rosemary-glazed rack of lamb layered with seasonal vegetables and velvety jus.',
    src: '/asset/prevaclub/wp-content/uploads/2026/06/hero-preva-kitchen-.jpeg',
    aspect: 'tall'
  },
  {
    id: 2,
    title: 'Wild Lobster Bites',
    category: 'dishes',
    tag: 'SEAFOOD SPECIAL',
    desc: 'Wild-caught lobster tail seared in garlic-herb butter with clarified lemon.',
    src: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=1200&q=85',
    aspect: 'wide'
  },
  {
    id: 3,
    title: 'Creamy Rasta Pasta',
    category: 'dishes',
    tag: 'HOUSE FAVORITE',
    desc: 'Creamy Caribbean-style penne tossed with authentic house jerk seasoning.',
    src: '/asset/prevaclub/wp-content/uploads/2026/08/Rasta-Pasta.webp',
    fallback: '/asset/hero/preva-pasta-hero.jpg',
    aspect: 'square'
  },
  {
    id: 4,
    title: 'Prime Steak Bites',
    category: 'dishes',
    tag: 'PRIME CUT',
    desc: 'USDA Prime seared steak bites with caramelized onions and wild mushrooms.',
    src: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 5,
    title: 'Warm Dining Ambiance',
    category: 'atmosphere',
    tag: 'DINING ROOM',
    desc: 'Intimate evening dining atmosphere crafted for celebrations and dinner dates.',
    src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=85',
    aspect: 'wide'
  },
  {
    id: 6,
    title: 'Craft Wine & Cocktail Program',
    category: 'cocktails',
    tag: 'BAR COLLECTION',
    desc: 'Curated wine collection and artisanal cocktails crafted to complement our dishes.',
    src: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 7,
    title: 'Crispy Southern Catfish',
    category: 'dishes',
    tag: 'SOUTHERN SPECIALTY',
    desc: 'Golden cornmeal crusted catfish fillets served with seasoned remoulade.',
    src: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 8,
    title: 'Preva Signature Wings',
    category: 'dishes',
    tag: 'SHAREABLE',
    desc: 'Crispy tossed house wings glazed in signature sweet chili or garlic honey.',
    src: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 9,
    title: 'Preva Double Prime Burger',
    category: 'dishes',
    tag: 'GOURMET BURGER',
    desc: 'Custom prime beef blend patty, aged cheddar, brioche bun, house sauce.',
    src: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 10,
    title: 'Chef Kitchen Preparation',
    category: 'kitchen',
    tag: 'CULINARY CRAFT',
    desc: 'Every plate prepared with fresh local ingredients and meticulous culinary care.',
    src: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=85',
    aspect: 'tall'
  },
  {
    id: 11,
    title: 'Artisan Berry Cheesecake',
    category: 'dishes',
    tag: 'SWEET INDULGENCE',
    desc: 'New York style cheesecake with macerated berry compote & fresh mint.',
    src: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=1200&q=85',
    aspect: 'square'
  },
  {
    id: 12,
    title: 'Evening Cocktail Lounge',
    category: 'cocktails',
    tag: 'NIGHTCAP',
    desc: 'Signature drinks mixed to order for relaxing evenings and lively nights.',
    src: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=85',
    aspect: 'wide'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Moments' },
  { id: 'dishes', label: 'Signature Dishes' },
  { id: 'kitchen', label: 'Kitchen & Chefs' },
  { id: 'cocktails', label: 'Cocktails & Bar' },
  { id: 'atmosphere', label: 'Dining Atmosphere' }
];

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const filteredItems = activeCategory === 'all'
    ? ALL_GALLERY_IMAGES
    : ALL_GALLERY_IMAGES.filter(img => img.category === activeCategory);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    if (typeof document !== 'undefined') document.body.style.overflow = '';
  };

  const nextLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
    }
  };

  const prevLightbox = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  const currentItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <main style={{ minHeight: '100vh', background: '#070507', color: '#f5f1e8', paddingBottom: '120px' }}>
      {/* Hero Header */}
      <section
        style={{
          padding: '140px 0 70px',
          background: 'radial-gradient(ellipse at 50% 20%, rgba(213, 164, 79, 0.12) 0%, transparent 65%), #0a080a',
          borderBottom: '1px solid rgba(213, 164, 79, 0.22)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: '#c5a059',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginBottom: '16px'
            }}
          >
            <Sparkles size={14} /> PREVA KITCHEN GALLERY
          </span>

          <h1
            style={{
              fontFamily: 'var(--font-roboto), Arial, sans-serif',
              fontSize: 'clamp(2.8rem, 5.5vw, 4.6rem)',
              lineHeight: 1.05,
              color: '#fff',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              margin: '0 0 20px 0',
              textTransform: 'uppercase'
            }}
          >
            A Feast <span style={{ color: '#c5a059', fontStyle: 'italic', textTransform: 'none' }}>For The Eyes</span>
          </h1>

          <div style={{ width: '80px', height: '2px', background: '#c5a059', margin: '0 auto 24px' }} />

          <p style={{ fontSize: '1.08rem', color: '#aaa398', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.8 }}>
            Explore the culinary craftsmanship, handcrafted signature plates, and warm ambient spaces that define the Preva Kitchen experience.
          </p>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  height: '42px',
                  padding: '0 20px',
                  borderRadius: '999px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  border: activeCategory === cat.id ? '1px solid #c5a059' : '1px solid rgba(255, 255, 255, 0.12)',
                  background: activeCategory === cat.id ? 'linear-gradient(110deg, #b7933f, #e1c87e)' : 'rgba(255, 255, 255, 0.03)',
                  color: activeCategory === cat.id ? '#120e06' : '#c5c0b6',
                  cursor: 'pointer',
                  transition: 'all 0.22s ease',
                  boxShadow: activeCategory === cat.id ? '0 6px 20px rgba(213, 164, 79, 0.3)' : 'none'
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery Grid */}
      <section style={{ padding: '70px 0 90px' }}>
        <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
              gap: '24px'
            }}
          >
            {filteredItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => openLightbox(index)}
                style={{
                  position: 'relative',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  background: '#110d10',
                  border: '1px solid rgba(213, 164, 79, 0.22)',
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
                  cursor: 'pointer',
                  minHeight: '300px',
                  aspectRatio: item.aspect === 'wide' ? '16/10' : item.aspect === 'tall' ? '4/5' : '1/1',
                  transition: 'transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.6)';
                  e.currentTarget.style.boxShadow = '0 22px 50px rgba(0, 0, 0, 0.7), 0 0 20px rgba(213, 164, 79, 0.12)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(213, 164, 79, 0.22)';
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.5)';
                  const img = e.currentTarget.querySelector('img');
                  if (img) img.style.transform = 'scale(1)';
                }}
              >
                {/* Image */}
                <img
                  src={item.src}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    if (item.fallback) e.currentTarget.src = item.fallback;
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    transition: 'transform 0.5s ease'
                  }}
                />

                {/* Dark Vignette Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 40%, rgba(8, 6, 8, 0.92) 100%)'
                  }}
                />

                {/* Top Badge */}
                <div style={{ position: 'absolute', top: '16px', left: '16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'rgba(10, 7, 9, 0.88)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(213, 164, 79, 0.3)',
                      color: '#c5a059',
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      padding: '4px 9px',
                      borderRadius: '4px'
                    }}
                  >
                    {item.tag}
                  </span>
                </div>

                {/* Bottom Details */}
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--font-roboto), Arial, sans-serif',
                      fontSize: '1.35rem',
                      color: '#fff',
                      margin: '0 0 6px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#b5b0a8', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Actions CTA */}
          <div
            style={{
              marginTop: '90px',
              padding: '60px 40px',
              background: 'linear-gradient(135deg, rgba(20, 14, 18, 0.9) 0%, rgba(10, 7, 9, 0.95) 100%)',
              border: '1px solid rgba(213, 164, 79, 0.3)',
              borderRadius: '20px',
              textAlign: 'center',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)'
            }}
          >
            <span style={{ color: '#c5a059', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              EXPERIENCE PREVA KITCHEN
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-roboto), Arial, sans-serif',
                fontSize: 'clamp(2rem, 3.6vw, 3rem)',
                color: '#fff',
                margin: '12px 0 20px',
                textTransform: 'uppercase'
              }}
            >
              Taste These Creations Tonight
            </h2>
            <p style={{ color: '#aaa', fontSize: '0.98rem', maxWidth: '560px', margin: '0 auto 32px' }}>
              Join us for daytime dining, evening dinners, or order online for fast pickup and delivery.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Link
                href="/menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  height: '52px',
                  padding: '0 34px',
                  background: 'linear-gradient(135deg, #a6133b, #761024)',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  boxShadow: '0 10px 28px rgba(166, 19, 59, 0.35)',
                  transition: 'transform 0.2s ease, filter 0.2s ease, background 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'linear-gradient(135deg, #bd1b49, #8f0e2d)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'linear-gradient(135deg, #a6133b, #761024)'; }}
              >
                View Full Menu <ArrowRight size={16} />
              </Link>
              <Link
                href="/menu"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  height: '52px',
                  padding: '0 30px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(213, 164, 79, 0.35)',
                  color: '#e8e2d8',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: '999px',
                  textDecoration: 'none'
                }}
              >
                Order Online
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {currentItem && (
        <div
          onClick={closeLightbox}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.92)',
            backdropFilter: 'blur(12px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '46px',
              height: '46px',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <X size={22} />
          </button>

          {/* Prev Button */}
          <button
            onClick={(e) => { e.stopPropagation(); prevLightbox(); }}
            style={{
              position: 'absolute',
              left: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <ChevronLeft size={26} />
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); nextLightbox(); }}
            style={{
              position: 'absolute',
              right: '24px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <ChevronRight size={26} />
          </button>

          {/* Modal Content */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '900px',
              width: '100%',
              background: '#120e11',
              border: '1px solid rgba(213, 164, 79, 0.35)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 30px 90px rgba(0,0,0,0.9)'
            }}
          >
            <div style={{ maxHeight: '65vh', overflow: 'hidden', background: '#000' }}>
              <img
                src={currentItem.src}
                alt={currentItem.title}
                onError={(e) => {
                  if (currentItem.fallback) e.currentTarget.src = currentItem.fallback;
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '65vh',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
            </div>
            <div style={{ padding: '24px 28px', background: '#120e11' }}>
              <span style={{ color: '#c5a059', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                {currentItem.tag}
              </span>
              <h2 style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '1.6rem', color: '#fff', margin: '0 0 8px', textTransform: 'uppercase' }}>
                {currentItem.title}
              </h2>
              <p style={{ margin: 0, color: '#aaa', fontSize: '0.92rem', lineHeight: 1.6 }}>
                {currentItem.desc}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
