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

Fields include instrument reference, symbol, company name, sector, country, score, direction, confidence, triggered signals JSON, negative signals JSON, explanation, generated timestamp, source, data status, created timestamp, and updated timestamp.

Results are append-only MVP daily/on-demand snapshots. Latest endpoints select the newest result per instrument.

Repository behavior:

- `latestForInstrument` returns the newest persisted result for an instrument.
- `latestSignals` reads persisted results, applies filters, collapses to the latest result per instrument, and sorts by score descending.
- `GET /api/v1/signals/:instrumentId` calculates and persists on demand when no result exists yet.

Signal API responses are enriched at response time with latest price context from Market Data Foundation public services. These fields are not persisted on `SignalResult`.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/signals/health` | Module health and latest generation timestamp |
| `GET /api/v1/signals/top` | Top/latest signals with direction, min score, limit, sector, and country filters |
| `GET /api/v1/signals/:instrumentId` | Latest signal for one instrument; calculates on demand if missing |
| `POST /api/v1/signals/run` | Manual signal generation for one instrument, symbol, or a limited universe |
| `GET /api/v1/signals/screener` | Filtered signal screener with direction, min score, signal type, sector, and country |

Query and request behavior:

- `direction`: `BULLISH`, `NEUTRAL`, or `BEARISH`; invalid values are ignored.
- `minScore`: clamped to `0-100`.
- `limit`: top/screener queries clamp to `1-100`; run requests clamp to `1-250`.
- `sector` and `country`: exact case-insensitive repository filters for persisted results.
- `signalType`: filters against signal code substrings or signal category names.
- `POST /signals/run` accepts `instrumentId`, `symbol`, or a limited instrument universe. Symbol lookup uses Market Data Foundation public instrument search.

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
- RSI recovering from oversold
- RSI overbought reversal
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

Each category scores the ratio of positive signals to total positive plus negative signals. A category with no usable signals is neutral at `0.5`.

Direction thresholds:

- `score >= 70`: `BULLISH`
- `score >= 40 && score < 70`: `NEUTRAL`
- `score < 40`: `BEARISH`

Confidence:

- `HIGH`: at least 200 price rows, fundamentals available, and at least 6 total signals
- `MEDIUM`: at least 50 price rows and at least 3 total signals
- `LOW`: otherwise

## Explainability

Every result includes:

- `triggered_signals`
- `negative_signals`
- human-readable `explanation`

Explanations are deterministic and assembled from the strongest available triggered or negative reasons. No black-box scoring is used.

## Frontend

Frontend feature root:

- `frontend/src/features/signal-generation-engine`

Frontend files:

- `api/signalGenerationEngineService.ts`
- `components/SignalsDashboardPage.tsx`
- `components/SignalCard.tsx`
- `components/SignalBadge.tsx`
- `components/SignalWidget.tsx`
- `hooks/useInstrumentSignal.ts`
- `types.ts`
- `routes.tsx`
- `index.ts`

Route:

- `/signals`

The dashboard shows top bullish signals, top bearish signals, momentum leaders, recently generated signals, a filterable screener, manual signal generation, empty states, loading states, and links to `/research/stocks/:id`.

Signal cards display current price, currency, daily price change, and daily percentage move with positive/negative visual styling. Missing price data is shown as unavailable rather than blocking the card.

Signal cards also expose an `Add to Portfolio` action. The action opens a frontend dialog that fetches portfolios through the Portfolio Management public frontend API, collects quantity, average cost, currency, and optional notes, then submits to the existing `POST /api/v1/portfolios/:id/holdings` endpoint. Duplicate holding API errors are translated into a user-friendly message: `This stock already exists in this portfolio. Edit the existing holding instead.`

Signal cards also expose an `Add to Watchlist` action. The action uses the Watchlist Management public frontend exports, lets the user select a watchlist, add an optional note/tags, and submits to `POST /api/v1/watchlists/:id/items`. Duplicate watchlist items are handled gracefully in the dialog.

Signal cards expose a `Create Alert` action for stock signal score alerts through the Alerts & Monitoring public frontend exports.

The Stock Research Workbench includes a compact signal widget with score, direction, confidence, top reasons, generated timestamp, and link to the full signals page.

The dashboard and cards link stocks to `/research/stocks/:id`.

## Tests

Current module test files:

- `backend/tests/modules/signal-generation-engine/signal-generation-engine.service.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.validation.test.ts`
- `backend/tests/modules/signal-generation-engine/signal-generation-engine.routes.test.ts`

Coverage includes:

- SMA calculation
- RSI calculation
- 52-week high/low helper behavior
- composite score calculation
- direction threshold logic
- explanation generation
- instrument signal generation and persistence handoff
- request/query validation
- route registration

## Known Limitations

- MVP is daily/batch/on-demand only.
- No real-time streaming, intraday signals, backtesting, portfolio recommendations, smart money, sector rotation, macro signals, analyst revisions, transcripts, options flow, or AI adaptive scoring.
- Peer-aware signal quality depends on Epic 2 peer context being available.
- Append-only signal snapshots may need a scheduled daily runner in a later epic.
- No frontend component tests are configured.

## Verification

Run:

- `backend`: `npx prisma generate`
- `backend`: `npm.cmd run build`
- `backend`: `npm.cmd test -- signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-engine.routes.test.ts --runInBand --forceExit`
- `backend`: `npm.cmd test -- market-data.repository.test.ts market-data.routes.test.ts market-data.service.test.ts market-data.validation.test.ts stock-research-workbench.service.test.ts stock-research-workbench.routes.test.ts stock-research-workbench.validation.test.ts signal-generation-engine.service.test.ts signal-generation-engine.validation.test.ts signal-generation-engine.routes.test.ts --runInBand --forceExit`
- `frontend`: `npm.cmd run build`

Latest result:

- Prisma client generation passed.
- Backend build passed.
- Frontend build passed.
- Signal Generation Engine tests passed: 3 suites, 10 tests.
- Active modular backend tests passed: 10 suites, 32 tests.
