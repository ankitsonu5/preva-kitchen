# Toast replacement plan

This plan replaces Toast (POS, KDS, reporting, labor, discounts) with systems
built into this codebase, without disrupting live service. Each phase has an
independently testable exit condition and can run in parallel with Toast
until its own exit condition is met.

Already built and NOT part of this plan (confirmed in the current codebase):
- Order-taking: dine-in take-order, online ordering, admin order list.
- KDS: full kitchen display system (see `KDS_IMPLEMENTATION_PLAN.md`).
- Menu management (`/admin/menus`).
- Refunds: Stripe-integrated, audited, admin-triggered.
- Payment processing: Stripe (replaces Toast's payment terminal role).
- A basic revenue dashboard (30-day revenue, today's revenue/orders, average
  prep time).

Explicitly out of scope: Toast's "Financial products" tile (Toast Capital
loans, payroll advances). That is Toast selling financial services to
restaurants — it is not a restaurant-operations feature to replicate.

## Phase 1 — Sales & financial reporting

- Net sales by item (quantity + revenue, filterable by date range).
- Day-over-day / week-over-week comparison (matches Toast's "Today vs
  Yesterday" pattern).
- Breakdown by fulfilment type (pickup/delivery/dine-in) and by payment
  method.
- CSV/Excel export for accounting (extend the existing `exports.js` route).

Exit condition: an admin can pull the same sales breakdown Toast currently
shows, for any chosen date range, without opening Toast.

## Phase 2 — Labor management

- Staff records with hourly rate (separate from CMS/admin login accounts —
  a line cook does not need a content-management login).
- Clock-in / clock-out (time entry) per shift, from a kitchen or
  front-of-house terminal.
- Labor cost % of net sales, computed from clocked hours × rate against
  Phase 1's sales figures.
- Manager correction flow for missed/incorrect clock entries.

Exit condition: a manager can see labor cost against sales for a shift or
day, sourced entirely from this system.

## Phase 3 — Discounts, promotions & gift cards

- Discount codes: percentage or fixed amount, expiry date, usage limits,
  applied at checkout and dine-in payment.
- Gift card issuance and redemption, balance tracking.
- Discount/gift-card activity reflected in Phase 1 reporting.

Exit condition: a discount code and a gift card can each be applied to a
real order and show up correctly in sales reporting.

## Phase 4 — KDS course pacing & offline hardening

Closes the two gaps identified against Toast's KDS specifically:

- Course-based firing: hold a later course (e.g. entrée) until staff fires
  it, instead of sending every line to the kitchen at once — needed for
  full-service dine-in pacing.
- Offline-first hardening: today the KDS queues *outgoing* actions
  (status/item updates) during an outage, but a new *incoming* order still
  requires a live connection to appear. Add local caching/replay so a
  longer outage doesn't drop incoming tickets.

Exit condition: a multi-course dine-in order paces correctly, and a kitchen
terminal recovers all missed tickets after a simulated extended outage.

## Phase 5 — Parallel run & cutover

- Run this system and Toast side-by-side for an agreed trial window.
- Reconcile daily totals between the two systems until they match.
- Export/archive historical Toast data (sales history, employee records) for
  reference before cancelling the subscription.
- Staff training on the new terminals.

Exit condition: one full day of live service — order-taking, kitchen,
payments, labor, and closing reports — is handled entirely on this system
with no Toast fallback, and the numbers reconcile.
