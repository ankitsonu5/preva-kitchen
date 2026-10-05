# Preva Kitchen — current system status vs Toast

Snapshot as of 2026-09-29. This documents what exists in this codebase today,
what's partially built, and what's fully missing, module by module, measured
against Toast (POS + KDS + reporting + labor + delivery). Every line below
was verified by reading the actual code — not assumed from feature names.

Out of scope for comparison: Toast's "Financial products" tile (Toast
Capital loans, Toast Payroll advances). That is Toast selling financial
services to restaurants, not a restaurant-operations feature to replicate.

---

## ✅ Fully built

### Order-taking (POS equivalent)
- Dine-in order entry: [Take Order](frontend/src/app/(admin)/admin/kds/take-order/page.js) — staff enters a table order, it lands unpaid straight on the KDS.
- Online ordering: `/shop` checkout, Stripe payment.
- Order history/search/export (CSV/XLSX/PDF): [`admin/orders`](frontend/src/app/(admin)/admin/orders/page.js), [`exports.js`](backend/src/routes/exports.js).
- One shared state machine drives every entry point: [`order-workflow.js`](backend/src/lib/order-workflow.js).

### KDS (Kitchen Display System)
- Two entry points (`/kitchen` terminal, `/admin/kds`) share one hook/component so they can never drift: [`useKdsBoard.js`](frontend/src/lib/kds/useKdsBoard.js), [`KdsBoard.js`](frontend/src/components/kds/KdsBoard.js).
- Validated order-status state machine with per-stage timestamps (estimated vs actual): [`order-workflow.js:7-51`](backend/src/lib/order-workflow.js#L7-L51).
- Item-level prep checklist, persisted server-side, synced across terminals: [`order-workflow.js:112-136`](backend/src/lib/order-workflow.js#L112-L136).
- Station / cook assignment with audit history: [`order-workflow.js:138-157`](backend/src/lib/order-workflow.js#L138-L157).
- Structured cancellation reasons (dropdown, saved on the order).
- Recall/restore completed tickets, checklist state preserved.
- Scheduled order hold/fire (auto-promotes into the active queue inside a firing window, or a cook can fire early).
- Capacity-aware prep-time estimates (`pricing.js`).
- Emergency ordering pause (`orderingEnabled`) and per-item sold-out/86.
- SLA tracking — per-stage warning/breach thresholds, ticket-age color coding.
- Auto-print: opt-in per terminal, serially queued, triggers the existing 80mm browser-print receipt on every new ticket — added this session in [`useKdsBoard.js`](frontend/src/lib/kds/useKdsBoard.js).
- Real-time updates: polling (3.5s) + SSE accelerant on top ([`events.js`](backend/src/lib/events.js)); SSE failure silently falls back to polling.
- Offline resilience for *outgoing* actions: status/item changes queue in `localStorage` and auto-flush on reconnect.
- Security: kitchen login is rate-limited (Mongo-backed, 5 attempts/15 min), no hardcoded fallback password, production refuses to boot without real `KITCHEN_ID`/`KITCHEN_PASSWORD`/`JWT_SECRET`.
- Test coverage: 27 backend integration tests, 16 frontend hook unit tests — all passing.

### Menu management
- Full CRUD on items, prices, categories, availability: [`/admin/menus`](frontend/src/app/(admin)/admin/menus/page.js).

### Payments
- Stripe handles card processing and webhooks (`stripe.js`, `webhook.js`) — functionally replaces Toast's payment-terminal role, without the dedicated hardware.

### Refunds
- Full Stripe-integrated refund flow: partial/full amount, already-refunded guard, idempotency key, audit log: [`admin.js:1024`](backend/src/routes/admin.js#L1024). Feature-parity with Toast's "Refund check."

### Dish-level inventory
- Per-item stock counter with `trackInventory` toggle: [`inventory.js`](backend/src/lib/inventory.js).
- Atomic, race-safe decrement on order RECEIVED; automatic restore on cancel/refund; auto-86 at zero stock; idempotent reservation lifecycle (payment/webhook retries can't double-decrement).
- Manual stock editing in [KDS Settings](frontend/src/app/(admin)/admin/kds/settings/page.js#L57-L122), with a simple "≤3 left" low-stock indicator.

---

## ⚠️ Partially built

### Sales / financial reporting
**Have:** a CMS-style admin dashboard ([`admin.js:27-95`](backend/src/routes/admin.js#L27-L95)) with `revenue30d`, `orders30d`, KDS average-cook-time/late-ticket stats, and a raw order export (CSV/XLSX/PDF, date+status filtered).
**Missing:** net sales by item, day-over-day/period comparison, breakdown by fulfilment type or payment method, any discount-impact reporting.

### Inventory
**Have:** dish-level stock counts (see above).
**Missing:** ingredient-level stock, recipe/BOM linking a dish to the ingredients it consumes, automatic ingredient decrement, low-stock alerts/reorder points, vendor/purchase-order management, waste tracking, cost-of-goods (COGS) reporting.

### Driver / delivery tracking
**Have:**
- A delivery ticket can be assigned a driver **name + phone** (manual entry): `assignDriver` / `kdsDriver` field ([`order-workflow.js`](backend/src/lib/order-workflow.js), wired through both KDS entry points).
- Delivery tickets stay visible through `ON_THE_WAY` until marked `DELIVERED`.
- Customer-facing [`LiveOrderTracker.js`](frontend/src/components/shop/LiveOrderTracker.js) — a **status-stage progress bar** (Pending → Preparing → Ready → On the way → Delivered) that the customer can view/share via a link, with polling for live updates.

**Missing (this is the "driver part" in full):**
- No GPS/live-location tracking of the driver at all — the customer tracker shows order *status*, never a map or a moving position.
- No driver mobile app or driver-side interface — a driver has no way to update their own location or mark progress; only kitchen staff can change status from the KDS.
- No ETA calculation based on real location/traffic — delivery time estimates come only from the fixed `shopDeliveryMinutes` setting, not from where the driver actually is.
- No map view anywhere in the admin/KDS for dispatchers to see where drivers are.
- No geofencing/auto-status-change (e.g., auto-marking "Delivered" on arrival).
- No driver assignment logic beyond manual name/phone entry — no driver pool, availability, or auto-assignment by proximity.

This entire area was explicitly deferred earlier in this project's work — it remains fully out, documented here per request.

---

## ❌ Fully missing

### Labor management
Nothing found (`hourlyRate`, `wage`, `clockIn`, shift-tracking — no matches anywhere). The existing `users` collection ([`auth.js`](backend/src/lib/auth.js)) is CMS/admin login accounts (SUPER_ADMIN, ADMIN, EDITOR, KDS_MANAGER) — not hourly-staff HR records.
Missing: employee records (name, role, hourly rate, hire date) separate from CMS logins; clock-in/clock-out; labor cost % of net sales; shift scheduling.

### Discounts / promotions
Nothing in [`pricing.js`](backend/src/lib/pricing.js) beyond tax, delivery fee, tip, and capacity buffer. No discount codes, percentage/fixed-amount promos, or expiry/usage-limit logic anywhere.

### Gift cards / loyalty
No balance tracking, issuance, or redemption logic found anywhere in the codebase.

### KDS course-based firing
No mechanism to hold a later course (entrée) until an earlier one (appetizer) is served/fired — every line on an order is sent to the kitchen at once. Matters for full-service dine-in pacing; not needed for counter/pickup-style service.

### True offline-first (incoming orders)
The offline handling that exists only covers *outgoing* actions (status/item changes queue in `localStorage`). A brand-new incoming order still requires a live connection to reach the KDS at all — an extended outage means tickets are missed, not just delayed.

### ESC/POS raw thermal printing
Auto-print (added this session) triggers the browser's print flow to whatever printer is set up on the kitchen PC (USB-attached, per your setup) — it does not speak the raw ESC/POS protocol directly to network/serial printers. Sufficient for your current single-PC/USB-printer setup; would need real driver-level integration for multi-station dedicated printers.

---

## Summary table

| Module | Status |
|---|---|
| Order-taking / POS | ✅ Full |
| KDS | ✅ Full (course-firing + offline-incoming gaps noted above) |
| Menu management | ✅ Full |
| Payments | ✅ Full (Stripe) |
| Refunds | ✅ Full |
| Dish-level inventory | ✅ Full |
| Sales/financial reporting | ⚠️ Partial |
| Ingredient-level inventory | ⚠️ Partial (dish-level only) |
| Driver / delivery tracking | ⚠️ Partial (manual name/phone + status only — no GPS/map/ETA) |
| Labor management | ❌ Missing |
| Discounts / promotions | ❌ Missing |
| Gift cards / loyalty | ❌ Missing |
| Financial products (loans/payroll) | 🚫 Out of scope — not a restaurant-ops feature |

See [`TOAST_REPLACEMENT_PLAN.md`](TOAST_REPLACEMENT_PLAN.md) for the phased build-out of the gaps above (driver/GPS tracking is intentionally not phased there — add it as its own phase if/when it's back in scope).
