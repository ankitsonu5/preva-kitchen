import Stripe from 'stripe';

/**
 * Stripe, in one place.
 *
 * The key itself tells us which mode we are in — `sk_test_…` versus `sk_live_…`
 * — so nothing has to be configured twice. Going live is swapping two
 * environment variables and nothing else.
 */

// Pinned on purpose. Stripe ships breaking changes behind version dates, and a
// silent upgrade in production is not something anyone wants to debug.
const API_VERSION = '2024-12-18.acacia';

let cached = null;

export function stripeKey() {
  return String(process.env.STRIPE_SECRET_KEY || '').trim();
}

export function stripeConfigured() {
  // Standard (sk_*) and restricted (rk_*) secret keys are both supported.
  // Stripe itself remains the authority on permissions for each API action.
  return stripeKey().length > 0;
}

export function stripeMode() {
  const key = stripeKey();
  if (key.includes('_live_')) return 'live';
  if (key.includes('_test_')) return 'test';
  if (key) return 'configured';
  return 'off';
}

export function stripe() {
  if (!stripeConfigured()) {
    throw new Error('STRIPE_SECRET_KEY is not set.');
  }
  if (!cached) {
    cached = new Stripe(stripeKey(), { apiVersion: API_VERSION });
  }
  return cached;
}

export function webhookSecret() {
  return String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
}

/** Canonical public storefront origin used for Stripe success/cancel URLs. */
export function storefrontUrl() {
  const configured = String(
    process.env.NEXT_PUBLIC_SITE_URL || String(process.env.FRONTEND_ORIGIN || '').split(',')[0] || ''
  ).trim();
  const raw = configured || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

  if (!raw) throw new Error('NEXT_PUBLIC_SITE_URL is required for production checkout.');

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a valid absolute URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use http or https.');
  }

  const localHost = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
  if (process.env.NODE_ENV === 'production' && (parsed.protocol !== 'https:' || localHost)) {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a public HTTPS URL in production.');
  }

  return parsed.origin;
}

/**
 * Whether it is acceptable to skip the card entirely and mark orders paid.
 *
 * Only ever true outside production. Deploying with NODE_ENV=production and no
 * Stripe key gives you a shop that refuses checkout, which is the correct
 * failure — far better than one that quietly hands out free food.
 */
export function allowUnpaidTestOrders() {
  return (
    !stripeConfigured() &&
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_UNPAID_TEST_ORDERS === 'true'
  );
}

/**
 * A short human summary used by the admin and the health endpoint, so an
 * operator can tell at a glance whether payments are actually armed.
 */
export function paymentStatusSummary() {
  const mode = stripeMode();
  if (mode === 'off') {
    const bypass = allowUnpaidTestOrders();
    return {
      mode,
      ready: false,
      webhookReady: false,
      message:
        bypass
          ? 'No Stripe key. Explicit no-card test mode is enabled for local order-flow testing.'
          : 'Payments are switched off. Set STRIPE_SECRET_KEY in backend/.env.'
    };
  }

  const hasWebhook = webhookSecret().startsWith('whsec_');
  return {
    mode,
    ready: hasWebhook,
    webhookReady: hasWebhook,
    message: hasWebhook
      ? `Stripe ${mode} mode and the webhook signing secret are configured.`
      : `Stripe is in ${mode} mode but STRIPE_WEBHOOK_SECRET is missing; checkout is disabled.`
  };
}
