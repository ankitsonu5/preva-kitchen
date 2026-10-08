import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import ProductGrid from '@/components/shop/ProductGrid';
import PrivateDiningBanner from '@/components/shop/PrivateDiningBanner';
import ReadyToOrder from '@/components/shop/ReadyToOrder';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateMenuPageSchema } from '@/lib/seo-schema';
import { FALLBACK_PRODUCTS, FALLBACK_CATEGORIES } from '@/data/fallbackMenu';
import { withoutLegacyDuplicates } from '@/lib/legacy-dish-slugs';

export default async function ShopContent() {
  const origin = getCanonicalOrigin();
  const [products, categories] = await Promise.all([
    cmsFetch('/shop/products'),
    cmsFetch('/shop/categories')
  ]);

  const list = withoutLegacyDuplicates(Array.isArray(products) && products.length > 0 ? products : FALLBACK_PRODUCTS);
  const cats = Array.isArray(categories) && categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const menuSchema = generateMenuPageSchema(list, origin);

  return (
    <ShopProvider>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(menuSchema) }}
      />
      <div className="ps">
        {/* ══ 1. MINIMAL LUXURY DISH HERO BANNER ══ */}
        <section className="ps-hero-minimal">
          <img
            src="/asset/hero/menu-hero-cinematic.webp"
            alt="Preva Kitchen Menu"
            className="ps-hero-minimal__bg"
          />
          <div className="ps-hero-minimal__shade" />

          <div className="ps-hero-minimal__content">
            <span className="ps-hero-minimal__kicker">PREVA KITCHEN</span>
            <h1 className="ps-hero-minimal__title">Preva Kitchen Menu – Wings, Seafood, Pasta &amp; More</h1>
            <p className="ps-hero-minimal__sub">Crafted with passion, served with pride in Redford Township, MI.</p>
          </div>
        </section>

        {/* MAIN CONTAINER FOR SECTIONS */}
        <div className="ps-wrap" style={{ paddingTop: '0' }}>
          {/* ══ 2. PRODUCT GRID ══ */}
          <div id="signature-creations" style={{ marginBottom: 56 }}>
            <ProductGrid products={list} categories={cats} />
          </div>

          {/* ══ 3. READY TO ORDER ══ */}
          <ReadyToOrder />

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
                <img src="/asset/home-reference/preva-restaurant-hero.png" alt="Dining room at Preva Kitchen" loading="lazy" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Sophisticated Atmosphere</span>
                </div>
              </div>
              <div className="ps-exp-card">
                <img src="/asset/home-reference/preva-kitchen-story.jpg" alt="Preparing a dish in the Preva Kitchen" loading="lazy" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Culinary Mastery</span>
                </div>
              </div>
              <div className="ps-exp-card">
                <img src="/asset/hero/preva-feast-hero.jpg" alt="A table of Preva Kitchen dishes" loading="lazy" />
                <div className="ps-exp-card__overlay">
                  <span className="ps-exp-card__title">Exclusive Fine Dining</span>
                </div>
              </div>
            </div>
          </div>

          {/* ══ 5. PRIVATE DINING & EXCLUSIVE EVENTS BANNER ══ */}
          <PrivateDiningBanner />
        </div>
      </div>
    </ShopProvider>
  );
}
