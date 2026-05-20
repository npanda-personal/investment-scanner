# CF-W1-MD-04 Market Data Per-Instrument Freshness And Sync Provenance Contract

Date: 2026-05-19

Owner: Team 03 Architecture Factory

## Status

Ready candidate contract for a bounded backend-local child. Not yet promoted for implementation.

## Contract Intent

Market Data Foundation must expose per-instrument freshness and sync provenance explicitly enough that:

- a region-level current result cannot hide a stale instrument;
- users can see whether an instrument is current because its own latest completed daily candle is present;
- no-new-data skip, no-op storage, stale, missing, and catch-up paths are distinguishable without DQE recomputation;
- downstream modules later consume Market Data freshness evidence instead of inventing a second freshness policy.

This contract is source-evidence-only. It does not grant Market Data Foundation ownership of readiness or eligibility scoring.

## Ownership

`market-data-foundation` owns this behavior.

Data Quality Engine remains the downstream gatekeeper for:

- readiness labels
- downstream eligibility
- fail-closed blocking
- strategy/backtest/signal/alert consumer policy

No downstream module should duplicate this Market Data freshness logic once the source contract exists.

## Exact Implementation Boundary

Allowed writer set:

- `backend/src/modules/market-data-foundation/market-data-foundation.service.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.types.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.md`
- `backend/tests/modules/market-data-foundation/market-data.service.test.ts`

Forbidden:

- `backend/src/modules/market-data-foundation/market-data-foundation.repository.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.controller.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.router.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.validation.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.provider.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.scheduler.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.worker.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.queue.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.market-session.ts`
- `backend/src/modules/market-data-foundation/market-data-foundation.universe.ts`
- `backend/src/modules/market-data-foundation/index.ts`
- repository, scheduler, market-session, provider, or universe tests
- Prisma, migrations, generated files, route registries, shared utilities, shared UI, package manifests, frontend files
- downstream module source changes

## Required Additive DTO Contract

The first child must keep current fields and add source-evidence metadata only.

Preferred additive shapes:

```ts
type MarketDataInstrumentFreshnessStatus =
  | 'CURRENT'
  | 'STALE'
  | 'MISSING'
  | 'UNKNOWN';

type MarketDataInstrumentFreshnessReasonCode =
  | 'LATEST_COMPLETED_PRESENT'
  | 'LATEST_COMPLETED_MISSED'
  | 'NO_STORED_CANDLES'
  | 'MARKET_SESSION_UNKNOWN'
  | 'REGION_CURRENT_INSTRUMENT_STALE'
  | 'PROVIDER_STATE_BLOCKED';

interface MarketDataInstrumentFreshnessEvidence {
  status: MarketDataInstrumentFreshnessStatus;
  reasonCode: MarketDataInstrumentFreshnessReasonCode;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  lagDays: number | null;
  regionLatestStoredTradingDate?: string | null;
  regionCurrentButInstrumentStale?: boolean;
  basis: 'PRICE_TICK_MAX_TIMESTAMP';
}

type MarketDataSyncOutcomeCode =
  | 'NO_NEW_DATA_SKIP'
  | 'NO_OP_STORAGE'
  | 'ROWS_STORED'
  | 'CATCH_UP_ELIGIBLE'
  | 'CATCH_UP_STORED';

interface MarketDataSyncProvenance {
  outcomeCode: MarketDataSyncOutcomeCode;
  skipReasonCode?: MarketDataSyncSkipReason | null;
  latestCompletedTradingDate: string | null;
  latestStoredTradingDate: string | null;
  lastCheckedAt?: string | null;
  nextEligibleSyncAt?: string | null;
}

interface CatalogSyncFreshnessSummary {
  regionStatus: 'CURRENT' | 'STALE' | 'UNKNOWN';
  reasonCode:
    | 'REGION_CURRENT_ALL_INSTRUMENTS_CURRENT'
    | 'REGION_CURRENT_INSTRUMENT_STALE'
    | 'REGION_STALE'
    | 'MARKET_SESSION_UNKNOWN';
  latestCompletedTradingDate: string | null;
  regionLatestStoredTradingDate: string | null;
  staleInstrumentCount: number;
}
```

Exact names may differ, but all three evidence layers must remain distinguishable:

- per-instrument freshness evidence
- last sync outcome provenance
- catalog region-vs-instrument freshness summary

## Required Instrument Freshness Rules

- `CURRENT`
  - latest stored trading date is equal to or later than the latest completed trading date
- `STALE`
  - latest stored trading date exists but is older than the latest completed trading date
- `MISSING`
  - no stored trading date exists
- `UNKNOWN`
  - latest completed trading date cannot be proven for the scope

Required fields:

- latest completed trading date
- latest stored trading date
- lag or age basis
- stable reason code

Catalog-row update timestamps remain secondary evidence only and must not masquerade as `latestStoredTradingDate`.

## Required Region-Vs-Instrument Mismatch Rule

When the scoped region is current but one or more instruments remain stale or missing:

- instrument freshness evidence must expose `REGION_CURRENT_INSTRUMENT_STALE`;
- catalog sync run/status responses must expose:
  - latest completed trading date
  - region latest stored trading date
  - stale instrument count
  - stable mismatch reason code

A warning string alone is not sufficient for this contract.

## Required Sync Provenance Rules

Required stable sync outcomes:

- `NO_NEW_DATA_SKIP`
  - provider fetch was skipped
  - `noNewData=true`
  - one or more skip reason codes exist
- `NO_OP_STORAGE`
  - provider fetch happened
  - stored candle values matched persisted rows
  - no rows inserted or updated
  - one or more rows counted as no-op
- `ROWS_STORED`
  - inserted or updated rows exist
- `CATCH_UP_ELIGIBLE`
  - current request was allowed specifically because latest completed EOD was missing
  - may remain request-local on the initiating sync response
- `CATCH_UP_STORED`
  - inserted or updated rows exist on a catch-up path

This contract does not require a durable stored history of every past sync outcome on all later list reads. The first child may expose request-local sync provenance where the current response already owns that evidence.

## No Duplication Rule

This child must not duplicate DQE scoring.

Specifically rejected in this pass:

- `READY`, `LIMITED`, `BLOCKED` or other DQE-style use-case tiers
- strategy/backtest/signal/alert gating logic
- consumer-specific eligibility claims

Market Data freshness evidence answers "what source-side freshness and sync path happened." DQE still answers "is this usable for downstream logic."

## Compatibility Rules

- preserve existing route paths and query params
- preserve current sync algorithm and stale-task selection behavior
- preserve current provider, scheduler, repository, and market-session behavior
- preserve existing `latest_price_date`, `expected_latest_trading_date`, `latest_completed_eod_date`, `stored_data_through_date`, `readiness_blockers`, and `trusted_baseline_blocker_codes`
- keep all new fields additive only

## Explicit Rejection In This Pass

Reject the following from `CF-W1-MD-04` first child:

- repository changes
- schema/migration/generated changes
- controller/router changes
- provider/scheduler/worker/queue changes
- frontend adoption
- DQE implementation changes
- Research Hub or Today Review consumer wiring
- shared utility work
- package changes

If any of that becomes necessary, stop and return the item to Team 00 / Architect as a new child or blocker.

## Test Contract

Focused backend tests must prove:

- current, stale, missing, and unknown instrument freshness states
- lag-days exposure
- region-current/instrument-stale mismatch exposure
- no-new-data skip provenance
- no-op storage provenance
- catch-up-eligible and catch-up-stored provenance
- preserved existing route and sync behavior
- no DQE-style readiness labels added by this packet

## Later Consumer Contract

After this slice is accepted, later consumers may read the new Market Data evidence through existing public outputs only:

- Data Quality Engine
- Today Review
- Research Hub

Those later consumers must remain separate packets.

## Split / Blocker Result

- Split required: `No` for the first child
- Blocked: `No`
- Honest future follow-on if requested later: repository-backed batch sync-state read or downstream consumer adoption child
