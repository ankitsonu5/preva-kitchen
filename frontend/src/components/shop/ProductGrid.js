'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { money, useCart } from './ShopProvider';
import Tilt3DCard from '../Tilt3DCard';
import { Sparkles, ArrowRight } from 'lucide-react';

// High-definition circular category images matching live Preva Kitchen menu
const CATEGORY_IMAGES = {
  'All': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Wings': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Burger': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'Quesadillas': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp',
  'Tacos': '/asset/prevaclub/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp',
  'Preva Bites': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp',
  'Pasta': '/asset/home-reference/signature-dishes/Rasta-Pasta.webp',
  'Salads': '/asset/prevaclub/wp-content/uploads/2026/08/house-salad.webp',
  'Entrées': '/asset/prevaclub/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Entrees': '/asset/prevaclub/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Sides': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaMac-768x768.webp',
  'Dessert': '/asset/prevaclub/wp-content/uploads/2026/08/red-wine-poached-pear.webp'
};

const DISH_LOCAL_MAP = {
  'rasta-pasta': '/asset/home-reference/signature-dishes/Rasta-Pasta.webp',
  'veggie-pasta': '/asset/prevaclub/wp-content/uploads/2026/08/Veggie-Pasta-768x614.webp',
  'preva-lamb': '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp',
  'preva-lamb-chops': '/asset/home-reference/signature-dishes/prevaLamb-600x600.webp',
  'catfish-bites': '/asset/home-reference/signature-dishes/PrevaCatfish-600x600.webp',
  'preva-catfish': '/asset/home-reference/signature-dishes/PrevaCatfish-600x600.webp',
  'preva-steak-bites': '/asset/home-reference/signature-dishes/PrevaSteakBites-600x600.webp',
  'preva-lobster': 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80',
  'lobster-bites': 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=800&q=80',
  'preva-burger': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'preva-wings': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'preva-wings-chilli': '/asset/prevaclub/wp-content/uploads/2026/08/PrevaWingsChilli-768x768.webp',
  'preva-mac': '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp',
  'preva-mac-and-cheese': '/asset/home-reference/signature-dishes/PrevaMac-600x600.webp',
  'preva-quesadillas': '/asset/home-reference/signature-dishes/PrevaQuesadilla-600x600.webp',
  'shrimp-tacos': '/asset/home-reference/signature-dishes/ShrimpTacos-600x600.webp'
};

const CANONICAL_CATEGORIES = [
  'Preva Wings',
  'Preva Burger',
  'Quesadillas',
  'Tacos',
  'Preva Bites',
  'Pasta',
  'Salads',
  'Entrées',
  'Sides',
  'Dessert'
];

function normalizeCategoryName(name) {
  if (!name) return 'Other';
  const clean = String(name).trim();
  if (/^entr[eé]es$/i.test(clean)) return 'Entrées';
  if (/^wings$/i.test(clean)) return 'Preva Wings';
  if (/^burger(s)?$/i.test(clean)) return 'Preva Burger';
  if (/^bites$/i.test(clean)) return 'Preva Bites';
  if (/^pasta$/i.test(clean)) return 'Pasta';
  if (/^salads?$/i.test(clean)) return 'Salads';
  if (/^desserts?$/i.test(clean)) return 'Dessert';
  if (/^sides?$/i.test(clean)) return 'Sides';
  if (/^quesadillas?$/i.test(clean)) return 'Quesadillas';
  if (/^tacos?$/i.test(clean)) return 'Tacos';
  return clean;
}

export function ProductCard({ product }) {
  const cart = useCart();
  const soldOut = !product.available;
  const needsChoice = product.optionGroups?.some((group) => group.required);
  const imageSrc = DISH_LOCAL_MAP[product.slug] || product.image || '/asset/home-reference/signature-dishes/Rasta-Pasta.webp';

  const quickAdd = () => {
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
  };

  return (
    <Tilt3DCard className="ps-card">
      <Link className="ps-card__shot" href={`/menu/${product.slug}`}>
        <img
          src={imageSrc}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            if (product.slug?.includes('pasta')) {
              e.currentTarget.src = '/asset/home-reference/signature-dishes/Rasta-Pasta.webp';
            } else {
              e.currentTarget.src = '/asset/hero/preva-pasta-hero.jpg';
            }
          }}
        />

        <div className="ps-card__chips">
          {soldOut && <span className="ps-chip ps-chip--out">Sold out</span>}
          {!soldOut && product.badge && <span className="ps-chip">{product.badge}</span>}
          {!soldOut && !product.badge && product.featured && <span className="ps-chip">Chef&rsquo;s pick</span>}
        </div>

        {!soldOut && (
          <div className="ps-card__quick">
            {needsChoice ? (
              <span className="ps-btn ps-btn--ghost ps-btn--sm ps-btn--block" style={{ background: 'rgba(0,0,0,.7)', borderRadius: '4px' }}>
                Choose options
              </span>
            ) : (
              <button
                className="ps-btn ps-btn--gold ps-btn--sm ps-btn--block"
                onClick={(event) => {
                  event.preventDefault();
                  quickAdd();
                }}
              >
                + Add to order
              </button>
            )}
          </div>
        )}
      </Link>

      <Link className="ps-card__name" href={`/menu/${product.slug}`}>{product.name}</Link>

      {product.description && <p className="ps-card__desc">{product.description}</p>}

      <div className="ps-card__foot lx-card-foot">
        <div className="lx-foot-left">
          <span className="ps-price">{money(product.priceCents)}</span>
          {product.showServings && product.servings && <span className="ps-meta">{product.servings}</span>}
        </div>
        {!soldOut && (
          needsChoice ? (
            <Link className="ps-btn ps-btn--gold ps-btn--sm lx-order-btn" href={`/menu/${product.slug}`}>Order</Link>
          ) : (
            <button type="button" className="ps-btn ps-btn--gold ps-btn--sm lx-order-btn" onClick={(e) => { e.preventDefault(); quickAdd(); }}>
              Order
            </button>
          )
        )}
      </div>
    </Tilt3DCard>
  );
}

export default function ProductGrid({ products, categories }) {
  const [active, setActive] = useState('All');

  // Normalize products with standard category names
  const normalizedProducts = useMemo(() => {
    return products.map((item) => ({
      ...item,
      normalizedCategory: normalizeCategoryName(item.category)
    }));
  }, [products]);

  // Extract deduplicated unique categories ordered canonically
  const distinctCategories = useMemo(() => {
    const present = new Set(normalizedProducts.map((p) => p.normalizedCategory));
    const ordered = CANONICAL_CATEGORIES.filter((cat) => present.has(cat));
    present.forEach((cat) => {
      if (!ordered.includes(cat)) ordered.push(cat);
    });
    return ordered;
  }, [normalizedProducts]);

  // Group products by category
  const categoryGroups = useMemo(() => {
    if (active !== 'All') {
      const filtered = normalizedProducts.filter((p) => p.normalizedCategory === active);
      return [{ category: active, items: filtered }];
    }

    return distinctCategories
      .map((cat) => ({
        category: cat,
        items: normalizedProducts.filter((p) => p.normalizedCategory === cat)
      }))
      .filter((group) => group.items.length > 0);
  }, [normalizedProducts, distinctCategories, active]);

  return (
    <>
      {/* ── Circular Food Image Category Navigation Bar ── */}
      <nav className="ps-circle-category-bar" aria-label="Menu categories">
        <button
          type="button"
          data-active={active === 'All'}
          onClick={() => setActive('All')}
          className="ps-cat-circle"
        >
          <div className="ps-cat-circle__wrap">
            <img src={CATEGORY_IMAGES['All']} alt="All Dishes" />
          </div>
          <span className="ps-cat-circle__name">All Dishes</span>
        </button>

        {distinctCategories.map((catName) => {
          const imgSrc = CATEGORY_IMAGES[catName] || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80';

          return (
            <button
              key={catName}
              type="button"
              data-active={active === catName}
              onClick={() => setActive(catName)}
              className="ps-cat-circle"
            >
              <div className="ps-cat-circle__wrap">
                <img src={imgSrc} alt={catName} />
              </div>
              <span className="ps-cat-circle__name">{catName}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Category-wise Grouped Dishes Display ── */}
      <div style={{ display: 'grid', gap: '64px', marginTop: '24px' }}>
        {categoryGroups.length === 0 ? (
          <p className="ps-empty">No dishes found in this category right now.</p>
        ) : (
          categoryGroups.map((group) => (
            <section
              key={group.category}
              id={`cat-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              style={{
                position: 'relative',
                paddingTop: '16px'
              }}
            >
              {/* Category Section Header */}
              <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(213, 164, 79, 0.15)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#c5a059',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        letterSpacing: '0.18em',
                        textTransform: 'uppercase',
                        marginBottom: '6px'
                      }}
                    >
                      <Sparkles size={13} />
                      PREVA SIGNATURE
                    </span>
                    <h3
                      style={{
                        fontFamily: 'var(--font-roboto), Arial, sans-serif',
                        fontSize: 'clamp(1.7rem, 2.6vw, 2.3rem)',
                        color: '#ffffff',
                        fontWeight: 600,
                        letterSpacing: '-0.01em',
                        margin: 0,
                        textTransform: 'uppercase'
                      }}
                    >
                      {group.category}
                    </h3>
                  </div>

                  <span
                    style={{
                      display: 'inline-block',
                      padding: '6px 14px',
                      background: 'rgba(213, 164, 79, 0.08)',
                      border: '1px solid rgba(213, 164, 79, 0.25)',
                      borderRadius: '4px',
                      color: '#c5a059',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    {group.items.length} {group.items.length === 1 ? 'Dish' : 'Dishes'} Available
                  </span>
                </div>
              </div>

              {/* Dish Cards Grid for this category */}
              <div className="ps-grid">
                {group.items.map((product) => (
                  <ProductCard product={product} key={product.id || product._id || product.slug} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </>
  );
}
