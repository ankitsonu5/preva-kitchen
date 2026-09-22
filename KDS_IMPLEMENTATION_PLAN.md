# KDS implementation plan

This plan upgrades the current kitchen display system without changing existing
orders or exposing deployment secrets. Each phase has an independently testable
exit condition.

## Phase 1 — workflow correctness and security

- Use one order-state transition policy for the admin KDS and kitchen terminal.
- Keep delivery tickets visible through `ON_THE_WAY`.
- Send the same customer status notifications from both KDS entry points.
- Record estimated and actual kitchen timestamps separately.
- Rate-limit kitchen login attempts and remove production credential fallbacks.
- Document the required kitchen environment variables.
- Add integration coverage for pickup, delivery, invalid transitions, recall,
  authorization, and notification-triggering status changes.

Exit condition: both KDS entry points enforce the same state machine and the
backend test suite covers every terminal workflow.

## Phase 2 — shared, persistent preparation state

- Persist checked/finished line items on the order.
- Synchronize item state between kitchen devices and the admin KDS.
- Record who changed an item and when.
- Make recall/restore preserve the preparation checklist.

Exit condition: refreshing or opening another terminal shows the same item
completion state.

## Phase 3 — operational controls

- Add structured cancellation/rejection reasons.
- Add cook/station assignment and configurable station names.
- Add an emergency ordering pause and temporary sold-out controls.
- Add scheduled-order hold/fire behaviour and capacity-aware prep times.

Exit condition: a kitchen lead can control availability and route work without
leaving the KDS.

## Phase 4 — frontend consolidation and resilience

- Extract the duplicated `/kitchen` and `/admin/kds` ticket UI into shared
  components and hooks.
- Add explicit offline/reconnecting states and safe retry behaviour.
- Add frontend interaction tests for the shared workflow.
- Add KDS operational metrics (ticket age, stage duration, SLA breaches).

Exit condition: both entry points render the same tested workflow and recover
cleanly from temporary API failures.

## Phase 5 — optional infrastructure integrations

- Replace polling with SSE or WebSockets when the deployment supports durable
  connections.
- Add offline queueing if the target kitchen hardware/browser supports it.
- Add ESC/POS auto-printing after the printer model, connection type, paper
  width, and station routing are confirmed.
- Add driver assignment/location tracking only if delivery operations require
  it.

Exit condition: infrastructure-specific features are verified on the actual
kitchen network and hardware. These items cannot be safely completed from code
alone without deployment and device details.
