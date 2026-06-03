# Earnings Intelligence

## Objective

Persist a backend read model for earnings-related research snapshots. The module reads only local persisted data and exposes the latest materialized snapshot for frontend market-intelligence pages.

## Owns

- `EarningsIntelligenceSnapshot` rows.
- Earnings consistency and acceleration scoring.
- Earnings category assignment for:
  - `UPCOMING_RESULTS`
  - `PRE_RESULT_INTEREST`
  - `RESULT_WINNERS`
  - `RESULT_DISAPPOINTMENTS`
  - `RESULT_REACTION_HISTORY`
  - `EARNINGS_WATCHLIST`
- `GET /api/v1/market-intelligence/earnings`.
- `EARNINGS_INTELLIGENCE_REFRESH` pipeline refresh command/stage.

## Inputs

The refresh uses existing persisted rows only:

- `Fundamental` quarterly, annual, and `MANUAL_VERIFIED` rows.
- `PriceTick`.
- `LatestPrice`.
- `MarketDeliverySnapshot`.

No provider fetch, market-data ingestion, backfill, frontend calculation, paid service, broker integration, or external telemetry is introduced.

## Snapshot Rules

The API never calculates earnings intelligence during a request. It reads the latest persisted `EarningsIntelligenceSnapshot` rows for the requested `region` and `assetType`.

Refresh upserts one row per `snapshotDate + region + assetType + symbol`. Category membership is persisted in `categories` JSON. Every persisted row has at least one allowed category; rows that do not qualify for a stronger bucket are assigned `EARNINGS_WATCHLIST` as a generic earnings review bucket.

Each row persists separate date evidence:

- `resultDate`: the displayed date selected by the provenance resolver.
- `periodEndDate`: the latest persisted fundamental period end date.
- `validatedAt`: the local/manual validation timestamp from the latest persisted fundamental, when available.
- `warnings`: row-level provenance limitations.

The listed `resultDate` includes explicit provenance in `resultDateSource`:

- `OFFICIAL_CALENDAR` is reserved for future persisted official-calendar inputs.
- `ESTIMATED_FROM_PERIOD_CADENCE` when the next expected result window is inferred from persisted reporting cadence.
- `PERIOD_END_DATE_FALLBACK` when no official/upcoming result date exists and the row falls back to the latest persisted fiscal period end.
- `VALIDATED_AT_FALLBACK` when no official/upcoming/period-end date exists and the row falls back to the local validation timestamp.
- `UNKNOWN` when no usable date basis exists.

Freshness is based on `periodEndDate` only. `validatedAt` is local validation/import evidence and must not make stale fundamentals look fresh.

Scoring is deterministic:

- `consistencyScore`: percentage of available sequential revenue, profit, EPS, and margin checks that are stable or improving across recent persisted results.
- `accelerationScore`: percentage of available revenue, profit, EPS, and margin-growth checks where latest growth improves versus prior growth.
- Growth fields compare the latest result with the same prior-year period when available, otherwise the previous same-type period.

## Limitations

Upcoming result dates are estimated from persisted period cadence because no external earnings calendar is fetched. Rows carry `RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS` in `reasonTags`, `ESTIMATED_RESULT_DATE` in `riskTags`, row-level warning metadata, and `resultDateSource = ESTIMATED_FROM_PERIOD_CADENCE` when this applies.

Period-end fallback dates and validation timestamp fallback dates are not official earnings announcement dates. Result reaction history and recent result winner/disappointment categories require an `OFFICIAL_CALENDAR` date.
