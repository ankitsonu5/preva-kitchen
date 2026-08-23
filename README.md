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

Open http://localhost:3000. With no Stripe keys and no Mongo, the backend uses
an in-memory demo store and orders are marked paid without a card (dev only).

Admin: http://localhost:3000/admin — default dev login
`admin@prevaclub.com` / `Preva#Redford2026` (in-memory store only; create real
admins with `npm run first-admin` in backend once Mongo is connected).

## CORS

The backend allows credentialed requests only from `FRONTEND_ORIGIN`
(comma-separated list). In normal use the browser never crosses origins at
all, because the frontend proxies `/api/*` to the backend — CORS matters for
direct API consumers (mobile apps, other services).

## Stripe

- Checkout redirect flow; cards never touch these servers.
- Point the Stripe webhook at the **backend** directly:
  `https://YOUR-BACKEND/api/shop/webhook` (not the frontend proxy — signature
  verification needs the raw bytes).
- Local testing: `stripe listen --forward-to localhost:4000/api/shop/webhook`.

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
