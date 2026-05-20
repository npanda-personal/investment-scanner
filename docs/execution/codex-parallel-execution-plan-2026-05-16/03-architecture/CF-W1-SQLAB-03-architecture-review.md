# CF-W1-SQLAB-03 Architecture Review

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Architecture-readiness packet prepared for a bounded first slice.

Readiness result: `Not Ready for Implementation`.

This item remains a draft requirement. This packet does not move it to Ready.

## Evidence Inspected

- `AGENTS.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-SQLAB-03-signal-quality-review-loop-actionability-for-noisy-and-limited-outcomes-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-fresh-direct-value-gaps-2026-05-20.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-01-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-SQLAB-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-SQLAB-02-signal-outcome-journal-post-event-learning-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-SQLAB-02-work-packet.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`
- active-scope conflict references:
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-CF-W1-SQLAB-02A-implementation-assignment.md`
  - `docs/execution/codex-parallel-execution-plan-2026-05-16/16-team-inboxes/TEAM-06-current-assignment.md`

## Current Source Findings

- `signal-quality-lab.service.ts` already derives the core diagnostics this requirement needs:
  - `evidenceUsability`
  - `recommendedAction`
  - `evaluationDiagnostics`
  - `horizonAvailability`
  - noisy issue types and descriptions
  - per-instrument outcome sets
- The module already distinguishes usable, limited, and unavailable evidence, but the current output stops mostly at diagnostics and explanatory text. It does not expose a stable review-loop action code/label packet for downstream reuse.
- The frontend page already renders:
  - selected-horizon evidence usability
  - recommended-action banners
  - noisy signal cards
  - instrument history / outcome rows
  but it does not render a compact actionability chip or follow-up state that clearly tells the user whether to rerun, try a shorter horizon, check price history, or treat the outcome as insufficient for judgment.
- Existing endpoints and query params are already sufficient for the first slice. No new route or frontend API file is required.
- No outcome persistence table exists, and the requirement explicitly keeps durable learning-memory work out of scope.

## Module Ownership

`signal-quality-lab` owns this requirement.

Reasons:

- the review-loop gap sits on top of owned outcome diagnostics and noisy-signal measurements;
- the requirement is about interpreting existing historical measurement for review, not generating signals or calibrating them;
- the feature already owns the user-facing review page that consumes these diagnostics.

## Architecture Verdict

Bounded no-schema, no-route, no-shared-file first slice is feasible.

Recommended first slice:

- module-local backend + feature-local frontend;
- additive actionability metadata derived from current outcome diagnostics only;
- no persistence, no journal write path, no shared UI extraction.

Pure backend-only metadata is technically possible, but it would not satisfy the requirement's direct review-loop user-value surface in one pass. The visible next-step surface should therefore stay inside the existing Signal Quality Lab page.

## Recommended First-Slice Semantics

The first slice should add a stable review-loop packet equivalent to:

- action codes such as:
  - `TRY_SHORTER_HORIZON`
  - `RERUN_AFTER_MORE_DATA`
  - `CHECK_PRICE_HISTORY`
  - `TREAT_AS_INSUFFICIENT_EVIDENCE`
  - `IGNORE_FOR_REVIEW_LOOP`
- compact labels and one-line reason summaries
- additive placement on:
  - overall summary / evaluation diagnostics
  - noisy signal items
  - per-instrument selected-horizon outcome rows where practical

Recommended intent:

- `TRY_SHORTER_HORIZON`: shorter-horizon evidence exists but the selected horizon is not yet evaluable.
- `RERUN_AFTER_MORE_DATA`: current selected horizon is pending because more future rows are required.
- `CHECK_PRICE_HISTORY`: missing or unusable local price history blocks measurement.
- `TREAT_AS_INSUFFICIENT_EVIDENCE`: limited, low-confidence, or small-sample evidence should not drive judgment.
- `IGNORE_FOR_REVIEW_LOOP`: noisy/churning or contradicted signal patterns should not be promoted as useful review evidence.

## Exact Future File Reservations

If Team 00 later promotes a first implementation slice, reserve only:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

## Exact Forbidden Files

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.repository.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.controller.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.router.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.validation.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.routes.test.ts`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.validation.test.ts`
- `frontend/src/features/signal-quality-lab/api/signalQualityLabService.ts`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `backend/src/modules/today-trade-review/**`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope

## Dependency Risks And Stop Conditions

Stop and return to Team 00 if the first slice requires:

- outcome persistence or journal write-path work;
- repository, schema, or route changes;
- signal-generation, calibration, trade-plan, or today-review source changes;
- shared component extraction;
- frontend API or route-file changes.

Specific risk:

- this slice overlaps the active `CF-W1-SQLAB-02A` file set exactly enough that it must not be routed in parallel against that active writer set;
- if Team 00 wants a later child that depends on accepted `SQLAB-02A` journal-preview semantics, keep that dependency explicit instead of widening this packet.

## Sequencing Rule

`CF-W1-SQLAB-03` must be sequenced behind active `CF-W1-SQLAB-02A`.

Reason:

- current active Team 06 `CF-W1-SQLAB-02A` reserves:
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
  - `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
  - `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
  - `frontend/src/features/signal-quality-lab/types.ts`
  - `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
  - `frontend/tests/ui/signal-quality-lab.spec.ts`
- the recommended `SQLAB-03` first slice needs the same file set.

Result:

- not parallel-safe with `SQLAB-02A`
- Team 00 must stack `SQLAB-03` after accepted/branch-local-complete `SQLAB-02A` or assign the same writer in strict sequence

## QA Planning Handoff Notes

Future Team 04 planning should cover:

- shorter-horizon available but selected-horizon unavailable actionability
- pending future-data rerun actionability
- missing price-history actionability
- limited/small-sample or low-confidence insufficient-evidence actionability
- noisy-signal ignore-for-review actionability
- visible page-level and row-level action chips/copy staying research-supportive
- preserved existing diagnostics, evidence usability, and query behavior
