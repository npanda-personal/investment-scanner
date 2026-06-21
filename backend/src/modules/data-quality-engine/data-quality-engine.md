# Data Quality Engine

Data Quality Engine evaluates whether Market Data Foundation instruments have enough clean data for downstream research workflows. It is a gatekeeper for Signal Generation, Signal Quality, Calibration, Strategy Framework, Backtesting, Strategy Decision, and Trade Plan readiness.

The module remains a flat backend module and a dedicated frontend feature. It consumes Market Data Foundation through its public service/API surface and does not import another module's repository directly.

## Ownership

Data Quality Engine owns:

- Coverage scoring.
- Signal readiness scoring.
- Liquidity scoring.
- Data gaps, blockers, warnings, and recommended fixes.
- Batch-safe evaluation workflows.
- Readiness filters for downstream modules.
- Data quality dashboard and diagnostics UI.

It does not own market data ingestion, provider validation, signal scoring, strategy decisions, backtests, or trade planning.

## Backend Files

- `data-quality-engine.router.ts`: Registers `/api/v1/data-quality/*` endpoints.
- `data-quality-engine.controller.ts`: Request handlers.
- `data-quality-engine.service.ts`: Evaluation, scoring, eligibility filtering, and batch orchestration.
- `data-quality-engine.repository.ts`: Prisma access for `DataQualityEvaluation`.
- `data-quality-engine.validation.ts`: Query and evaluate request parsing.
- `data-quality-engine.types.ts`: DTOs and response contracts.

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/data-quality/summary` | Region/asset-scoped summary metrics. |
| `GET /api/v1/data-quality/instruments` | Paginated, filtered evaluation list. |
| `GET /api/v1/data-quality/instruments/:instrumentId` | Latest diagnostics for one instrument; evaluates on demand when missing. |
| `GET /api/v1/data-quality/signal-readiness` | Convenience list defaulting to `READY`. |
| `GET /api/v1/data-quality/liquidity` | Convenience liquidity-focused list. |
| `POST /api/v1/data-quality/evaluate` | Bounded batch evaluation. |

List endpoints return:

```json
{
  "items": [],
  "pagination": {
    "total": 0,
    "limit": 25,
    "offset": 0,
    "nextOffset": null,
    "hasMore": false
  }
}
```

## Filters

Supported list filters:

- `search`: Partial symbol/company search.
- `status`: Coverage status: `GOOD`, `PARTIAL`, `POOR`, `UNUSABLE`.
- `readinessStatus`: `READY`, `LIMITED`, `NOT_READY`.
- `liquidityStatus`: `LIQUID`, `THIN`, `ILLIQUID`, `UNKNOWN`.
- `sector`: Case-insensitive partial match.
- `country`: Case-insensitive partial match.
- `eligibleForSignals`: Boolean.
- `eligibleForBacktesting`: Boolean.
- `region`: Global market region.
- `assetType`: Global asset type. `STOCK` includes legacy `EQUITY` rows for compatibility.
- `limit` / `offset`: Bounded pagination.
- `sortBy` / `sortOrder`: Allowlisted sorting. Unknown sort fields fall back safely.

Region and asset scope are applied through the related `Stock` relation so evaluated rows do not leak across markets.

## Scoring

Coverage considers:

- Price history length.
- Latest price availability and freshness.
- Fundamentals availability.
- Corporate action availability.
- Sector, industry, country, and currency metadata.
- Volume availability.
- Adjusted close availability.

Signal readiness considers:

- RSI/SMA50/SMA200 history sufficiency.
- Latest price staleness.
- Volume availability.
- Sector/country context.
- Liquidity score.

Liquidity considers recent volume, median/average volume, zero-volume ratio, and sample sufficiency.

## Eligibility (single authority)

`instrument_eligibility` verdicts are the **single source of truth**. The legacy
`DataQualityEvaluation` booleans are derived to be *equal* to the verdicts, so the
two stores can never disagree by construction (see `evaluateInstrument`, which sets
`eligibleFor* = computeEligibilityVerdicts(...)`).

- `eligibleForSignals` = `signalEligible`: readiness ≥ 70, ≤ 3 stale sessions, **and**
  (mainboard → has fundamentals) **and** liquidity score ≥ 40. The fundamentals and
  illiquid gates were previously absent from the legacy boolean — they now apply
  uniformly to every consumer.
- `eligibleForBacktesting` = `backtestEligible`: ≥ 252 price rows and a fresh latest price.
- `eligibleForCalibration` = `calibrationEligible`: ≥ 60 price rows. (Signal history is
  produced *downstream* of DQE, so it is **not** a calibration gate — `hasSignal` is
  informational only.)

Downstream modules must consume `filterByVerdict` / `getEligibility` (verdict authority)
or `filterEligibleInstruments` (reads the derived legacy booleans) instead of
re-deriving readiness rules. A missing verdict row defaults to `WARN_AND_PROCESS`
(included with READY status); callers can pass `missingQualityBehavior: 'SKIP'` to
exclude with the honest reason `ELIGIBILITY_NOT_COMPUTED`.

## Business Logic & Data Sources

DQE is **persisted-read and never calls an external provider directly.** Every input is
read from internal DB tables through Market Data Foundation's public service methods;
MDF is the only component that ingests from approved external sources (Yahoo Finance for
prices/fundamentals/corporate actions, SEC for US filings, exchange listing files). DQE
turns that DB-backed input into the scores, statuses, facts, and verdicts below.

| Data point | Business logic (what it answers) | Derived from | Source path (internal table ← external origin) |
| --- | --- | --- | --- |
| `coverageScore` / `coverageStatus` | "How complete is this instrument's data for research?" Weighted blend of history depth, freshness, fundamentals, actions, metadata, volume, adjusted-close cleanliness. | price history length, latest-price freshness, fundamentals/actions counts, sector/industry/country/currency, volume presence | `Stock` + `StockPrice` + `Fundamental` + corporate actions ← Yahoo / SEC / exchange listings |
| `signalReadinessScore` / `signalReadinessStatus` | "Is there enough clean, fresh history to compute indicators (RSI/SMA50/SMA200) for signals?" | price-bar counts vs RSI/SMA gates, staleness, volume, sector/country, liquidity score | `StockPrice` ← Yahoo; metadata from `Stock` |
| `liquidityScore` / `liquidityStatus` | "Is recent traded volume deep enough to act on?" Base + volume-band bonus + median bonus − zero-volume penalty + sample bonus; **bands are region-scaled** (IN vs US share counts). | recent-window volumes (avg/median/zero-ratio/sample size) | `StockPrice.volume` ← Yahoo |
| `isStale` / `staleSessions` | "Is the latest price old?" Trading-session count behind the region's expected last completed session (calendar-day fallback when the calendar is unknown; continuous-day for crypto). | latest price date vs trading calendar | `StockPrice` ← Yahoo; calendar from internal `expectedLatestTradingDate` / `tradingSessionsBetween` |
| `volumeCoveragePct` | "What share of bars actually carry volume?" Real one-pass measure (previously persisted as a placeholder `0`). | per-bar volume over the window | `StockPrice.volume` ← Yahoo |
| `maxGapDays` | "What is the largest hole in the history window?" Largest calendar gap between consecutive bars. | sorted bar dates | `StockPrice.date` ← Yahoo |
| `fundamentalsCoverageTier` / `fundamentalsPeriodCount` | "How many distinct fiscal periods of fundamentals exist?" NONE / SHALLOW / ADEQUATE / DEEP. | distinct `periodEndDate` count | `Fundamental` ← Yahoo / SEC / manual |
| Eligibility verdicts (`signal`/`review`/`backtest`/`calibration`) | "Is this instrument fit for each downstream use?" Pure function of the measured facts + `ELIGIBILITY_POLICY`. | `EligibilityFacts` (bars, staleness, liquidity, fundamentals, metadata flags) | derived; persisted to `instrument_eligibility` |
| Use-case tiers (`dailyReview`/`signal`/`backtest`/`calibration`/`automation`) | "READY / LIMITED / BLOCKED for each workflow, with reasons." `automation` is always BLOCKED in Phase 0 (not broker-authorized). | coverage/readiness/liquidity statuses + trusted-baseline evidence | derived |
| Trusted-baseline evidence (`requiredHistoryStatus`, `listingDateStatus`, `trustedBaselineBlockerCodes`) | "Does the instrument have a trustworthy long-history baseline?" Gates daily-review/backtest/calibration tiers. | trusted-universe curation columns | `Stock` (trusted-baseline fields) ← MDF trusted-universe curation |
| Instrument metadata (`symbol`, `companyName`, `sector`, `industry`, `country`, `currency`, `region`, `assetType`, `catalogSource`) | identity, region/asset scoping, and the mainboard-fundamentals gate (`catalogSource = NSE_EQUITY_SECURITIES`). | catalog columns | `Stock` ← exchange listing files / catalog ingestion |
| `dataGaps` / `warnings` / `readinessBlockers` / `recommendedFixes` | human-readable diagnostics for the UI drawer. **Display only** — no machine decision is parsed back out of these strings. | derived from the facts above | derived |

Persistence (both internal): `data_quality_evaluations` (one latest row per instrument)
and `instrument_eligibility` (one row per instrument + trading date). Region/asset scope
is applied through the `Stock` relation, so the summary universe total and the per-status
counts use one scoping engine and stay consistent per market.

## Batch Evaluation

`POST /api/v1/data-quality/evaluate` processes bounded batches and returns:

- `processedCount`
- `totalCount`
- `batchSize`
- `offset`
- `nextOffset`
- `hasMore`
- `evaluatedCount`
- `skippedCount`
- `failedCount`
- `warnings`
- `durationMs`

The frontend owns user-triggered orchestration across batches and shows progress until `hasMore=false`. The page uses the shared batch runner with module-owned defaults:

- `data_quality_engine_batch_size = 100`
- `data_quality_engine_batch_request_workers_count = 4`

The backend remains bounded at a maximum `batchSize` of 100. The frontend overlaps independent offsets after the first batch discovers `totalCount`, then refreshes the visible table and summary after completion.

## Scheduled Stage Adapter (01C)

The module now exposes a scheduler-only adapter:

- `DataQualityEngineService.evaluateScheduledStage({ instrumentIds, region, assetType, batchSize })`

Adapter contract:

- consumes explicit changed instrument ids only;
- processes the explicit instrument set in bounded chunks using the requested `batchSize` capped at 100 instruments;
- performs DB-only reads per chunk through Market Data Foundation public batch methods (`getInstrumentsByIds`, `listRecentPriceWindowsByInstrumentIds`, `storedFundamentalsByInstrumentIds`) plus bounded per-instrument stored corporate-actions reads;
- reports optional per-chunk progress (`processedCount`, success/failure/skip counts, `nextOffset`, `hasMore`, warnings, and errors) to the scheduled pipeline adapter when provided;
- does not call provider/live HTTP flows;
- persists one latest evaluation per changed instrument via existing upsert behavior;
- preserves existing readiness/tier semantics including `automation = BLOCKED` with `PHASE0_AUTOMATION_NOT_AUTHORIZED`.

## Frontend UX

`DataQualityEnginePage` follows the shared UX guidance:

- Page header with primary `Evaluate Scope` action.
- Region/asset scope message.
- Market Data Foundation review-readiness summary display for the same `region / assetType`, including review mode, trust status, trusted/catalog counts, data-through date, and the next bounded Market Data repair action. Data Quality only displays this Market Data-owned contract and does not recalculate provider, price, or Trusted Review Universe state.
- Summary cards for evaluated coverage, signal-ready count, blocked count, and data issues.
- `Quality Views` tab strip for common workflows:
  - All
  - Signal Ready
  - Blocked
  - Poor Coverage
  - Low Liquidity
  - Backtest Ready
- Compact filter bar for search, coverage, readiness, liquidity, sector, and signal eligibility.
- Shared `DataTable` for pagination, sorting, loading, and empty states.
- Row click opens a diagnostics drawer with scores, eligibility, gaps, blockers, warnings, and recommended fixes.
- Evaluate Scope uses shared progress UI with processed / total, batch count, evaluated, skipped, failed, and warnings counts.

## Known Limitations

- Holiday/session-specific staleness is inherited from Market Data Foundation and uses a simple day threshold in this module.
- Liquidity thresholds are simple daily-volume heuristics and can be tuned by market later.
- **Crypto is not yet supported by DQE.** Crypto instruments live in physically isolated `crypto_*` tables, while the evaluation tables are foreign-keyed to `Stock`. A crypto-scoped view therefore returns no rows; the UI shows an explicit "not yet available for crypto" notice rather than a silently empty table.
- **Denormalized scope columns are pending an owner-approved schema change.** Region/asset isolation currently relies on the `Stock` relation (reliable because `Stock.region` is non-null). Adding `region`/`assetType` (+ `isStale`/trusted-baseline) columns directly on `data_quality_evaluations` / `instrument_eligibility` would harden isolation and let the read path stop reconstructing state from human-readable strings — both deferred until the schema edit is approved.
- The persisted-read path still reconstructs some tier/trust state by matching `dataGaps` / `readinessBlockers` strings; those strings remain display-authoritative until the structured columns above land.
- `eligibleForSignals` historical (`asOf`) runs use a score-based staleness override that is approximate, because the persisted readiness score baked in a today-relative freshness component at evaluation time.
- Verdicts are computed in both the evaluate path and the persistence path via the same pure functions (identical results); collapsing to a single computation is a pending performance refactor, not a correctness gap.
- `LOW_VOLUME_COVERAGE` is wired into the review verdict but inert by default (`reviewMinVolumeCoveragePct = 0`); region profiles can raise the threshold once per-market volume-coverage expectations are calibrated.
- `POOR` and `ILLIQUID` view presets currently target the strictest diagnostic states. Broader multi-status presets can be added if the API gains multi-value filters.
- Backend evaluation currently processes each bounded batch with per-instrument error isolation; frontend request parallelism is the coordinated acceleration strategy for full-scope runs.
- The implementation follows `AGENTS.md`, `docs/architecture.md`, and `docs/ux-ui-best-practices.md`: module boundaries stay flat, Market Data Foundation is consumed through public exports, batch work remains bounded, and the UI uses shared table/filter/page patterns where practical.

## Verification

- `npm run build`
- `npm test -- data-quality --runInBand`
- `npm run build` in frontend when UI changes are made.
