# Trade Plan & Risk Management Engine

The Trade Plan & Risk Management Engine is responsible for converting strategy-backed candidates into practical trade-review plans.

It sits between the Strategy Decision Engine and the future Paper/Algo Trading modules.

## Ownership
It owns:
- Trade plan preview (entry zone, stop loss, target, R/R)
- Position sizing based on user portfolio or capital base constraints
- Portfolio exposure checks
- Risk grading
- Plan blockers and invalidation rules
- Plan persistence

It does NOT own:
- Raw signals
- Strategy rules
- Backtest simulation
- Market data ingestion
- Portfolio holdings
- Broker execution or order placement
- Live trading

## Plan Status
- `VALID`: The plan meets all minimum risk criteria and the market gate is open.
- `WATCH`: The plan is for a watch decision, or price is too far from preferred entry.
- `BLOCKED`: The plan cannot be traded (e.g., Reward/Risk < 1.0, market closed).
- `INSUFFICIENT_DATA`: Missing required data (like latest price or history).

## Methodology
- **Entry**: Relies on `StrategyDecision` definitions. Defaults to current price or a pullback/breakout reference based on strategy.
- **Stop Loss**: Uses recent swing lows, SMA50, or a fallback fixed percentage.
- **Target**: Defaults to 2R (2x risk multiple).
- **Position Sizing**: Scales risk percent against the portfolio total value or capital base.

## Integration
- Can be triggered manually via `/api/v1/trade-plans/generate`.
- Reads `StrategyDecisionResult` from the database.
- Consumes `MarketDataFoundation` for the latest price and historical SMA approximation.
- Consumes `PortfolioManagement` for capital sizing and concentration checks.
