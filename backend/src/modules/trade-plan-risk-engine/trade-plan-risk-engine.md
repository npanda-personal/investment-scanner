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

## Hardening Audit Findings & Rules

### Plan Status
- `VALID`: Requires R/R >= 1.5, good data quality, market gate open, robust stop/target methods.
- `WATCH`: Strategy is unproven, price is extended above preferred entry, or R/R is between 1.0 and 1.5.
- `BLOCKED`: R/R < 1.0, market gate CLOSED for long setups, unusable data quality, illiquid, or mathematically invalid target/stop geometry.
- `INSUFFICIENT_DATA`: Missing latest price or sufficient price history to compute technicals.

### Risk Grade
- `LOW`: R/R >= 2.0, strategy rating GOOD/EXCELLENT, clean data quality, and strong stop methods.
- `MEDIUM`: R/R >= 1.5 with minor warnings.
- `HIGH`: Fallback stop methods used, strategy unproven, high volatility, or portfolio concentration limits breached.
- `UNDEFINED`: Insufficient data.

### Methodology
- **Entry Zone**: Evaluates Breakout vs Pullback. Flags `WEAK` quality if price is already extended far above SMA50 or recent breakout zones.
- **Stop Loss**: Prioritizes robust 10-day swing lows or SMA50 support. Falls back to ATR or fixed percentages (which flags `FALLBACK` quality and `HIGH` risk). Guards against stops being too tight (< 1%) or above entry.
- **Target**: Defaults to 2R but flags `WEAK` if the expected move requires an unrealistic leap relative to recent volatility. Target <= Entry for longs results in `BLOCKED`.
- **Position Sizing**: Safely scales based on `capitalBase` or actual connected portfolio value. Blocks quantities < 1. Exposes single-position portfolio concentration checks against a default 10% maximum.
- **Data Quality Integration**: Consumes `DataQualityEngineService`. Blocks on `UNUSABLE` coverage or `ILLIQUID` status.

## API Endpoints
- `GET /api/v1/trade-plans/health`
- `GET /api/v1/trade-plans/model`
- `GET /api/v1/trade-plans/candidates` (Supports `region`, `assetType`, `strategyCode`, `planStatus`, `riskGrade`, `minRewardRisk`, `portfolioId`, `limit`, `offset`, `sortBy`, `sortDirection`)
- `GET /api/v1/trade-plans/:instrumentId`
- `POST /api/v1/trade-plans/generate`
- `POST /api/v1/trade-plans/generate/batch` (Uses parallel concurrency for high-performance generation)

## Integration
- **Frontend Dashboard:** Available at `/trade-plans`. Integrates with the shared `DataTable` to provide pagination and sorting (e.g., on the Status and Risk Grade columns).
- Can be triggered manually via `/api/v1/trade-plans/generate`.
- Reads `StrategyDecisionResult` from the database.
- Consumes `MarketDataFoundation` for the latest price and historical SMA approximation.
- Consumes `PortfolioManagement` for capital sizing and concentration checks.
- Consumes `DataQualityEngine` for signal readiness and liquidity blocking.
