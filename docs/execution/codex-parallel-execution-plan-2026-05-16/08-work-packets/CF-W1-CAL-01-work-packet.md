# CF-W1-CAL-01 Work Packet

Date: 2026-05-18

## Work Item

Signal Calibration reliability-drift and trust-state refinement.

## State

Architecture packet prepared. Not Ready for Implementation.

This slice is intentionally backend-only and module-local. It refines calibration trust-state behavior without changing routes, schema, providers, or frontend scope.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Module: `signal-calibration-engine`

## Allowed Files After Ready Promotion

- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.service.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/signal-calibration-engine/signal-calibration-engine.routes.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.repository.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.controller.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.router.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.validation.ts`
- Signal Quality Lab source or exports
- Data Quality Engine source or exports
- Historical Context Snapshots source
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend files
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add stable trusted, limited, diagnostic-only, and unavailable calibration trust states;
- fail closed for blocking DQ evidence rather than treating it only as a penalty;
- keep current calibration score math and persisted-row compatibility intact;
- preserve research-support wording;
- avoid query, controller, router, repository, schema, provider, or frontend expansion.

## Dependency Notes

- Primary owner is `signal-calibration-engine`.
- Non-blocking upstream dependency: current Signal Quality Lab summary diagnostics.
- Non-blocking upstream dependency: current Data Quality Engine evaluation DTO semantics.
- `CF-W1-SQLAB-01` and `CF-W1-DQ-02` should be aligned when accepted, but neither is required to begin this bounded module-local slice.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- trusted calibration with sufficient evidence and clean DQ;
- limited calibration with low-sample or context-gap evidence;
- diagnostic-only calibration with missing DQ alignment;
- unavailable calibration with zero selected-horizon evidence;
- unavailable calibration with blocking DQ evidence;
- additive compatibility of current readiness/evidence fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-calibration-engine.service.test.ts signal-calibration-engine.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema changes;
- route/controller/query-contract changes;
- SQLAB or DQE source/export changes;
- shared DTO, shared utility, package, generated, provider, or frontend work;
- calibration model rewrite rather than trust-state refinement.

## Next Gate

Team 04 QA planning, then Team 00 sequencing. This packet is bounded enough for future Ready review, but it is not promoted by Team 03.
