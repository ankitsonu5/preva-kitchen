# Preva Platform

Standard two-service layout: the frontend and backend are separate apps with
separate dependencies and separate environment files.

```
preva-platform/
├── backend/            Express API (port 4000)
│   ├── .env            ← backend secrets: Mongo, JWT, Stripe, CORS origins
│   ├── server.js       Express entry: CORS, cookies, Stripe webhook (raw body)
│   └── src/
│       ├── router.js   framework-agnostic route table
│       ├── routes/     public.js · shop.js · admin.js · exports.js
│       ├── lib/        db · auth · stripe · pricing · sanitize · activity
│       └── webhook.js  Stripe webhook handler
└── frontend/           Next.js site + admin UI (port 3000)
    ├── .env.local      ← frontend config: BACKEND_URL only
    ├── next.config.mjs /api/* rewrite → backend (cookies stay same-origin)
    └── src/            app router pages, components, styles
```

## Run locally

```bash
# terminal 1 — backend
cd backend && npm install && cp .env.example .env && npm run dev
# terminal 2 — frontend
cd frontend && npm install && cp .env.example .env.local && npm run dev
```

Open http://localhost:3000. The in-memory database fallback is development-only
and deliberately contains no default admin account. Create named accounts with
`npm run ensure-admin`; credentials are read from environment variables and
stored only as bcrypt hashes.

## CORS

The backend allows credentialed requests only from `FRONTEND_ORIGIN`
(comma-separated list). In normal use the browser never crosses origins at
all, because the frontend proxies `/api/*` to the backend — CORS matters for
direct API consumers (mobile apps, other services).

## Stripe

- Checkout redirect flow; cards never touch these servers.
- Point the live Stripe webhook at the **backend** route:
  `https://prevakitchen.com/api/stripe/webhook`. nginx must route this path
  directly to Express because signature verification needs the raw bytes.
- Local testing: `stripe listen --forward-to localhost:4000/api/shop/webhook`.
- Run `npm run audit:production` in `backend/` before every production deploy.

## Email Notifications

Every public form (Reservation, Contact, Career Application) saves to Mongo
**and** sends two emails via [Resend](https://resend.com): an admin alert to
`ADMIN_EMAIL`, and a branded confirmation to the address the visitor typed
in. Reservation and career notifications use dedicated reusable functions in
`backend/src/lib/email.js`. Both sends are attempted in parallel after the
database write. A provider failure is logged but does not turn an already
saved form submission into an API error. Every attempt (sent/failed/skipped)
is logged to the `emailLogs` Mongo collection and to the console.

### 1. Configure Resend

Create a Resend API key, verify `prevakitchen.com`, and add the DNS records
Resend supplies. The `FROM_EMAIL` domain must be verified before production
delivery will work. `onboarding@resend.dev` is suitable only for limited
Resend testing.

### 2. Set the backend environment variables

In `backend/.env` (see `backend/.env.example` for the full list with
comments):

```
RESEND_API_KEY=re_your_api_key
FROM_EMAIL=Preva Kitchen <notifications@prevakitchen.com>
ADMIN_EMAIL=reservations@prevakitchen.com
RESERVATION_ADMIN_EMAIL=reservations@prevakitchen.com
HR_EMAIL=hr@prevakitchen.com
ADMIN_URL=https://prevakitchen.com/admin
STOREFRONT_URL=https://prevakitchen.com
```

`RESERVATION_ADMIN_EMAIL` and `HR_EMAIL` are optional overrides; both fall
back to `ADMIN_EMAIL`. Comma-separated recipients are supported. Existing
`ADMIN_EMAILS`, `STAFF_ALERT_EMAIL`, and `STAFF_EMAIL_FROM` values remain
supported as deployment-compatible fallbacks.

### 3. Verify it works

`cd backend && npm run verify:email` checks the env vars and renders every
template without sending anything. Add `-- --send you@example.com` to send
one real test email through Resend and display its provider message ID.

### 4. Local testing without emailing real people

Set `MAIL_CATCH_ALL=you@yourinbox.com` in `backend/.env` (or `.env.local`).
Whenever `NODE_ENV` is not `production`, every email — admin alert **and**
customer confirmation — is redirected there instead of the real recipient,
with a `[email] dev mode: redirecting ...` console line showing the original
address. Submit each form once, confirm both emails land in that one inbox,
then check `emailLogs` in Mongo (or the console) for the send status and
Resend message id.

### Anti-spam / anti-abuse on these routes

- **Honeypot**: every form has a hidden `hp_field` input real visitors never
  see; a bot that fills it gets a fake 200/201 success with nothing saved and
  nothing emailed.
- **Rate limit**: 5 submissions per IP per 15 minutes, per form.
- **Idempotency**: an identical submission (same IP + fields) within 20s
  returns the first response again instead of inserting/emailing twice — this
  is what protects against double-clicking Submit or a client-side retry.

## Order exports

Admin → Orders → **Excel** / **PDF** buttons. Also directly:
`GET /api/admin/orders/export?format=xlsx|pdf&status=PAID&from=2026-07-01&to=2026-07-31`
(auth required; respects the same filters as the orders screen).

## Hero background video

The home hero plays a slow-motion nightclub video (0.5x) with an automatic
image-slideshow fallback if the video cannot load. To use your own footage,
add a `videoUrl` field to the `home_hero` section in Admin → Sections (any
direct .mp4 URL). The Preva Kitchen page hero works the same way with a
chef/kitchen clip. Both respect `prefers-reduced-motion`.
