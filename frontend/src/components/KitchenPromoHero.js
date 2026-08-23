"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Promo hero for /preva-kitchen — quick-service style (think burgerking.in):
 * rotating launch/offer slides, each selling one dish hard with a price tag
 * and an instant "Order Now" path. Content comes from the site's own
 * signature dishes and operating copy; only the presentation is new.
 */
const PROMO_SLIDES = [
  {
    kicker: 'NEW LAUNCH',
    title: 'Lavish Lamb Tower',
    price: '$27.50',
    tag: 'Chef Signature',
    desc: 'Rosemary-glazed lamb chops stacked over roasted seasonal vegetables with a velvety jus. Crafted to share, made to be remembered.',
    img: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80',
    accent: '#E3C077'
  },
  {
    kicker: 'GUEST FAVORITE',
    title: 'Seared Steak Bites',
    price: '$21.98',
    tag: 'USDA Prime Angus',
    desc: 'Tender 8oz Prime steak bites with caramelized onions, bell peppers, and wild mushrooms. Rich, smoky, unforgettable umami.',
    img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    accent: '#E3A15C'
  },
  {
    kicker: 'SEAFOOD SPECIAL',
    title: 'Wild Lobster Bites',
    price: '$27.98',
    tag: 'Wild-Caught',
    desc: 'Fresh lobster bites seared in garlic herb butter, finished with clarified lemon dip and microgreens.',
    img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=900&q=80',
    accent: '#E37C5C'
  },
  {
    kicker: 'LUNCH OFFER',
    title: 'Daytime Dining From 11 AM',
    price: '$14.99',
    tag: 'Full Service',
    desc: 'Relaxed lunch and early dining with the full chef-driven menu — polished plates, generous portions and easy ordering.',
    img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80',
    accent: '#9BC49A'
  }
];

const AUTOPLAY_MS = 5500;

export default function KitchenPromoHero({ onReserve }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((idx) => {
    setActive((idx + PROMO_SLIDES.length) % PROMO_SLIDES.length);
  }, []);

  // Autoplay — pauses on hover/focus and under reduced motion.
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || prefersReduced) return;
    timerRef.current = setInterval(() => {
      setActive((prev) => (prev + 1) % PROMO_SLIDES.length);
    }, AUTOPLAY_MS);
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const openOrder = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') window.openOrderModal?.();
  };
  const openMenu = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') window.openMenuModal?.();
  };

  const slide = PROMO_SLIDES[active];

  return (
    <div
      className="lx-promo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured dishes and offers"
    >
      <button
        type="button"
        className="lx-slider-arrow lx-promo-arrow prev"
        onClick={() => goTo(active - 1)}
        aria-label="Previous offer"
      >
        &#8249;
      </button>

      <div className="lx-promo-stage">
        {/* Copy column */}
        <div className="lx-promo-copy" key={`copy-${active}`}>
          <span className="lx-promo-kicker" style={{ '--slide-accent': slide.accent }}>
            <span className="lx-kicker-dot" aria-hidden="true"></span>
            {slide.kicker}
          </span>
          <h1 className="lx-promo-title">{slide.title}</h1>
          <div className="lx-promo-meta">
            {slide.price && <span className="lx-promo-price">{slide.price}</span>}
            <span className="lx-promo-tag">{slide.tag}</span>
          </div>
          <p className="lx-promo-desc">{slide.desc}</p>
          <div className="lx-promo-ctas">
            <a href="#order" className="luxe-btn luxe-btn-gold lx-promo-btn" onClick={openOrder}>
              ORDER NOW
            </a>
            <a href="#menu" className="luxe-btn luxe-btn-glass lx-promo-btn" onClick={openMenu}>
              VIEW MENU
            </a>
            {onReserve && (
              <a
                href="#dining-reserve"
                className="lx-promo-link"
                onClick={(e) => { e.preventDefault(); onReserve(e); }}
              >
                or reserve a table &rarr;
              </a>
            )}
          </div>
        </div>

        {/* Dish column */}
        <div className="lx-promo-dish" key={`dish-${active}`}>
          <div className="lx-promo-plate" style={{ '--slide-accent': slide.accent }}>
            <img src={slide.img} alt={slide.title} />
            {slide.price && <span className="lx-promo-price-badge">{slide.price}</span>}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="lx-slider-arrow lx-promo-arrow next"
        onClick={() => goTo(active + 1)}
        aria-label="Next offer"
      >
        &#8250;
      </button>

      {/* Dots */}
      <div className="lx-promo-dots" role="tablist" aria-label="Choose slide">
        {PROMO_SLIDES.map((s, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={s.title}
            className={`lx-promo-dot ${idx === active ? 'is-active' : ''}`}
            onClick={() => goTo(idx)}
          />
        ))}
      </div>
    </div>
  );
}
