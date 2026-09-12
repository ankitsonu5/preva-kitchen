'use client';

import Script from 'next/script';

/**
 * Google Analytics 4 — client component so it only loads in the browser.
 *
 * Set NEXT_PUBLIC_GA_MEASUREMENT_ID in .env.local to enable.
 * Example: NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 *
 * When the key is absent the component renders nothing — safe in development.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function GoogleAnalytics() {
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Tracking helpers — import and call these anywhere in the app.
   All functions guard against window.gtag being undefined (SSR / blocked).
   ══════════════════════════════════════════════════════════════════════════ */

function safeGtag(...args) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
}

/**
 * Track a custom event.
 * @param {string} eventName  - GA4 event name (snake_case)
 * @param {object} params     - event parameters
 */
export function trackEvent(eventName, params = {}) {
  safeGtag('event', eventName, params);
}

/**
 * Ecommerce: item added to cart.
 * Call when customer clicks "Add to Cart".
 */
export function trackAddToCart({ id, name, price, category, quantity = 1 }) {
  safeGtag('event', 'add_to_cart', {
    currency: 'USD',
    value: price * quantity,
    items: [{ item_id: id, item_name: name, price, item_category: category, quantity }],
  });
}

/**
 * Ecommerce: customer reaches checkout page.
 * Call once when the checkout form first loads.
 */
export function trackBeginCheckout({ items = [], totalCents = 0 }) {
  safeGtag('event', 'begin_checkout', {
    currency: 'USD',
    value: totalCents / 100,
    items: items.map(i => ({
      item_id: i.id || i.itemId,
      item_name: i.name,
      price: (i.unitCents || 0) / 100,
      quantity: i.qty || 1,
    })),
  });
}

/**
 * Ecommerce: purchase confirmed (call on order confirmation page after payment).
 */
export function trackPurchase({ orderNumber, totalCents = 0, items = [], fulfilment = 'PICKUP' }) {
  safeGtag('event', 'purchase', {
    transaction_id: String(orderNumber),
    currency: 'USD',
    value: totalCents / 100,
    shipping: 0,
    tax: 0,
    items: items.map(i => ({
      item_id: i.id || i.itemId,
      item_name: i.name,
      price: (i.unitCents || 0) / 100,
      quantity: i.qty || 1,
    })),
    // Custom dimension — delivery vs pickup
    fulfilment_type: fulfilment,
  });
}

/**
 * Lead: reservation submitted.
 */
export function trackReservation() {
  safeGtag('event', 'generate_lead', {
    currency: 'USD',
    value: 0,
    lead_type: 'reservation',
  });
}

/**
 * Lead: contact form submitted.
 */
export function trackContactSubmit() {
  safeGtag('event', 'generate_lead', {
    currency: 'USD',
    value: 0,
    lead_type: 'contact',
  });
}

/**
 * Lead: career application submitted.
 */
export function trackCareerApplication() {
  safeGtag('event', 'generate_lead', {
    currency: 'USD',
    value: 0,
    lead_type: 'career_application',
  });
}
