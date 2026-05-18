# CF-W1-CAL-01 Work Packet

Date: 2026-05-18

## Work Item

Signal Calibration reliability drift and trust-state refinement.

## State

Docs-only architecture refresh completed.

Ready recommendation: `Ready candidate` for Team 04 QA handoff and Team 00 sequencing. Team 03 does not self-promote to implementation.

This slice remains backend-only and module-local.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Module: `signal-calibration-engine`

## Exact File Reservations

Reserved writer set for the first implementation pass:

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`

Optional only if response payload assertions are widened:

- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Forbidden Files

All other files are forbidden for this child, especially:

- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.module.ts`
- all `backend/src/modules/signal-quality-lab/**`
- all `backend/src/modules/data-quality-engine/**`
- all `backend/src/modules/historical-context-snapshots/**`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- all frontend source and frontend tests

## Required Behavior

Future implementation must:

- keep the slice inside the calibration service/types/doc/test boundary;
- preserve current score math and persisted-row compatibility;
- keep current readiness/status fields and add trust-state metadata inside `calibrationReadiness`;
- distinguish `TRUSTED`, `LIMITED`, `DIAGNOSTIC_ONLY`, and `UNAVAILABLE` trust semantics;
- fail closed for blocking DQ states instead of treating them as penalties only;
- treat missing DQ evaluation as diagnostic-only rather than normal influence;
- preserve research-support wording.

## Blocker / Split Notes

- Split required: `No`
- Architectural blocker: `None`
- Non-blocking semantic alignment:
  - `CF-W1-SQLAB-01` for shared trust wording
  - `CF-W1-DQ-02` for future session-aware currentness evidence
- Shared-file conflict:
  - no parallel writer on the reserved calibration service/types/doc/test set

## QA Planning Handoff Notes

Use the prepared QA plan at `04-qa/CF-W1-CAL-01-qa-plan.md`.

Team 04 should validate:

- trusted calibration with strong evidence and clean DQ;
- limited calibration with low-sample or context-gap evidence;
- diagnostic-only calibration when DQ alignment is missing;
- unavailable calibration when selected-horizon evidence is absent;
- unavailable calibration when DQ is blocking;
- compatibility of existing readiness/evidence/score fields.

Suggested focused command after Team 00 promotion and implementation handoff:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts --runInBand
```

Optional only if route payload assertions are expanded:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma or schema changes;
- repository, controller, router, validation, or index edits;
- SQLAB, DQE, or Historical Context source changes;
- shared utility, package, generated, provider, or frontend work;
- score-model rewrite instead of trust-state refinement.

## Next Gate

Team 04 QA validation against the prepared plan, then Team 00 Ready evaluation and sequencing.
