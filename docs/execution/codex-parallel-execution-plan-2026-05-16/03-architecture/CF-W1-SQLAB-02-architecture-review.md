# CF-W1-SQLAB-02 Architecture Review

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Child readiness refined. `CF-W1-SQLAB-02A` is a Ready candidate only after `CF-W1-SQLAB-01` branch-local acceptance on the shared backend `signal-quality-lab` files. `CF-W1-SQLAB-02B` remains proposal-blocked for durable implementation.

`CF-W1-SQLAB-02` cannot satisfy the full durable-journal requirement inside the current no-schema boundary. A bounded no-schema first slice is source-supported as an additive derived journal preview inside `signal-quality-lab`, and it can be routed as the next sequenced child after `CF-W1-SQLAB-01`. Durable post-event learning storage remains blocked pending explicit schema/repository/generated consent because there is still no module-owned persistence surface for the journal.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-requirement.md`
- `10-requirements/requirements-backlog.md`
- `10-requirements/refinement-queue.md`
- `12-ready-queue/ready-for-implementation.md`
- `03-architecture/module-ownership-map.md`
- `00-control/active-work-board.md`
- `99-decision-inbox/open-decisions.md`
- `03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- `06-contracts/CF-W1-SQLAB-01-signal-quality-outcome-confidence-contract.md`
- `03-architecture/CF-W1-CAL-01-architecture-review.md`
- `backend/prisma/schema.prisma`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `backend/src/modules/signal-generation-engine/signal-generation-engine.md`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.md`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Current Source Findings

- `signal-quality-lab` calculates outcomes on demand. Its repository `recalculate()` path explicitly returns `persistedOutcomes: false`, and the module doc says no `SignalOutcome` table exists in this MVP.
- Backend and frontend `SignalOutcomeSet` types expose measured forward-return data only. There is no journal-entry DTO, lesson-note field, or persistence status field today.
- The existing instrument-history workflow already joins signal history and outcome rows by `signalResultId` and selected horizon on the `Signal Quality Lab` page, so a bounded derived journal preview can be rendered without route-registry changes.
- The frontend already loads instrument history and outcomes through the existing `fetchSignalHistory(...)` and `fetchSignalOutcomes(...)` calls, so additive preview fields do not require new endpoints, new query params, or frontend API-client behavior changes.
- Prisma currently provides no `signal-quality-lab` owned persistence model. `SignalResult` stores raw signal fields plus `scoringInputSummary` and `dataQualityEligibilitySnapshot`, but no post-event learning or journal field exists there.
- Reusing `SignalResult` for journal persistence would cross module ownership into `signal-generation-engine` and would mix raw signal generation with post-event learning state.
- `TodayReviewRun.sourceSnapshot` shows the repo can persist additive JSON when a module already owns a persisted row, but `signal-quality-lab` has no equivalent owned row to extend in the first slice.
- `SignalCalibrationResult` is persisted, but it is owned by `signal-calibration-engine` and keyed to calibration results rather than one journal entry per measured signal-result and horizon scope.

## Module Boundary Review

`signal-quality-lab` should own post-event learning interpretation because it already owns:

- forward outcome measurement;
- selected-horizon maturity and missing-history diagnostics;
- research-support explanations attached to outcome views.

It does not own a durable storage row for journal state. Durable note persistence must not be hidden inside `signal-generation-engine`, `signal-calibration-engine`, or unrelated review modules.

## Architecture Decision

Prepare `CF-W1-SQLAB-02` as a split requirement:

1. `CF-W1-SQLAB-02A` no-schema first slice:
   - additive derived journal preview only;
   - computed from existing `SignalOutcomeSet` data;
   - rendered in the existing `signal-quality-lab` instrument-history workflow;
   - explicitly marked as not persisted.
2. `CF-W1-SQLAB-02B` durable post-event learning storage:
   - future storage packet only;
   - blocked pending explicit storage approval because there is no current module-owned persisted row for journal entries.

The first slice should add stable preview metadata equivalent to:

```ts
type SignalOutcomeJournalStatus =
  | 'EVALUATED'
  | 'INSUFFICIENT_FUTURE_DATA'
  | 'MISSING_PRICE_HISTORY';

type SignalOutcomeJournalLessonLabel =
  | 'FAVORABLE_FOLLOW_THROUGH'
  | 'ADVERSE_FOLLOW_THROUGH'
  | 'FLAT_FOLLOW_THROUGH'
  | 'PENDING_FUTURE_DATA'
  | 'MISSING_PRICE_HISTORY';

interface SignalOutcomeJournalPreview {
  scopeType: 'SIGNAL_RESULT_HORIZON';
  status: SignalOutcomeJournalStatus;
  lessonLabel: SignalOutcomeJournalLessonLabel;
  lessonSummary: string;
  persistenceStatus: 'DERIVED_NOT_PERSISTED';
}
```

Recommended first-pass mapping:

- `EVALUATED` + `FAVORABLE_FOLLOW_THROUGH`: selected-horizon outcome is available and the forward move aligned with the original bullish/bearish direction.
- `EVALUATED` + `ADVERSE_FOLLOW_THROUGH`: selected-horizon outcome is available and the forward move contradicted the original direction.
- `EVALUATED` + `FLAT_FOLLOW_THROUGH`: selected-horizon outcome is available but too close to flat to describe as aligned or contradicted.
- `INSUFFICIENT_FUTURE_DATA` + `PENDING_FUTURE_DATA`: price history exists, but the selected horizon is not mature yet.
- `MISSING_PRICE_HISTORY` + `MISSING_PRICE_HISTORY`: no usable local price history exists for the measured signal.

This keeps the first slice bounded, research-support oriented, and honest about durability.

## Ready-Candidate Decision

`CF-W1-SQLAB-02A` is a Ready candidate, not a promoted Ready item, with these exact sequencing conditions:

- `CF-W1-SQLAB-01` must reach branch-local acceptance first because both packets reserve `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, `signal-quality-lab.md`, and `signal-quality-lab.service.test.ts`.
- Team 00 must route `CF-W1-SQLAB-02A` on top of the accepted `CF-W1-SQLAB-01` branch/worktree or assign the same writer to both packets in strict sequence. It must not run as a parallel writer against those shared backend files.
- Team 04 already prepared the child QA plan for this exact no-schema slice. No additional architecture split is needed before Ready review.

`CF-W1-SQLAB-02B` is still proposal-blocked because durable post-event learning has no owned persistence row in `signal-quality-lab` and would need explicit consent for Prisma/schema, repository mapping, generated artifacts, and storage ownership.

## Exact Future File Reservations

For the `CF-W1-SQLAB-02A` no-schema child only:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Forbidden Files

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
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-market, paid/cloud, broker, or telemetry flows

## Dependency And Conflict Notes

- This first slice does not need Prisma, route, shared DTO, frontend API-client, package, generated, or provider approval.
- Durable journal persistence remains blocked because no owned storage surface exists inside `signal-quality-lab`.
- The packet shares `signal-quality-lab.service.ts`, `signal-quality-lab.types.ts`, `signal-quality-lab.md`, and the service test with `CF-W1-SQLAB-01`. Team 00 must combine or sequence those packets; they must not run as parallel writers. Branch-local acceptance of `CF-W1-SQLAB-01` is the gate for this child to become implementation-eligible.
- `CF-W1-CAL-01` is a semantic downstream consumer only. It is not a file-set blocker for the no-schema preview slice.

## Required QA Scenarios

Team 04 should plan for:

- bullish or bearish measured outcomes that map to favorable follow-through;
- measured outcomes that map to adverse follow-through;
- flat selected-horizon outcomes that avoid overclaiming confirmation;
- pending selected-horizon outcomes with sufficient start-history but insufficient future rows;
- missing local price-history cases;
- explicit UI copy that marks the journal preview as derived and not yet persisted;
- additive compatibility of current signal-history and outcome responses.

## Readiness Result

- `CF-W1-SQLAB-02A`: Ready candidate after `CF-W1-SQLAB-01` branch-local acceptance and Team 00 sequencing on the shared backend files.
- `CF-W1-SQLAB-02B`: proposal-blocked for future storage approval.

Do not promote the full parent requirement. Team 00 should either promote `CF-W1-SQLAB-02A` as the next sequenced no-schema child or keep working a separate storage approval packet for `CF-W1-SQLAB-02B`.
