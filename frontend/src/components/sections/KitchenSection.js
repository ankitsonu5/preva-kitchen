"use client";

import { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const DISHES = [
  {
    num: '01',
    title: 'Lavish Lamb Tower',
    price: '$27.50',
    img: 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=900&q=80',
    category: 'CHEF SIGNATURE',
    desc: 'Rosemary-glazed lamb chops with seasonal vegetables and a rich, velvety jus.'
  },
  {
    num: '02',
    title: 'Lobster Bites',
    price: '$27.98',
    img: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?auto=format&fit=crop&w=900&q=80',
    category: 'SEAFOOD SPECIAL',
    desc: 'Wild-caught lobster seared in garlic herb butter with a bright lemon finish.'
  },
  {
    num: '03',
    title: 'Seared Steak Bites',
    price: '$21.98',
    img: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80',
    category: 'GUEST FAVORITE',
    desc: 'Prime steak bites sautéed with peppers, onions, and mushrooms for deep savory flavor.'
  }
];

export default function KitchenSection({ visible, onReserveDining, onOpenMenu, onOpenOrder }) {
  const pathname = usePathname();
  const sectionRef = useRef(null);
  const dishCardRef = useRef(null);
  const scrollTriggerRef = useRef(null);

  const [activeDish, setActiveDish] = useState(0);
  const currentIndexRef = useRef(0);

  const changeDish = useCallback((idx) => {
    if (idx === currentIndexRef.current) return;

    const direction = idx > currentIndexRef.current ? 1 : -1;
    currentIndexRef.current = idx;
    setActiveDish(idx);

    if (dishCardRef.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.killTweensOf(dishCardRef.current);
      gsap.fromTo(
        dishCardRef.current,
        { y: direction * 30, scale: 0.975, opacity: 0.82 },
        { y: 0, scale: 1, opacity: 1, duration: 0.48, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }
  }, []);

  // On-scroll Dish Change using GSAP ScrollTrigger
  useLayoutEffect(() => {
    if (pathname !== '/' || !sectionRef.current) return;

    let mediaMatcher;
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // The dish card is primary content, so it must be visible immediately.
      // Only its selected dish changes while the pinned section is scrolled.
      gsap.set('.home-dish-visual', { y: 0, scale: 1, autoAlpha: 1 });

      if (!reduceMotion) {
        const copyItems = [
          '.home-dish-copy .section-eyebrow',
          '.home-dish-copy .home-section-heading',
          '.home-dish-lead',
          '.home-dish-selector',
          '.home-dish-benefits li',
          '.home-dish-actions'
        ];

        gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 82%',
            once: true
          }
        })
          .fromTo(
            copyItems,
            { y: 30, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.68,
              stagger: 0.09,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility'
            }
          );
      }

      mediaMatcher = gsap.matchMedia();

      mediaMatcher.add("(min-width: 900px)", () => {
        const st = ScrollTrigger.create({
          id: "preva-home-kitchen-showcase",
          trigger: sectionRef.current,
          start: "top 75px",
          end: "+=1400",
          pin: true,
          pinSpacing: true,
          scrub: 0.5,
          onUpdate: (self) => {
            const raw = self.progress * DISHES.length;
            const idx = Math.min(DISHES.length - 1, Math.max(0, Math.floor(raw)));
            if (idx !== currentIndexRef.current) {
              changeDish(idx);
            }
          }
        });

        scrollTriggerRef.current = st;

        const refreshTimer = setTimeout(() => {
          ScrollTrigger.refresh();
        }, 150);

        return () => {
          clearTimeout(refreshTimer);
          if (st) {
            try { st.kill(true); } catch (e) {}
          }
        };
      });
    }, sectionRef);

    return () => {
      if (scrollTriggerRef.current) {
        try { scrollTriggerRef.current.kill(true); } catch (e) {}
        scrollTriggerRef.current = null;
      }
      const activeTrigger = ScrollTrigger.getById("preva-home-kitchen-showcase");
      if (activeTrigger) {
        try { activeTrigger.kill(true); } catch (e) {}
      }
      if (mediaMatcher) {
        try { mediaMatcher.revert(); } catch (e) {}
      }
      try { ctx.revert(); } catch (e) {}
      if (sectionRef.current) {
        try {
          gsap.set(sectionRef.current, { clearProps: "all" });
        } catch (e) {}
      }
    };
  }, [pathname, changeDish]);

  // This pinned, interactive showcase belongs exclusively to the homepage.
  // The explicit route guard is a second line of defence if a client-side
  // transition ever keeps the component alive for an extra render.
  if (pathname !== '/' || visible === false) return null;

  const currentDish = DISHES[activeDish];

  return (
    <section
      ref={sectionRef}
      id="showcase"
      className="split-section lunch-premium-split home-dish-showcase"
      style={{
        background: '#050505',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        position: 'relative',
        minHeight: 'calc(100vh - 85px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 0',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="split-container home-dish-layout"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 'clamp(32px, 4.5vw, 60px)',
          maxWidth: '1380px',
          width: '100%',
          margin: '0 auto',
          padding: '0 var(--site-gutter, 32px)',
          boxSizing: 'border-box'
        }}
      >
        {/* LEFT COLUMN: About Preva Kitchen Story */}
        <div
          className="split-content-col home-dish-copy-col"
          style={{
            flex: '1.25 1 580px',
            maxWidth: '680px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            position: 'relative'
          }}
        >
          <div className="split-inner-content home-dish-copy" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
            <span
              className="section-eyebrow"
              style={{
                color: 'var(--accent-gold, #c5a059)',
                display: 'block',
                marginBottom: '12px',
                letterSpacing: '3px',
                fontSize: '0.8rem',
                fontWeight: 800,
                textTransform: 'uppercase'
              }}
            >
              PREVA KITCHEN
            </span>

            <h2
              className="home-section-heading"
              style={{
                marginBottom: '18px',
                lineHeight: 1.12,
                color: '#fff',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}
            >
              One Dish That Tells <br />
              <span className="text-gold" style={{ color: '#c5a059' }}>the Preva Kitchen Story</span>
            </h2>

            <p className="home-dish-lead" style={{ fontSize: '1.05rem', lineHeight: 1.75, color: '#aaa', margin: '0 0 18px 0', maxWidth: '640px' }}>
              Discover the signature daytime dining experience at Preva Kitchen: chef-driven plates, warm hospitality, and a refined atmosphere built for every moment from business lunches to celebration dinners.
            </p>

            {/* Clickable Dish Selector Pills */}
            <div className="home-dish-selector" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '0 0 20px 0' }}>
              {DISHES.map((dish, idx) => (
                <button
                  key={dish.num}
                  type="button"
                  onClick={() => {
                    changeDish(idx);
                    if (scrollTriggerRef.current) {
                      const st = scrollTriggerRef.current;
                      const targetScroll = st.start + ((idx + 0.3) / DISHES.length) * (st.end - st.start);
                      if (typeof window !== 'undefined') {
                        if (window.lenis) {
                          window.lenis.scrollTo(targetScroll, { duration: 0.7 });
                        } else {
                          window.scrollTo({ top: targetScroll, behavior: 'smooth' });
                        }
                      }
                    }
                  }}
                  style={{
                    background: activeDish === idx ? 'rgba(201, 168, 76, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    border: activeDish === idx ? '1.5px solid #C9A84C' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: activeDish === idx ? '#C9A84C' : '#999',
                    padding: '7px 16px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.5px',
                    transition: 'all 0.25s ease'
                  }}
                >
                  {dish.num} {dish.title}
                </button>
              ))}
            </div>

            <ul className="home-dish-benefits" style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', color: '#ccc', lineHeight: 1.75, fontSize: '0.94rem', maxWidth: '640px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ color: '#c5a059', fontWeight: '800' }}>✦</span> Locally inspired flavors with a luxury finish
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ color: '#c5a059', fontWeight: '800' }}>✦</span> Comfortable dine-in service for everyday meals and celebrations
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: '#c5a059', fontWeight: '800' }}>✦</span> Easy pickup, delivery and group-order options from one kitchen
              </li>
            </ul>

            {/* CTA Buttons - ALL 3 IN 1 SINGLE ROW */}
            <div
              className="res-cta-group home-dish-actions"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                width: '100%',
                maxWidth: '600px',
                marginTop: '16px'
              }}
            >
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onReserveDining) onReserveDining();
                  else if (typeof window !== 'undefined' && window.openDiningModal) window.openDiningModal();
                }}
                className="hero-btn-reserve"
                style={{
                  flex: '1 1 0px',
                  minWidth: 0,
                  height: '48px',
                  padding: '0 8px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '999px'
                }}
              >
                RESERVE A TABLE
              </a>

              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenMenu) onOpenMenu();
                  else if (typeof window !== 'undefined' && window.openMenuModal) window.openMenuModal();
                }}
                className="hero-btn-menus"
                style={{
                  flex: '1 1 0px',
                  minWidth: 0,
                  height: '48px',
                  padding: '0 8px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '999px'
                }}
              >
                VIEW THE MENU
              </a>

              <a
                href="#preva-order"
                onClick={(e) => {
                  e.preventDefault();
                  if (onOpenOrder) onOpenOrder();
                  else if (typeof window !== 'undefined' && window.openOrderModal) window.openOrderModal();
                }}
                className="hero-btn-menus"
                style={{
                  flex: '1 1 0px',
                  minWidth: 0,
                  height: '48px',
                  padding: '0 8px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '999px'
                }}
              >
                ORDER ONLINE
              </a>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: GSAP Pinned Dish Showcase Card */}
        <div
          className="split-image-col home-dish-visual"
          style={{
            flex: '1 1 520px',
            maxWidth: '580px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0'
          }}
        >
          <div
            ref={dishCardRef}
            className="dish-scroll-card-spot home-dish-card"
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: '26px',
              overflow: 'hidden',
              background: 'radial-gradient(ellipse at top, rgba(201, 168, 76, 0.14) 0%, rgba(15, 12, 22, 0.96) 100%)',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              boxShadow: '0 30px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(201, 168, 76, 0.15)'
            }}
          >
            {/* Image Container with Cross-Fade */}
            <div className="home-dish-media" style={{ position: 'relative', width: '100%', height: '380px', overflow: 'hidden', background: '#0a0812' }}>
              
              {/* Category Tag */}
              <span
                className="home-dish-category"
                style={{
                  position: 'absolute',
                  top: '18px',
                  left: '18px',
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid #c5a059',
                  color: '#c5a059',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '1.5px',
                  zIndex: 4,
                  backdropFilter: 'blur(8px)'
                }}
              >
                {currentDish.category}
              </span>

              {/* Price Badge */}
              <span
                className="home-dish-price"
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'linear-gradient(135deg, #F0D080 0%, #C9A84C 100%)',
                  color: '#000',
                  fontWeight: '900',
                  fontSize: '1.1rem',
                  padding: '6px 18px',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(201, 168, 76, 0.4)',
                  zIndex: 4
                }}
              >
                {currentDish.price}
              </span>

              {/* Cross-fading Dish Images (100% Contained & Uncropped) */}
              {DISHES.map((d, idx) => (
                <div
                  key={d.num}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: activeDish === idx ? 1 : 0,
                    transform: activeDish === idx
                      ? 'translateY(0) scale(1)'
                      : `translateY(${idx < activeDish ? '-34px' : '34px'}) scale(0.985)`,
                    transition: 'opacity 0.45s ease-out, transform 0.48s cubic-bezier(0.22, 1, 0.36, 1)',
                    overflow: 'hidden'
                  }}
                >
                  {/* Ambient blurred backdrop so there are never harsh letterbox bars */}
                  <img
                    src={d.img}
                    alt=""
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: '-20px',
                      width: 'calc(100% + 40px)',
                      height: 'calc(100% + 40px)',
                      objectFit: 'cover',
                      filter: 'blur(22px) brightness(0.4)',
                      transform: 'scale(1.15)',
                      pointerEvents: 'none'
                    }}
                  />
                  {/* Crisp, 100% contained food image without any cut off */}
                  <img
                    src={d.img}
                    alt={d.title}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      zIndex: 1
                    }}
                  />
                </div>
              ))}

              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,12,22,0.9) 0%, transparent 40%)', pointerEvents: 'none', zIndex: 2 }} />
            </div>

            {/* Dish Info Details Container */}
            <div className="home-dish-details" style={{ padding: '20px 26px 22px', position: 'relative', zIndex: 3 }}>
              <h3 className="home-dish-title" style={{ fontSize: '1.7rem', color: '#fff', margin: '0 0 8px', fontWeight: 700, lineHeight: 1.12 }}>
                {currentDish.title}
              </h3>
              <p className="home-dish-description" style={{ color: 'rgba(255, 255, 255, 0.78)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
                {currentDish.desc}
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
