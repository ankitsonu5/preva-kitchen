import dotenv from 'dotenv';

// Production must never inherit laptop-only test keys from .env.local.
// The deployment environment sets NODE_ENV before Node starts; local/dev keeps
// .env.local as the highest-priority override.
dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}
import express from 'express';
import cors from 'cors';
import { dispatch } from './src/index.js';
import { currentUser } from './src/lib/auth.js';
import { handleStripeWebhook } from './src/webhook.js';
import { stripeConfigured, stripeMode, storefrontUrl, webhookSecret } from './src/lib/stripe.js';
import { connectDatabase } from './src/lib/db.js';

/**
 * The Preva API server.
 *
 * The frontend (Next.js) and this backend are separate deployments with
 * separate .env files. Everything under /api is answered here; the frontend
 * either proxies to us (its next.config rewrite, so the browser stays
 * same-origin and cookies just work) or calls us cross-origin, which the CORS
 * block below permits for the configured frontend origin only.
 */

const app = express();
const PORT = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const jwtSecret = String(process.env.JWT_SECRET || '').trim();
  if (jwtSecret.length < 32 || /replace[-_ ]?me|change[-_ ]?me|example|default/i.test(jwtSecret)) {
    throw new Error('JWT_SECRET must be a unique non-placeholder value of at least 32 characters in production.');
  }

  const mongoUri = String(process.env.MONGODB_URI || process.env.DATABASE_URL || '').trim();
  if (!mongoUri) throw new Error('MONGODB_URI is required in production.');
  if (/mongodb(?:\+srv)?:\/\/(?:localhost|127\.0\.0\.1|\[?::1\]?)(?::|\/|$)/i.test(mongoUri)) {
    throw new Error('MONGODB_URI must not point to localhost in production.');
  }

  storefrontUrl();

  if (process.env.ALLOW_UNPAID_TEST_ORDERS === 'true') {
    throw new Error('ALLOW_UNPAID_TEST_ORDERS must be false in production.');
  }

  if (!stripeConfigured() || stripeMode() !== 'live') {
    throw new Error('A live STRIPE_SECRET_KEY is required in production.');
  }
  if (!webhookSecret().startsWith('whsec_')) {
    throw new Error('The live STRIPE_WEBHOOK_SECRET is required in production.');
  }
}

if (String(process.env.TRUST_PROXY || '').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

/* ── CORS ─────────────────────────────────────────────────────────────────
   Locked to the frontend's origin, with credentials on because the admin
   session is an httpOnly cookie. A wildcard origin cannot be combined with
   credentials — the browser rejects it — which is why this is a list, not
   '*'. Add extra origins (a staging site, a preview URL) comma-separated in
   FRONTEND_ORIGIN. */
const productionOrigins = ['https://prevakitchen.com', 'https://www.prevakitchen.com'];
const configuredOrigins = (
  process.env.FRONTEND_ORIGIN || (isProduction ? productionOrigins.join(',') : 'http://localhost:3000')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Keep the canonical storefronts in the tracked production allowlist as well
// as FRONTEND_ORIGIN. Environment files are intentionally gitignored, so a
// deployment that misses that variable must not break checkout on our domains.
const allowedOrigins = [
  ...new Set([
    ...configuredOrigins,
    ...productionOrigins
  ])
];

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin, curl, or server-to-server. Allow.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

/* ── Stripe webhook — BEFORE the JSON parser ──────────────────────────────
   Signature verification needs the raw bytes. express.json() would consume
   and re-serialise the body, changing the bytes and failing every check, so
   this route is mounted first with a raw parser of its own. */
app.post(
  ['/api/stripe/webhook', '/api/shop/webhook'],
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// Admin media uploads use base64 JSON. A 25 MB hero video expands by roughly
// one third, so 40 MB leaves safe envelope room while per-file checks below
// still enforce strict media limits.
app.use(express.json({ limit: '40mb' }));

/* ── tiny cookie parser ───────────────────────────────────────────────────
   The auth layer only ever reads one cookie, so a dependency-free parse is
   enough. */
function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

/* ── adapter: Express req → the request shape auth.js expects ─────────────
   currentUser() was written against the fetch Request API (headers.get,
   cookies.get(name).value). Rather than fork auth.js per framework, the
   Express request is wrapped to speak that dialect. */
function asFetchLikeRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return {
    headers: { get: (name) => req.headers[String(name).toLowerCase()] || null },
    cookies: { get: (name) => (cookies[name] === undefined ? undefined : { value: cookies[name] }) }
  };
}

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || '';
}

app.get('/api/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: true,
    service: 'preva-backend',
    environment: isProduction ? 'production' : 'development',
    time: new Date().toISOString()
  });
});

/* ── everything else goes through the shared router ───────────────────── */
app.all(/^\/api\/(.*)/, async (req, res, next) => {
  try {
    const path = '/' + req.params[0];
    const user = await currentUser(asFetchLikeRequest(req)).catch(() => null);

    const outcome = await dispatch({
      method: req.method,
      path,
      query: req.query,
      body: req.body && Object.keys(req.body).length ? req.body : null,
      user,
      request: req,
      ip: clientIp(req)
    });

    for (const cookie of outcome.cookies || []) {
      const options = { ...(cookie.options || {}) };
      // The router speaks in seconds (fetch-API convention); Express wants ms.
      if (typeof options.maxAge === 'number') options.maxAge = options.maxAge * 1000;
      res.cookie(cookie.name, cookie.value, options);
    }
    for (const [name, value] of Object.entries(outcome.headers || {})) {
      res.setHeader(name, value);
    }

    // Binary bodies (the PDF/Excel exports) pass through untouched.
    if (Buffer.isBuffer(outcome.body)) return res.status(outcome.status).send(outcome.body);
    return res.status(outcome.status).json(outcome.body ?? null);
  } catch (error) {
    return next(error);
  }
});

app.use((error, req, res, next) => {
  if (error?.message?.includes('CORS')) {
    return res.status(403).json({ message: error.message });
  }
  console.error('[server]', error);
  return res.status(500).json({ message: 'Something went wrong on our side.' });
});

// Production must never appear healthy while orders and Stripe event claims
// are unable to persist. Local development may still use the explicit
// in-memory fallback provided by db.js.
if (isProduction) await connectDatabase();

app.listen(PORT, () => {
  console.log(`[preva-backend] listening on http://localhost:${PORT}`);
  console.log(`[preva-backend] CORS allows: ${allowedOrigins.join(', ')}`);
});

export default app;
