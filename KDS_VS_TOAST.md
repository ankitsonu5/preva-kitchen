# Preva Kitchen KDS vs Toast KDS

A focused comparison of the Kitchen Display System specifically -- not the
full Toast business suite (that is covered separately in
`SYSTEM_STATUS_VS_TOAST.md`). Every Preva Kitchen line below was verified by
reading the actual code.

---

## How Toast's KDS works

Toast is an all-in-one restaurant platform (POS + KDS + online ordering +
payments). Its kitchen display piece works like this:

**Order sources.** An order can come from a POS terminal, Toast's own online
ordering widget, a self-order kiosk, or a pulled-in third-party order
(DoorDash/UberEats). Every source normalizes into one common order object so
the kitchen never has to think about where an order came from.

**Station routing.** Each line item routes automatically to its station's
screen or printer (Grill, Fry, Salad). The Expo screen is the last stage,
where every station's work comes back together into one ticket before it
goes out.

**Course firing.** A multi-course order (appetizer, then entree) holds the
later course until staff fires it, so the kitchen doesn't get slammed with
every course at once.

**Hardware model.** Toast KDS runs on dedicated, offline-first Android
terminals. If the restaurant's internet drops, the POS and KDS keep working
locally and sync once the connection returns.

---

## What Preva Kitchen's KDS has built

**Shared engine, two entry points.** `/kitchen` (standalone terminal) and
`/admin/kds` (inside the admin panel) both run on one shared hook/component
and one backend workflow service, so their rules can never drift apart.

- Validated order-status state machine with per-stage timestamps (estimated
  vs actual): `PENDING -> PAID/RECEIVED -> PREPARING -> READY -> (ON_THE_WAY
  for delivery) -> DELIVERED/COMPLETED`, with `CANCELLED` from any stage.
- Item-level prep checklist, persisted server-side, synced across every
  open terminal.
- Station / cook assignment with audit history (who, when).
- Structured cancellation reasons (dropdown, saved on the order).
- Recall/restore for a completed ticket, checklist state preserved.
- Scheduled order hold/fire -- a future order stays out of the active queue
  until its firing window, or a cook can pull it early.
- Capacity-aware prep-time estimates (more items on an order adds buffer
  time automatically).
- Emergency ordering pause and per-item sold-out ("86").
- SLA tracking -- per-stage warning/breach thresholds with ticket-age color
  coding.
- Auto-print -- opt-in per terminal, serially queued, triggers an 80mm
  receipt print on every new ticket.
- Real-time updates -- polling (3.5s) plus an SSE accelerant on top; if SSE
  can't connect, polling keeps working unchanged.
- Offline resilience for outgoing actions -- status/item changes queue
  locally and auto-flush on reconnect.
- Security -- rate-limited kitchen login, no hardcoded fallback credentials,
  production refuses to boot without real secrets configured.
- Test coverage -- 27 backend integration tests, 16 frontend hook unit
  tests, all passing.
- Dish-level inventory -- per-item stock counter with atomic, race-safe
  decrement on order RECEIVED, automatic restore on cancel/refund, and
  auto-86 at zero stock.
- Driver assignment -- a delivery ticket can be assigned a driver name and
  phone number (manual entry), with a full audit trail.

---

## Side-by-side

| Capability | Toast | Preva Kitchen |
|---|---|---|
| Order state machine | Yes | Yes |
| Item checklist / prep tracking | Yes | Yes |
| Station routing | Yes (auto, printer-per-station) | Yes (manual assign) |
| SLA / ticket-age alerts | Yes | Yes |
| Auto-print to kitchen printer | Yes (dedicated printer per station) | Yes (single printer, browser print) |
| Course firing / pacing | Yes | No |
| Offline-first hardware | Yes (dedicated terminals) | Partial (browser-based, outgoing actions only) |
| Scheduled / hold-fire orders | Not a core feature | Yes |
| Capacity-aware prep time | Not a core feature | Yes |
| Cancellation reason tracking | Varies | Yes |
| Recall / restore completed ticket | Varies | Yes |
| Integrated payment terminal | Yes (hardware) | Card via Stripe (no dedicated hardware) |
| Driver location / GPS tracking | No (separate delivery apps handle this) | No (name/phone only, see note below) |
| Labor, loyalty, inventory | Yes (separate modules) | Not part of KDS scope |

---

## Where the gaps are

**Course-based firing.** No mechanism today to hold a later course until an
earlier one is served -- every line on an order reaches the kitchen at once.
Matters for full-service, multi-course dine-in; not needed for
counter/pickup-style service.

**True offline-first for incoming orders.** The offline handling that
exists only covers *outgoing* actions (status/item changes queued locally).
A brand-new incoming order still needs a live connection to reach the KDS
at all -- an extended outage means missed tickets, not just delayed ones.

**ESC/POS raw thermal printing.** Auto-print triggers the browser's print
flow to whatever printer is set up on the kitchen PC (USB-attached, per the
current setup) rather than speaking the raw ESC/POS protocol to a
network/serial printer directly. Fine for one PC with one attached printer;
would need real driver-level work for multiple dedicated station printers.

**Driver / delivery tracking.** A ticket can be assigned a driver name and
phone manually, and stays visible through "on the way." There is no GPS,
live map, driver app, or real-location ETA -- this is a bigger, separate
scope than the KDS itself and remains explicitly out of scope for now.

---

## Bottom line

At the level of kitchen workflow logic -- the actual job a KDS does --
Preva Kitchen's build is close to feature-parity with Toast's KDS, and adds
two things Toast doesn't treat as core (scheduled hold/fire, capacity-aware
prep time). The real gaps are course-based pacing for full-service dining,
true offline-first behavior for incoming orders, and multi-station raw
thermal printing -- all solvable in software, without new hardware, if and
when they become priorities.
