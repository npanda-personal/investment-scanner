# CF-W1-MD-02 Durable Market Data Readiness Evidence Contract

Date: 2026-05-17

## Status

Architecture-ready for later Decision Packet / ADR drafting only.

Source, Prisma, migration, route, provider, scheduler, and startup implementation remain blocked.

## Contract Intent

Market Data Foundation must eventually provide durable, auditable readiness evidence for OHLC and latest-price data before downstream modules can treat market data as trusted.

The current schema is centered on `PriceTick` uniqueness by `symbol + timestamp`, which is narrower than the root policy's target natural key and auditability requirements.

## Durable Evidence Requirements

A future approved storage model should be able to audit:

- instrument identity or a stable symbol-to-instrument mapping,
- region,
- asset type,
- timeframe,
- trading date or timestamp,
- source,
- source symbol / provider symbol used,
- source timestamp where available,
- ingestion timestamp,
- batch/run identity or source fingerprint,
- duplicate provider rows skipped,
- invalid OHLC rows rejected,
- missing latest candle evidence,
- stale latest candle evidence,
- zero or suspicious volume evidence,
- adjusted-close fallback evidence,
- provider support and fallback state,
- validation window used for provider support checks.

## Candidate Natural Key

The target natural key for idempotent OHLC/readiness evidence should include, at minimum:

```text
instrument_id or canonical symbol
region
asset_type
timeframe
timestamp or trading_date
source
source_symbol where provider identity can differ
```

The exact key and whether it belongs on `PriceTick`, a companion evidence table, or a derived readiness evidence table require a later Product Owner and Architect decision.

## Current Evidence Limitation

Current characterization tests can prove transient readiness behavior, but they do not fully prove durable per-row provenance or durable per-instrument readiness evidence for every readiness blocker.

Existing local invariants are useful as characterization coverage, not as proof that storage is contract-complete.

## Forbidden Until Decision

Do not change:

- `backend/prisma/schema.prisma` or migrations,
- `PriceTick`, `LatestPrice`, or related storage keys,
- Market Data route registry,
- provider selection or live-provider behavior,
- scheduler/startup/backfill behavior,
- package files or generated Prisma types.

Do not run live providers, Angel One, repair runs, backfills, services, or tests in this docs-only preparation task.

## Decision Packet Note

A Decision Packet / ADR is needed later before choosing between:

- expanding `PriceTick`,
- adding a companion OHLC evidence table,
- adding a durable readiness evidence table,
- keeping current storage and limiting claims to derived/read-path evidence.

The Decision Packet must cover migration path, rollback, Prisma impact, query/test strategy, downstream contract impact, and Product Owner approval. It was not created in this pass because implementation is not active now.

## Acceptance Criteria For Future Approval

- Approved storage model and natural key are documented.
- Migration and rollback strategy are documented.
- Local/free constraints remain intact.
- Downstream consumers know which evidence is durable and which is derived.
- QA has focused storage/evidence invariants before source work starts.

## Team 03 Relaunch Architecture Notes - 2026-05-17

Readiness result: ADR/decision-prep only. Source, schema, migration, provider, service, route, startup, repair, backfill, and test implementation remain blocked.

Read-only schema inspection confirms the current `PriceTick` uniqueness is `symbol + timestamp`, and `LatestPrice` is keyed by `symbol`. That is narrower than the target natural key described by root policy because it does not prove region, asset type, timeframe, source, source symbol, or instrument identity as part of the uniqueness model.

Recommended ADR posture:

- compare expanding existing price rows, a companion OHLC evidence table, a durable readiness evidence table, and keeping current storage with explicitly limited claims,
- define whether records are append-only, idempotent/upserted, derived, cached, provider-specific, normalized canonical, or a documented combination,
- keep Data Quality Engine ownership of readiness evaluation,
- specify migration/no-backfill, rollback, query, and focused-test strategy before any Prisma or source reservation.

No source/schema files are reserved by this contract.
