# Smart Money Intelligence

Smart Money Intelligence identifies price-volume patterns indicative of accumulation or distribution. It is fully integrated with the **Global Market Scope**.

## Global Market Scope Integration

All accumulation and distribution analysis can be scoped by region:
- `region`: (IN, US, EU, GLOBAL) filters candidates and sector summaries.
- `assetType`: (STOCK) filters the target universe.

### Backend Support
Query parameters `region` and `assetType` are supported in all list and aggregation endpoints. Repositories use `resolveRelatedMarketRegionFilter` to join snapshots with regional stock metadata.

Snapshot refresh also accepts `region` and `assetType`. The frontend must call the authenticated API client, not raw unauthenticated `fetch`, so `Refresh Snapshots` genuinely invokes the backend and then reloads the visible accumulation/distribution/sector data.

Refresh generation persists all supported ranges (`1M`, `3M`, and `6M`) in one run. The list endpoints are persisted-snapshot reads, so a refresh must not only calculate the default `3M` range while leaving the other visible UI ranges empty.

## API Reference

| Endpoint | Purpose | Region Support |
| --- | --- | --- |
| `GET /api/v1/smart-money/top` | Top accumulation candidates | Supported |
| `GET /api/v1/smart-money/distribution`| Top distribution warnings | Supported |
| `GET /api/v1/smart-money/sectors` | Sector-level aggregation | Supported |
| `POST /api/v1/smart-money/run` | Persist daily smart-money snapshots for all supported ranges in one bounded batch | Supported |

## Scoring Methodology

The score combines two kinds of price-volume evidence:

- Recent evidence from the latest candle, 20-day average volume, and short multi-day accumulation/distribution streaks.
- Range-window evidence from the selected `1M`, `3M`, or `6M` price/volume window.

The range selector is not only a display filter. Each timeframe recalculates evidence over its own window and persists that result under the `(snapshotDate, instrumentId, range)` key. A stock can therefore be accumulating on `1M` while remaining neutral or distributing on `6M`.

Range-window signals include:

- `RANGE_ACCUMULATION_<range>` when up-day directional volume and range return support accumulation.
- `RANGE_DISTRIBUTION_<range>` when down-day directional volume and range return support distribution.
- `RANGE_HIGH_VOLUME_UP_DAYS_<range>` and `RANGE_HIGH_VOLUME_DOWN_DAYS_<range>` when high-volume days are skewed by direction across the selected window.

The range-window evidence is intentionally ignored for windows shorter than 30 bars so a 21-day minimum does not overfit a tiny sample. The latest-day evidence still works once the module has at least 21 usable bars.

Backend tests must prove that the same latest candle can produce different `1M` and `6M` outcomes when the broader window has different volume/price behavior. Tests that only verify snapshots exist for every range are not sufficient.

## Batch Refresh Behavior

`POST /api/v1/smart-money/run` is batch bounded. It accepts:

- `batchSize` clamped to `1..100`
- `offset`
- `region`
- `assetType`

The endpoint refreshes all supported ranges (`1M`, `3M`, `6M`) for only the current batch of scoped instruments and returns progress metadata:

- `processedCount`
- `totalCount`
- `batchSize`
- `offset`
- `nextOffset`
- `hasMore`
- `generatedCount`
- `skippedCount`
- `failedCount`
- `warnings`
- `durationMs`

The frontend owns full-scope orchestration. It keeps calling the backend with `nextOffset` until `hasMore=false`, keeps the refresh button disabled while running, and shows progress plus a final generated/skipped/failed summary. The regular Playwright suite stubs the POST and asserts this orchestration; real full refreshes remain manual browser checks because they are database-heavy.

Scheduled pipeline automation can also call `SmartMoneyIntelligenceService.run()` with explicit `instrumentIds`. That path avoids region-wide pagination, uses local persisted market data only, uses missing ownership placeholders rather than provider calls, writes persisted daily snapshots for each supported range, and counts missing explicit instruments as skipped evidence instead of clean success.

## Sector Aggregation
Sector summaries are calculated per region to provide accurate localized tailwinds and distribution warnings.

Sector aggregation is range-specific. If the user selects `1M`, `3M`, or `6M`, the frontend must pass the same range to top candidates, distribution warnings, and sector summaries.

## Downstream Reads

`stock()` may calculate and persist an on-demand snapshot when today's snapshot is missing. Downstream batch triage modules that need fast, bounded reads should use the public `latestPersistedStock()` service method so missing smart-money context becomes a data gap instead of triggering price-volume calculation during their request.

## Frontend
- `SmartMoneyIntelligencePage`: Subscribes to `useMarketScope()`. Automatically refetches all candidates and sector data when the header region changes.
- Empty accumulation/distribution tables must explain whether no candidates/warnings exist for the current scope/range and point users to `Refresh Snapshots` or sector context. Generic `No records found` is not sufficient for this module.
- Refresh Snapshots must run through bounded frontend-orchestrated batches and pass the active `region` and `assetType` on every request.
