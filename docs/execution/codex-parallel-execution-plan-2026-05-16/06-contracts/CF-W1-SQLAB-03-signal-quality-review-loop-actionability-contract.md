# CF-W1-SQLAB-03 Signal Quality Review-Loop Actionability Contract

Date: 2026-05-20

Owner: Team 03 Architecture Factory

## Status

Draft architecture contract for a bounded first slice. Not Ready for Implementation.

## Contract Intent

Signal Quality Lab must turn noisy, limited, and unavailable historical outcome evidence into a clear review-oriented next step without changing outcome math, horizon availability logic, query behavior, or persistence shape.

The first slice exists to answer:

- should the user try a shorter horizon,
- wait and rerun after more data,
- check missing price history,
- treat the outcome as insufficient for judgment,
- or ignore the signal for the review loop because the pattern is too noisy.

## Ownership

`signal-quality-lab` owns this contract.

Signal Generation, Signal Calibration, and Trade Plan consume these outputs later but must not own the first review-loop actionability dialect.

## Required First-Slice Boundary

Allowed future implementation boundary:

- `backend/src/modules/signal-quality-lab/signal-quality-lab.service.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.types.ts`
- `backend/src/modules/signal-quality-lab/signal-quality-lab.md`
- `backend/tests/modules/signal-quality-lab/signal-quality-lab.service.test.ts`
- `frontend/src/features/signal-quality-lab/types.ts`
- `frontend/src/features/signal-quality-lab/components/SignalQualityLabPage.tsx`
- `frontend/tests/ui/signal-quality-lab.spec.ts`

Forbidden:

- Prisma/schema/migrations;
- repository/controller/router/validation edits;
- frontend API or route file edits;
- signal-generation, signal-calibration, trade-plan, or today-review source edits;
- route-registry, shared utility, shared UI, package, generated, provider/live-data, startup/backfill, paid/cloud, broker, or telemetry scope.

## Required Additive Semantics

The first slice must preserve current fields and add review-loop actionability metadata only.

Recommended additive shape:

```ts
type SignalQualityReviewActionCode =
  | 'TRY_SHORTER_HORIZON'
  | 'RERUN_AFTER_MORE_DATA'
  | 'CHECK_PRICE_HISTORY'
  | 'TREAT_AS_INSUFFICIENT_EVIDENCE'
  | 'IGNORE_FOR_REVIEW_LOOP';

interface SignalQualityReviewAction {
  actionCode: SignalQualityReviewActionCode;
  actionLabel: string;
  reasonSummary: string;
}
```

Recommended additive placement:

```ts
interface EvaluationDiagnostics {
  // existing fields preserved
  reviewAction?: SignalQualityReviewAction;
}

interface NoisySignalItem {
  // existing fields preserved
  reviewAction?: SignalQualityReviewAction;
}

interface SignalOutcomeSet {
  // existing fields preserved
  selectedHorizonReviewAction?: SignalQualityReviewAction;
}
```

Exact names may differ. The semantics must not.

## Required Mapping Rules

- `TRY_SHORTER_HORIZON`
  - selected horizon is unavailable;
  - shorter-horizon evidence exists and is already evaluable.

- `RERUN_AFTER_MORE_DATA`
  - selected horizon is unavailable because more future trading rows are needed;
  - missing price history is not the primary blocker.

- `CHECK_PRICE_HISTORY`
  - missing or unusable local price history is the primary blocker for current measurement.

- `TREAT_AS_INSUFFICIENT_EVIDENCE`
  - evidence is limited, low-confidence, or too small-sample to support a confident review judgment.

- `IGNORE_FOR_REVIEW_LOOP`
  - the record is noisy or contradictory enough that the user should not promote it as useful review evidence in this slice.

## Required Reason-Summary Rule

Add one concise reason summary built only from existing module evidence:

- `evidenceUsability`
- `evaluationDiagnostics`
- `horizonAvailability`
- noisy issue type / description
- selected-horizon availability
- current confidence / sample state already exposed in-module

Required precedence:

1. missing price history
2. shorter-horizon already available
3. insufficient future rows
4. noisy/churning contradiction
5. low-confidence or small-sample limitation

The first child must not invent new scoring or change existing diagnostics just to produce the actionability label.

## Required UI Contract

The existing Signal Quality Lab page must show the additive actionability packet on owned surfaces only:

- overview / selected-horizon diagnostic state
- noisy signal cards
- instrument history selected-horizon outcome row where practical

The UI may use compact chips or inline labels, but it must keep research-support wording and avoid direct advice or target-like language.

## Compatibility Rules

- preserve current outcome calculations
- preserve current `recommendedAction`, `evidenceUsability`, `evaluationDiagnostics`, `horizonAvailability`, and noisy issue detection
- preserve current routes, query params, and endpoint usage
- keep all new fields additive only

## Sequencing Rule

`CF-W1-SQLAB-03` must be sequenced behind active `CF-W1-SQLAB-02A`.

Why:

- both packets reserve the same `signal-quality-lab` backend and frontend files;
- one-writer-per-file remains mandatory.

Team 00 may stack this child on top of the accepted or branch-local-complete `SQLAB-02A` worktree. It must not run as a parallel writer against the active `SQLAB-02A` file set.

## Explicit Rejection In This Pass

Reject the following from `CF-W1-SQLAB-03`:

- outcome persistence or journal write paths
- schema/repository/generated changes
- route/controller/validation changes
- frontend API or route changes
- signal-generation, calibration, trade-plan, or today-review expansion
- shared UI extraction

If any of that becomes necessary, stop and return the item to Team 00 / Architect as a new child or blocker.

## Test Contract

Focused tests must prove:

- shorter-horizon actionability
- rerun-after-more-data actionability
- missing-price-history actionability
- insufficient-evidence actionability for limited/noisy cases
- ignore-for-review actionability on noisy issue rows
- visible page rendering with no regression to existing diagnostics or query behavior

