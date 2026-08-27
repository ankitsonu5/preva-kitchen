import './env.js';
import { MongoClient } from 'mongodb';
import Stripe from 'stripe';

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

const checks = [];
const add = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
const isLocalHost = (hostname = '') => ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase());

function safeUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

const origins = String(process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const requiredOrigins = ['https://prevakitchen.com', 'https://www.prevakitchen.com'];
add('NODE_ENV', process.env.NODE_ENV === 'production', process.env.NODE_ENV || '<unset>');
add('CORS live origins', requiredOrigins.every((origin) => origins.includes(origin)), origins.join(', ') || '<unset>');
add('CORS has no localhost', origins.every((origin) => !isLocalHost(safeUrl(origin)?.hostname)), origins.join(', ') || '<unset>');

const siteUrl = safeUrl(String(process.env.NEXT_PUBLIC_SITE_URL || ''));
add(
  'Public site URL',
  siteUrl?.protocol === 'https:' && !isLocalHost(siteUrl.hostname),
  siteUrl?.origin || '<unset/invalid>'
);

const jwtSecret = String(process.env.JWT_SECRET || '').trim();
add(
  'JWT secret',
  jwtSecret.length >= 32 && !/replace[-_ ]?me|change[-_ ]?me|example|default/i.test(jwtSecret),
  jwtSecret ? 'set (redacted)' : '<unset>'
);
add(
  'Unpaid test orders disabled',
  process.env.ALLOW_UNPAID_TEST_ORDERS !== 'true',
  process.env.ALLOW_UNPAID_TEST_ORDERS || '<unset>'
);

const mongoUri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
let mongoHost = '<unset/invalid>';
let mongoIsLocal = false;
if (mongoUri) {
  const match = mongoUri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?(\[[^\]]+\]|[^:/?]+)/i);
  mongoHost = match?.[1]?.replace(/^\[|\]$/g, '') || '<invalid>';
  mongoIsLocal = isLocalHost(mongoHost);
}
add('MongoDB production URI', Boolean(mongoUri) && !mongoIsLocal, `${mongoHost}/${process.env.MONGODB_DB || '<default>'}`);

if (mongoUri && !mongoIsLocal) {
  try {
    const client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 12000 });
    await client.connect();
    await client.db(process.env.MONGODB_DB || undefined).command({ ping: 1 });
    await client.close();
    add('MongoDB connectivity', true, 'ping succeeded');
  } catch (error) {
    add('MongoDB connectivity', false, error.message);
  }
}

const stripeKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
const stripeMode = stripeKey.includes('_live_') ? 'live' : stripeKey.includes('_test_') ? 'test' : stripeKey ? 'unknown' : 'off';
add('Stripe secret mode', stripeMode === 'live', stripeMode);
add(
  'Stripe webhook secret',
  String(process.env.STRIPE_WEBHOOK_SECRET || '').startsWith('whsec_'),
  process.env.STRIPE_WEBHOOK_SECRET ? 'set (redacted)' : '<unset>'
);

if (stripeKey) {
  try {
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const expectedUrl = siteUrl ? `${siteUrl.origin}/api/stripe/webhook` : '';
    const endpoint = endpoints.data.find((item) => item.url === expectedUrl && item.status === 'enabled');
    const events = new Set(endpoint?.enabled_events || []);
    const coversEvents = endpoint && (events.has('*') || requiredWebhookEvents.every((event) => events.has(event)));
    add('Stripe webhook endpoint', Boolean(endpoint), expectedUrl || '<site URL unavailable>');
    add('Stripe webhook events', Boolean(coversEvents), coversEvents ? 'all required events enabled' : 'missing required events');
  } catch (error) {
    add('Stripe dashboard access', false, error.message);
  }
}

add(
  'Google Places API key',
  Boolean(String(process.env.GOOGLE_PLACES_API_KEY || '').trim()),
  process.env.GOOGLE_PLACES_API_KEY ? 'set (redacted)' : '<unset>'
);

for (const check of checks) {
  console.log(`${check.pass ? 'PASS' : 'FAIL'}  ${check.name}: ${check.detail}`);
}

const failures = checks.filter((check) => !check.pass);
console.log(`\n${checks.length - failures.length}/${checks.length} production checks passed.`);
if (failures.length) process.exitCode = 1;
