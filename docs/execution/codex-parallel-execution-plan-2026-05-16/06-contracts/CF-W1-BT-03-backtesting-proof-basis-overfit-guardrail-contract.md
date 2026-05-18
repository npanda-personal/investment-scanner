# CF-W1-BT-03 Backtesting Proof-Basis / Overfit Guardrail Contract

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready-candidate contract prepared for the bounded first child.

This contract covers one no-schema `backtesting-strategy-lab` packet only. It is additive, module-local, and separate from both BT-02 review-disposition work and BT-01A DQ characterization.

## Contract Intent

Backtesting output must explicitly tell the user when a result is:

- historical single-window evidence only;
- weak because the sample or evidence is thin; or
- not suitable for reliability judgment yet.

This first child must do that without fabricating walk-forward, holdout, or parameter-sensitivity validation that the module does not perform.

## Required Source Boundary

Implementation must stay inside `backtesting-strategy-lab` service/types/doc/test plus the module-owned frontend types/page/UI smoke test.

Allowed direction:

- add additive proof-basis fields under existing run metrics, or stable equivalents
- derive those fields from current module-local evidence only
- render the same proof-basis story in saved-run list and selected-run detail
- update focused module tests and feature-local UI smoke coverage

Forbidden:

- Prisma/schema, migrations, generated files, or repository identity changes
- controller/router/validation/route-registry changes
- shared backend utility or shared UI changes
- `data-quality-engine`, `market-data-foundation`, `strategy-framework`, or `trade-plan-risk-engine` source changes
- API client, hook, feature-route, or broad frontend navigation changes
- walk-forward engine, holdout engine, parameter sweep, optimizer, or Monte Carlo work
- simulation math, benchmark math, ranking math, or rule-evaluator semantic changes
- BT-02 review-disposition coupling as a prerequisite for this child

## Required Run-Level Contract

Returned completed-run metrics must expose additive proof-basis semantics equivalent to:

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

Exact names may differ, but the behavior must remain stable.

## Required Proof-Basis Mapping

### 1. Explicit Single-Window Disclosure

Every current completed run must state:

- `singleWindowStatus = SINGLE_WINDOW_ONLY`
- `holdoutValidationStatus = NOT_RUN`
- `walkForwardValidationStatus = NOT_RUN`
- `parameterSensitivityStatus = NOT_RUN`

This is the core guardrail. The module must not imply broader proof exists.

### 2. Sample-Evidence Status

The first child must classify sample evidence from current trade count only:

- `NO_TRADES` when `numberOfTrades = 0`
- `LOW_TRADES` when `numberOfTrades > 0` and `< 10`
- `ADEQUATE` otherwise

No new optimization, resampling, or sensitivity logic is allowed.

### 3. Reliability Status

`reliabilityStatus = DO_NOT_USE_FOR_RELIABILITY`

- failed run; or
- `availabilityStatus = ERROR`; or
- `availabilityStatus = INSUFFICIENT_HISTORY`; or
- `calculationAudit.aggregateStatus = LEGACY_INVALID`; or
- `numberOfTrades = 0`

`reliabilityStatus = WEAK_EVIDENCE`

- usable aggregate proof exists; and
- one or more current weak-evidence conditions apply:
  - `numberOfTrades < 10`
  - `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE`
  - `exitDiagnostics.endOfTestExitPercent >= 0.4`
  - `dataCoveragePercent` below the current preferred threshold

`reliabilityStatus = REVIEW_ONLY`

- completed run;
- no invalid/withheld aggregate proof;
- no insufficient-history or no-trade blocker;
- no weak-evidence gate;
- still historical-only because single-window-only and broader validation states remain `NOT_RUN`

### 4. Summary And Reasons

- `proofBasisSummary` must be concise and user-facing.
- `proofBasisSummary` must tell the truth that current proof is historical-only and lacks broader validation.
- `proofBasisReasons` must preserve the specific categories behind the summary.
- `proofBasisReasons` must include explicit absence categories:
  - `SINGLE_WINDOW_ONLY`
  - `NO_HOLDOUT_VALIDATION`
  - `NO_WALK_FORWARD_VALIDATION`
  - `NO_PARAMETER_SENSITIVITY_EVIDENCE`
- Weak-evidence and do-not-use categories must be additive, not replacements for those absence disclosures.

## Compatibility Rules

- Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataCoveragePercent`, and `calculationAudit` remain present and unrenamed.
- Existing `trades` payload shape remains unchanged in this first child.
- Existing run routes, query parameters, saved-run loading behavior, and scope behavior remain unchanged.
- Existing registered-strategy and custom-rule execution behavior remains unchanged.
- Existing BT-02 `reviewDisposition` fields are not required and must not become a hidden dependency of this child.

## Required UI Contract

The current Backtesting Strategy Lab page must show:

- a clear proof-basis label for the selected run
- a concise proof-basis summary for the selected run
- the same proof-basis label and summary in the saved-run list row for that run
- existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence as supporting context

The UI must stay research-support oriented and must not introduce:

- direct trade advice
- validated-certainty language
- fabricated walk-forward or holdout proof
- fabricated parameter-sensitivity evidence

## Explicit Deferrals

The following remain out of scope for this first child:

- walk-forward engine implementation
- holdout engine implementation
- parameter sweep or optimizer implementation
- Monte Carlo or advanced quant validation expansion
- BT-02 review-disposition merge or unification
- BT-01A DQ policy change
- route/controller/repository or source-contract widening
- `strategy-framework` metadata expansion
- any schema/generated/shared-route/shared-UI change

If later work needs those paths, it must be split into a separate approval-gated child packet.

## Test Contract

Focused coverage must prove:

- `REVIEW_ONLY` still discloses single-window-only and missing broader validation
- `WEAK_EVIDENCE` for:
  - low trade count
  - benchmark gap
  - weak exit distribution
  - low data coverage
- `DO_NOT_USE_FOR_RELIABILITY` for:
  - no trades
  - insufficient history
  - `LEGACY_INVALID` aggregate proof
- list/detail normalization for the same run
- backward-compatible existing metrics payload fields
- no fabricated validation language
