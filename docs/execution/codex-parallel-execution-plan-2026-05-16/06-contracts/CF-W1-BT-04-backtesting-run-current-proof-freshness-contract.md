# CF-W1-BT-04 Backtesting Run Current-Proof Freshness Contract

Date: 2026-05-20

## Purpose

Give saved backtesting runs an additive current-proof contract so users can distinguish:

- the latest comparable proof,
- an older stale proof,
- a repaired legacy historical proof, and
- a structurally limited historical proof.

## Scope

Bounded first child only:

- `backtesting-strategy-lab` backend projection
- `backtesting-strategy-lab` feature-local saved-run list and selected-run rendering

Out of scope:

- repository redesign
- route changes
- shared UI changes
- package or generated-file changes
- Prisma or migration changes
- new validation engines such as walk-forward or holdout

## Additive Fields

The contract should add fields equivalent to:

```ts
type BacktestCurrentProofStatus =
  | 'CURRENT_PROOF'
  | 'STALE_PROOF'
  | 'REPAIRED_HISTORICAL'
  | 'LIMITED_HISTORICAL_PROOF';

type BacktestCurrentProofReasonCode =
  | 'LATEST_COMPARABLE_RUN'
  | 'OLDER_THAN_LATEST_COMPARABLE_RUN'
  | 'LEGACY_INVALID_REPAIRED'
  | 'INSUFFICIENT_HISTORY'
  | 'MISSING_PRICE_HISTORY'
  | 'LOW_DATA_COVERAGE'
  | 'BENCHMARK_UNAVAILABLE'
  | 'NO_TRADES';

interface BacktestCurrentProof {
  status: BacktestCurrentProofStatus;
  summary: string;
  reasonCodes: BacktestCurrentProofReasonCode[];
  latestComparableRunGeneratedAt: string | null;
  runGeneratedAt: string | null;
}
```

These fields are additive. Existing run DTO fields remain backward-compatible.

## Source Inputs

Derive the first child only from evidence the module already owns, such as:

- run `generatedAt`
- current normalized run status and metrics
- `availabilityStatus`
- `calculationAudit`
- strategy code, version, timeframe, region, asset type, and comparable saved-run grouping already returned in run config

Do not create a second persistence model or a new validation engine in this slice.

## Status Rules

- `CURRENT_PROOF`
  - this run is the latest comparable saved run
  - no legacy-invalid repair warning is active
  - no structural limitation forces a lower-trust label
- `STALE_PROOF`
  - a newer comparable saved run exists
  - the summary explains that the run is older than the latest comparable proof
- `REPAIRED_HISTORICAL`
  - historical repair logic is active, especially `LEGACY_INVALID`
- `LIMITED_HISTORICAL_PROOF`
  - the run remains visible but is limited by insufficient history, missing price history, no trades, or similar structural evidence gaps

## UI Projection Rules

- The saved-run list and selected-run panel must show the same label and same summary for the same run.
- The new label must be additive to existing benchmark, coverage, warning, and audit panels.
- The UI must not imply walk-forward validation, holdout validation, optimization proof, or forward predictive certainty.

## Backward Compatibility

- Existing `BacktestRun` fields remain valid.
- Existing simulation math, proof-basis guardrails, review-disposition behavior, and coverage diagnostics remain unchanged.
- Historical repaired runs should surface a truthful repaired-historical label instead of rendering like current proof.

## Stop Conditions

Stop and split the child if truthful behavior requires:

- repository edits
- route or controller edits
- shared UI work
- new backtesting engines
- Prisma or migration changes

## One-Writer Rule

This contract reserves one writer across the backtesting backend/frontend file set in the future implementation pass. No parallel `backtesting-strategy-lab` writer is allowed.
