# CF-W2-SPL-01A - Signal Position Ledger First Slice Requirement

Date: 2026-05-26

Owner: Team 02 - Product / Requirement Factory

Status: Original child requirement draft. Not Ready for Implementation. Superseded as the next architecture intake by split child `CF-W2-SPL-01B`.

Parent: `CF-W2-SPL-01 - Signal Position Ledger`

## Product Goal

This document records the original combined first-slice intent for a dedicated Signal Position Ledger that would show system-triggered active and closed signal positions from reliable filtered system evidence.

Team 03 architecture review showed this combined scope is not truthful on the current source because active and closed lifecycle proof do not both exist from persisted/public evidence today.

Use this document as split history only. Do not route it as the next implementation-prep child.

The first slice should answer:

- which signal positions are currently active;
- which signal positions are already closed by documented exit, invalidation, or expiry evidence;
- what the source-proven entry trigger was;
- what the current open return is for active rows;
- what the close return was for closed rows; and
- which evidence/trust gaps still prevent a row from being treated as reliable.

## Bounded Slice

The first slice should stay read-focused and investor-value-first:

- one module-local active list;
- one module-local closed list;
- optional row drilldown only if Team 03 proves it stays inside the module boundary;
- no broker, quantity, or portfolio accounting semantics;
- no target/reward/risk semantics;
- no page-local bulk automation controls.

## Required Row Rules

An active row requires:

- source-proven entry trigger date or timestamp;
- source-proven entry trigger price;
- entry reason summary;
- strategy code plus strategy version where current source supports it;
- current lifecycle state from documented rule evidence or accepted active-health semantics;
- latest trusted price date and current return, or explicit unavailable/stale price status;
- latest data-quality or trust status, or explicit unavailable status.

A closed row requires:

- all active-row entry basis;
- documented close type: `EXIT_TRIGGERED`, `INVALIDATED`, or `EXPIRED`;
- close date or timestamp;
- close price basis;
- close reason summary;
- return from entry to close.

Rows that fail those proof requirements must stay out of the list or remain explicitly unsupported. The module must not fabricate a completed lifecycle.

## First-Slice Output Expectations

Active rows should show:

- company name
- symbol
- entry trigger date
- entry trigger price
- entry reason summary
- current trusted price date
- current return percent
- lifecycle state
- trust/evidence status
- data-quality status
- strategy/rule/version provenance

Closed rows should show:

- company name
- symbol
- entry trigger date
- entry trigger price
- close type
- close date
- close price
- close reason summary
- closed return percent
- trust/evidence status
- strategy/rule/version provenance

## Guardrails

- `current return` means price return from source-proven entry trigger price to the latest trusted price. It does not mean realized P/L.
- `closed return` means price return from source-proven entry trigger price to documented close price. It does not mean booked account performance.
- If the latest price is stale or unsupported, show a warning or unavailable status instead of a fresh-looking open return.
- If the close event cannot be proven from documented exit, invalidation, or expiry evidence, do not place the row in `Closed`.
- The first slice must consume existing public outputs from Signal Generation, Today Review, Strategy Decision, Data Quality, Strategy Framework, and Backtesting where they already exist. It must not duplicate those modules' calculations.

## Acceptance Criteria

- The first-slice requirement defines a distinct module boundary for `signal-position-ledger`.
- The first slice stays separate from Today Review daily ranking and from Portfolio holdings.
- Active rows require source-proven entry evidence before they appear as active signal positions.
- Closed rows require documented close evidence before they appear in closed history.
- Active rows show current return only against the latest trusted price basis or an explicit unavailable/stale state.
- Closed rows show close date, close price, close reason, and closed return only when source-backed evidence exists.
- Strategy/rule/version provenance remains visible or explicitly unavailable.
- Data-quality/trust limitations remain visible and never silently upgrade weak evidence.
- No UI or API semantics imply broker execution, target-price advice, or reward/risk framing.

## Non-Goals

- No Prisma schema or migration change is assumed safe by this draft.
- No route-registry change is assumed safe by this draft.
- No shared backend utility or shared frontend component change.
- No package manifest or generated-file change.
- No broker, live-trading, paper-trading, or portfolio-sizing feature.
- No alerting, journaling, or notification scope.
- No new ranking engine.
- No rewrite of Today Review, Trade Plan, or Portfolio ownership semantics.

## Dependencies

- Accepted `CF-W1-SIG-TRIGGER-ENTRY-01`
- Accepted `CF-W1-TSC-02A-TREV-HEALTH`
- Settled Today Review no-target base from `CF-W2-TSC-04A` and `CF-W2-TSC-05A`
- Prefer accepted `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` if the first slice wants richer support evidence without inventing fallback semantics
- Team 03 decision on read-model-only versus durable ledger/storage-first

## Explicit Forbidden Scope

Stop and split if the first slice requires:

- broker or portfolio integration
- quantity, cost basis, tax, or account P/L semantics
- target price, reward/risk, or Trade Plan geometry as trusted lifecycle proof
- Prisma/schema/migration work without an explicit architecture packet
- route-registry or shared-component widening without Team 00 reservation
- broad rewrites inside `today-trade-review`, `trade-plan-risk-engine`, `portfolio-management`, `portfolio-intelligence`, or `backtesting-strategy-lab`

## Recommended Team 03 Architecture Questions

Team 03 should answer:

1. Can current persisted evidence already prove enough closed rows to support a truthful `Closed` tab?
2. If not, should the first implementation split into:
   - active-only read model first, then
   - durable closed-history ledger later?
3. Can the module stay isolated under new `signal-position-ledger` backend/frontend files, or does it need consent-gated shared contracts from day one?
4. Which existing public exports are sufficient, and which missing lifecycle facts would require a new storage packet?

## Split Result

Use the following split path instead:

1. `CF-W2-SPL-01B - Signal Position Ledger active positions read model`
2. later durable closed-history / lifecycle-storage child, still to be defined after Team 00 intentionally opens that path

## Next Gate

Team 03 should not prepare a Ready packet for `CF-W2-SPL-01A` as written.

Next architecture intake should be `CF-W2-SPL-01B`, followed by Team 04 QA planning for that narrowed child only.

Do not move this child to Ready from the requirement lane.
