# CF-W1-TSC-03 Architecture Review

Date: 2026-05-24

Owner: Team 03 - Architecture Factory

## Status

Docs-only architecture prep completed.

Current verdict: split child `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` is promotable after Team 00 recorded accepted `CF-W1-TSC-02A-TREV-HEALTH` commit `34c9993` as the required base.

`CF-W1-TSC-03` should not move as one unsplit parent packet. The honest executable path is one bounded Today Review child:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`

That child is technically feasible without schema, route, shared UI, shared backend utility, package, generated-file, provider/live-data, startup/backfill, or persistence-contract changes. The prior Team 07 writer-set blocker is cleared by local branch commit `34c9993`.

## Evidence Inspected

- `AGENTS.md`
- `10-requirements/CF-W1-TSC-03-today-review-supporting-trust-evidence-requirement.md`
- `10-requirements/next-top-10-candidates.md`
- `03-architecture/CF-W1-DQ-03-architecture-review.md`
- `06-contracts/CF-W1-DQ-03-data-quality-residual-reason-summary-contract.md`
- `08-work-packets/CF-W1-DQ-03-work-packet.md`
- `03-architecture/CF-W1-CAL-01A-architecture-review.md`
- `06-contracts/CF-W1-CAL-01A-signal-calibration-dq-readiness-gate-contract.md`
- `08-work-packets/CF-W1-CAL-01A-work-packet.md`
- `17-team-outboxes/TEAM-03-CF-W1-CAL-01A-architecture.md`
- `03-architecture/CF-W1-BT-04-architecture-review.md`
- `06-contracts/CF-W1-BT-04-backtesting-run-current-proof-freshness-contract.md`
- `08-work-packets/CF-W1-BT-04-work-packet.md`
- `09-summaries/CF-W1-BT-04-po-acceptance-packet.md`
- `03-architecture/CF-W1-TSC-01A-architecture-review.md`
- `06-contracts/CF-W1-TSC-01A-trigger-evidence-adoption-contract.md`
- `03-architecture/CF-W1-TSC-02-architecture-review.md`
- `06-contracts/CF-W1-TSC-02-active-signal-health-rule-evidence-contract.md`
- `08-work-packets/CF-W1-TSC-02-work-packet.md`
- `04-qa/CF-W1-TSC-02A-TREV-HEALTH-qa-plan.md`
- `17-team-outboxes/TEAM-03-CF-W1-TSC-02-architecture-outbox.md`
- `17-team-outboxes/TEAM-00-orchestrator-integration-outbox.md`
- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/src/modules/signal-calibration-engine/signal-calibration-engine.types.ts`
- `backend/src/modules/signal-calibration-engine/index.ts`
- `backend/src/modules/data-quality-engine/index.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Current-State Findings

### 1. The first honest child shares the active Team 07 writer set

`CF-W1-TSC-03` must project its evidence on the same Today Review backend/frontend files already reserved by active `CF-W1-TSC-02A-TREV-HEALTH`:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

Because Team 07 is actively writing that exact set in a stacked worktree for `TSC-02A`, `TSC-03` is blocked by single-writer sequencing even though the child boundary itself is small and honest.

### 2. The child can stay inside Today Review only

Today Review already carries additive snapshot surfaces that can host the supporting evidence chain without repository, route, or schema edits:

- `dataQualitySnapshot`
- `sourceSignalSnapshot`
- `strategyProofSnapshot`
- `explainability`

The current service already calls module-owned public read paths for Data Quality and Calibration. It can add a Today Review-owned supporting-trust projection without changing those upstream modules.

### 3. Data Quality residual support is optional, not a source-edit dependency

`CF-W1-DQ-03` defines a compact DQ-owned residual summary for downstream trust consumers, but the current requirement already allows explicit unavailable language when that packet is absent from the chosen implementation base.

That means:

- if `DQ-03` fields are present on the chosen base, Today Review should reuse them directly;
- if they are absent, Today Review must show the latest DQ status and an explicit residual-summary unavailable state;
- it must not recreate DQ residual logic inside Today Review.

### 4. Calibration evidence is already available in bounded form

Current source already exposes `calibrationReadiness.status`, `downstreamInfluence`, `reasons`, and `blockers` through `SignalCalibrationResultDto`.

Accepted `CF-W1-CAL-01A` adds richer trust semantics such as `trustState` and `dqGateState`, but those are optional for the first TSC-03 child:

- if the chosen base includes `CAL-01A`, surface those module-owned semantics directly;
- otherwise reuse the existing module-owned readiness/downstream-influence fields and mark richer trust-state details unavailable.

No calibration source edit is required for the Today Review child.

### 5. Backtesting proof currentness can remain additive and fail closed

Accepted `CF-W1-BT-04` adds module-owned backtesting current-proof labels. Current `dev` source does not yet show those fields, but the requirement already permits explicit unavailable labeling when they are absent from the implementation base.

Today Review can stay bounded by following this rule:

- if the chosen base includes accepted `BT-04` current-proof fields on Backtesting public reads, reuse those labels directly;
- otherwise show backtesting proof currentness as unavailable;
- do not derive new stale/current/historical proof labels inside Today Review.

That preserves honest trust semantics without opening backtesting source edits in this child.

### 6. The child must stay separate from active health

`CF-W1-TSC-02A-TREV-HEALTH` owns current active-signal health semantics.

`CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE` must not:

- redefine health states;
- merge supporting trust evidence into a new health score;
- add a new ranking engine;
- reinterpret calibration or backtesting evidence into advice-like prioritization.

It may only add compact DQ/calibration/backtesting support evidence alongside the accepted Today Review candidate and health story.

## Architecture Decision

Split `CF-W1-TSC-03` into one bounded Today Review child:

- `CF-W1-TSC-03A-TREV-SUPPORTING-EVIDENCE`

The child should be:

- Today Review-owned;
- additive on accepted Trusted Signal Candidate and active-health projections;
- read-path only;
- one-writer across the existing Today Review backend/frontend reservation;
- conservative when upstream trust slices are absent from the chosen base.

## Proposed Additive Projection

The child should add one stable supporting-trust projection equivalent to:

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

Exact field names may differ. The semantics must remain stable:

- module-owned meaning only;
- explicit unavailable/missing states when the chosen base cannot prove a block;
- no aggregate score.

## Required Base And Sequencing

### Hard sequencing rule

Do not promote or implement this child while Team 07 still owns the Today Review writer set for `CF-W1-TSC-02A-TREV-HEALTH`.

### Required Today Review base

The child must stack on the accepted outcome of `CF-W1-TSC-02A-TREV-HEALTH`, not plain `dev`.

That base already carries:

- accepted `CF-W1-TSC-01A-TREV` candidate semantics from commit `9fbc989`;
- Team 07 Today Review language cleanup away from Trade Plan-first trust wording;
- active-health fields that `TSC-03` must remain compatible with.

### Optional richer bases

If Team 00 chooses a base that also includes accepted upstream trust slices, reuse them directly:

- `CF-W1-DQ-03` for residual summary
- `CF-W1-CAL-01A` for calibration `trustState` and `dqGateState`
- `CF-W1-BT-04` for backtesting proof currentness

If those slices are absent from the chosen base, the child remains honest only with explicit unavailable labeling. It must not recreate their logic.

## Exact Future File Reservations

Allowed implementation files after Team 00 clears the active writer:

- `backend/src/modules/today-trade-review/today-trade-review.types.ts`
- `backend/src/modules/today-trade-review/today-trade-review.service.ts`
- `backend/src/modules/today-trade-review/today-trade-review.md`
- `backend/tests/modules/today-trade-review/today-trade-review.service.test.ts`
- `frontend/src/features/today-trade-review/types.ts`
- `frontend/src/features/today-trade-review/components/TodayReviewPage.tsx`
- `frontend/src/features/today-trade-review/components/TodayReviewCandidateDetailPage.tsx`
- `frontend/tests/ui/today-trade-review.spec.ts`

## Exact Forbidden Files

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
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/signal-calibration-engine/**`
- `backend/src/modules/backtesting-strategy-lab/**`
- `backend/src/modules/signal-generation-engine/**`
- `backend/src/modules/strategy-decision-engine/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- all upstream/downstream source and tests outside the allowed Today Review file set
- provider/live-data, startup/backfill, paid/cloud, broker, telemetry, or credential files

## Stop Conditions

Stop and return this child to Team 00 / Architect if truthful implementation requires:

- schema, migration, or generated-file changes;
- repository/controller/router/validation/index edits;
- route or route-registry changes;
- shared UI or shared backend utility edits;
- package changes;
- upstream module source edits to DQ, Calibration, Backtesting, Signal Generation, Strategy Decision, or Trade Plan;
- a new score, ranking formula, or advice-like prioritization layer;
- health-state rewrites that belong to `CF-W1-TSC-02A`.

## QA Handoff Notes

Future Team 04 planning should verify:

- full evidence present on a base that includes DQ residual, calibration readiness, and BT current-proof fields;
- DQ blocked with visible hard gate and no silent upgrade;
- DQ residual summary unavailable when `DQ-03` is absent from the chosen base;
- calibration `USABLE`, `LIMITED`, and `UNAVAILABLE` display from module-owned readiness semantics;
- calibration `trustState` / `dqGateState` display only when `CAL-01A` is present on the chosen base;
- backtesting `CURRENT_PROOF`, `STALE_PROOF`, `REPAIRED_HISTORICAL`, and `LIMITED_HISTORICAL_PROOF` only when `BT-04` is present on the chosen base;
- explicit unavailable backtesting proof-currentness when `BT-04` is absent from the chosen base;
- mixed-source missing evidence without new heuristics;
- same supporting-trust story in list and detail for the same candidate;
- no target price, reward/risk, Trade Plan-first, new ranking, or direct-advice wording on touched surfaces;
- no drift of accepted `TSC-02A` health semantics.

## Ready Recommendation

Current result: `promoted by Team 00 as split child`.

Team 00 selected this base choice:

1. accepted `TSC-02A` commit `34c9993` with explicit unavailable fallback for any absent `DQ-03` / `CAL-01A` / `BT-04` fields.
