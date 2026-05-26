# CF-W2-SPL-01B - Signal Position Ledger Active Positions Read Model Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: New narrowed child requirement draft. Not Ready for Implementation. Team 03 architecture prep next.

Parent: `CF-W2-SPL-01 - Signal Position Ledger`

Split source: `CF-W2-SPL-01A - Signal Position Ledger first slice`

## Product Goal

Define the smallest honest first implementation child for Signal Position Ledger: an active-only read model that shows system-triggered active signal positions from existing persisted/public evidence only.

This child should answer:

- which signal positions are currently active;
- what company/symbol each active position belongs to;
- when the entry trigger happened;
- at what source-proven entry trigger price;
- why the entry trigger was accepted;
- what the latest trusted price date is;
- what the current return percent is from entry to the latest trusted price when that basis is trustworthy;
- what lifecycle or health state is currently provable;
- what DQ/trust/evidence limitations still apply; and
- which strategy/rule/version provenance supports the row.

Closed history is explicitly deferred. This child must not claim to prove closed lifecycle truth.

## Bounded Slice

This child is intentionally narrow:

- one module-local active list only;
- optional row detail only if Team 03 proves it stays module-local and read-only;
- no closed tab;
- no lifecycle replay storage;
- no broker, quantity, cost-basis, realized P/L, or portfolio semantics;
- no Trade Plan target, reward/risk, or target-price framing;
- no startup/backfill/provider/live-data expansion.

## Required Row Fields

Each active row must show or explicitly mark unavailable:

- company name
- symbol
- region
- asset type
- entry trigger date or timestamp
- entry trigger price
- entry reason summary
- current trusted price date
- current return percent from entry to latest trusted price
- lifecycle or health state only where current persisted/public evidence can prove it
- DQ status
- trust/evidence status
- strategy identifier or code
- strategy version
- rule provenance where current public evidence supports it

## Truth Rules

An active row requires:

- source-proven entry trigger date or timestamp;
- source-proven entry trigger price;
- entry reason summary;
- strategy/rule/version provenance where current source exposes it;
- latest trusted price date plus current return percent, or explicit unavailable/stale price status;
- DQ/trust/evidence status from existing public outputs, or explicit unavailable status.

Lifecycle or health state may appear only when provable from existing persisted/public evidence such as accepted Today Review active-health semantics or compatible public outputs already in source.

The module must not:

- invent an `active` state from missing lifecycle evidence;
- infer a `closed` state from later prices, target hits, or unsupported heuristics;
- backfill lifecycle history from provider/live calls;
- derive trust by duplicating DQ, strategy, or backtest logic owned elsewhere.

## Output Expectations

`current return percent` means price return from source-proven entry trigger price to the latest trusted price. It does not mean realized account performance.

If the latest price basis is stale, unsupported, or missing, the row must show an explicit warning or unavailable state instead of a fresh-looking return.

`lifecycle/health state` should be shown only when the current source can prove it. Otherwise the row should show an explicit limited/unknown evidence status rather than fabricated lifecycle certainty.

## Acceptance Criteria

- The child stays active-only and does not expose a `Closed` list.
- Active rows require source-proven entry trigger evidence before they appear.
- Active rows show latest trusted price date and current return percent only when that price basis is trustworthy; otherwise the module shows explicit stale/unavailable status.
- Lifecycle/health state appears only when provable from existing persisted/public evidence.
- DQ/trust/evidence limitations remain visible and do not silently upgrade weak rows.
- Strategy/rule/version provenance remains visible or explicitly unavailable.
- The child uses existing persisted/public evidence only.
- No acceptance criterion implies Prisma/schema, route-registry, shared UI, package, generated, provider/live, startup/backfill, broker, portfolio, closed-history proof, or Trade Plan target/R:R scope.

## Non-Goals

- No closed history in this child.
- No close date, close price, close reason, or closed return proof in this child.
- No Prisma schema or migration change.
- No route-registry change.
- No shared frontend component or shared backend utility widening.
- No package manifest or generated-file change.
- No provider/live-data calls, startup jobs, backfill jobs, or new workers.
- No broker, portfolio, quantity, capital-allocation, or account-performance semantics.
- No Trade Plan target, stop, reward/risk, or target-price framing.

## Explicit Deferred Follow-On

Closed history must move to a later child requirement for durable lifecycle/storage proof.

That later child should own any future need for:

- documented close events;
- close date/price/reason persistence;
- reusable closed lifecycle DTOs;
- truthful closed return computation across sessions;
- any consent-gated Prisma/schema/generated/repository widening required to make that truthful.

This requirement does not authorize or imply that later child.

## Dependencies

- Accepted `CF-W1-SIG-TRIGGER-ENTRY-01`
- Accepted `CF-W1-TSC-02A-TREV-HEALTH`
- Settled Today Review no-target base from `CF-W2-TSC-04A` and `CF-W2-TSC-05A`
- Prefer accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` if richer support evidence is needed without inventing fallback semantics
- Team 03 architecture packet confirming the exact existing public/persisted truth sources and bounded file reservations

## Explicit Forbidden Scope

Stop and split again if this child requires:

- Prisma/schema/migration changes
- route registry edits
- shared UI or shared backend utility edits
- package manifest or generated-file changes
- provider/live-data calls
- startup/backfill flows
- broker or portfolio integration
- Trade Plan target or reward/risk semantics
- closed-history proof
- broad rewrites in `today-trade-review`, `trade-plan-risk-engine`, `portfolio-management`, `portfolio-intelligence`, or `backtesting-strategy-lab`

## Recommended Team 03 Architecture Questions

Team 03 should answer:

1. Which current persisted/public outputs are the exact truth sources for entry trigger basis, latest trusted price basis, DQ/trust status, lifecycle/health compatibility status, and strategy/rule/version provenance?
2. Can `CF-W2-SPL-01B` stay isolated under new `signal-position-ledger` backend/frontend files with only deferred route-registration requests?
3. Which active-row lifecycle/health states are honestly provable now, and which must remain explicitly unavailable?
4. What exact module-local file reservations would keep this child bounded and avoid shared-file widening?

## Next Gate

Next Team 03 gate: architecture review, source-map refresh, contract draft, and bounded work-packet prep for `CF-W2-SPL-01B` only.

Next Team 04 gate: QA plan only after Team 03 finishes the narrowed `CF-W2-SPL-01B` packet.

Do not move this child to Ready from the requirement lane.
