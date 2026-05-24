# CF-W1-TSC-01A - Trusted Signal Candidate Trigger Evidence Adoption Work Packet

Date: 2026-05-24

Owner: Team 03 - Solution Architect Factory

Status: Split Work Packet Draft - Requires Team 04 QA Plan And Team 00 Promotion

## Objective

Wire source-proven Signal Generation trigger price evidence into `/today-review` so Trusted Signal Candidate grouping can start from rule-triggered entry evidence rather than Trade Plan, target, or R:R fields.

## Architecture Decision

This cannot be a Team 07-only implementation.

The first implementation must be split:

1. Team 06 adds a bounded Signal Generation bridge so `latestForInstrument` can optionally enrich with Strategy Framework context.
2. Team 07 consumes that bridge from Today Review and projects trusted-candidate evidence into existing JSON-backed snapshots and feature-local UI.

## Child 1 - Team 06 Signal Generation Bridge

Branch recommendation:

- `codex/team06-strategy-signal/CF-W1-TSC-01A-signal-latest-strategy-context`

Allowed files:

- `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.types.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.trigger-contract.test.ts`

Required behavior:

- Add optional strategy-aware read options to `latestForInstrument`.
- Keep existing no-options behavior unchanged.
- Reuse existing strategy-aware enrichment logic.
- Preserve route behavior by not changing controller/router/validation files.
- Do not add persistence, schema, generated files, provider/live calls, or startup/backfill behavior.

## Child 2 - Team 07 Today Review Adoption

Branch recommendation after Child 1 acceptance:

- `codex/team07-portfolio-alerts/CF-W1-TSC-01A-today-review-trigger-evidence`

Allowed files:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Required behavior:

- Pass `decision.strategy` and review scope to the accepted Signal Generation bridge.
- Project `triggerContract.trigger_price_evidence` through Today Review evidence snapshots.
- Classify Trusted Signal Candidate groups from Data Quality plus source-proven trigger evidence.
- Keep missing evidence visible.
- Do not treat Trade Plan, target, stop, R:R, or compatibility-only target-shaped fields as trusted candidate evidence.

## Global Forbidden Scope

- Prisma schema or migrations.
- Route registries.
- Shared backend utilities.
- Shared frontend components.
- Package manifests.
- Generated files.
- Provider/live-data calls.
- Startup/backfill behavior.
- Broker integration.
- Paid/cloud services.
- External telemetry.
- Broad navigation or shared UX work.
- Trade Plan source changes.
- Repository changes for Today Review or Signal Generation.

## Stop Conditions

Stop and return to Team 00 if implementation requires:

- new persisted candidate columns;
- Signal Generation route/controller/validation changes;
- Today Review repository/schema changes;
- shared DTO or shared UI changes;
- Strategy Framework, Strategy Decision, Data Quality, Market Data, Trade Plan, Alerts, Portfolio, Watchlist, Copilot, or Research Hub source edits;
- provider/live-data or startup/backfill behavior;
- target, R:R, direct advice, or synthetic profit-target semantics.

## Required Validation For Future Children

Team 06 bridge:

```powershell
cd backend
npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.trigger-contract.test.ts --runInBand
npm.cmd run build
```

Team 07 adoption:

```powershell
cd backend
npm.cmd test -- today-trade-review.service.test.ts --runInBand
npm.cmd run build
```

```powershell
cd frontend
npm.cmd run build
npm.cmd run test:ui -- today-trade-review.spec.ts --workers=1
```

## Readiness Result

Do not promote the Team 07 Today Review child until the Team 06 bridge is accepted. Team 00 may promote the Team 06 bridge first after Team 04 QA planning confirms the focused strategy-aware `latestForInstrument` checks.
