# CF-W1-BT-02 Backtesting Outcome Review Traceability Contract

Date: 2026-05-18

Owner: Team 03 Architecture Factory

## Status

Ready-candidate contract prepared for the narrowed first child.

This contract covers one bounded no-schema `backtesting-strategy-lab` packet only. It supersedes the earlier broader BT-02 interpretation for the first child.

## Contract Intent

Backtesting output must give the user one canonical review-disposition label plus a concise reason summary that stays consistent between the saved-run list and the selected-run detail view.

This first child is additive and module-local. It must preserve current simulation behavior and use existing run evidence instead of widening into a broader traceability rewrite.

## Required Source Boundary

Implementation must stay inside `backtesting-strategy-lab` service/types/doc/test plus the module-owned frontend types/page/UI smoke test.

Allowed direction:

- add additive run-level review-disposition fields
- derive those fields from existing module evidence only
- render the same disposition label and summary in both saved-run list and selected-run detail
- update focused module tests and feature-local UI smoke coverage

Forbidden:

- Prisma/schema, migrations, generated files, or repository identity changes
- controller/router/validation/route-registry changes
- shared backend utility or shared UI changes
- `strategy-framework` source changes
- `trade-plan-risk-engine` source changes
- API client, hook, feature-route, or broad frontend navigation changes
- simulation math, benchmark math, ranking math, or rule-evaluator semantic changes
- trade-level structured rule-ID traceability expansion in this first child

## Required Run-Level Contract

Returned completed-run metrics must expose additive review-disposition semantics equivalent to:

```ts
type BacktestReviewDisposition =
  | 'TRUSTED_REVIEW'
  | 'PARTIAL_REVIEW'
  | 'DIAGNOSTIC_ONLY'
  | 'LEGACY_REPAIRED'
  | 'WITHHELD';

interface BacktestMetrics {
  reviewDisposition?: BacktestReviewDisposition;
  reviewDispositionReasonSummary?: string;
  reviewDispositionReasons?: string[];
}
```

Exact names may differ, but the behavior must remain stable.

## Required Outcome Mapping

- `WITHHELD`
  - failed runs; or
  - `availabilityStatus = ERROR`; or
  - `calculationAudit.aggregateStatus = LEGACY_INVALID`; or
  - any other explicit aggregate-proof quarantine
- `LEGACY_REPAIRED`
  - `calculationAudit.repairedTradeReturnCount > 0`; and
  - aggregate proof remains usable
- `DIAGNOSTIC_ONLY`
  - `availabilityStatus = INSUFFICIENT_HISTORY`; or
  - `numberOfTrades = 0`; or
  - `benchmarkComparison.benchmarkDataStatus = UNAVAILABLE`; or
  - `exitDiagnostics.endOfTestExitPercent >= 0.4`; or
  - `numberOfTrades < 10`
- `PARTIAL_REVIEW`
  - `availabilityStatus = PARTIAL`; or
  - limited data coverage while aggregate proof remains usable
- `TRUSTED_REVIEW`
  - completed run;
  - no withheld-proof, legacy-repair, diagnostic-only, or partial-review condition applies

The service may derive these outcomes from current metrics, calculation audit, benchmark status, exit diagnostics, and coverage signals. It must not change run behavior to manufacture a better outcome.

## Required Summary Behavior

- `reviewDispositionReasonSummary` must be concise and user-facing, not an implementation dump.
- `reviewDispositionReasons` must preserve the specific evidence categories behind the summary.
- List and detail must use the same derived fields for the same run.
- Existing evidence fields remain visible as supporting proof, not replaced by the summary.

## Compatibility Rules

- Existing `availabilityStatus`, `benchmarkComparison`, `exitDiagnostics`, `realismWarnings`, `dataCoverage`, `dataQualityMetadata`, and `calculationAudit` remain present and unrenamed.
- Existing `trades` payload shape remains unchanged in this first child.
- Existing run routes, query parameters, saved-run loading behavior, and scope behavior remain unchanged.
- Existing registered-strategy and custom-rule run execution behavior remains unchanged.

## Required UI Contract

The current Backtesting Strategy Lab page must show:

- a clear review-disposition label for the selected run
- a concise reason summary for the selected run
- the same disposition label and reason summary in the saved-run list row for that run
- existing benchmark, availability, data-coverage, exit-diagnostic, realism-warning, and calculation-audit evidence as supporting context

The UI must stay research-support oriented and must not introduce direct trade advice or target-price language.

## Explicit Deferrals

The following remain out of scope for this first child:

- trade-level structured rule IDs
- trade-level invalidation trace IDs
- route/controller/repository or source-contract widening
- `strategy-framework` metadata expansion
- `trade-plan-risk-engine` alignment work
- any schema/generated/shared-route/shared-UI change

If later work needs those paths, it must be split into a separate approval-gated child packet.

## Test Contract

Focused coverage must prove:

- trusted review outcome
- partial review outcome
- diagnostic-only outcomes for insufficient history, no trades, benchmark unavailable, weak exits, and low sample size
- legacy-repaired outcome
- withheld outcome for `LEGACY_INVALID`
- list/detail normalization for the same run
- backward-compatible existing metrics payload fields
- research-support wording remains intact
