import { cmsFetch } from '@/lib/cms';
import ProductGrid from '@/components/shop/ProductGrid';
import MenuOrderSection from '@/components/shop/MenuOrderSection';
import { getCanonicalOrigin } from '@/lib/site-url';
import { generateMenuPageSchema } from '@/lib/seo-schema';
import { withoutLegacyDuplicates } from '@/lib/legacy-dish-slugs';
import { getMenuProductDescription, getProductMenuPriceCents } from '@/lib/menu-options';
import { menuCategoriesOrFallback, menuProductsOrFallback } from '@/lib/menu-data';
import { money } from '@/lib/money';

export default async function ShopContent() {
  const origin = getCanonicalOrigin();
  const [products, categories] = await Promise.all([
    cmsFetch('/shop/products'),
    cmsFetch('/shop/categories')
  ]);

  const list = withoutLegacyDuplicates(menuProductsOrFallback(products));
  const cats = menuCategoriesOrFallback(categories);
  const menuSchema = generateMenuPageSchema(list.map((product) => ({
    ...product,
    priceCents: getProductMenuPriceCents(product),
    price: money(getProductMenuPriceCents(product)),
    description: getMenuProductDescription(product)
  })), origin);

  return (
    <>
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

          {/* ══ 6. READY TO ORDER (closing card) ══ */}
          <MenuOrderSection />
        </div>
      </div>
    </>
  );
}
