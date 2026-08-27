import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import ProductGrid from '@/components/shop/ProductGrid';
import PrivateDiningBanner from '@/components/shop/PrivateDiningBanner';
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
        
        {/* ══ 1. MINIMAL LUXURY DISH HERO BANNER ══ */}
        <section className="ps-hero-minimal">
          <img
            src="/asset/hero/menu-hero-cinematic.jpg"
            alt="Preva Kitchen Menu"
            className="ps-hero-minimal__bg"
          />
          <div className="ps-hero-minimal__shade" />

          <div className="ps-hero-minimal__content">
            <span className="ps-hero-minimal__kicker">PREVA KITCHEN</span>
            <h1 className="ps-hero-minimal__title">Our Menu</h1>
            <p className="ps-hero-minimal__sub">Crafted with passion, served with pride.</p>
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
          <PrivateDiningBanner />

        </div>
      </div>
    </ShopProvider>
  );
}
