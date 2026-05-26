# CF-W2-SPL-01B Active Position Read Model Contract

Date: 2026-05-26

Owner: Team 03 Architecture Factory

## Status

Contract prepared from current source and dependency-boundary review.

Ready recommendation: backend-only `Ready candidate after QA`, not self-promoted for implementation.

## Contract Intent

Expose one truthful active-row read model for Signal Position Ledger using current persisted/public evidence only.

This first child must solve four concrete truth gaps without widening into storage or shared-file scope:

- turn current source-proven trigger evidence into one explicit ledger-row projection;
- attach current latest price basis for raw return display only when that basis is trustworthy;
- attach current DQ/trust evidence and current strategy/rule/version provenance;
- keep lifecycle/health explicit about limited proof on current `dev`.

This child must remain research-support only. It must not imply broker positions, realized profit, portfolio performance, target-price truth, or direct financial advice.

## Allowed Implementation Boundary

- `backend/src/modules/signal-position-ledger/signal-position-ledger.module.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.router.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.controller.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.service.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.repository.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.validation.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.types.ts`
- `backend/src/modules/signal-position-ledger/signal-position-ledger.md`
- `backend/src/modules/signal-position-ledger/index.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.service.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.repository.test.ts`
- `backend/tests/modules/signal-position-ledger/signal-position-ledger.validation.test.ts`

Optional only if the implementation adds explicit isolated router assertions:

- `backend/tests/modules/signal-position-ledger/signal-position-ledger.routes.test.ts`

## Forbidden Implementation Boundary

- `backend/src/api/routes.ts`
- `frontend/src/app/routes.tsx`
- all `frontend/src/features/signal-position-ledger/**`
- all `frontend/tests/ui/**`
- Prisma schema and migrations
- generated files
- package manifests
- shared backend utilities
- shared frontend components
- all Today Review, Trade Plan, Portfolio, Backtesting, and provider/startup/live files

If the implementation cannot stay inside this boundary, stop and escalate.

## Required Additive Contract

### 1. Active row projection

Minimum required row semantics:

```ts
type SignalPositionTriggerType = 'bullish_entry_trigger' | 'bearish_trigger';
type SignalPositionReturnStatus = 'CURRENT' | 'STALE' | 'UNAVAILABLE';
type SignalPositionHealthState = 'EXIT_TRIGGERED' | 'RISK_WARNING' | null;
type SignalPositionLifecycleEvidenceStatus = 'EXIT_COMPATIBILITY_ONLY' | 'UNAVAILABLE';

interface SignalPositionLedgerActiveRow {
  signalId: string | null;
  instrumentId: string;
  symbol: string;
  companyName: string | null;
  region: string | null;
  assetType: string | null;
  triggerType: SignalPositionTriggerType;
  entryTriggerTimestamp: string;
  entryTriggerPrice: number;
  entryReasonSummary: string;
  strategyId: string | null;
  strategyVersion: string | null;
  entryRuleId: string | null;
  latestTrustedPriceDate: string | null;
  latestTrustedPrice: number | null;
  currentReturnPercent: number | null;
  currentReturnStatus: SignalPositionReturnStatus;
  currentDataQualityStatus: string | null;
  healthState: SignalPositionHealthState;
  lifecycleEvidenceStatus: SignalPositionLifecycleEvidenceStatus;
  trustEvidenceStatus: string;
}
```

Exact names may differ. The semantics must remain stable.

### 2. Active list response

Minimum required response semantics:

```ts
interface SignalPositionLedgerActiveListResponse {
  items: SignalPositionLedgerActiveRow[];
  totalCount: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
  hasMore: boolean;
  scope: {
    region: string;
    assetType: string;
  };
  warnings: string[];
}
```

This child must stay list-only. Row detail is deferred.

## Required Row-Inclusion Rules

An active row may appear only when all of the following are true:

- it comes from the latest persisted trusted signal row for the instrument in the selected scope;
- the enriched trigger contract exists;
- `trigger_price_evidence.status === SOURCE_PROVEN`;
- `trigger_price` is numeric;
- `trigger_timestamp` is present;
- `trigger_type` is `bullish_entry_trigger` or `bearish_trigger`.

Rows must stay hidden or explicitly unsupported when:

- the signal is legacy/incomplete;
- source-proven trigger price is unavailable;
- source-proven trigger timestamp is unavailable;
- the row is only a `risk_warning` signal with no entry basis.

## Required Current Return Rules

The module must compute:

```ts
currentReturnPercent = ((latestTrustedPrice - entryTriggerPrice) / entryTriggerPrice) * 100
```

Required semantics:

- this is raw price return only;
- it is not realized profit, account performance, or short-profit proof;
- the row must keep `triggerType` visible so bullish/bearish context is not hidden;
- if current price basis is stale, missing, unsupported, partial, or blocked by current DQ trust, `currentReturnPercent` must be `null` and `currentReturnStatus` must explain why.

## Required Price-Basis Rules

Use current persisted/public price evidence only.

Allowed sources:

- public `MarketDataFoundationService.latestPriceByInstrumentId(...)`; or
- direct read of the same persisted `PriceTick` evidence inside the owning module repository.

Required semantics:

- latest trusted price date must come from the latest persisted price row used for the row;
- the child must not call providers or trigger live refresh;
- `data_status` and current DQ status must be able to downgrade the price basis to stale/unavailable.

## Required DQ / Trust Rules

Use current public/persisted DQ evidence only.

Allowed sources:

- public `DataQualityEngineService.getLatestEvaluationForInstrument(...)`
- public `DataQualityEngineService.getEvaluationsForInstruments(...)`
- or direct read of the same persisted `DataQualityEvaluation` evidence inside the owning repository

Required semantics:

- DQ status must come from current public DQ semantics, not locally re-scored logic;
- blocked/limited DQ may keep an existing entry row visible, but must downgrade trust/return presentation;
- the module must not silently upgrade weak rows.

## Required Health / Lifecycle Rules

Current `dev` allows only limited current health compatibility:

- `EXIT_TRIGGERED`
- `RISK_WARNING`

Allowed current source:

- current exit-oriented Strategy Decision public output for the same instrument.

Required mapping:

- `EXIT_CANDIDATE` -> `EXIT_TRIGGERED`
- `REDUCE_RISK` -> `RISK_WARNING`
- otherwise `healthState = null`

Required lifecycle-evidence semantics:

- when either mapped state is present, set lifecycle evidence to compatibility-only;
- otherwise set lifecycle evidence to unavailable.

Forbidden in this child:

- `ACTIVE`
- `HEALTHY`
- `WEAKENING`
- `INVALIDATED`
- `EXPIRED`
- `CLOSED`
- inferred open/closed state from later prices, target hits, or unsupported heuristics

## Required Provenance Rules

The row must keep visible when current source supports them:

- strategy id / code
- strategy version
- entry rule id
- trigger type
- entry reason summary

Current source may leave explicit unavailable when not provable:

- exit rule id
- invalidation rule id
- durable lifecycle status
- close reason/date/price

## Compatibility Rules

- this child must not widen any existing API route registry;
- this child must not require frontend feature work;
- this child must not assume the accepted Today Review health packet is merged into current `dev`;
- this child must remain backward-compatible with current persisted signal rows that satisfy trusted read requirements.

## Test Contract

Focused backend tests must prove:

- rows appear only with source-proven trigger price and timestamp;
- risk-warning-only signals do not appear as active entry rows;
- current return is computed only when price basis is usable;
- stale/missing/partial price basis downgrades return display;
- current DQ status is consumed rather than recomputed;
- only `EXIT_TRIGGERED` / `RISK_WARNING` may appear as health states on current `dev`;
- all other lifecycle semantics remain unavailable;
- response stays paginated and scope-aware.

## Route-Exposure Rule

This contract allows module-local router/controller files only.

This contract does not approve mounting the module into:

- `backend/src/api/routes.ts`

Backend route exposure is a later Team 00 shared-file gate.

## Escalation Rule

Escalate to Team 00 and do not keep Ready reservations if implementation proves it needs:

- route-registry wiring;
- frontend feature work;
- shared UI;
- schema/storage;
- generated types;
- package changes;
- provider/live/startup/backfill behavior;
- Today Review, Trade Plan, Portfolio, or Backtesting source changes.
