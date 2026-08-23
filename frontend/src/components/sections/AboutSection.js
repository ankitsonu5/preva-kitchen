"use client";

import Link from 'next/link';

const FALLBACK_INTERIOR = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85';
const PLATE_IMAGE = 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=700&q=85';

export default function AboutSection({ eyebrow, title, description, image, visible }) {
  if (visible === false) return null;

  return (
    <section id="about" className="pk-about-section">
      <span className="pk-about-watermark" aria-hidden="true">PREVA</span>

      <div className="container pk-about-shell">
        <div className="pk-about-visual" aria-label="The Preva Kitchen dining experience">
          <div className="pk-about-main-photo">
            <img
              src={image || FALLBACK_INTERIOR}
              alt="The warm dining room at Preva Kitchen"
              loading="lazy"
              decoding="async"
            />
            <span className="pk-about-photo-label">Redford, Michigan</span>
          </div>

          <div className="pk-about-detail-photo">
            <img
              src={PLATE_IMAGE}
              alt="A freshly prepared Preva Kitchen plate"
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="pk-about-seal" aria-hidden="true">
            <span>PREVA</span>
            <small>KITCHEN</small>
          </div>
        </div>

        <div className="pk-about-copy">
          <span className="pk-about-eyebrow"><i aria-hidden="true" />{eyebrow || 'ABOUT PREVA KITCHEN'}</span>
          <h2 className="home-section-heading">{title || 'Food Worth Gathering Around'}</h2>
          <p className="pk-about-lead">Come hungry. Leave feeling like family.</p>
          <div className="pk-about-description" style={{ whiteSpace: 'pre-line' }}>
            {description || 'Preva Kitchen brings together familiar comfort, bold flavor and thoughtful presentation. Every plate is prepared with care in a welcoming space made for family dinners, date nights and celebrations.'}
          </div>

          <div className="pk-about-promises" aria-label="What makes Preva Kitchen special">
            <div><strong>01</strong><span>Bold flavor,<br />made fresh</span></div>
            <div><strong>02</strong><span>Warm, genuine<br />hospitality</span></div>
            <div><strong>03</strong><span>Dine in, pickup<br />or catering</span></div>
          </div>

          <div className="pk-about-actions">
            <Link href="/preva-kitchen-menu" className="pk-about-primary">Explore the menu <span aria-hidden="true">↗</span></Link>
            <a href="#prv-reservations" className="pk-about-secondary">Reserve a table <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
    </section>
  );
}
