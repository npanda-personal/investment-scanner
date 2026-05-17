# CF-W1-L3-PORT-01 Portfolio And Watchlist Readiness DTO Contract

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Child architecture contract prepared. Not Ready for Implementation.

Parent policy: `CF-W1-L3-DQ-01`

Product Owner decision: `07-decisions/DECISION-20260517-lane3-readiness-consumer-policy-resolution.md`

## Contract Intent

Portfolio and watchlist backend DTOs must expose Data Quality readiness evidence so passive displays, downstream alerts, and future UX can distinguish trusted, limited, and blocked market/signal context.

This contract is additive and backend-only. It does not approve UI work.

## Required Data Source

Implementation must use `DataQualityEngineService` from the Data Quality Engine public module export.

Allowed public calls:

- `getLatestEvaluationForInstrument(instrumentId)`
- `getEvaluationsForInstruments(instrumentIds)`
- existing public DTO fields from `DataQualityEvaluationDto`

Forbidden:

- importing `DataQualityEngineRepository` into Lane 3 modules;
- recreating Data Quality scoring logic in portfolio or watchlist modules;
- changing Data Quality Engine source or exports in this child slice;
- calling providers, startup/backfill flows, or live market-data refresh flows.

## DTO Shape

Because shared backend utilities are forbidden for this slice, portfolio and watchlist should define module-local DTO names with the same field shape.

Minimum readiness DTO fields:

```ts
type Lane3DisplayReadinessStatus = 'READY' | 'LIMITED' | 'BLOCKED';
type Lane3ActionReadinessStatus = 'READY' | 'BLOCKED';

interface Lane3ReadinessEvidenceDto {
  source: 'data-quality-engine';
  instrumentId: string;
  symbol: string;
  displayStatus: Lane3DisplayReadinessStatus;
  actionStatus: Lane3ActionReadinessStatus;
  signalReadinessStatus: 'READY' | 'LIMITED' | 'NOT_READY' | 'MISSING';
  coverageStatus: 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE' | 'MISSING';
  liquidityStatus: 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN' | 'MISSING';
  dailyReviewTierStatus: 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';
  signalTierStatus: 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';
  eligibleForSignals: boolean;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  lastEvaluatedAt: string | null;
}

interface Lane3ReadinessSummaryDto {
  status: Lane3DisplayReadinessStatus;
  readyCount: number;
  limitedCount: number;
  blockedCount: number;
  missingEvaluationCount: number;
  canUseForTrustedDisplay: boolean;
  canUseForActionWorkflows: boolean;
}
```

Portfolio-specific names may be:

- `PortfolioHoldingReadinessDto`
- `PortfolioReadinessSummaryDto`

Watchlist-specific names may be:

- `WatchlistItemReadinessDto`
- `WatchlistReadinessSummaryDto`

## Required DTO Attach Points

Portfolio child slice:

- Add `readiness: PortfolioHoldingReadinessDto` to `HoldingValuationDto`.
- Add `readinessSummary: PortfolioReadinessSummaryDto` to `PortfolioSummaryDto`.
- Preserve existing `dataStatus` for backward compatibility, but do not let `dataStatus = COMPLETE` imply Data Quality trust.

Watchlist child slice:

- Add `readiness: WatchlistItemReadinessDto` to `WatchlistDashboardItemDto`.
- Add `readinessSummary: WatchlistReadinessSummaryDto` to `WatchlistDetailDto`.
- Preserve existing price, signal, and `researchUrl` fields for backward compatibility.

## Readiness Mapping

Missing evaluation:

- `displayStatus = 'BLOCKED'`
- `actionStatus = 'BLOCKED'`
- `signalReadinessStatus = 'MISSING'`
- `coverageStatus = 'MISSING'`
- `liquidityStatus = 'MISSING'`
- `dailyReviewTierStatus = 'MISSING'`
- `signalTierStatus = 'MISSING'`
- `eligibleForSignals = false`
- `blockers` includes `Missing data quality evaluation.`

`READY`:

- Passive display can be trusted only when the Data Quality daily-review tier is `READY`, or when tiers are absent and `signalReadinessStatus` is `READY`.
- Action eligibility can be `READY` only when the Data Quality signal tier is `READY` and `eligibleForSignals` is true.

`LIMITED`:

- Passive display is allowed with `displayStatus = 'LIMITED'`.
- `actionStatus` must be `BLOCKED`.
- Reasons and blockers from Data Quality must be carried through.

Blocked or not ready:

- `NOT_READY`, `UNUSABLE`, stale hard blockers, unsupported/scope mismatch blockers, or `dailyReview` tier `BLOCKED` must produce `displayStatus = 'BLOCKED'`.
- Action eligibility remains `BLOCKED`.

## Backward Compatibility

Existing response fields must remain present:

- portfolio `currentPrice`, `marketValue`, `dailyChange`, `signal`, and `dataStatus`;
- watchlist `currentPrice`, `dailyChange`, `dailyChangePercent`, `latestSignal`, and `researchUrl`.

This slice adds explicit readiness metadata so downstream code no longer infers trust from the presence of price or signal fields.

## Forbidden Behavior

- Do not remove existing API fields.
- Do not change route paths.
- Do not add Prisma models or migrations.
- Do not add shared DTO files.
- Do not edit frontend files.
- Do not create alert suppression behavior in this child slice.
- Do not create portfolio-intelligence reliability labels in this child slice.
- Do not introduce direct financial advice language.
- Do not introduce arbitrary target prices.

## Implementation Split

Default implementation order:

1. `CF-W1-L3-PORT-01A`: portfolio-management DTO readiness.
2. `CF-W1-L3-PORT-01B`: watchlist-management DTO readiness.

Both may share this contract, but each implementation pass should reserve only one module's files unless Team 00 records a combined backend-only exception.

## Test Contract

Focused backend tests must prove:

- READY DQ yields ready/trusted readiness metadata.
- LIMITED DQ yields limited passive display metadata and blocked action metadata.
- missing DQ yields blocked metadata.
- NOT_READY or blocked tier yields blocked metadata.
- existing valuation/watchlist fields remain backward-compatible.
- Data Quality is consumed through the public service boundary.
