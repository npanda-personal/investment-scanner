# CF-W1-MD-03 Work Packet

Date: 2026-05-18

Owner: Team 03 Architecture Factory

State: Ready candidate packet prepared. Not Ready for Implementation until Team 04 QA planning and Team 00 promotion.

## Work Item

Market Data Foundation signoff-threshold contract enforcement for the existing `95%` price-ready and `90%` metadata-ready universe thresholds.

## Smallest Bounded First Child

The smallest safe child is the full `CF-W1-MD-03` requirement as one backend-only signoff-policy slice.

Why this is bounded:

- coverage metrics already exist;
- `universeSignoff` already exists;
- blocker DTOs already support additive threshold reasons;
- no schema, route, repository, provider, DQE, or frontend work is required.

## Allowed Files After Ready Promotion

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `backend/tests/modules/market-data-foundation/market-data.universe.test.ts`

## Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- all Data Quality Engine source/tests
- route registries
- shared backend utilities
- package manifests
- frontend or shared UI files
- provider/live-data/startup/backfill redesign
- `CF-W1-MD-02A` and future `CF-W1-MD-02B` durable evidence/schema work
- paid/cloud, broker, or telemetry scope

## Required Implementation

- Add explicit signoff blockers for:
  - price coverage below `95%`
  - metadata coverage below `90%`
- Keep `downstreamAllowed=false` whenever either threshold misses.
- Preserve the existing review-ready minimum-count and `10%` review-ready-share gates.
- Keep signoff explanation output specific enough for QA to distinguish price-threshold failure from metadata-threshold failure.
- Update the module doc so the Universe Signoff section matches the enforced threshold policy.

## Explicitly Deferred From This Child

- durable readiness evidence storage or additive schema work
- DQE handoff or downstream DQE-consumer adoption
- trust-status redesign
- route/controller payload widening
- provider, repair-plan, startup, or backfill redesign
- frontend trust messaging or UI changes

## Team 04 QA Planning Handoff

Team 04 should plan:

- pass, price-fail, metadata-fail, and dual-fail threshold cases;
- preserved review-ready minimum-count/share fail cases;
- parity checks for `universeHealth()` versus `repairPlan()` signoff output;
- stable blocker-code and required-threshold values;
- explicit guard that the packet does not widen into `MD-02A` storage/schema scope.

Suggested focused command after approved implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts market-data.universe.test.ts --runInBand
```

## Sequencing Notes

- `CF-W1-MD-03` is independent of active Research Hub and Smart Money writers.
- `CF-W1-MD-03` must stay separate from `CF-W1-MD-02A`; `MD-02A` remains docs-only and proposal-only.
- Do not run `CF-W1-MD-03` in parallel with any future Market Data packet that reserves:
  - `market-data-foundation.service.ts`
  - `market-data-foundation.md`
  - `market-data.service.test.ts`
  - `market-data.universe.test.ts`

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires schema, generated files, repository/provider/startup/backfill work, DQE source, route/controller changes, shared utilities, package changes, frontend/UI work, or any attempt to bundle `MD-03` with `MD-02A` or `MD-02B`.

## Next Gate

1. Team 04 focused QA-plan prep for threshold enforcement and explanation parity.
2. Team 00 Ready evaluation for one bounded backend-only Market Data writer pass.
