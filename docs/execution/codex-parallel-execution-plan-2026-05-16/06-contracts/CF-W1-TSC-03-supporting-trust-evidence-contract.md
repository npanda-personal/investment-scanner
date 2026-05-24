# CF-W1-TSC-03 Supporting Trust Evidence Contract

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

## Status

Split-child contract prepared for docs-only readiness.

Current verdict: `blocked by active writer sequencing`.

This contract applies to the bounded child:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`

## Purpose

Define one additive Today Review supporting-trust projection so the user can see, for the same candidate and in the same `/today-review` workflow:

- latest Data Quality trust evidence;
- calibration readiness evidence; and
- backtesting proof-currentness evidence;

without opening separate module pages and without creating a new score, health state, or ranking formula.

This remains research-support only. It must not become a Trade Plan-first workflow, target-price workflow, reward/risk workflow, direct-action workflow, broker workflow, or automated trade instruction.

## Required Base

The child must stack on the accepted outcome of `CF-W1-TSC-02A-TREV-HEALTH`, not plain `dev` and not the currently active Team 07 writer worktree while that writer set is reserved.

Optional richer base behavior:

- if the chosen base includes `CF-W1-DQ-03`, reuse DQ residual summary fields directly;
- if the chosen base includes `CF-W1-CAL-01A`, reuse calibration `trustState` and `dqGateState` directly;
- if the chosen base includes accepted `CF-W1-BT-04`, reuse BT current-proof labels directly.

If any of those slices are absent from the chosen base, the child must render explicit unavailable or missing states. It must not recreate their logic inside Today Review.

## Scope

### In scope

- Today Review candidate-row supporting-trust indicators
- Today Review candidate-detail supporting-trust section
- additive Today Review backend/frontend types
- additive Today Review service projection
- focused Today Review service and UI smoke coverage

### Out of scope

- new persistence
- repository/controller/router/validation/index edits
- route changes
- route-registry edits
- shared backend utilities
- shared frontend UI
- schema or migrations
- package or generated-file changes
- upstream module source changes
- new page or new monitor route
- durable evidence history
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential work
- `CF-W1-TSC-02A` health-state redefinition
- any composite trust score, ranking, or advice-like prioritization

## Allowed Files

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Forbidden Files

- `backend/src/modules/today-trade-review/today-trade-review.repository.ts`
- `backend/src/modules/today-trade-review/today-trade-review.controller.ts`
- `backend/src/modules/today-trade-review/today-trade-review.router.ts`
- `backend/src/modules/today-trade-review/today-trade-review.validation.ts`
- `backend/src/modules/today-trade-review/index.ts`
- `backend/tests/modules/today-trade-review/today-trade-review.controller.test.ts`
- `frontend/src/features/today-trade-review/api/**`
- `frontend/src/features/today-trade-review/hooks/**`
- `frontend/src/features/today-trade-review/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- generated files
- Prisma schema or migrations
- all source/tests outside the allowed Today Review file set

## Additive Projection Contract

The child should add semantics equivalent to:

```ts
type SupportingEvidenceAvailability =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'MISSING'
  | 'UNSUPPORTED';

interface TodayReviewDataQualitySupport {
  sourceModule: 'Data Quality Engine';
  availability: SupportingEvidenceAvailability;
  status: string | null;
  residualCategory: string | null;
  residualSummary: string | null;
  evidenceDate: string | null;
  reasons: string[];
}

interface TodayReviewCalibrationSupport {
  sourceModule: 'Signal Calibration Engine';
  availability: SupportingEvidenceAvailability;
  status: string | null;
  downstreamInfluence: string | null;
  trustState: string | null;
  dqGateState: string | null;
  evidenceDate: string | null;
  reasons: string[];
  blockers: string[];
}

interface TodayReviewBacktestingSupport {
  sourceModule: 'Backtesting Strategy Lab';
  availability: SupportingEvidenceAvailability;
  status: string | null;
  summary: string;
  reasonCodes: string[];
  runGeneratedAt: string | null;
  latestComparableRunGeneratedAt: string | null;
}

interface TodayReviewSupportingTrustEvidence {
  dataQuality: TodayReviewDataQualitySupport;
  calibration: TodayReviewCalibrationSupport;
  backtesting: TodayReviewBacktestingSupport;
}
```

Exact names may differ. The semantics must remain stable.

The projection may be stored on the candidate DTO or equivalent list/detail projection fields, but list and detail must tell the same story for the same candidate.

## Required Source Rules

### Data Quality

- Reuse current module-owned DQ status already available on the Today Review candidate.
- Reuse `CF-W1-DQ-03` residual fields only when they exist on the chosen base.
- If `DQ-03` fields are absent, keep `status` visible and set residual summary availability to unavailable.
- Do not create a new DQ interpretation taxonomy inside Today Review.
- DQ remains the hard gate. Missing, blocked, or unsupported DQ must not silently upgrade a candidate or health story.

### Calibration

- Reuse current module-owned `calibrationReadiness.status`, `downstreamInfluence`, `reasons`, and `blockers` when available.
- Reuse `trustState` and `dqGateState` only when the chosen base includes accepted `CF-W1-CAL-01A`.
- If those richer fields are absent, mark them unavailable. Do not synthesize them.
- Do not reinterpret calibration into a new aggregate trust score.

### Backtesting

- Reuse accepted `CF-W1-BT-04` current-proof labels only when those fields exist on the chosen base.
- If `BT-04` fields are absent, the backtesting block must render as unavailable.
- Do not derive stale/current/historical proof labels inside Today Review.
- Do not imply walk-forward, holdout, forward-validation, or guaranteed predictive proof the product does not own.

## List And Detail Rules

- Candidate row indicators may be compact, but they must preserve the same meaning as detail.
- Candidate detail must expose the full three-block supporting evidence chain.
- Missing evidence must be explicit.
- The same candidate must not tell a different trust story between list and detail.

## Compatibility Rules

- Existing Today Review routes remain unchanged.
- Existing Today Review persisted rows remain readable.
- Older rows that lack the new support fields must render conservatively and not fail.
- New fields are additive only.
- Existing `CF-W1-TSC-02A` health fields, if present on the chosen base, remain backward-compatible and separate from this support projection.

## Explicit Non-Goals

- No new health-state set
- No new ranking score
- No new composite trust score
- No target price or profit target display
- No reward/risk or Trade Plan geometry as support evidence
- No upstream source edits to DQ, Calibration, or Backtesting modules

## Stop Conditions

Stop and split again if truthful implementation requires:

- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry edits;
- shared UI or shared backend utility edits;
- package changes;
- upstream source edits;
- BT/DQ/Calibration logic recreation inside Today Review;
- health-state rewrites belonging to `TSC-02A`.

## One-Writer Rule

One writer only across the full Today Review backend/frontend reservation.

Do not run this child in parallel with any other Today Review source packet.

## Readiness Note

As of 2026-05-24:

- parent `CF-W1-TSC-03` is not Ready;
- child `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is the only honest executable path;
- implementation remains blocked until Team 07 clears the active `TSC-02A` Today Review writer set and Team 00 records the selected post-`TSC-02A` base.
