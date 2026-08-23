"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CulinarySection({ visible, onReserveDining }) {
  const sectionRef = useRef(null);
  const bgRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const ctaRef = useRef(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    // IntersectionObserver to trigger 1-by-1 staggered entrance on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          } else {
            // Re-trigger animation when scrolled out and back in
            entry.target.classList.remove('is-visible');
          }
        });
      },
      { threshold: 0.08, rootMargin: '0px 0px -20px 0px' }
    );

    if (cardsRef.current) observer.observe(cardsRef.current);
    if (headerRef.current) observer.observe(headerRef.current);
    if (ctaRef.current) observer.observe(ctaRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (visible === false) return null;

  const handleReserveClick = (e) => {
    e.preventDefault();
    if (onReserveDining) {
      onReserveDining();
    }
    const resTarget = document.getElementById('reservations') || document.getElementById('prv-reservations');
    if (resTarget) {
      resTarget.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="dining"
      className="section-padding culinary-section parallax-active"
      style={{
        position: 'relative',
        overflow: 'hidden',
        marginTop: 'clamp(24px, 3vw, 42px)',
        padding: '3.25rem 0',
        background: '#050505',
        borderTop: '1px solid rgba(197, 160, 89, 0.32)'
      }}
    >
      {/* Parallax Background Image */}
      <div
        ref={bgRef}
        className="culinary-bg-parallax"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=80')",
          position: 'absolute',
          top: '-8%',
          left: 0,
          width: '100%',
          height: '116%',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
          pointerEvents: 'none'
        }}
      />
      <div className="culinary-overlay-gradient" />
      <div className="culinary-overlay-vignette" />

      <div className="container relative-z2" style={{ position: 'relative', zIndex: 2 }}>
        {/* Section Header */}
        <div ref={headerRef} className="section-header text-center culinary-header-anim" style={{ marginBottom: '2rem' }}>
          <span className="section-eyebrow">CULINARY</span>
          <h2 className="home-section-heading" style={{ color: '#fff', margin: '0.5rem 0' }}>
            Culinary Excellence
          </h2>
          <div className="header-separator" style={{ margin: '0.9rem auto' }} />
          <p style={{ color: '#ddd', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
            A journey for the senses, crafted for the discerning palate.
          </p>
        </div>

        {/* 3 Glass Cards - 1-by-1 Staggered Entrance */}
        <div ref={cardsRef} className="menu-highlights">
          {/* Card 1: Lunch & Early Dining */}
          <div className="glass-card culinary-card-anim">
            <div className="card-icon-badge" />
            <h3>Lunch &amp; Early Dining</h3>
            <p>Relaxed daytime dining with full service starting at 11:00 AM.</p>
          </div>

          {/* Card 2: Dinner Service */}
          <div className="glass-card culinary-card-anim">
            <div className="card-icon-badge" />
            <h3>Dinner Service</h3>
            <p>Chef-driven dining designed to carry you into the evening.</p>
          </div>

          {/* Card 3: Weekly Specials */}
          <div className="glass-card culinary-card-anim">
            <div className="card-icon-badge" />
            <h3>Weekly Specials</h3>
            <p>Chef&apos;s tasting menus and vegan options curated for the discerning palate.</p>
          </div>
        </div>

        {/* Bottom CTA & Note */}
        <div ref={ctaRef} className="culinary-cta-anim">
          <div className="text-center" style={{ marginTop: '2rem' }}>
            <a
              href="#reservations"
              onClick={handleReserveClick}
              className="btn btn-outline-gold"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 32px',
                border: '1px solid #c5a059',
                color: '#c5a059',
                textDecoration: 'none',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontWeight: 700,
                fontSize: '0.85rem',
                borderRadius: '4px',
                background: 'rgba(197, 160, 89, 0.08)',
                transition: 'all 0.35s ease',
                boxShadow: '0 4px 15px rgba(197, 160, 89, 0.15)'
              }}
            >
              Reserve Dining
            </a>
          </div>
          <p
            className="dining-operational-note text-center"
            style={{
              marginTop: '0.8rem',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.82rem'
            }}
          >
            Reservations are recommended for dinner and larger groups. Walk-ins are always welcome when space allows.
          </p>
        </div>
      </div>

      {/* Dynamic 1-by-1 Staggered CSS Animation */}
      <style dangerouslySetInnerHTML={{ __html: `
        .culinary-section .menu-highlights {
          gap: 1.25rem;
        }

        .culinary-section .glass-card {
          min-height: 240px;
          padding: 1.8rem 1.6rem;
        }

        .culinary-section .card-icon-badge {
          width: 40px;
          height: 40px;
          margin-bottom: 1.15rem;
        }

        .culinary-section .glass-card h3 {
          margin-bottom: 0.8rem;
          font-size: 1.35rem;
          line-height: 1.12;
        }

        .culinary-section .glass-card p {
          margin: 0;
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .culinary-header-anim {
          opacity: 0;
          transform: translateY(35px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .culinary-header-anim.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .culinary-card-anim {
          opacity: 0;
          transform: translateY(60px) scale(0.93);
          transition: opacity 0.85s cubic-bezier(0.16, 1, 0.3, 1), transform 0.85s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.35s ease;
          will-change: opacity, transform;
        }

        /* 1-by-1 Staggered Animation Timing */
        .menu-highlights.is-visible .culinary-card-anim:nth-child(1) {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition-delay: 0.12s;
        }
        .menu-highlights.is-visible .culinary-card-anim:nth-child(2) {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition-delay: 0.38s;
        }
        .menu-highlights.is-visible .culinary-card-anim:nth-child(3) {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition-delay: 0.64s;
        }

        .culinary-cta-anim {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.8s;
        }
        .culinary-cta-anim.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .culinary-section .glass-card {
            min-height: 205px;
            padding: 1.55rem 1.25rem;
          }
        }
      `}} />
    </section>
  );
}
