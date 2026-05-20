# CF-W1-RH-03 Work Packet

Date: 2026-05-20

## Work Item

Research Hub explainability and trust labels.

## State

READY-CANDIDATE architecture packet prepared. Team 04 QA planning and Team 00 sequencing are still required before any implementation handoff.

This is a bounded no-schema Research Hub slice. It is module-local, but it includes bounded feature-local frontend copy because current Research Hub What Changed fallback text and UI smoke still overclaim temporal evidence.

## Owner / Lane / Module

- Architecture owner: Team 03 Architecture Factory
- Future implementation owner: Team 08 UX / Research / Copilot unless Team 00 intentionally routes one bounded Research Hub writer pass elsewhere
- Lane: Cross-lane research aggregation
- Backend module: `research-hub`
- Frontend feature: `research-hub`

## Required Base / Sequencing

- Required accepted base: `CF-W1-RH-01` commit `fd88c62`, or a later `dev` head that already contains it
- Current `dev` on 2026-05-20 does not contain `fd88c62`
- `CF-W1-RH-02A` is a sequencing dependency for truthful What Changed unavailable-basis copy unless Team 00 combines `RH-02A + RH-03` into one writer pass

Do not run `RH-03` in parallel with `RH-01` or `RH-02A`.

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
- implementation from current unstacked `dev` while it lacks `fd88c62`
- parallel Research Hub writers
- `backend/src/modules/research-hub/index.ts`
- `backend/src/modules/research-hub/research-hub.controller.ts`
- `backend/src/modules/research-hub/research-hub.router.ts`
- `frontend/src/features/research-hub/hooks/useResearchOverview.ts`
- `frontend/src/features/research-hub/index.tsx`
- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all upstream module source/tests
- scheduler/journal storage
- durable Research Hub snapshot/history work
- Prisma/schema/migrations
- generated files
- shared backend utilities
- shared frontend components
- package manifests
- provider/live-data integration
- startup/backfill workflows
- paid/cloud, broker, or telemetry flows
- broad Research Hub redesign

## Required Behavior

Future implementation must:

- assign explicit `nextBestAction.sourceModule` ownership instead of inferring from route text;
- stop treating raw signal-count presence as a reliability proxy;
- keep signal trust labels honest through the Research Hub actionability surface and related feature-local copy;
- tighten `dataReadiness` wording so local availability does not read like trusted review readiness;
- use unavailable comparison-basis semantics for What Changed when no auditable prior Research Hub basis exists;
- keep the child additive, no-schema, and research-support only.

Future implementation must not:

- add durable comparison storage or snapshot persistence;
- infer deltas from current `tradeCandidates` alone;
- use Today Review or another upstream module as a surrogate prior basis;
- widen into routes, shared UI, shared utilities, upstream source edits, or package/schema work.

## QA Handoff Needed

Team 04 can prepare QA now.

Minimum scenarios:

- explicit source-owned next-action path;
- raw signal counts present but evidence still limited/unproven;
- honest local-availability wording for data readiness;
- unavailable-basis What Changed path with no stale temporal sentence;
- UI smoke coverage for the feature-local copy change;
- research-support wording with no advice, target, broker, or automation language.

Suggested focused commands after implementation exists:

```powershell
cd backend
npm.cmd test -- --runInBand --runTestsByPath tests/modules/research-hub/research-hub.service.test.ts
```

```powershell
cd frontend
npm.cmd run test:ui -- research-hub.spec.ts --workers=1
```

## True Consent-Blocker Result

No true consent blocker exists for this bounded first child.

If Team 00 later wants durable snapshot/storage for auditable prior-basis replay, split that into a separate consent-gated child and keep `RH-03` no-schema.

## Stop Conditions

Stop and return to Team 00 / Architect if implementation requires:

- starting from a base that omits accepted `RH-01`;
- parallel Research Hub writers;
- any upstream module source or test edit;
- route-registry edits;
- schema, migration, or generated-type changes;
- shared utility or shared UI changes;
- durable overview snapshot persistence;
- package changes;
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry work.

## Next Gate

Team 04 QA planning, then Team 00 Ready evaluation and sequencing.
