# CF-W1-L3-ALERT-01 Alert Readiness Suppression Contract

Date: 2026-05-17

Owner: Team 03 Architecture Factory

## Status

Child architecture contract prepared. Not Ready for Implementation.

Parent policy: `CF-W1-L3-DQ-01`

Related completed slice: `CF-W1-L3-AUTH-02`

## Contract Intent

Alerts Monitoring must not create action-like alert events from untrusted market, signal, portfolio, or watchlist data. Alert creation requires Data Quality `READY` evidence.

This contract is backend-only and additive. It does not approve schema, route, frontend, notification, or copilot digest changes.

## Required Data Source

Implementation must consume `DataQualityEngineService` from the Data Quality Engine public module export.

Allowed public calls:

- `getLatestEvaluationForInstrument(instrumentId)`
- `getEvaluationsForInstruments(instrumentIds)`
- existing public DTO fields from `DataQualityEvaluationDto`

Forbidden:

- importing `DataQualityEngineRepository` into Alerts Monitoring;
- reimplementing readiness scoring or stale/liquidity/coverage thresholds;
- changing Data Quality Engine source or public exports;
- calling providers, startup/backfill, live data refresh, Angel One, broker, paid/cloud, or telemetry flows.

## Required Readiness Rule

Alert event creation is action-like. It requires `READY`.

Preferred gate:

- `evaluation.useCaseTiers.automation.status === 'READY'`

Fallback gate when `automation` tier is absent:

- `evaluation.useCaseTiers.signal.status === 'READY'`, or
- when tiers are absent, `evaluation.signalReadinessStatus === 'READY' && evaluation.eligibleForSignals === true`

Suppress event creation for:

- missing Data Quality evaluation;
- `LIMITED`;
- `NOT_READY`;
- `BLOCKED` tier;
- `coverageStatus = UNUSABLE`;
- stale hard blockers;
- unsupported region or asset type blockers;
- scope mismatch blockers;
- provider/source-gap blockers;
- any future Data Quality status that is not explicitly `READY`.

## Alert Surface Mapping

Stock rule types:

- `PRICE_ABOVE`
- `PRICE_BELOW`
- `DAILY_MOVE_ABOVE`
- `DAILY_MOVE_BELOW`
- `SIGNAL_SCORE_ABOVE`
- `SIGNAL_DIRECTION_CHANGED`

Use `rule.instrumentId` as the readiness instrument id. If no instrument id exists, no event is created.

Portfolio rule types:

- `PORTFOLIO_HOLDING_DRAWDOWN`
- `PORTFOLIO_BEARISH_SIGNAL`

Evaluate each holding only when that holding instrument has `READY` alert readiness.

Watchlist rule types:

- `WATCHLIST_SIGNAL_SCORE_ABOVE`
- `WATCHLIST_PRICE_ABOVE`
- `WATCHLIST_PRICE_BELOW`

Evaluate each watchlist item only when that item instrument has `READY` alert readiness.

## Result DTO Additions

Additive result fields are allowed:

```ts
interface AlertReadinessSuppressionDto {
  ruleId: string;
  instrumentId: string | null;
  symbol: string | null;
  reason: string;
  source: 'data-quality-engine';
  requiredTier: 'automation';
  tierStatus: 'READY' | 'LIMITED' | 'BLOCKED' | 'MISSING';
  signalReadinessStatus: 'READY' | 'LIMITED' | 'NOT_READY' | 'MISSING';
  coverageStatus: 'GOOD' | 'PARTIAL' | 'POOR' | 'UNUSABLE' | 'MISSING';
  liquidityStatus: 'LIQUID' | 'THIN' | 'ILLIQUID' | 'UNKNOWN' | 'MISSING';
  blockers: string[];
  warnings: string[];
  lastEvaluatedAt: string | null;
}
```

Add to `AlertEvaluationResult`:

- `skippedReadiness: number`
- `readinessSuppressions: AlertReadinessSuppressionDto[]`

Existing fields must remain present.

## Event Metadata Additions

Created events must include Data Quality evidence in `metadata.dataQuality`, using the same source, required tier, tier status, readiness status, coverage status, liquidity status, eligibility, reasons/blockers/warnings, and `lastEvaluatedAt` fields needed for audit.

No schema change is required because metadata is already JSON.

## Forbidden Behavior

- Do not create events from `LIMITED` readiness.
- Do not create events from missing DQ.
- Do not create events from `NOT_READY`, blocked, stale, unsupported, scope-mismatched, or unusable evidence.
- Do not hide suppression by reporting only duplicate skips.
- Do not change route paths or event ownership rules.
- Do not add `AlertEvent.userId`.
- Do not update notification/copilot digest behavior in this slice.
- Do not use direct financial advice language.
- Do not introduce arbitrary target prices.

## Backward Compatibility

Existing alert event and evaluation response fields remain present.

The new suppression fields are additive. Existing callers that ignore them should continue to work, while QA and future UI can use them to explain why alert events were not created.

## Test Contract

Focused backend tests must prove:

- READY DQ allows event creation when rule conditions match.
- missing DQ suppresses event creation.
- LIMITED DQ suppresses event creation.
- NOT_READY or blocked tier suppresses event creation.
- created events carry `metadata.dataQuality`.
- readiness suppressions are reported in `AlertEvaluationResult`.
- duplicate suppression still works.
- ownership behavior from `CF-W1-L3-AUTH-02` is not weakened.
