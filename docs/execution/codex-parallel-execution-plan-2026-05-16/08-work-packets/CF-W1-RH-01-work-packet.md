# CF-W1-RH-01 Work Packet

Date: 2026-05-18

## Work Item

Research Hub backend actionability evidence wiring.

## State

Architecture packet prepared. Ready candidate after Team 04 QA planning and Team 00 sequencing.

This is a bounded backend-only `research-hub` slice. It stays inside the Research Hub backend module, module docs, and focused module tests.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 08 UX / Research / Copilot, unless Team 00 intentionally routes one bounded backend-only writer pass elsewhere
- Lane: Cross-lane research aggregation
- Backend module: `research-hub`

## Allowed Files After Ready Promotion

- `backend/src/modules/research-hub/research-hub.service.ts`
- `backend/src/modules/research-hub/research-hub.md`
- `backend/tests/modules/research-hub/research-hub.service.test.ts`
- optional only if helper aliases are needed without expanding the response shape: `backend/src/modules/research-hub/research-hub.types.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- all `frontend/src/features/research-hub/**`
- all `frontend/tests/ui/**`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `backend/src/modules/today-trade-review/**`
- all `backend/src/modules/trade-plan-risk-engine/**`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/signal-calibration-engine/**`
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
- broad frontend redesign

## Required Behavior

Future implementation must:

- replace placeholder actionability dimensions for Today Review, Trade Plan, Signal Quality, and Calibration with public-output-derived status/count/evidence-date/message values;
- keep the existing Research Hub response shape unchanged;
- use only public service reads already available on `dev`;
- keep `whatChanged` untouched in this child;
- preserve research-support language and conservative boolean semantics;
- fail closed when public evidence is absent or lookup calls fail.

Future implementation must not:

- edit upstream module source or tests;
- consume upstream repositories or private helpers;
- invent trust scoring, target-like semantics, or advice wording;
- widen into frontend rendering changes.

## Dependency Sequencing Rule

- `CF-W1-L3-TREV-01`: compatibility dependency only. Consume current `dev` Today Review public outputs now; prefer additive publication-evidence fields later only if they are merged into `dev`.
- `CF-W1-TP-02`: compatibility dependency only. Consume current `dev` public paper-readiness outputs now; do not reopen Trade Plan semantics here.
- `CF-W1-SQLAB-01`: semantic-upgrade dependency only. Before its accepted trust-state packet is merged into `dev`, keep Signal Quality capped below `READY`.
- `CF-W1-CAL-01`: semantic-upgrade dependency only. Before its accepted trust-state packet is merged into `dev`, keep Calibration capped below `READY`.

Do not assume those branch commits are already present on `dev`.

## QA Handoff Needed

Team 04 can start QA planning now.

Minimum scenarios:

- Today Review public latest-run mapping yields `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA` outcomes.
- Trade Plan public paper-readiness mapping yields `READY`, `LIMITED`, `BLOCKED`, and `INSUFFICIENT_DATA` outcomes.
- Signal Quality summary replaces placeholder insufficiency when public summary exists, but does not overstate trust on current `dev`.
- Calibration persisted-read mapping replaces placeholder insufficiency when public rows exist, but does not overstate trust on current `dev`.
- `canReviewActionableSetups` stays conservative and research-support only.
- no advice-like or target-like wording appears in actionability messages, blockers, or next-best-action text.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- research-hub.service.test.ts --runInBand
```

Team 04 should explicitly record that:

- frontend Research Hub changes are intentionally deferred;
- accepted `SQLAB-01` and `CAL-01` packets are not assumed merged into `dev` during this child.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Research Hub frontend changes;
- route-registry edits;
- upstream module source edits;
- upstream repository/private-internal access;
- schema, migration, or generated-type changes;
- shared utility or shared UI changes;
- provider/live-data integration;
- startup/backfill orchestration;
- package changes;
- broader Research Hub redesign;
- coupling this packet with `CF-W1-RH-02`.

## Notes For Team 00

- This packet is a genuine bounded first child and does not need a split to become implementable.
- The writer set is intentionally narrow: Research Hub backend service/doc/tests only.
- Keep it isolated from any same-pass Today Review, Trade Plan, Signal Quality Lab, or Signal Calibration source work.
- Do not widen this child into `whatChanged`, frontend redesign, or upstream module edits.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.
