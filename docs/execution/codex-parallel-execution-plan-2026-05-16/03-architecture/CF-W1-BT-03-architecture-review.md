# CF-W1-BT-03 Architecture Review

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate. Smallest no-schema/no-shared first child is feasible.

This is a docs-only readiness result. Team 04 QA handoff and Team 00 Ready promotion are still required before any application-code pass.

This packet stays separate from:

- `CF-W1-BT-02` review-disposition normalization
- `CF-W1-BT-01A` DQ characterization

If implementation pressure pulls those packets together, Team 00 must make that sequencing decision explicitly instead of silently widening this child.

## Evidence Inspected

- `AGENTS.md`
- `docs/instructions.md`
- `docs/module-verification-register.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/10-requirements/CF-W1-BT-03-backtesting-proof-basis-overfit-guardrail-requirement.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-01A-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-01A-backtesting-dq-fail-closed-characterization-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-01A-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/03-architecture/CF-W1-BT-02-architecture-review.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/06-contracts/CF-W1-BT-02-backtesting-outcome-review-traceability-contract.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/08-work-packets/CF-W1-BT-02-work-packet.md`
- `docs/execution/codex-parallel-execution-plan-2026-05-16/11-module-audits/audit-backtesting-trade-risk.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`

## Current Source Findings

- The module doc already states that `backtesting-strategy-lab` does not own walk-forward optimization, Monte Carlo, or advanced quant research. That is the correct hard boundary for this child.
- The service already computes the module-local evidence needed for an honest proof-basis guardrail:
  - `availabilityStatus`
  - `numberOfTrades`
  - `dataCoverage` and `dataCoveragePercent`
  - `benchmarkComparison`
  - `exitDiagnostics`
  - `realismWarnings`
  - `calculationAudit`
- The service already emits weak-evidence warnings for:
  - low trade count
  - heavy end-of-test exits
  - low data coverage
  - benchmark gap
  - large drawdown
- The selected-run detail already renders most of that evidence, but no field explicitly says that current proof is single-window-only and lacks holdout, walk-forward, and parameter-sensitivity validation.
- The saved-run list currently collapses the story further to `status` plus `Legacy invalid` or `totalReturn`, so the list cannot carry the same proof-basis story as detail without an additive projection.
- Nothing in the current source suggests that the first child needs a validation engine, schema work, route changes, shared UI, or simulation-math rewrite. The gap is framing and normalization of evidence that already exists.

## Architecture Decision

Prepare `CF-W1-BT-03` as one bounded `backtesting-strategy-lab` packet that adds proof-basis metadata derived from current module evidence only.

The first child should add additive module-local DTO fields equivalent to:

```ts
type BacktestProofReliabilityStatus =
  | 'REVIEW_ONLY'
  | 'WEAK_EVIDENCE'
  | 'DO_NOT_USE_FOR_RELIABILITY';

type BacktestProofBasisReason =
  | 'SINGLE_WINDOW_ONLY'
  | 'NO_HOLDOUT_VALIDATION'
  | 'NO_WALK_FORWARD_VALIDATION'
  | 'NO_PARAMETER_SENSITIVITY_EVIDENCE'
  | 'LOW_SAMPLE_SIZE'
  | 'NO_TRADES'
  | 'INSUFFICIENT_HISTORY'
  | 'WEAK_EXIT_DISTRIBUTION'
  | 'BENCHMARK_GAP'
  | 'LOW_DATA_COVERAGE'
  | 'LEGACY_INVALID_AGGREGATE';

interface BacktestProofBasis {
  reliabilityStatus: BacktestProofReliabilityStatus;
  singleWindowStatus: 'SINGLE_WINDOW_ONLY';
  holdoutValidationStatus: 'NOT_RUN';
  walkForwardValidationStatus: 'NOT_RUN';
  parameterSensitivityStatus: 'NOT_RUN';
  sampleEvidenceStatus: 'ADEQUATE' | 'LOW_TRADES' | 'NO_TRADES';
  proofBasisSummary: string;
  proofBasisReasons: BacktestProofBasisReason[];
}

interface BacktestMetrics {
  proofBasis?: BacktestProofBasis;
}
```

Exact field names may differ, but the behavior must remain stable.

This packet must stay separate from any BT-02 `reviewDisposition` field set. The child may coexist with that later work, but it must not depend on BT-02 landing first in order to be internally coherent.

## Required Mapping Rules

- Every current completed run must explicitly disclose:
  - `singleWindowStatus = SINGLE_WINDOW_ONLY`
  - `holdoutValidationStatus = NOT_RUN`
  - `walkForwardValidationStatus = NOT_RUN`
  - `parameterSensitivityStatus = NOT_RUN`
- `sampleEvidenceStatus`
  - `NO_TRADES` when `numberOfTrades = 0`
  - `LOW_TRADES` when `numberOfTrades > 0` and `< 10`
  - `ADEQUATE` otherwise
- `reliabilityStatus = DO_NOT_USE_FOR_RELIABILITY`
  - failed runs
  - `availabilityStatus = ERROR`
  - `availabilityStatus = INSUFFICIENT_HISTORY`
  - `calculationAudit.aggregateStatus = LEGACY_INVALID`
  - `numberOfTrades = 0`
- `reliabilityStatus = WEAK_EVIDENCE`
  - usable aggregate proof exists; and
  - one or more current weak-evidence conditions apply:
    - `numberOfTrades < 10`
    - `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE`
    - `exitDiagnostics.endOfTestExitPercent >= 0.4`
    - `dataCoveragePercent` below the current preferred threshold
- `reliabilityStatus = REVIEW_ONLY`
  - completed run
  - no withheld/invalid aggregate proof
  - no no-trade or insufficient-history blocker
  - no weak-evidence gate
  - still explicitly historical-only because all current runs remain single-window-only without broader validation evidence

`proofBasisSummary` must stay concise and user-facing. It should always tell the truth that the run is historical single-window evidence only and that broader validation has not been performed.

## UI Projection Rules

- The saved-run list must show the same proof-basis label and summary that the selected-run detail shows for the same run.
- Existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit panels remain visible as supporting evidence.
- No new page, route, shared UI component, API client, hook, or navigation change is required.
- The UI wording must stay research-support oriented and must not imply validated certainty, direct advice, or forward-proof that the system does not have.

## Exact Future File Reservations

Allowed files for the bounded first child only:

- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.types.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.md`
- `backend/tests/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.test.ts`
- `frontend/src/features/backtesting-strategy-lab/types.ts`
- `frontend/src/features/backtesting-strategy-lab/components/BacktestingStrategyLabPage.tsx`
- `frontend/tests/ui/backtesting-strategy-lab.spec.ts`

## Explicitly Forbidden Files

- application source or tests before Team 00 promotion
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/**`
- generated Prisma client or generated types
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.repository.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.controller.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.router.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.validation.ts`
- `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.module.ts`
- `backend/src/modules/backtesting-strategy-lab/index.ts`
- `backend/src/modules/data-quality-engine/**`
- `backend/src/modules/market-data-foundation/**`
- `backend/src/modules/strategy-framework/**`
- `backend/src/modules/trade-plan-risk-engine/**`
- `frontend/src/features/backtesting-strategy-lab/api/backtestingStrategyLabService.ts`
- `frontend/src/features/backtesting-strategy-lab/hooks/useBacktestingStrategyLab.ts`
- `frontend/src/features/backtesting-strategy-lab/routes.tsx`
- backend and frontend route registries
- shared backend utilities
- shared frontend components
- package manifests
- any shared or generated source-contract file

## Explicitly Blocked Change Classes

- no walk-forward engine
- no holdout engine
- no parameter sweep or optimizer
- no Monte Carlo or advanced quant expansion
- no Prisma/schema/migration/generated-file change
- no repository/controller/router/validation or route-registry change
- no shared UI or shared backend utility change
- no cross-module source-contract change
- no simulation-math, benchmark-math, or ranking-model rewrite
- no BT-02 review-disposition merge in this first child
- no BT-01A DQ policy change in this first child

If implementation pressure creates any of those needs, stop and split the requirement into a later approval-gated child.

## Dependency And Conflict Notes

- No schema, route, shared UI, or generated-file blocker exists for the bounded first child.
- The child depends only on evidence already computed inside `backtesting-strategy-lab`.
- The future implementation writer set exactly overlaps `CF-W1-BT-02`.
- The future backend doc/test subset overlaps `CF-W1-BT-01A`.
- Team 00 must not run BT-03 in parallel with BT-02, and must not stack BT-03 on top of BT-01A doc/test edits in shared `dev` without one explicit writer. Safe options:
  - land BT-02 first, then stack BT-03;
  - merge both BT-02 and BT-03 into one dedicated backtesting writer worktree;
  - defer BT-01A until the service/doc/test writer set is clear.

That is a sequencing constraint, not a source-architecture blocker.

## Required QA Planning Handoff For Team 04

Team 04 can plan this packet now.

Required scenarios:

- `REVIEW_ONLY` run that still states single-window-only and no broader validation evidence
- `WEAK_EVIDENCE` run for:
  - low trade count
  - benchmark unavailable
  - weak end-of-test exit distribution
  - low data coverage
- `DO_NOT_USE_FOR_RELIABILITY` run for:
  - no trades
  - insufficient history
  - legacy invalid aggregate proof
- saved-run list and selected-run detail show the same proof-basis label and the same summary for the same run
- existing benchmark, availability, coverage, warning, and calculation-audit evidence remain visible
- no walk-forward, holdout, parameter-sensitivity, direct-advice, or validated-certainty language is fabricated

## Ready Recommendation

- Ready candidate: yes
- Split required: no
- Blocked: no

Team 04 QA planning can proceed now, and Team 00 can evaluate `CF-W1-BT-03` as a bounded Ready candidate after the QA handoff is accepted and the backtesting writer sequence is made explicit.
