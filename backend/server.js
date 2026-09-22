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
import jwt from 'jsonwebtoken';
import { dispatch } from './src/index.js';
import { currentUser, jwtSecret } from './src/lib/auth.js';
import { handleStripeWebhook } from './src/webhook.js';
import { stripeConfigured, stripeMode, storefrontUrl, webhookSecret } from './src/lib/stripe.js';
import { connectDatabase } from './src/lib/db.js';
import { kdsEvents } from './src/lib/events.js';

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

  const kitchenId = String(process.env.KITCHEN_ID || '').trim();
  const kitchenPassword = String(process.env.KITCHEN_PASSWORD || '').trim();
  if (!kitchenId || kitchenPassword.length < 12 || /replace[-_ ]?me|change[-_ ]?me|example|default/i.test(kitchenPassword)) {
    throw new Error('KITCHEN_ID and a unique KITCHEN_PASSWORD of at least 12 characters are required in production.');
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
   Supports local development (all localhost / 127.0.0.1 ports), production
   storefront domains, Vercel preview URLs, and any custom FRONTEND_ORIGIN.
   credentials: true is enabled for httpOnly admin and cart session cookies. */
const productionOrigins = [
  'https://prevakitchen.com',
  'https://www.prevakitchen.com',
  'https://preva-kitchen.vercel.app'
];

const configuredOrigins = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  ...productionOrigins,
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002'
]);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;

  // Allow all localhost and 127.0.0.1 ports in development
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  // Allow Preva Kitchen subdomains and Vercel deployments in production
  if (/^https:\/\/([a-z0-9-]+\.)*prevakitchen\.com$/i.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i.test(origin)) return true;

  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
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

/* ── KDS live-update stream ────────────────────────────────────────────────
   A push accelerant on top of the KDS board's existing poll, not a
   replacement for it. It carries no payload — a "change" event just tells
   an already-open screen to refetch immediately instead of waiting for its
   next poll tick. If this connection never opens (proxy strips SSE,
   browser support, network blip), the screen's normal poll timer keeps
   working exactly as it always has; nothing depends on this succeeding.

   This bypasses the shared dispatch() router because that router returns a
   single JSON body per request — it has no way to hold a response open and
   stream from it. Auth is re-derived here for the same reason: an
   EventSource can't send an Authorization header, so the kitchen-terminal
   token (normally a Bearer header) is accepted as a `token` query param
   here, mirroring the query fallback verifyKitchenAuth() already has. */
app.get('/api/shop/kitchen-events', async (req, res) => {
  const user = await currentUser(asFetchLikeRequest(req)).catch(() => null);
  let authorized = Boolean(user);
  if (!authorized) {
    const token = String(req.query?.token || '').replace(/^Bearer\s+/i, '').trim();
    if (token) {
      try {
        const payload = jwt.verify(token, jwtSecret());
        authorized = Boolean(payload && (payload.role === 'kitchen' || payload.role === 'admin'));
      } catch {
        authorized = false;
      }
    }
  }
  if (!authorized) return res.status(401).json({ message: 'Kitchen access required.' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no' // production nginx must not buffer this
  });
  res.write(': connected\n\n');

  const onChange = () => res.write('event: change\ndata: {}\n\n');
  kdsEvents.on('change', onChange);

  // Keeps intermediary proxies from timing out an idle connection, and lets
  // the client detect a dead connection instead of hanging forever.
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    kdsEvents.off('change', onChange);
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
  console.log(`[preva-backend] CORS allows: ${[...allowedOrigins].join(', ')}`);
});

export default app;
