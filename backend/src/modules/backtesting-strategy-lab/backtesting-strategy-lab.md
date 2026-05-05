# Backtesting & Strategy Lab

## Ownership

`backtesting-strategy-lab` owns MVP historical strategy simulation, detailed run history, equity curves, drawdowns, trade logs, and simulation diagnostics. It helps users test registered Strategy Framework strategies and secondary custom rule configs against historical daily-close data.

It does not own Strategy Framework definitions/ratings, live trading, broker execution, portfolio optimization, tax modeling, intraday backtesting, advanced quant research, walk-forward optimization, Monte Carlo, paid providers, or machine-learning strategy search.

## Backend Structure

Backend module files are intentionally flat:

- `backtesting-strategy-lab.module.ts`
- `backtesting-strategy-lab.router.ts`
- `backtesting-strategy-lab.controller.ts`
- `backtesting-strategy-lab.service.ts`
- `backtesting-strategy-lab.repository.ts`
- `backtesting-strategy-lab.validation.ts`
- `backtesting-strategy-lab.types.ts`
- `backtesting-strategy-lab.md`
- `index.ts`

The service consumes Market Data Foundation and Watchlist Management through public module exports only.
It consumes Strategy Framework public service/registry/evaluator exports when a backtest config includes `mode: REGISTERED_STRATEGY` or `strategyCode`. It must not duplicate registered strategy rules.

## Endpoints

Mounted under `/api/v1`:

| Endpoint | Purpose |
| --- | --- |
| `GET /backtests/strategies` | List saved strategies |
| `POST /backtests/strategies` | Save a strategy definition |
| `GET /backtests/strategies/:id` | Get one strategy |
| `PATCH /backtests/strategies/:id` | Update a strategy |
| `DELETE /backtests/strategies/:id` | Delete a strategy |
| `POST /backtests/strategies/:id/run` | Run a saved strategy |
| `POST /backtests/run` | Run an ad hoc strategy config |
| `GET /backtests/runs` | List recent runs |
| `GET /backtests/runs/:id` | Get one run |
| `DELETE /backtests/runs/:id` | Delete a run |

## Persistence

Prisma models:

- `BacktestStrategy`
  - `name`
  - `description`
  - `config`
  - timestamps
- `BacktestRun`
  - optional `strategyId`
  - `config`
  - `status`
  - timestamps
  - `metrics`
  - `equityCurve`
  - `trades`
  - `error`

Migration:

- `202604280006_backtesting_strategy_lab`

## Strategy Config Schema

Supported universes:

- `ALL`
- `SYMBOLS`
- `INSTRUMENTS`
- `WATCHLIST`

Backtest modes:

- `REGISTERED_STRATEGY`: primary mode. Strategy Framework is the source of truth for rules.
- `CUSTOM_RULES`: secondary/experimental mode. Existing rule-based configs remain supported.

Registered Strategy Framework configs include:

- `mode: REGISTERED_STRATEGY`
- `strategyCode`
- `strategyVersion`
- `timeframe`: `1Y`, `3Y`, `5Y`, `10Y`, `15Y`
- `region`
- `assetType`
- `universe`: `ALL`, `SYMBOLS`, `INSTRUMENTS`, or `WATCHLIST`

When registered mode or `strategyCode` is present, entry/exit checks use the registered Strategy Framework evaluator. Custom rule-only configs remain supported for compatibility but are no longer the primary strategy source.

Supported entry rules:

- `SIGNAL_SCORE_ABOVE`
- `SIGNAL_DIRECTION_BULLISH`
- `PRICE_ABOVE_SMA50`
- `SMA50_ABOVE_SMA200`

Supported exit rules:

- `SIGNAL_SCORE_BELOW`
- `SIGNAL_DIRECTION_BEARISH`
- `PRICE_BELOW_SMA50`
- `FIXED_HOLDING_PERIOD`

Supported sizing:

- `EQUAL_WEIGHT`
- `FIXED_AMOUNT`

Required bounds:

- valid date range with start before end
- `initialCapital > 0`
- `maxPositions` from 1 to 100
- `transactionCostPercent` from 0 to 10%
- thresholds for signal score rules
- holding days for fixed holding-period exit

Optional data-quality-aware universe filters:

- `useDataQualityFilter`
- `minSignalReadinessScore`
- `excludeNotReady`
- `excludeIlliquid`
- `excludeMissingQuality`

The filter is disabled by default. When enabled, the service consumes Data Quality Engine public methods before loading price history. Run metrics include:

- `universeBeforeDataQualityFilter`
- `universeAfterDataQualityFilter`
- `excludedForDataQuality`
- `missingQualityEvaluationCount`

## Simulation Methodology

The MVP engine:

- uses daily historical close/adjusted-close from Market Data Foundation
- iterates through available trading dates
- evaluates exit rules before entry rules each day
- tracks cash and open positions
- prevents buying when cash is insufficient
- enforces max open positions
- applies transaction costs on entry and exit
- closes open positions at the end of the test

The current signal rules use a historical proxy derived from available prices:

- price above SMA50
- SMA50 above SMA200
- 1M positive movement

This is intentional because the Signal Generation Engine stores latest generated signal results, not a full historical signal archive.

## Metrics

Returned metrics:

- total return
- CAGR
- max drawdown
- volatility
- Sharpe ratio using risk-free rate 0
- win rate
- average win
- average loss
- profit factor
- number of trades
- average holding days
- best trade return
- worst trade return
- availability status: `AVAILABLE`, `PARTIAL`, `INSUFFICIENT_HISTORY`, `NOT_RUN`, or `ERROR`
- data coverage: instruments considered, enough history, excluded for history, excluded for data quality, missing history, insufficient history, warnings
- registered strategy rating/readiness when applicable

After a registered strategy run completes, the service upserts `StrategyPerformanceSummary` through Strategy Framework using the natural key `strategyCode + strategyVersion + timeframe + region + assetType + universeKey`.

## Frontend

Frontend feature:

- `frontend/src/features/backtesting-strategy-lab`

Route:

- `/backtests`

The UI includes:

- Registered Strategy setup as the default mode
- Custom Rules setup as a secondary/experimental mode
- URL deep-link support: `/backtests?mode=registered&strategyCode=TREND_MOMENTUM&timeframe=3Y`
- save strategy action
- run ad hoc strategy action
- saved strategy list
- saved run list
- saved runs labeled as registered strategy runs or custom rule backtests
- performance metric cards
- equity and drawdown chart
- trade log with bounded display
- rating, readiness, availability, and data coverage diagnostics for registered runs
- optional data-quality filter controls and universe before/after metadata in results

## Known Limitations

- Auth Identity now protects backtest routes. New strategies/runs are owned by the authenticated user. Existing nullable-owner records remain readable during migration.
- Subscription Billing gates backtest runs by monthly plan limits and records successful run usage.

- Daily close only.
- No intraday fills or slippage model.
- No broker/order execution.
- No tax lots.
- No portfolio optimization.
- No historical SignalResult archive; signal rules use a price-derived proxy.
- Universe `ALL` is capped to the first available instruments for MVP runtime safety.
- Currency conversion is not applied across instruments.
- Registered strategy historical context is price-derived and does not reconstruct every historical market-context or smart-money snapshot yet.
- Readiness labels are research/paper-test oriented only; no live-trading readiness is displayed.

## Verification

Expected verification commands:

- `npx prisma generate`
- `npm run build` in `backend`
- `npm test -- backtesting-strategy-lab --runInBand` in `backend`
- `npm run build` in `frontend`
