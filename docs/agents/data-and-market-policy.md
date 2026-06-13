# Data Quality, OHLC Policy, Market Scope & Batch Orchestration

> Extracted verbatim from the original AGENTS.md constitution. Index of all topic files: [AGENTS.md](../../AGENTS.md)

# 19. Data Quality Requirements

Data Quality Engine owns readiness evaluation.

It should check, where applicable:

- missing candles
- stale data
- duplicate candles
- zero or suspicious volume
- invalid OHLC values
- impossible price moves
- insufficient history
- unsupported asset type
- unsupported region
- provider/source gaps
- symbol/instrument mismatch
- stale market context
- stale historical snapshots
- scope mismatch
- liquidity concerns

Downstream modules may consume Data Quality Engine public outputs.

Downstream modules must not duplicate data quality scoring logic.

Signals, strategy decisions, calibration, backtests, alerts, portfolio context, watchlist context, and copilot summaries must either:

- require data quality to pass, or
- clearly show warning status and reason.

---

# 20. Market Data And OHLC Policy

Market Data Foundation owns market-data ingestion and normalized data access.

Use the existing project’s Prisma/database architecture unless an approved ADR changes it.

Persisted OHLC/price records must document whether they are:

- append-only
- idempotent/upserted
- derived
- cached
- provider-specific
- normalized canonical records

For idempotent OHLC/price data, define a natural key such as:

```text
instrument_id or symbol
region
asset_type
timeframe
timestamp/date
source
```

Where practical, enforce uniqueness at database level.

Market-data records should track:

```text
source
source_symbol
source_timestamp if available
ingested_at
region
asset_type
timeframe
data_quality_status where applicable
```

Do not change OHLC storage strategy casually.

A future local analytical store such as DuckDB/Parquet may be proposed only if the Architect produces an ADR covering:

- current bottleneck
- proposed storage model
- module ownership
- migration path
- query/test strategy
- rollback plan
- impact on existing Prisma models
- Product Owner approval requirement

---

# 21. Global Market Scope

The application uses global market region and asset context.

Default:

```text
region = IN
assetType = STOCK
```

Supported target scopes:

```text
IN
US
EU
GLOBAL
```

Target asset classes:

```text
STOCK
ETF
INDEX
CRYPTO
```

Current support may be narrower.

Do not pretend unsupported scopes are complete.

Frontend rules:

- Use the existing `useMarketScope()` hook where applicable.
- All instrument/stock/market-data API calls should include `region` and `assetType`.
- Components should refetch data when market scope changes.
- Persisted scope key should remain `market_scope` unless explicitly changed.

Backend rules:

- Standard query parameters are `region` and `assetType`.
- Use shared market-scope helpers where present.
- Do not show unknown-scope rows in scoped views unless the module can safely infer scope from owned data.

---

# 22. Batch Orchestration Standard

Long-running universe workflows must use bounded batches or module-owned workers/jobs.

Examples:

- catalog import
- market-data sync
- data-quality evaluation
- signal generation
- calibration
- backtesting
- smart-money snapshot refresh
- historical context snapshot generation

Backend endpoints must not process an entire universe in one synchronous request unless a documented worker/job system owns that workflow.

Backend batch responses should include:

```text
totalCount
processedCount
batchSize
offset or cursor
nextOffset or nextCursor
hasMore
summary counts
warnings
durationMs
region
assetType
```

Frontend owns orchestration across batches unless a backend worker/job system is explicitly implemented.

Rules:

- Include `region` and `assetType` in every batch request.
- Default batch size should usually be `25`.
- Max batch size should usually be `100` unless documented.
- One item failure should not fail the whole batch when safe.
- Responses should be additive and backward-compatible.
- Do not fake progress.
- Do not leave users staring at long-running actions without visible progress.

---

