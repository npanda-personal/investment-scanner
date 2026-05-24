# Team 03 Outbox - CF-W1-MD-05 Architecture Readiness

Date: 2026-05-24

Team: Team 03 - Architecture Factory

## Work Item

`CF-W1-MD-05 - catalog sync latest-session freshness and skip-reason explainability`

## Mode

Architecture readiness prep only. No application code implemented.

## Verdict

Ready candidate.

## Why

- current backend service logic already knows the difference between:
  - latest completed session missing,
  - region current but stale instruments pending,
  - final-confirmed/current region state;
- current catalog page already receives per-instrument freshness dates and only needs clearer UI use of them;
- the trust bug can be handled with additive DTO and feature-owned UI messaging updates;
- no schema, route, provider, startup/backfill, or shared UI change is required for the first slice.

## Files Changed

- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-MD-05-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-MD-05-catalog-sync-freshness-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-MD-05-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-03-CF-W1-MD-05-architecture-outbox.md`

## Files Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-MD-05-catalog-sync-latest-session-freshness-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/17-team-outboxes/TEAM-02-market-data-freshness-requirement-2026-05-24.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-market-data-data-quality.md`
- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

## Exact Future File Reservations

Allowed:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`
- `frontend/src/features/market-data-foundation/types.ts`
- `frontend/src/features/market-data-foundation/components/MarketDataFoundationPage.tsx`
- `frontend/tests/ui/market-data-foundation.spec.ts`

Forbidden:

- Prisma/schema/migrations
- generated files
- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- `frontend/src/features/market-data-foundation/api/marketDataFoundationService.ts`
- `frontend/src/features/market-data-foundation/components/InstrumentDetailPage.tsx`
- `frontend/src/features/market-data-foundation/components/MarketDataStatusPanel.tsx`
- `frontend/src/features/market-data-foundation/routes.tsx`
- `frontend/tests/ui/market-data-foundation-instrument.spec.ts`
- backend/frontend route registries
- shared backend utilities
- shared UI
- package manifests
- provider/live-data/startup/backfill scope

## Blockers / Boundaries

- No blocker for the bounded first slice.
- Boundary: unsupported-provider rows can be explained as excluded from queued catalog sync scope, but numeric excluded counts are out of this slice. If those counts are required, reopen with repository reservation.

## QA Handoff

Team 04 should prepare:

- stale latest-session mismatch proof
- region-current/instrument-stale catch-up proof
- fully current/final-confirmed proof
- pre-fetch skip reason proof
- no-op vs skipped distinction
- failed work vs skipped distinction
- catalog-row freshness wording proof
- unsupported-row explanatory boundary proof

Suggested commands after implementation:

```powershell
cd backend
npm.cmd test -- market-data.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- market-data-foundation.spec.ts --workers=1
```

## Teams Ready To Pick Up New Tasks

- Team 04 QA planning: ready to draft the verification matrix for `CF-W1-MD-05`
- Lane 1 implementation team: ready to reserve the exact Market Data Foundation writer set above
- Team 02 Requirement Factory: free to continue downstream discovery while `MD-05` moves to QA/Ready review

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.

No tests, builds, providers, live calls, commits, or pushes were run in this architecture pass.
