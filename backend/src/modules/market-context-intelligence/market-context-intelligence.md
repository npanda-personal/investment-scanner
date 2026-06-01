# Market Context Intelligence

Market Context Intelligence provides a high-level summary of the market environment, including regime, breadth, and sector rotation. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All context summaries are region-specific:
- `region`: (IN, US, EU, GLOBAL) ensures breadth and regime calculations are relevant to the selected market.

### Persistence
Snapshots are stored per region in the `MarketContextSnapshot` database model. This allows for historical analysis of specific market conditions (e.g., "Breadth of India stocks in May 2026").

Downstream batch modules that need bounded reads can use the public `latestPersistedSummary(region)` service method. Unlike `summary()`, it returns only the latest persisted snapshot and does not run market-context generation when a snapshot is missing.

All controller endpoints must pass the requested `region` into the service. Generated snapshots must be persisted with that same region, not `GLOBAL`, otherwise downstream modules such as Strategy Decision will correctly treat the scoped market gate as missing/unknown and block long candidates.

Persisted summary reads must keep sample-count and breadth metrics coherent. If a persisted snapshot has breadth percentages and sector rows but no stored live sample count, the repository derives the displayed price sample from the persisted sector snapshot counts instead of returning `0`.

### Sector Intelligence Snapshot

`SectorSnapshot` is a persisted read model for trader-facing sector intelligence. Refresh writes one row per sector for the selected `region/assetType` scope using only persisted sector index catalog rows, `PriceTick`, and `LatestPrice` evidence. It does not call external providers, ingestion, repair, backfill, signal generation, or frontend code.

The refresh path is idempotent on `snapshotDate + scopeRegion + scopeAssetType + sector`. The read API returns the latest persisted snapshot only; a missing snapshot is reported as a missing read model instead of materializing data on page load.

### Market Pulse Snapshot

`MarketPulseSnapshot` is a persisted read model for the user-facing Market Pulse snapshot. It is owned by `market-context-intelligence` because it composes market context from persisted local database evidence:

- `PriceTick` index rows from saved index EOD sources,
- `PriceTick` sector-index rows from saved sector index sources,
- active scoped `Stock` rows plus persisted stock `PriceTick` candles,
- persisted `MarketDeliverySnapshot` rows,
- persisted `SourceFileImport` completion rows for source freshness.

`GET /api/v1/market-intelligence/market-pulse` and `/history` are read-only. They return the latest persisted `MarketPulseSnapshot` rows for `region + assetType + timeframe` and never calculate, import, refresh, or call providers during the GET request.

`MARKET_PULSE_REFRESH` is the approved refresh path. It uses persisted DB rows only and upserts by `snapshotDate + region + assetType + timeframe`, making repeated refreshes idempotent for the same day and scope. Missing snapshots return `availability=EMPTY` with a clear operator hint instead of a server error.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/market-context/summary` | Consolidated context; may generate a snapshot when missing | Supported for admin/operator contexts |
| `GET /api/v1/market-context/persisted-summary` | Latest saved market context without generation | Supported for trader-facing read-only pages |
| `GET /api/v1/market-context/persisted-breadth` | Latest saved breadth envelope without generation | Supported for trader-facing read-only pages |
| `GET /api/v1/market-intelligence/market-pulse` | Latest saved MarketPulseSnapshot without generation | Supported for trader-facing read-only pages |
| `GET /api/v1/market-intelligence/market-pulse/history` | Recent saved MarketPulseSnapshot rows without generation | Supported for trader-facing read-only pages |
| `GET /api/v1/market-intelligence/sectors` | Latest saved SectorSnapshot rows without generation | Supported for trader-facing read-only pages |
| `GET /api/v1/market-context/regime` | Region-aware regime | Supported |
| `GET /api/v1/market-context/sectors` | Sector strength per region | Supported |

## Methodology

- **Regime**: Combines broad index/price behavior and breadth signals into a market condition and gate.
- **Breadth**: `percentAboveSma50` is calculated over instruments that have an SMA50 sample; `percentAboveSma200` is calculated over instruments that have an SMA200 sample. The response exposes `sma50SampleCount` and `sma200SampleCount` so the UI can show the denominators used for each displayed percentage.
- **Persisted breadth envelope**: `/persisted-breadth` reads only saved `MarketContextSnapshot` evidence. It returns official NSE advance, decline, and unchanged counts as `null` with explicit gaps because those source rows are not persisted yet.
- **Sample count coherence**: The displayed sample count must match the data source used for the displayed breadth metrics, or the UI must label the distinction. The current UI shows `Price Sample` for the persisted/price universe count and `SMA Samples` for the SMA50/SMA200 denominators.
- **Sector leadership**: Missing metadata buckets such as `Unknown`, empty sector names, `N/A`, `NA`, and null-equivalent labels are excluded from leading/weak sector rankings through the shared known-sector predicate. They may be diagnosed as missing metadata elsewhere, but they are not treated as a real leading or weak sector.
- **Sector Intelligence**: Classification uses sector-index returns and relative rank only. Categories are `STRONG`, `IMPROVING`, `NEUTRAL`, and `WEAK`; rows include `sectorScore`, `trendScore`, `return1W`, `return1M`, `return3M`, `reasonTags`, and `warnings`.
- **Market Pulse**: Overall health score is a weighted read model: index trend 25%, sector strength 25%, breadth 25%, delivery participation 15%, and data freshness 10%. Health labels are `HEALTHY`, `TRADABLE_BUT_SELECTIVE`, `FRAGILE`, and `RISKY`. Freshness downgrades can lower the label and add explicit warnings. The read model does not produce buy/sell instructions or arbitrary target prices.
- **Takeaways**: A single named sector is not described as both leading and lagging.

## Frontend
- `MarketContextPage`: Subscribes to `useMarketScope()`. Automatically refetches all widgets when the header region changes.
- `MarketRegimeWidget`: Displays the verdict (OPEN/CLOSED) specific to the current market scope.
- Breadth cards show separate labels for price sample and SMA denominator samples when persisted breadth data is rendered.
- Sector widgets hide missing-metadata buckets from leadership/weakness lists and show a named-sector empty state when no real sectors qualify.

## Verification
- `backend/src/shared/utils/market-scope.test.ts`: Verifies regional mapping.
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.service.test.ts`: Verifies breadth denominator sample counts and Unknown-sector exclusion.
- `backend/tests/modules/market-context-intelligence/sector-intelligence-snapshot.service.test.ts`: Verifies sector ranking, classification, score generation, idempotent refresh, and API response.
- `backend/tests/modules/market-context-intelligence/market-pulse-snapshot.service.test.ts`: Verifies Market Pulse scoring thresholds, freshness status, partial warnings, index/sector ranking, breadth calculation, delivery missing handling, and idempotent refresh handoff.
- `backend/tests/modules/market-context-intelligence/market-pulse-snapshot.repository.test.ts`: Verifies snapshot upsert idempotency and latest persisted reads.
- `backend/tests/modules/market-context-intelligence/market-pulse-snapshot.controller.test.ts`: Verifies read API returns persisted snapshots and does not trigger refresh work.
- `backend/tests/modules/market-context-intelligence/market-context-intelligence.routes.test.ts`: Verifies controller/route behavior.
- `frontend/tests/ui/market-context-intelligence.spec.ts`: Verifies visible sample-count coherence and Unknown-sector exclusion on `/market-context`.
