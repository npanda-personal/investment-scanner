# CF-W1-STRAT-01 Work Packet

Date: 2026-05-17

## Work Item

Strategy Decision no-target / exit-invalidation compatibility slice.

## Approved Decision

Product Owner approved Option B-Strict in:

- `07-decisions/DECISION-20260517-no-target-exit-invalidation-semantics-resolution.md`

## Allowed Source Files

- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- `backend/src/modules/strategy-decision-engine/strategy-decision-engine.types.ts`

## Allowed Test Files

- `backend/tests/modules/strategy-decision-engine/**`

## Forbidden Files

- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/tests/modules/trade-plan-risk-engine/**`
- `frontend/src/**`
- Prisma schema/migrations.
- Route registries.
- Shared utilities/UI.
- Package manifests.
- Generated/common fixtures.
- Provider, Angel One, live-provider, startup/backfill files.

## Implementation Tasks

- Stop deriving `riskPlan.targetPrice` from `latestPrice * 1.15`.
- Emit a compatibility-safe `targetPrice` value.
- Replace `Target price achieved.` with rule/evidence-based exit wording.
- Replace fixed 15% target rationale with risk-review evidence wording.
- Preserve Strategy Decision module boundaries.
- Add focused Strategy Decision tests for no-target semantics and forbidden wording.

## Validation Command

```powershell
cd backend
npm.cmd test -- strategy-decision-engine.service.test.ts --runInBand
```

## Acceptance Criteria

- Focused Strategy Decision tests pass.
- No Trade Plan, frontend, Prisma, route, shared, package, generated/common fixture, provider, startup, or Angel One files are modified.
- QA accepts.
- Code review accepts.
- Architect accepts.
- PO packet records acceptance under standing delegation based on explicit Option B-Strict approval.
