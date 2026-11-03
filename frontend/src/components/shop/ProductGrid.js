'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { money } from '@/lib/money';
import Tilt3DCard from '../Tilt3DCard';
import { ArrowRight, Search } from 'lucide-react';
import { dishImage } from '@/lib/dish-images';
import { CATEGORY_IMAGES, menuCategoryOptions, normalizeCategoryName, categoryPath } from '@/lib/menu-categories';
import {
  getMenuDisplayName,
  getProductMenuPriceCents,
  MENU_IMAGE_UNAVAILABLE
} from '@/lib/menu-options';

export function ProductCard({ product }) {
  const soldOut = !product.available;
  const productName = getMenuDisplayName(product.name, product.slug);
  const imageSrc = MENU_IMAGE_UNAVAILABLE.has(product.slug) && !product.image ? null : dishImage(product);

  return (
    <Tilt3DCard className="ps-card">
      <div className="ps-card__shot">
        {/* The dish name below is the card's real link; this image link is a
            duplicate target for mouse users, so keep it out of the tab order and
            the accessibility tree. */}
        <Link href={`/menu/${product.slug}`} tabIndex={-1} aria-hidden="true" style={{ display: 'block', height: '100%' }}>
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={`${productName} at Preva Kitchen`}
              loading="lazy"
              onError={(e) => {
                if (product.slug?.includes('pasta')) {
                  e.currentTarget.src = '/asset/home-reference/signature-dishes/Rasta-Pasta.webp';
                } else {
                  e.currentTarget.src = '/asset/hero/preva-pasta-hero.jpg';
                }
              }}
            />
          ) : (
            <div className="ps-product-photo-placeholder" role="img" aria-label={`${productName} photo unavailable`}>
              Product photo unavailable
            </div>
          )}
        </Link>

        <div className="ps-card__chips">
          {soldOut && <span className="ps-chip ps-chip--out">Sold out</span>}
        </div>

      </div>

      <h3 style={{ margin: 0, fontSize: 'inherit', textTransform: 'inherit', lineHeight: 'inherit' }}>
        <Link className="ps-card__name" href={`/menu/${product.slug}`}>{productName}</Link>
      </h3>

      {product.description && <p className="ps-card__desc">{product.description}</p>}

      <div className="ps-card__foot lx-card-foot">
        <div className="lx-foot-left">
          <span className="ps-price">{money(getProductMenuPriceCents(product))}</span>
          {product.showServings && product.servings && <span className="ps-meta">{product.servings}</span>}
        </div>
        {!soldOut && (
          <Link className="ps-btn ps-btn--gold ps-btn--sm lx-order-btn" href={`/menu/${product.slug}`}>Order now</Link>
        )}
      </div>
    </Tilt3DCard>
  );
}

export default function ProductGrid({ products, categories }) {
  const [active, setActive] = useState('All');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  // Normalize products with standard category names
  const normalizedProducts = useMemo(() => {
    return products.map((item) => ({
      ...item,
      normalizedCategory: normalizeCategoryName(item.category)
    }));
  }, [products]);

  const categoryOptions = useMemo(
    () => menuCategoryOptions(products, categories),
    [products, categories]
  );
  const distinctCategories = useMemo(
    () => categoryOptions.map((category) => category.name),
    [categoryOptions]
  );

  // Group products by category
  const categoryGroups = useMemo(() => {
    // A search looks through every category and lists the matches together.
    if (query) {
      const matches = normalizedProducts.filter((p) => {
        const tags = Array.isArray(p.tags) ? p.tags.join(' ') : '';
        return [p.name, p.description, p.normalizedCategory, tags]
          .some((value) => String(value || '').toLowerCase().includes(query));
      });
      return [{ category: `Results for “${search.trim()}”`, items: matches, isSearch: true }];
    }

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
  }, [normalizedProducts, distinctCategories, active, query, search]);

  return (
    <>
      {/* ── Search ── */}
      <div style={{ position: 'relative', maxWidth: '520px', margin: '32px auto 8px' }}>
        <Search size={18} aria-hidden="true" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#c5a059' }} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the menu: wings, pasta, salmon..."
          aria-label="Search the menu"
          style={{
            width: '100%',
            padding: '14px 18px 14px 46px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(213, 164, 79, 0.3)',
            borderRadius: '999px',
            color: '#ffffff',
            fontSize: '15px',
            outline: 'none'
          }}
        />
      </div>

      {/* ── Circular Food Image Category Navigation Bar ── */}
      <nav className="ps-circle-category-bar" aria-label="Menu categories">
        <button
          type="button"
          data-active={active === 'All'}
          onClick={() => { setActive('All'); setSearch(''); }}
          className="ps-cat-circle"
        >
          <div className="ps-cat-circle__wrap">
            <img src={CATEGORY_IMAGES['All']} alt="All Dishes" />
          </div>
          <span className="ps-cat-circle__name">All Dishes</span>
        </button>

        {categoryOptions.map(({ name: catName, image: imgSrc }) => {
          return (
            <button
              key={catName}
              type="button"
              data-active={active === catName}
              onClick={() => { setActive(catName); setSearch(''); }}
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
        {categoryGroups.length === 0 || categoryGroups[0].items.length === 0 ? (
          <p className="ps-empty">{query ? `No dishes match “${search.trim()}”. Try another word.` : 'No dishes found in this category right now.'}</p>
        ) : (
          categoryGroups.map((group) => (
            <section
              key={group.category}
              id={`cat-${group.category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
              style={{
                position: 'relative'
              }}
            >
              {/* Category Section Header */}
              <div style={{ marginBottom: '28px', borderBottom: '1px solid rgba(213, 164, 79, 0.15)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2
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
                    </h2>
                  </div>

                  {group.isSearch ? (
                    <span style={{ color: '#c5a059', fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {group.items.length} {group.items.length === 1 ? 'Dish' : 'Dishes'}
                    </span>
                  ) : (
                  <Link
                    href={categoryPath(group.category)}
                    style={{
                      display: 'inline-block',
                      textDecoration: 'none',
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
                    {group.items.length} {group.items.length === 1 ? 'Dish' : 'Dishes'} · View all
                  </Link>
                  )}
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
