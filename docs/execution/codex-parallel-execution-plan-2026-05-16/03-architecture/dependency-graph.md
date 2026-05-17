# Dependency Graph

## Text Flow

Market scope -> instrument identity -> market data/OHLC -> data quality -> indicators -> strategy definitions -> rule evaluation -> signal/trigger generation -> signal quality -> calibration -> strategy decisions -> backtesting -> trade-plan/risk -> portfolio context -> watchlists -> alerts -> research workbench -> AI copilot -> QA -> release audit.

## Dependency List

| Capability | Depends On |
|---|---|
| Market scope | root product scope and shared helpers |
| Instrument identity | Market Data Foundation stock/instrument records |
| Market data/OHLC | instrument identity, provider policy, local/free source constraints |
| Data quality | instruments, OHLC, latest price, metadata |
| Indicators | OHLC, sufficient history, data quality |
| Strategy definitions | versioned strategy/rule contract |
| Rule evaluation | strategy definitions, indicators, DQ status |
| Signals/triggers | rule evaluation, DQ gating, market scope, audit fields |
| Signal quality | signals, future OHLC outcomes, historical snapshots |
| Calibration | raw signals, signal quality, calibration version |
| Strategy decisions | strategy definitions, signals, DQ, market context |
| Backtesting | OHLC, strategies, DQ, assumptions |
| Trade-plan/risk | strategy decisions, backtest proof, DQ, exits/invalidation |
| Portfolio context | auth/user, portfolio data, market data |
| Watchlists | auth/user, instruments |
| Alerts | alert rules, signals, watchlists, portfolios |
| Research workbench | instruments, signals, DQ, context, portfolio/watchlist |
| AI copilot | deterministic public outputs only |
| QA | contracts, implementation evidence |
| Release audit | QA, review, Architect signoff, PO acceptance |

## Blocked-By Table

| Work | Blocked By |
|---|---|
| Downstream signal generation | Market Data trust and Data Quality readiness |
| Signal quality and calibration | stable signal object and outcome data |
| Strategy decisions | strategy/rule contract, DQ, market context |
| Backtests | OHLC coverage and strategy contract |
| Trade-plan/risk | strategy decisions, proof snapshots, exit/invalidation rules |
| Portfolio/watchlist/alert overlays | auth ownership and public contracts |
| Copilot | deterministic summary contract and source-module traceability |

## Parallel-Safe Grouping

- Group A: read-only module audits.
- Group B: planning docs and contract inventories.
- Group C: QA baseline and test inventory.
- Group D: UX planning and view-model review.

Implementation is not parallel-safe until file reservations and contract gates exist.

## First Three Implementation Waves

1. Wave 1: Market Data Foundation and Data Quality readiness hardening.
2. Wave 2: Strategy Framework, Signal Generation, Signal Quality, and Calibration contracts.
3. Wave 3: Strategy Decision, Backtesting, Trade Plan Risk, Today Review, Research Workbench, and portfolio/watchlist/alert UX.
