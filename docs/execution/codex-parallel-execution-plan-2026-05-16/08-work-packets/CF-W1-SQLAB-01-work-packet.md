# CF-W1-SQLAB-01 Work Packet

Date: 2026-05-18

## Work Item

Signal Quality Lab outcome-confidence and readiness labeling.

## State

Architecture packet prepared. Not Ready for Implementation.

This slice is intentionally backend-only and module-local. It refines trust-state labeling without changing routes, schema, providers, or frontend scope.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Module: `signal-quality-lab`

## Allowed Files After Ready Promotion

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- optional only if endpoint-level additive response assertions are added: `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- Data Quality Engine source or exports
- Signal Generation, Signal Calibration, Strategy Decision, or Trade Plan files
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- frontend files
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add stable outcome-confidence states for trusted, limited, diagnostic, and untrusted results;
- derive those states from existing selected-horizon evidence plus DQ evaluation presence/blockers;
- preserve research-support wording and avoid target/advice language;
- keep current fields backward-compatible and additive;
- avoid any new query parameter, controller, router, repository, or persistence work.

## QA Handoff Needed

Team 04 should prepare focused backend QA for:

- trusted selected-horizon evidence with full DQ support;
- limited evidence with partial selected-horizon support;
- diagnostic evidence with missing or optional DQ coverage;
- untrusted evidence with zero selected-horizon outcomes;
- untrusted evidence when DQ lookup fails;
- additive compatibility of current summary/group fields.

Suggested focused command after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts signal-quality-lab.routes.test.ts --runInBand
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema changes;
- route/controller/query-contract changes;
- Data Quality Engine source/export changes;
- shared DTO, shared utility, package, generated, provider, or frontend work;
- calibrating or gating downstream modules in the same slice.

## Next Gate

Team 04 QA planning, then Team 00 sequencing. This packet is bounded enough for future Ready review, but it is not promoted by Team 03.
