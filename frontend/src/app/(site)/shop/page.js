import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import ProductGrid from '@/components/shop/ProductGrid';
import Link from 'next/link';
import SvgIcon from '@/components/SvgIcon';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Preva Kitchen — Fine-Plated Gourmet & Online Ordering',
  description:
    'Where Flavor Becomes Art. Order Preva Kitchen directly for pickup or delivery in Redford Township. Chef-driven gourmet menu.',
  alternates: { canonical: '/shop' }
};

export default async function ShopPage() {
  const [products, categories, settings] = await Promise.all([
    cmsFetch('/shop/products'),
    cmsFetch('/shop/categories'),
    cmsFetch('/shop/settings')
  ]);

  const list = Array.isArray(products) ? products : [];
  const cats = Array.isArray(categories) ? categories : [];

  return (
    <ShopProvider>
      <div className="ps">
        
        {/* ══ 1. EDGE-TO-EDGE HERO VIDEO SECTION (100vw FULL SCREEN WIDTH) ══ */}
        <section className="ps-hero-edge">
          <video
            autoPlay
            loop
            muted
            playsInline
            poster="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80"
            className="ps-hero-edge__video"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-chef-preparing-a-dish-in-a-restaurant-41555-large.mp4" type="video/mp4" />
            <source src="https://cdn.coverr.co/videos/coverr-chef-preparing-a-dish-5221/1080p.mp4" type="video/mp4" />
          </video>

          <div className="ps-hero-edge__overlay" />

          <div className="ps-hero-edge__content">
            {/* Left Side Typography & CTAs */}
            <div>
              <span className="ps-kicker" style={{ color: '#C9A84C', fontWeight: 800, letterSpacing: '4px', textTransform: 'uppercase', fontSize: '13px', textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
                PREVA FINE-PLATED KITCHEN
              </span>
              <h1 className="ps-hero-title">
                Where Flavor <br /> Becomes Art
              </h1>
              <p className="ps-hero-subhead">
                A refined fine-plated gourmet dish, chef-crafted menu, same high standard — straight from our kitchen to your table or doorstep.
              </p>

              <div className="ps-hero-ctas">
                <a href="#signature-creations" className="ps-btn ps-btn--gold">
                  View Menu
                </a>
                <a href="#prv-reservations" className="ps-btn ps-btn--ghost">
                  Book Table
                </a>
              </div>

              {settings && !settings.orderingEnabled && (
                <p className="ps-alert" style={{ marginTop: 24, maxWidth: 520 }}>{settings.closedMessage}</p>
              )}
            </div>

            {/* Right Side Featured Dish Spotlight Glass Card (NOIR FLAME style) */}
            <div className="ps-hero-spotlight">
              <div style={{ position: 'relative' }}>
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                  alt="Featured Gourmet Dish"
                  className="ps-hero-spotlight__img"
                />
                <span className="ps-chip" style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)', borderColor: '#C9A84C' }}>
                  <SvgIcon name="star" size={14} /> Chef’s Signature
                </span>
              </div>
              <div className="ps-hero-spotlight__info">
                <div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '20px', color: '#fff', margin: 0 }}>Grilled Lamb Chops</h3>
                  <p style={{ fontSize: '12.5px', color: '#bbb', margin: '4px 0 0' }}>Seasoned with Preva house spices</p>
                </div>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '22px', fontWeight: 'bold', color: '#C9A84C' }}>$32.00</span>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTAINER FOR SECTIONS */}
        <div className="ps-wrap" style={{ paddingTop: '0' }}>

          {/* ══ 2. SIGNATURE CREATIONS & PRODUCT GRID ══ */}
          <div id="signature-creations" style={{ marginBottom: 56 }}>
            <h2 className="ps-sec-title">Signature Creations</h2>
            <ProductGrid products={list} categories={cats} />
          </div>

          {/* ══ 4. DINING EXPERIENCE GALLERY ══ */}
          <div style={{ marginTop: '88px', marginBottom: '80px' }}>
            <div style={{ marginBottom: '36px' }}>
              <span style={{ display: 'block', marginBottom: '10px', color: 'var(--accent-gold, #c5a059)', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase' }}>
                AMBIENCE & HOSPITALITY
              </span>
              <h2 className="ps-sec-title" style={{ margin: 0 }}>Dining Experience</h2>
            </div>
            <div className="ps-exp-grid">
              <div className="ps-exp-card">
                <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80" alt="Preva Ambiance" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Sophisticated Atmosphere</span>
                </div>
              </div>
              <div className="ps-exp-card">
                <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=800&q=80" alt="Master Chef Plating" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Culinary Mastery</span>
                </div>
              </div>
              <div className="ps-exp-card">
                <img src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80" alt="Candlelight Dining" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Exclusive Fine Dining</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ 5. PRIVATE DINING & EXCLUSIVE EVENTS BANNER (NOIR FLAME style) ══ */}
          <div className="ps-private-banner">
            <div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#C9A84C', letterSpacing: '3px', textTransform: 'uppercase' }}>CATERING & GROUP DINING</span>
              <h2 className="ps-private-banner__title" style={{ marginTop: 6 }}>
                Private Dining & Exclusive Events Available
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14.5px', marginTop: 4 }}>
                Host family celebrations, corporate lunches and memorable group meals with Preva Kitchen.
              </p>
            </div>
            <a href="#prv-reservations" className="ps-btn ps-btn--gold" style={{ padding: '0 32px' }}>
              Reserve Private Suite
            </a>
          </div>

        </div>
      </div>
    </ShopProvider>
  );
}
