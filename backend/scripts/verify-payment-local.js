import dotenv from 'dotenv';
import Stripe from 'stripe';
import { readFile } from 'node:fs/promises';
import { MongoClient } from 'mongodb';

dotenv.config({ path: '.env.local' });
dotenv.config();

const baseUrl = String(process.env.PAYMENT_VERIFY_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const key = String(process.env.STRIPE_SECRET_KEY || '').trim();
const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || '').trim();
const frontendEnv = dotenv.parse(await readFile('../frontend/.env.local', 'utf8').catch(() => ''));
const publishableKey = String(frontendEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').trim();
const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || '').trim();
const siteIsLocal = /localhost|127\.0\.0\.1|::1/i.test(siteUrl);
const secretMode = key.includes('_live_') ? 'live' : key.includes('_test_') ? 'test' : 'restricted';
const publishableMode = publishableKey.includes('_live_') ? 'live' : publishableKey.includes('_test_') ? 'test' : 'unset';

if (!key.startsWith('sk_') && !key.startsWith('rk_')) {
  throw new Error('STRIPE_SECRET_KEY is missing or invalid.');
}
if (!webhookSecret.startsWith('whsec_')) {
  throw new Error('STRIPE_WEBHOOK_SECRET is missing or invalid.');
}

const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
const account = await stripe.accounts.retrieve();
const requiredWebhookEvents = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'payment_intent.payment_failed',
  'charge.refunded',
  'refund.created',
  'refund.updated',
  'refund.failed'
];
const webhookEndpoints = await stripe.webhookEndpoints.list({ limit: 100 });
const configuredWebhook = webhookEndpoints.data.find((endpoint) => {
  const events = new Set(endpoint.enabled_events || []);
  return endpoint.status === 'enabled' &&
    (events.has('*') || requiredWebhookEvents.every((event) => events.has(event)));
});
const health = await fetch(`${baseUrl}/api/health`);
if (!health.ok) throw new Error(`Backend health check failed with HTTP ${health.status}.`);
const emptyQuote = await fetch(`${baseUrl}/api/shop/quote`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ lines: [] })
});

let mongoPersistent = false;
let mongoError = '';
const mongoUri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
if (mongoUri) {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    await mongo.db(process.env.MONGODB_DB || undefined).command({ ping: 1 });
    mongoPersistent = true;
  } catch (error) {
    mongoError = error?.name || 'MongoConnectionError';
  } finally {
    await mongo.close().catch(() => {});
  }
}

const payload = JSON.stringify({
  id: 'evt_preva_local_webhook_verification',
  object: 'event',
  type: 'preva.local_verification',
  livemode: key.includes('_live_'),
  created: Math.floor(Date.now() / 1000),
  data: { object: { id: 'local_verification' } }
});
const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });

const accepted = await fetch(`${baseUrl}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': signature },
  body: payload
});
const rejected = await fetch(`${baseUrl}/api/stripe/webhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=invalid' },
  body: '{}'
});

console.log(JSON.stringify({
  backendHealthy: health.ok,
  invalidCartRejected: emptyQuote.status === 400,
  invalidCartStatus: emptyQuote.status,
  stripeMode: secretMode,
  frontendPublishableMode: publishableMode,
  stripeModesMatch: publishableMode === 'unset' || secretMode === 'restricted' || secretMode === publishableMode,
  siteUrlMode: siteIsLocal ? 'local' : siteUrl ? 'public' : 'unset',
  mongoConfigured: Boolean(process.env.MONGODB_URI || process.env.DATABASE_URL),
  mongoPersistent,
  mongoError: mongoPersistent ? '' : mongoError,
  stripeAccountReady: Boolean(account.charges_enabled && account.details_submitted),
  payoutsEnabled: Boolean(account.payouts_enabled),
  stripeWebhookEndpointEnabled: Boolean(configuredWebhook),
  stripeWebhookEventsCovered: Boolean(configuredWebhook),
  signedWebhookAccepted: accepted.status === 200,
  signedWebhookStatus: accepted.status,
  invalidWebhookRejected: rejected.status === 400,
  invalidWebhookStatus: rejected.status
}, null, 2));

if (emptyQuote.status !== 400 || accepted.status !== 200 || rejected.status !== 400 || !configuredWebhook || !mongoPersistent) {
  process.exitCode = 1;
}
