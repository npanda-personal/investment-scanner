# Signal Generation Engine

## Ownership

Epic 3 is implemented as a dedicated `signal-generation-engine` backend module and frontend feature.

The module owns daily/on-demand signal generation, composite scoring, persisted signal results, signal filtering, and signal documentation. It consumes Market Data Foundation and Stock Research Workbench through public exports only.

No runtime code is imported from legacy scanner, real-time scanner, backtester, smart-money, watchlist, frontend service, or old component folders.

## Backend Structure

Backend files are flat:

- `signal-generation-engine.module.ts`
- `signal-generation-engine.router.ts`
- `signal-generation-engine.controller.ts`
- `signal-generation-engine.service.ts`
- `signal-generation-engine.repository.ts`
- `signal-generation-engine.validation.ts`
- `signal-generation-engine.types.ts`
- `signal-generation-engine.md`
- `index.ts`

## Persistence

Prisma model:

- `SignalResult`

Fields include instrument reference, symbol, company name, sector, country, score, direction, confidence, triggered signals JSON, negative signals JSON, explanation, generated timestamp, normalized generated date, model version, source, data status, created timestamp, and updated timestamp.

`modelVersion` defaults to `signal-engine-v1` and is exposed so Signal Quality Lab can measure results across model versions later.

Results are daily idempotent MVP snapshots. Re-running generation for the same instrument, signal model version, and UTC trading day updates the existing row instead of creating duplicate logical results. This keeps Signal Quality Lab and Signal Calibration Engine from counting repeated manual runs as independent signal history.

Natural key:

- `instrumentId + modelVersion + generatedDate`

`generatedDate` is normalized to UTC midnight. `generatedAt` remains the actual generation timestamp for display and ordering.

Repository behavior:

- `createSignalResult` upserts by the daily natural key.
- `latestForInstrument` returns the newest persisted result for an instrument.
- `latestSignals` utilizes Prisma `distinct: ['instrumentId']` for efficient DB-level retrieval of the newest results per stock. It supports in-memory sorting of the reduced set and returns a paginated object: `{ signals: SignalResultDto[], total: number, limit: number, offset: number }`.
- `GET /api/v1/signals/:instrumentId` calculates and persists on demand when no result exists yet.

Signal API responses are enriched at response time with latest price context from Market Data Foundation public batch services (`getInstrumentsByIds`, `getLatestPricesBySymbols`). This fixes the N+1 lookup bottleneck while keeping `SignalResult` lean.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose | Status |
| --- | --- | --- |
| `GET /api/v1/signals/health` | Module health and latest generation timestamp | Implemented |
| `GET /api/v1/signals/top` | Top/latest signals with direction, min score, limit, sector, and country filters | Implemented |
| `GET /api/v1/signals/:instrumentId` | Latest signal for one instrument; calculates on demand if missing | Implemented |
| `POST /api/v1/signals/run` | Manual signal generation for one instrument, symbol, or a limited universe | Implemented |
| `GET /api/v1/signals/screener` | Filtered signal screener with direction, min score, signal type, sector, and country | Implemented |

Query and request behavior:

- `direction`: `BULLISH`, `NEUTRAL`, or `BEARISH`; invalid values are ignored.
- `minScore`: clamped to `0-100`.
- `limit`: top/screener queries clamp to `1-100`; run requests clamp to `1-250`.
- `offset`: supported for pagination.
- `sortBy` and `sortDirection`: supported for score, currentPrice, dailyChangePercent, and generatedAt.
- `sector` and `country`: exact case-insensitive repository filters for persisted results.
- `signalType`: filters against signal code substrings or signal category names.
- `POST /signals/run` accepts `instrumentId`, `symbol`, or a limited instrument universe. Symbol lookup uses Market Data Foundation public instrument search.
- `POST /signals/run` optionally accepts `useDataQualityFilter`, `minSignalReadinessScore`, `allowedReadinessStatuses`, `includeLimited`, `skipUnusable`, and `missingQualityBehavior`.
- Data-quality filtering is disabled by default for backward compatibility.
- When enabled, Signal Generation consumes Data Quality Engine public service methods and skips instruments that are not eligible for signals, fail readiness thresholds, or have unusable coverage.
- Missing quality evaluations default to `WARN_AND_PROCESS`; callers may set `missingQualityBehavior: "SKIP"`.
- Run responses include `warnings` and a `dataQuality` summary with before/after counts and missing evaluation count.

Signal response price fields:

- `currentPrice`
- `previousClose`
- `dailyChange`
- `dailyChangePercent`
- `currency`
- `priceTimestamp`

Price data comes from Market Data Foundation latest and historical price APIs. If price data is unavailable or the price lookup fails, these fields return `null` and the signal endpoint still succeeds.

## Signal Definitions

Technical signals:

- price above or below SMA50
- SMA50 above or below SMA200
- near 52-week high or low
- RSI recovering from oversold (RSI < 30)
- RSI overbought reversal (RSI > 70)
- volume breakout or heavy down-volume selloff when volume is available

Momentum signals:

- 1M positive or negative momentum
- 3M positive or negative momentum
- 6M acceleration
- outperforming or underperforming peer average when peer context is available

Fundamental signals:

- positive or negative EPS
- positive or negative net income
- P/E below or above peer average when peers are available
- dividend yield above or below peer average when peers are available
- fundamentals or market cap available

## Scoring

Composite score is `0-100`.

MVP weights:

- Technical: 40%
- Momentum: 35%
- Fundamentals: 25%

Each category scores the ratio of positive signals to total signals evaluated. To avoid extreme scores with very low signal counts, Laplace smoothing (0.5) is applied: `(positive + 0.5) / (total + 1.0)`. A category with no signals defaults to `0.5`.

Direction thresholds:

- `score >= 70`: `BULLISH`
- `score >= 40 && score < 70`: `NEUTRAL`
- `score < 40`: `BEARISH`

Confidence:

- `HIGH`: at least 200 price rows, fundamentals available, at least 6 total signals evaluated, and latest price is NOT stale.
- `MEDIUM`: at least 50 price rows and at least 3 total signals evaluated.
- `LOW`: otherwise

Staleness is defined as market data more than 5 calendar days old (allowing for weekends).

## Indicator Formulas

- **SMA:** Simple Moving Average of adjusted close prices over the period.
- **RSI:** Industry-standard Wilder's smoothed Relative Strength Index.
- **Momentum:** Simple percentage change from price at offset in trading days (21 for 1M, 63 for 3M, 126 for 6M).
- **Acceleration:** 1M momentum > (3M momentum / 3) AND 3M momentum > (6M momentum / 2).

## Explainability

Every result includes:

- `triggered_signals` (bullish/positive)
- `negative_signals` (bearish/negative)
- `warnings` (data quality, staleness)
- human-readable `explanation`

Explanations are deterministic and assembled from the strongest available triggered or negative reasons. No black-box scoring is used.

## Frontend

Frontend feature root:

- `frontend/src/features/signal-generation-engine`

Frontend files:

- `api/signalGenerationEngineService.ts`
- `components/SignalsDashboardPage.tsx`
- `components/SignalTable.tsx`
- `components/SignalCard.tsx`
- `components/SignalBadge.tsx`
- `components/SignalWidget.tsx`
- `hooks/useInstrumentSignal.ts`
- `types.ts`
- `routes.tsx`
- `index.ts`

Routes:

- `/signals`
- `/stocks/:id?tab=signals` links into the unified stock workspace context when stock-level signal views are expanded.

The dashboard uses tabbed table views for Bullish, Bearish, Neutral, Momentum Leaders, Recent, and Screener. Signal lists are server-paginated, support column sorting, and keep actions available per row.

Rows show current price, daily move, score, confidence, generated timestamp, summary reasons, and actions. 

A detailed **Tooltip** is available for each signal, showing:
- Data quality warnings (e.g. stale price)
- Comprehensive list of Bullish Factors
- Comprehensive list of Bearish Factors

Actions:
- View stock
- Add to Watchlist
- Add to Portfolio
- Create Alert

Manual signal generation includes an optional `Use data quality filter` checkbox. When enabled, the run skips instruments with insufficient, stale, illiquid, or unusable data according to Data Quality Engine evaluations and shows skipped/warning counts.

## Tests

Current module test files:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`

Coverage includes:
- SMA calculation
- Wilder's RSI calculation
- 52-week high/low helper behavior
- Composite score calculation with Laplace smoothing
- Direction threshold logic
- Confidence logic with staleness check
- Enrichment with batch lookup optimization
- Explanation generation
- Instrument signal generation and persistence handoff
- Request/query validation including offset and sorting
- Route registration

## Known Limitations

- MVP is daily/batch/on-demand only.
- No real-time streaming, intraday signals, backtesting, portfolio recommendations, macro signals, analyst revisions, transcripts, options flow, or AI adaptive scoring.
- Peer-aware signal quality depends on Epic 2 peer context being available.
- Intraday signal snapshots are intentionally out of scope; the current model keeps one row per instrument/model/day.
- No frontend component tests are configured.

## Verification

Run:

- `backend`: `npx prisma generate`
- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- tests/modules/signal-generation-engine --runInBand --forceExit`
- `frontend`: `npm.cmd run build`

Manual verification:
- Verify signal tooltips show both bullish and bearish factors.
- Verify "Summary" column shows the most relevant reasons based on direction.
- Verify stale data warning appears in tooltips for older signals.
- Verify pagination and sorting work correctly on the dashboard.
- Verify N+1 optimization by checking logs (minimal DB/external calls during list loading).
