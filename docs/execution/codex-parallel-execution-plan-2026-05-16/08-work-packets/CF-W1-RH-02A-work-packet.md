# CF-W1-RH-02A Work Packet

Date: 2026-05-18

## Work Item

Research Hub what-changed fail-closed comparison-basis semantics.

## State

Architecture packet prepared. Ready candidate after Team 04 QA planning and Team 00 sequencing.

This is a bounded Research Hub module-owned slice. It is no-schema and no-shared, but it includes both backend and module-owned frontend because the current page hard-codes misleading temporal copy.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 08 UX / Research / Copilot, unless Team 00 intentionally routes one bounded Research Hub writer pass elsewhere
- Lane: Cross-lane research aggregation
- Backend module: `research-hub`
- Frontend feature: `research-hub`

## Allowed Files After Ready Promotion

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.types.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `frontend/src/features/research-hub/api/researchHubApi.ts`
- `frontend/src/features/research-hub/components/ResearchOverviewPage.tsx`
- `frontend/tests/ui/research-hub.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all upstream module source and tests, including:
  - `backend/src/modules/today-trade-review/**`
  - `backend/src/modules/strategy-decision-engine/**`
  - `backend/src/modules/trade-plan-risk-engine/**`
  - `backend/src/modules/market-context-intelligence/**`
  - `backend/src/modules/signal-quality-lab/**`
  - `backend/src/modules/signal-calibration-engine/**`
  - `backend/src/modules/smart-money-intelligence/**`
- scheduler/journal storage
- durable Research Hub overview snapshot work
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated files
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry flows
- broad Research Hub UI redesign

## Required Behavior

Future implementation must:

- add explicit comparison-basis status to `whatChanged`;
- fail closed when no auditable prior Research Hub basis exists;
- clear `newTradeCandidates`, `downgradedCandidates`, and `marketGateChange` under unavailable basis;
- replace the frontend fallback sentence that currently says `since the last evaluation`;
- keep all copy research-support only.

Future implementation must not:

- derive deltas from the current `tradeCandidates` list alone;
- reuse Today Review persisted runs as a surrogate Research Hub basis;
- add storage, scheduling, journaling, or backfill behavior;
- widen into route, shared UI, shared utility, or upstream module work.

## Sequencing Rule

This packet conflicts directly with `CF-W1-RH-01`.

Shared writer files:

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- `backend/src/modules/research-hub/research-hub.types.ts` is optional in `RH-01` but required here

Team 00 must:

- sequence `RH-01` and `RH-02A`;
- avoid parallel Research Hub writers;
- combine them only through an explicit one-writer re-pack if desired.

## QA Handoff Needed

Team 04 can start QA planning now.

Minimum scenarios:

- no prior basis yields `comparisonBasis.status = UNAVAILABLE`;
- unavailable basis yields empty `newTradeCandidates`, empty `downgradedCandidates`, and null `marketGateChange`;
- frontend displays basis-unavailable wording rather than `since the last evaluation`;
- frontend remains stable when warnings exist but comparison basis does not;
- no advice-like or target-like wording appears in the What Changed panel;
- no implementation path infers history from Today Review or other mismatched upstream sources.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- any upstream module source or test edit;
- route-registry edits;
- schema, migration, or generated-type changes;
- shared utility or shared UI changes;
- scheduler/journal storage;
- durable overview snapshot persistence;
- package changes;
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry work.

## Notes For Team 00

- This is a genuine bounded first child for `CF-W1-RH-02`.
- It is Ready-candidate only as a fail-closed unavailable-basis slice.
- True delta history remains a later `RH-02B` style follow-on and must not be silently folded into this packet.
- Keep the packet isolated to the exact Research Hub file reservations above.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing behind `CF-W1-RH-01`.
