# CF-W1-SQLAB-02 Work Packet

Date: 2026-05-18

## Work Item

Signal outcome journal and post-event learning.

## State

Child routing refined. `CF-W1-SQLAB-02A` is a Ready candidate only after `CF-W1-SQLAB-01` branch-local acceptance on the shared backend `signal-quality-lab` files. `CF-W1-SQLAB-02B` remains proposal-blocked for durable implementation.

This packet only prepares the no-schema first slice: a derived journal preview inside `signal-quality-lab`. Durable journal persistence remains out of scope and blocked.

## Owner / Lane / Modules

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 06 Strategy / Signals / Risk
- Lane: Lane 2
- Backend module: `signal-quality-lab`
- Frontend feature: `signal-quality-lab`

## Allowed Files After Ready Promotion

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Current Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/today-trade-review/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- providers, live-market validation, paid/cloud, broker, or telemetry flows

## Required Behavior

Future implementation must:

- add additive per-signal selected-horizon journal-preview metadata derived from the existing measured outcome;
- distinguish evaluated, insufficient-future-data, and missing-price-history states;
- produce a concise research-support lesson summary from the measured outcome without target/advice language;
- mark the preview explicitly as derived and not persisted;
- render the preview inside the existing instrument-history workflow only;
- preserve current routes, query behavior, payload compatibility, and on-demand outcome calculation as the source of truth.

## Explicitly Deferred

- durable journal entry storage;
- editable lesson notes or save/update actions;
- Prisma/schema, migration, or new repository persistence logic;
- separate journal routes, separate journal page, or shared UI extraction;
- calibration, Today Review, backtesting, alerts, or strategy follow-through expansion.

## Dependency Notes

- Durable persistence is blocked until Team 00 / Architect approve a storage packet for `CF-W1-SQLAB-02B`.
- This packet shares backend writer files with `CF-W1-SQLAB-01`. Team 00 must combine or sequence the two packets and keep one writer per file.
- `CF-W1-SQLAB-02A` becomes implementation-eligible only after `CF-W1-SQLAB-01` reaches branch-local acceptance in its dedicated worktree or equivalent accepted branch state. Do not wait for merge to `dev`, but do require one accepted upstream backend baseline before this child starts.
- `CF-W1-CAL-01` is only a semantic downstream consumer and is not a file-reservation blocker.

## QA Handoff Needed

Team 04 should prepare:

- focused backend service coverage for favorable, adverse, flat, pending, and missing-history journal-preview states;
- UI smoke coverage for the instrument-history preview, explicit derived-not-persisted copy, and no regression to current insufficient-data messaging.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- signal-quality-lab.service.test.ts --runInBand
```

```powershell
cd frontend
npm.cmd run test:ui -- signal-quality-lab.spec.ts --workers=1
npm.cmd run build
```

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- Prisma/schema changes or a new durable storage path;
- repository, controller, router, validation, or query-contract changes;
- signal-generation or calibration source changes;
- editable note persistence or any save/update flow;
- shared utility, shared UI, package, generated, provider, or route-registry work.

Also stop if Team 00 attempts to run `CF-W1-SQLAB-02A` in parallel with `CF-W1-SQLAB-01` on the overlapping backend files.

## Next Gate

Team 04 QA planning is already prepared for the no-schema first slice.

Team 00 must now decide one of two paths:

1. promote `CF-W1-SQLAB-02A` as the next sequenced bounded implementation child after `CF-W1-SQLAB-01` branch-local acceptance; or
2. keep `CF-W1-SQLAB-02B` as a separate storage approval packet for the durable parent requirement.
