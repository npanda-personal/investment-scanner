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

The listed `resultDate` includes explicit provenance in `resultDateSource`:

- `ESTIMATED_FROM_PERIOD_CADENCE` when the next expected result window is inferred from persisted reporting cadence.
- `OFFICIAL_CALENDAR` is reserved for future persisted official-calendar inputs.
- `UNKNOWN` when the date comes from persisted result availability or the source is not authoritative.

Scoring is deterministic:

- `consistencyScore`: percentage of available sequential revenue, profit, EPS, and margin checks that are stable or improving across recent persisted results.
- `accelerationScore`: percentage of available revenue, profit, EPS, and margin-growth checks where latest growth improves versus prior growth.
- Growth fields compare the latest result with the same prior-year period when available, otherwise the previous same-type period.

## Limitations

Upcoming result dates are estimated from persisted period cadence because no external earnings calendar is fetched. Rows carry `RESULT_WINDOW_ESTIMATED_FROM_PERSISTED_PERIODS` in `reasonTags`, `ESTIMATED_RESULT_DATE` in `riskTags`, and `resultDateSource = ESTIMATED_FROM_PERIOD_CADENCE` when this applies.
