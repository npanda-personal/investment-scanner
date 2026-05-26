# CF-W2-SPL-01B Work Packet

Date: 2026-05-26

## Work Item

`CF-W2-SPL-01B` Signal Position Ledger active rows backend read model.

## State

Architecture packet prepared.

Ready candidate after Team 04 QA confirmation and Team 00 sequencing.

This is a bounded backend-only `signal-position-ledger` slice. It stays inside the new backend module, module docs, and focused backend tests.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 00-assigned Lane 2 writer
- Lane: Lane 2
- Backend module: `signal-position-ledger`

## Allowed Files After Ready Promotion

- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

Optional only if the implementer adds isolated router assertions:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `frontend/src/features/signal-position-ledger/**`
- all `frontend/tests/ui/**`
- all Today Review, Trade Plan, Portfolio, Backtesting, and shared module source/tests
- upstream repository/private-internal access
- shared backend utilities
- shared frontend components
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- package manifests
- generated files
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- expose one paginated active-row response;
- include rows only when source-proven entry trigger timestamp and source-proven entry trigger price both exist;
- include current latest price date and raw current return percent only when that price basis is trustworthy;
- expose current DQ/trust status from current persisted/public evidence;
- expose strategy/rule/version provenance where current source supports it;
- expose only `EXIT_TRIGGERED` or `RISK_WARNING` as current health compatibility states on current `dev`;
- mark all other lifecycle semantics explicit unavailable;
- remain list-only with no row-detail surface.

Future implementation must not:

- add closed-history semantics;
- infer open/closed lifecycle truth from prices or targets;
- widen into route-registry, frontend, shared UI, schema, package, generated, provider/live, startup, backfill, broker, portfolio, or Trade Plan target/R:R scope.

## Required Inclusion Rules

Row inclusion requires:

- latest persisted trusted signal row in selected scope;
- enriched source-proven trigger contract;
- `trigger_type` compatible with entry-ledger rows;
- non-legacy/non-incomplete row status for trigger basis.

Rows must remain hidden or explicitly unsupported when trigger basis is missing.

## Required QA Handoff

Team 04 should verify:

- source-proven entry proof gate
- legacy/incomplete exclusion behavior
- current return current/stale/unavailable behavior
- current DQ/trust projection
- strategy/rule/version provenance visibility
- allowed health-state mapping only
- no fabricated lifecycle truth
- pagination and scope behavior

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.service.test.ts signal-position-ledger.repository.test.ts signal-position-ledger.validation.test.ts --runInBand
npm.cmd run build
```

Optional only if router assertions are added:

```powershell
cd backend
npm.cmd test -- signal-position-ledger.routes.test.ts --runInBand
```

## Team 00 Shared-File Gate

This work packet intentionally does not include shared-file exposure.

If Team 00 later wants the module exposed beyond isolated module tests, open a separate shared-file packet for:

- `backend/src/api/routes.ts`

If Team 00 later wants a surfaced page, open a later frontend packet for:

- `frontend/src/features/signal-position-ledger/**`
- `frontend/src/app/routes.tsx`

## One-Writer Rule

Reserve the whole `signal-position-ledger` backend writer set to one implementer in one pass.

Do not split service/repository/validation/router/controller ownership across different writers.

## Stop Conditions

Stop and return to Team 00 immediately if implementation requires:

- backend route-registry wiring;
- frontend feature or UI work;
- schema, migration, or generated-file changes;
- package-manifest changes;
- shared utility/UI changes;
- provider/live/startup/backfill behavior;
- Today Review / Trade Plan / Portfolio / Backtesting source edits.

If any of those become necessary, Team 00 must reopen the packet as a split or shared-file child instead of widening this one silently.

## Notes For Team 00

- This is a genuine bounded first child and can proceed as backend-only.
- The current Team 04 QA plan is broader than this packet; use the backend subset for Ready evaluation.
- No safer user-visible slice exists without opening shared route-registry scope.

## Next Gate

Team 04 QA confirmation against the backend-only boundary, then Team 00 Ready evaluation and sequencing.
