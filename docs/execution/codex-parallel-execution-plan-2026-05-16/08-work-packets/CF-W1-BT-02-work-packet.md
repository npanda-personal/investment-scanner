# CF-W1-BT-02 Work Packet

Date: 2026-05-18

## Work Item

Backtesting outcome review traceability.

## State

Ready candidate.

This packet is bounded to one no-schema `backtesting-strategy-lab` implementation pass. It is not yet approved for application code until Team 04 QA planning and Team 00 Ready promotion are complete.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `backtesting-strategy-lab`
- Frontend feature: `backtesting-strategy-lab`

## Allowed Files After Ready Promotion

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.routes.test.ts`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.test.ts`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- paid/cloud, provider/startup, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add additive run-level review-outcome and review-traceability fields;
- add additive trade-level structured traceability fields for entry, exit, invalidation/risk, rule version, and legacy repair;
- classify runs into trusted, partial, diagnostic, legacy-repaired, or withheld review states using current module evidence;
- preserve current availability, benchmark, exit diagnostics, and calculation-audit fields;
- render the new traceability contract on the current Backtesting Strategy Lab page;
- preserve current registered/custom execution behavior and current research-support wording.

## Explicitly Deferred

- Prisma/schema or generated-file changes;
- repository/controller/router/validation work;
- Strategy Framework source changes;
- Trade Plan Risk Engine traceability work;
- simulation-math, benchmark-math, or strategy-semantic changes;
- shared UI/navigation work.

## Dependency Notes

- No schema or route blocker exists for this packet.
- Existing run `metrics` and `trades` JSON payloads are sufficient for additive fields.
- Existing Strategy Framework evaluator outputs are sufficient for registered-run rule IDs and strategy version traceability.
- Team 00 must keep this packet as the only active writer set for `backtesting-strategy-lab` service/types/doc/test and page/types/UI spec during the implementation pass.

## QA Handoff Needed

Team 04 should prepare the QA plan for this packet now.

Required QA focus:

- backend service coverage for trusted, partial, diagnostic-only, legacy-repaired, and withheld review outcomes;
- backend service coverage for registered and custom trade traceability mapping;
- explicit proof that benchmark unavailable, weak end-of-test exits, and insufficient history become visible review evidence;
- UI smoke coverage for review-outcome labeling, traceability reason text, and trade-level structured trace fields;
- regression coverage that current legacy-invalid warning behavior remains visible and that no direct-advice language appears.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- backtesting-strategy-lab.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- backtesting-strategy-lab.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema, migrations, or generated files;
- repository/controller/router/validation or route-registry changes;
- Strategy Framework source edits;
- Trade Plan Risk Engine edits;
- shared utility/UI or package changes;
- simulation or benchmark math changes beyond additive traceability.

## Next Gate

Team 04 QA planning can start now.

Team 00 can evaluate `CF-W1-BT-02` for Ready promotion as one bounded no-schema backtesting packet after the QA handoff is accepted.
