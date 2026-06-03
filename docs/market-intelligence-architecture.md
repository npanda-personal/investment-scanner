# Market Intelligence Architecture

## Goals

Market Intelligence is the trader-facing read layer for local, rule-based market research. It should turn persisted local market data into scoped, explainable snapshots that answer what is healthy, what deserves review, what needs caution, and what context applies to a selected instrument.

The architecture must preserve these constraints:

- localhost-first and zero incremental cost;
- no broker integration, order placement, or real-money execution;
- no paid provider, paid AI, cloud, telemetry, or hosted dependency;
- no black-box recommendations or direct financial advice;
- no arbitrary predefined prices;
- no trader page that imports, repairs, syncs, backfills, generates, evaluates, calibrates, refreshes, or runs shared pipeline work on page load;
- every trader-facing row must come from persisted backend read models or show an honest unavailable/empty state.

Market Intelligence is not the source of truth for raw market data, data quality, signals, strategy rules, or portfolio records. It composes and exposes persisted read models from owning modules.

## Intelligence Pipeline

```text
Market Data
→ Sector Intelligence
→ Earnings Intelligence
→ Market Pulse
→ Stock Interest
→ Instrument Context
→ Future Modules
```

The pipeline above is the trader-facing dependency order. It is not permission for page-level computation. Refresh work belongs in backend module services and pipeline orchestration; trader APIs read already materialized snapshots.

Current implementation status:

- Market Data Foundation owns persisted stock, price, latest price, delivery, source import, and fundamental inputs.
- Market Context Intelligence owns `SectorSnapshot` and `MarketPulseSnapshot`.
- Earnings Intelligence owns `EarningsIntelligenceSnapshot`.
- Market Intelligence owns `StockInterestSnapshot`.
- Frontend Market Intelligence defines future contracts for `InstrumentContextSnapshot`, `CompounderSnapshot`, `TraderSetupSnapshot`, and `RiskRadarSnapshot`, but their backend read APIs are not implemented yet.

## Snapshot Catalog

### MarketPulseSnapshot

Status: implemented backend persisted read model.

Owner: `backend/src/modules/market-context-intelligence`.

Read APIs:

- `GET /api/v1/market-intelligence/market-pulse`
- `GET /api/v1/market-intelligence/market-pulse/history`

Refresh path: `MARKET_PULSE_REFRESH`.

Persistence model: `MarketPulseSnapshot`.

Scope key:

```text
snapshotDate + region + assetType + timeframe
```

Purpose: summarize broad market health for the selected scope using local persisted evidence. The snapshot includes market health score/label, component scores, top indices, strong sectors, weak sectors, breadth summary, delivery summary, candidate count, warnings, and source freshness summary.

Inputs:

- persisted index `PriceTick` rows;
- persisted sector-index `PriceTick` rows;
- active scoped `Stock` rows and persisted stock `PriceTick` rows;
- persisted `LatestPrice` rows where needed by the calculation;
- persisted `MarketDeliverySnapshot` rows;
- persisted `SourceFileImport` rows for source freshness, including linked sector-index price provenance from official NSE all-index imports.

Rules:

- GET requests must never calculate or refresh this snapshot.
- Refresh uses local database rows only.
- Refresh is idempotent for the same date, scope, and timeframe.
- Missing snapshots must return an empty/unavailable envelope with a useful operator hint.
- Health language must stay research-support oriented: healthy, tradable but selective, fragile, risky, stale, partial.
- Sector-index freshness must come from completed source-file evidence or `PriceTick.sourceFileImportId` provenance on real sector-index rows; it must not be inferred from wall-clock time.

### SectorSnapshot

Status: implemented backend persisted read model.

Owner: `backend/src/modules/market-context-intelligence`.

Read API:

- `GET /api/v1/market-intelligence/sectors`

Refresh path: `SECTOR_INTELLIGENCE_REFRESH`.

Persistence model: `SectorSnapshot`.

Scope key:

```text
snapshotDate + scopeRegion + scopeAssetType + sector
```

Purpose: provide one persisted sector-intelligence row per sector for trader-facing sector review. Rows include classification, score, short-term and medium-term returns, trend score, reason tags, and warnings.

Inputs:

- saved sector index catalog rows;
- persisted `PriceTick` rows;
- persisted `LatestPrice` rows.

Rules:

- Refresh must not call external providers, ingestion, repair, backfill, signal generation, or frontend code.
- Classifications are `STRONG`, `IMPROVING`, `NEUTRAL`, and `WEAK`.
- Missing metadata buckets such as unknown/empty sectors must not be promoted as real sector leadership.
- Read APIs return the latest persisted snapshot only.

### EarningsIntelligenceSnapshot

Status: implemented backend persisted read model.

Owner: `backend/src/modules/earnings-intelligence`.

Read API:

- `GET /api/v1/market-intelligence/earnings`

Refresh path: `EARNINGS_INTELLIGENCE_REFRESH`.

Persistence model: `EarningsIntelligenceSnapshot`.

Scope key:

```text
snapshotDate + scopeRegion + scopeAssetType + symbol
```

Purpose: materialize earnings-related research rows from persisted local evidence. Rows include result date, result date source, period end date, validation timestamp, days to result, revenue/profit/EPS growth, margin trend, consistency score, acceleration score, reason tags, risk tags, warning metadata, freshness, and categories.

Allowed categories:

- `UPCOMING_RESULTS`
- `PRE_RESULT_INTEREST`
- `RESULT_WINNERS`
- `RESULT_DISAPPOINTMENTS`
- `RESULT_REACTION_HISTORY`
- `EARNINGS_WATCHLIST`

Inputs:

- persisted `Fundamental` quarterly, annual, and manual-verified rows;
- persisted `PriceTick` rows;
- persisted `LatestPrice` rows;
- persisted `MarketDeliverySnapshot` rows.

Rules:

- GET requests must never calculate earnings intelligence.
- Refresh reads local persisted data only.
- Every persisted row must have at least one allowed category.
- Estimated result windows must carry explicit provenance through `resultDateSource`, reason tags, and risk tags.
- Estimated result dates are limitations, not authoritative calendar events.
- Period-end and validation timestamp fallback dates must be labelled with `PERIOD_END_DATE_FALLBACK` or `VALIDATED_AT_FALLBACK`.
- Freshness must be evaluated from persisted `periodEndDate`, not `validatedAt`.

### StockInterestSnapshot

Status: implemented backend persisted read model.

Owner: `backend/src/modules/market-intelligence`.

Read API:

- `GET /api/v1/market-intelligence/stock-interest`

Refresh path: `STOCK_INTEREST_REFRESH`.

Persistence model: `StockInterestSnapshot`.

Scope key:

```text
snapshotDate + scopeRegion + scopeAssetType + timeframe + category + symbol
```

Purpose: persist ranked stock-interest rows for trader review. Rows include symbol, company, sector, category, score, direction, reason tags, risk tags, freshness, warnings, and data-through date.

Allowed categories:

- `TODAY_TOP_INTEREST`
- `GROWTH_CONSISTENCY`
- `GROWTH_ACCELERATION`
- `SECTOR_LEADERS`
- `ACCUMULATION`
- `BREAKOUTS`
- `RISK_AVOID`

Inputs:

- persisted `PriceTick` rows;
- persisted `LatestPrice` rows;
- persisted `MarketDeliverySnapshot` rows;
- persisted `Fundamental` rows;
- stock sector metadata.

Rules:

- GET requests must never calculate rankings.
- Refresh reads local persisted data only.
- Refresh must keep the latest snapshot coherent by pruning stale category rows for symbols recalculated in the current batch.
- Frontend must preserve backend row order and tags.
- Direction labels must remain review-oriented and must not become buy/sell instructions.

### InstrumentContextSnapshot

Status: future backend read model; current frontend contract/unavailable state exists.

Current frontend consumers:

- `/instrument-workspace`
- instrument context rail on stock pages.

Expected owner: future backend Market Intelligence aggregation owner, with explicit architecture approval before implementation.

Expected purpose: provide one selected instrument context rail that summarizes the current backend-provided state across market, sector, relative strength, earnings, compounder, setup, and risk dimensions.

Current frontend contract:

- `snapshotDate`
- `symbol`
- `marketState`
- `sectorState`
- `relativeStrength`
- `earningsStatus`
- `compounderStatus`
- `setupStatus`
- `riskStatus`
- `freshness`

Rules:

- Until a backend read API exists, the UI must show unavailable state.
- The stock page or workspace must not infer this context from local page data.
- Future implementation must include scope, symbol/instrument identity, freshness per upstream source, warnings, and gaps.
- The context snapshot should aggregate existing read models; it must not duplicate their scoring logic.

### Future CompounderSnapshot

Status: future backend read model; current frontend contract/unavailable state exists.

Current frontend page:

- `/compounder-radar`

Expected purpose: identify durable long-term growth candidates using persisted evidence and research-support language.

Current frontend contract:

- `snapshotDate`
- `symbol`
- `compounderScore`
- `growthScore`
- `qualityScore`
- `trendScore`
- `reasonTags`
- `riskTags`
- `freshness`

Rules:

- Must not use "multibagger" framing.
- Must not infer rows in the frontend.
- Must document growth, quality, trend, and risk inputs before backend implementation.
- Must use persisted local data and explicit freshness/gap reporting.

### Future TraderSetupSnapshot

Status: future backend read model; current frontend contract/unavailable state exists.

Current frontend page:

- `/trader-setup-radar`

Expected purpose: identify reviewable swing setups for timeframes of `1D` and above.

Current frontend contract:

- `snapshotDate`
- `symbol`
- `setupType`
- `setupScore`
- `timeframe`
- `reasonTags`
- `riskTags`
- `freshness`

Rules:

- Must present setup candidates, not instructions.
- Must document rule names, rule versions, data quality status, and invalidation/exit context before any future trigger workflow consumes it.
- Must not use intraday or broker assumptions unless explicitly approved.
- Must consume public outputs from signal, strategy, market context, data quality, and risk modules rather than importing their repositories.

### Future RiskRadarSnapshot

Status: future backend read model; current frontend contract/unavailable state exists.

Current frontend page:

- `/risk-radar`

Expected purpose: identify instruments or holdings that need caution due to weak context, stale data, liquidity concerns, poor result reaction, breakdown behavior, or portfolio risk.

Current frontend contract:

- `snapshotDate`
- `symbol`
- `riskScore`
- `riskCategory`
- `reasonTags`
- `freshness`

Rules:

- Risk rows must explain why a warning exists.
- Risk Radar may consume Data Quality, Market Context, Earnings Intelligence, Portfolio Intelligence, Signal/Strategy outputs, and future setup snapshots through public contracts only.
- It must not duplicate Data Quality scoring logic.
- It must not tell the user to sell.

## Refresh Stages

### MARKET_PULSE_REFRESH

Owner: Market Context Intelligence service, orchestrated by Pipeline Orchestration.

Adapter:

```text
MarketPulseSnapshotService.refreshSnapshot({ region, assetType, timeframe, pipelineRunId })
```

Rules:

- DB-only materialization.
- Reads persisted market data, sector-index data, stock universe, delivery, and source-import evidence.
- Does not call providers, ingestion, backfill, repair, signal generation, or frontend code.
- Upserts one scoped Market Pulse snapshot for the current snapshot date.
- Must record warnings for missing or stale inputs.

### SECTOR_INTELLIGENCE_REFRESH

Owner: Market Context Intelligence service, orchestrated by Pipeline Orchestration.

Adapter:

```text
MarketContextIntelligenceService.refreshSectorSnapshots({ region, assetType, dataThroughDate })
```

Rules:

- DB-only materialization.
- Writes one `SectorSnapshot` row per real sector in scope.
- Uses saved sector-index rows, `PriceTick`, and `LatestPrice` evidence only.
- Must keep refresh idempotent by snapshot date, scope, and sector.

### EARNINGS_INTELLIGENCE_REFRESH

Owner: Earnings Intelligence service, orchestrated by Pipeline Orchestration.

Rules:

- DB-only materialization.
- Reads persisted fundamentals, prices, latest prices, and delivery snapshots.
- Supports bounded work through batch size, offset, and optional instrument ids.
- Writes category counts, warnings, errors, and continuation metadata.
- Must mark estimated result windows explicitly.

### STOCK_INTEREST_REFRESH

Owner: Market Intelligence service, orchestrated by Pipeline Orchestration.

Adapter:

```text
StockInterestSnapshotService.refreshSnapshots(...)
```

Rules:

- DB-only materialization.
- Reads persisted prices, latest prices, delivery, fundamentals, and stock metadata.
- Supports bounded work through batch size and offset.
- Writes category counts, warnings, errors, and continuation metadata.
- Must not fetch providers or calculate during trader reads.

## Dependency Graph

```text
Market Data Foundation
  - Stock catalog and instrument identity
  - PriceTick
  - LatestPrice
  - MarketDeliverySnapshot
  - SourceFileImport
  - Fundamental

Market Data Foundation
  → Market Context Intelligence
      → SectorSnapshot
      → MarketPulseSnapshot

Market Data Foundation
  → Earnings Intelligence
      → EarningsIntelligenceSnapshot

Market Data Foundation
  → Market Intelligence
      → StockInterestSnapshot

SectorSnapshot
  → MarketPulseSnapshot
  → InstrumentContextSnapshot

EarningsIntelligenceSnapshot
  → StockInterestSnapshot where earnings context is relevant
  → InstrumentContextSnapshot
  → Future CompounderSnapshot
  → Future RiskRadarSnapshot

StockInterestSnapshot
  → Trader UI
  → InstrumentContextSnapshot
  → Future TraderSetupSnapshot
  → Future RiskRadarSnapshot

Data Quality Engine
  → freshness, readiness, and warning inputs for future compounder, setup, risk, and instrument context read models

Portfolio / Watchlists / Alerts
  → trader workflows that may reference Market Intelligence outputs without owning their calculations
```

Dependency rules:

- Downstream modules must consume public module exports or APIs.
- No module may import another module's repository directly.
- Snapshot refreshes must be scoped by `region` and `assetType`; `timeframe` is required where the model supports it.
- Unknown-scope rows must not satisfy scoped trader reads.
- Future modules need architecture contracts before persistence or route changes.

## Freshness Rules

- Every snapshot must expose `snapshotDate`.
- Every data-bearing snapshot should expose `dataThroughDate` when the source evidence has a market-data date.
- Every read response must expose generated time or freshness status when available.
- Freshness is based on persisted source evidence, not the wall-clock time of the GET request.
- A stale or partial snapshot may be displayed only with clear warnings.
- Missing snapshots must show empty/unavailable state; they must not trigger generation.
- For `IN / STOCK` EOD review, data freshness should refer to the latest completed trading session, not in-progress daily candles.
- Future `InstrumentContextSnapshot` freshness must summarize upstream component freshness and expose which source is stale, partial, missing, or backend-unavailable.
- Future compounder, setup, and risk snapshots must include enough freshness and warning fields for the UI to explain why a row is visible or limited.
- Frontend must not override, hide, or reinterpret backend freshness.

## Read API Rules

- Trader read APIs are read-only `GET` endpoints.
- Current localhost-validation decision: implemented Market Intelligence snapshot GET routes may be unauthenticated, but this exception is limited to read-only persisted snapshot routes.
- Read APIs must return persisted snapshots only.
- Read APIs must not call providers, import market data, repair data, backfill history, run pipeline commands, generate signals, evaluate strategies, calibrate signals, or calculate trader rows during request handling.
- Standard query parameters are `region` and `assetType`; `timeframe`, `category`, `limit`, or `symbol` may be added only where the owning contract defines them.
- Responses should include scope, availability/status, snapshot date, data-through date where applicable, warnings, and a clear message when data is absent.
- Empty state is a valid response. Fake rows are not allowed.
- Error responses must not expose secrets, credentials, provider tokens, private data, or database dumps.
- Backend row order is part of the read-model contract unless a documented query parameter asks for a specific sort.
- Frontend must not sort or recompute ranked rows unless the API contract explicitly delegates that behavior.
- Compatibility routes may remain, but they must not become hidden calculation paths.

## Trader UI Rules

- Primary trader navigation is snapshot-first:
  - Market Pulse
  - Stock Interest Radar
  - Earnings Intelligence
  - Compounder Radar
  - Trader Setup Radar
  - Risk Radar
  - Watchlists
  - Portfolios
  - Alerts
  - Instrument Workspace
- Trader pages must use `useMarketScope()` and refetch or reload read models when the selected scope changes.
- Trader pages must not expose operator controls for import, sync, repair, backfill, provider validation, generation, evaluation, calibration, or pipeline execution.
- Trader pages must not make write requests for shared market-intelligence snapshots.
- Personal watchlist, portfolio, alert, note, and preference workflows may remain writable under their owning modules.
- UI must show unavailable backend support honestly for future snapshots.
- UI must show backend-provided reason tags, risk tags, warnings, freshness, and empty-state messages without inventing missing evidence.
- UI copy must use research-support language such as candidate, review, trigger, warning, freshness, data quality, and context.
- UI copy must avoid buy/sell instruction language, guarantees, and financial-advice framing.
- Instrument Workspace may search and open existing local catalog instruments, but it must not infer `InstrumentContextSnapshot` from stock-page local state.
- UI smoke tests for these pages must verify that missing backend states are honest and that no prohibited backend mutation or operator workflow is triggered.

## Ownership Matrix

| Area | Owns | Current owner | Current status | Key rules |
| --- | --- | --- | --- | --- |
| Market data inputs | Stock catalog, `PriceTick`, `LatestPrice`, delivery, source imports, fundamentals | `market-data-foundation` | Implemented upstream dependency | Must stay local/free; downstream modules must not bypass ownership. |
| Data readiness | Data quality and readiness gates | `data-quality-engine` | Implemented upstream dependency | Future risk/setup/context read models should consume public outputs instead of duplicating scoring. |
| Sector Intelligence | `SectorSnapshot`, sector read API, sector refresh adapter | `market-context-intelligence` | Implemented | DB-only refresh; latest persisted read only. |
| Market Pulse | `MarketPulseSnapshot`, market pulse read APIs, refresh adapter | `market-context-intelligence` | Implemented | DB-only refresh; GET must not calculate. |
| Earnings Intelligence | `EarningsIntelligenceSnapshot`, earnings read API, refresh adapter | `earnings-intelligence` | Implemented | Estimated result dates must be labelled as estimated. |
| Stock Interest | `StockInterestSnapshot`, stock-interest read API, refresh adapter | `market-intelligence` | Implemented | Frontend preserves backend row order and does not calculate rankings. |
| Refresh orchestration | Command catalog, leases, run/stage ledger, manual command execution | `pipeline-orchestration` | Implemented for listed stages | Orchestrates module adapters; does not own snapshot calculations. |
| Trader UI shell | Snapshot pages, unavailable states, market scope usage | `frontend/src/features/market-intelligence` | Implemented presentation layer | Read-only for intelligence snapshots; no operator controls. |
| Instrument Context | Aggregated instrument context read model | Future architecture owner TBD | Frontend contract only | Requires backend contract and Product Owner approval before implementation. |
| Compounder Radar | Compounder snapshot read model | Future architecture owner TBD | Frontend contract only | Must avoid speculative language and document scoring inputs first. |
| Trader Setup Radar | Setup snapshot read model | Future architecture owner TBD | Frontend contract only | Must be rule-based, auditable, and review-oriented. |
| Risk Radar | Risk snapshot read model | Future architecture owner TBD | Frontend contract only | Must explain risk warnings and consume Data Quality outputs. |
| Shared route registries | Backend and frontend route registration | Orchestrator / Architect controlled | Existing routes registered elsewhere | Route changes require explicit reservation and approval. |
| Prisma schema | Snapshot persistence models and indexes | Orchestrator / Architect controlled | Existing models for current snapshots | Schema changes require approval and migration/release evidence. |
