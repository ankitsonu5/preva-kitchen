"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SvgIcon from '@/components/SvgIcon';

const DEFAULT_CONTENT = {
  eyebrow: 'ORDER ONLINE',
  title: 'Preva Kitchen, Ready When You Are',
  description: 'Choose pickup or delivery and enjoy Preva Kitchen wherever the day takes you. Browse the direct menu or select your preferred ordering platform.',
  primaryLabel: 'Choose Order Option',
  secondaryLabel: 'View Online Menu',
  image: '/asset/hero/preva-pasta-hero.jpg'
};

const DEFAULT_SETTINGS = {
  orderingEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: true,
  pickupMinutes: 25,
  deliveryMinutes: 45,
  closedMessage: 'Online ordering is closed right now.'
};

export default function OrderOnlineSection({ visible = true, content = {} }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const copy = { ...DEFAULT_CONTENT, ...(content || {}) };

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/shop/settings', { cache: 'no-store', signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setSettings((current) => ({ ...current, ...data })))
      .catch((error) => {
        if (error.name !== 'AbortError') console.error('Could not load ordering settings:', error);
      });
    return () => controller.abort();
  }, []);

  if (visible === false) return null;

  const openOrderingOptions = () => {
    if (typeof window !== 'undefined' && window.openOrderModal) {
      window.openOrderModal();
      return;
    }
    window.location.assign('/menu');
  };

  return (
    <section id="preva-order" className="home-order-section" aria-labelledby="home-order-title">
      <div className="container">
        <div className="home-order-grid">
          <div className="home-order-media">
            <img src={copy.image} alt="Preva Kitchen Rasta Pasta dish" />
            <div className="home-order-media-shade" aria-hidden="true" />
            <span className="home-order-status"><i /> Pickup &amp; Delivery</span>
            <div className="home-order-media-copy">
              <span>PREVA KITCHEN</span>
              <strong>Chef-driven flavor.<br />Ordered your way.</strong>
            </div>
          </div>

          <div className="home-order-copy">
            <span className="home-order-eyebrow">{copy.eyebrow}</span>
            <h2 id="home-order-title" className="home-section-heading">{copy.title}</h2>
            <p>{copy.description}</p>

            <div className="home-order-services" aria-label="Available ordering methods">
              {settings.pickupEnabled && (
                <div className="home-order-service">
                  <span><SvgIcon name="clock" size={20} /></span>
                  <div><strong>Pickup</strong><small>Ready in about {settings.pickupMinutes} minutes</small></div>
                </div>
              )}
              {settings.deliveryEnabled && (
                <div className="home-order-service">
                  <span><SvgIcon name="location" size={20} /></span>
                  <div><strong>Delivery</strong><small>Estimated {settings.deliveryMinutes} minutes</small></div>
                </div>
              )}
            </div>

            {!settings.orderingEnabled && <p className="home-order-closed">{settings.closedMessage}</p>}

            <div className="home-order-actions">
              <button
                type="button"
                className="home-order-primary"
                onClick={openOrderingOptions}
                aria-haspopup="dialog"
                aria-controls="prevaOrderModal"
              >
                {copy.primaryLabel} <SvgIcon name="arrow-right" size={17} />
              </button>
              <Link className="home-order-secondary" href="/menu">
                {copy.secondaryLabel}
              </Link>
            </div>

            <span className="home-order-note"><SvgIcon name="check" size={15} /> Platforms and availability are managed from the admin panel.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
