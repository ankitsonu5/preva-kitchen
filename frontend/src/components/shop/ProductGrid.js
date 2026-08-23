'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { money, useCart } from './ShopProvider';
import Tilt3DCard from '../Tilt3DCard';

// High-definition circular category images matching live Preva Kitchen menu
const CATEGORY_IMAGES = {
  'All': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Wings': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaWings-768x768.webp',
  'Preva Burger': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaBurger-768x768.webp',
  'Quesadillas': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaQuesadilla-768x768.webp',
  'Tacos': 'https://prevaclub.com/wp-content/uploads/2026/08/ShrimpTacos-768x768.webp',
  'Preva Bites': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaCatfish-768x768.webp',
  'Pasta': 'https://prevaclub.com/wp-content/uploads/2026/08/Rasta-Pasta.webp',
  'Salads': 'https://prevaclub.com/wp-content/uploads/2026/08/house-salad.webp',
  'Entrees': 'https://prevaclub.com/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Entrées': 'https://prevaclub.com/wp-content/uploads/2026/08/prevaLamb-768x768.webp',
  'Sides': 'https://prevaclub.com/wp-content/uploads/2026/08/PrevaMac-768x768.webp',
  'Dessert': 'https://prevaclub.com/wp-content/uploads/2026/08/red-wine-poached-pear.webp'
};

export function ProductCard({ product }) {
  const cart = useCart();
  const soldOut = !product.available;
  const needsChoice = product.optionGroups?.some((group) => group.required);
  const imageSrc = product.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80';

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
      <Link className="ps-card__shot" href={`/shop/${product.slug}`}>
        <img src={imageSrc} alt={product.name} loading="lazy" />

        <div className="ps-card__chips">
          {soldOut && <span className="ps-chip ps-chip--out">Sold out</span>}
          {!soldOut && product.badge && <span className="ps-chip">{product.badge}</span>}
          {!soldOut && !product.badge && product.featured && <span className="ps-chip">Chef&rsquo;s pick</span>}
        </div>

        {!soldOut && (
          <div className="ps-card__quick">
            {needsChoice ? (
              <span className="ps-btn ps-btn--ghost ps-btn--sm ps-btn--block" style={{ background: 'rgba(0,0,0,.7)', borderRadius: '12px' }}>
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

      <Link className="ps-card__name" href={`/shop/${product.slug}`}>{product.name}</Link>

      <div className="lx-rating" aria-label={`Rated ${product.rating || (product.featured ? '4.8' : '4.6')} out of 5`}>
        <span className="lx-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
        <span className="lx-rating-num">{product.rating || (product.featured ? '4.8' : '4.6')}</span>
      </div>

      {product.description && <p className="ps-card__desc">{product.description}</p>}

      <div className="ps-card__foot lx-card-foot">
        <div className="lx-foot-left">
          <span className="ps-price">{money(product.priceCents)}</span>
          {product.showServings && product.servings && <span className="ps-meta">{product.servings}</span>}
        </div>
        {!soldOut && (
          needsChoice ? (
            <Link className="ps-btn ps-btn--gold ps-btn--sm lx-order-btn" href={`/shop/${product.slug}`}>Order</Link>
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

  const shown = useMemo(
    () => (active === 'All' ? products : products.filter((product) => product.category === active)),
    [products, active]
  );

  return (
    <>
      {/* Image 2 Circular Food Image Category Bar */}
      {categories.length > 1 && (
        <nav className="ps-circle-category-bar" aria-label="Menu categories">
          <button
            type="button"
            data-active={active === 'All'}
            onClick={() => setActive('All')}
            className="ps-cat-circle"
          >
            <div className="ps-cat-circle__wrap">
              <img src={CATEGORY_IMAGES['All']} alt="All" />
            </div>
            <span className="ps-cat-circle__name">All</span>
          </button>

          {categories.map((category) => {
            const catName = typeof category === 'string' ? category : category.name;
            const imgSrc = CATEGORY_IMAGES[catName] || category.image || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80';

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
      )}

      <div className="ps-sec ps-sec--tight">
        {shown.length === 0 ? (
          <p className="ps-empty">Nothing in this category is available for online ordering right now.</p>
        ) : (
          <div className="ps-grid">
            {shown.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
