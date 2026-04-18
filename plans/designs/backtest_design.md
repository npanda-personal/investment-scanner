# Backtesting Engine Design

## Overview
The backtesting engine simulates trading strategies on historical price data, producing performance metrics and equity curves.

## Configuration
A backtest configuration includes:
- **Watchlist(s)**: symbols to include.
- **Date range**: start and end dates.
- **Strategy configuration**: entry/exit rules (expressed in a similar condition language as the scanner).
- **Position sizing**: fixed amount, percentage of equity, etc.
- **Stop‑loss / take‑profit**: optional risk management.

## Simulation Steps
1. Load historical price ticks for each symbol in the watchlist, sorted by time.
2. For each time step (e.g., daily), evaluate strategy conditions to generate signals (buy/sell).
3. Apply position sizing and execute trades at the next available price.
4. Track portfolio equity, positions, and cash.
5. At the end of the simulation, compute performance metrics (Sharpe ratio, max drawdown, win rate, total return, etc.).

## Output
- **Equity curve**: time‑series of portfolio value.
- **Trade ledger**: list of all executed trades with entry/exit prices, P&L.
- **Performance summary**: key metrics.
- **Monthly returns heatmap**.

## Implementation Notes
- Use the same condition evaluator as the scanner engine for consistency.
- Leverage TimescaleDB for efficient time‑series queries.
- Support for walk‑forward optimization and Monte Carlo simulations (future).