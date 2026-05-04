# Strategy Decision Engine (Epic 21.1 Hardened)

## Ownership

`strategy-decision-engine` is the central decision layer. It converts data from raw signals, calibrated scores, and market context into explainable trade/no-trade/exit decisions.

It consumes multiple other modules to reach its conclusions:
- `market-context-intelligence`
- `signal-generation-engine`
- `signal-calibration-engine`
- `data-quality-engine`
- `smart-money-intelligence`

## Scoring Methodology

Every decision includes a `scoreBreakdown` to provide full transparency.

### TREND_MOMENTUM
- **Market Context (20%)**: OPEN = 20, SELECTIVE = 10, CLOSED = 0 (Blocker).
- **Signal Strength (30%)**: Calibrated score thresholds.
- **Trend Technical (20%)**: Above SMA50 and SMA200.
- **Data Quality (15%)**: Eligible for signals.
- **Sector/Smart Money (15%)**: Accumulation bias.

### PULLBACK_IN_UPTREND
- **Market Context (20%)**
- **Trend Technical (25%)**: Confirmed long-term uptrend.
- **Pullback Quality (20%)**: Near SMA50 support + Cool RSI.
- **Data Quality (20%)**
- **Sector/Smart Money (15%)**

### DEFENSIVE_EXIT
- **Bearish Signal Reliability (30%)**
- **Trend Breakdown (25%)**: Price < SMA50.
- **Market/Sector Weakness (20%)**: CLOSED market gate.
- **Portfolio Risk (15%)**: Placeholder for concentration risk.
- **Smart Money Warnings (10%)**: Distribution bias.

## Core Concepts

### Market Tradeability Gate
Strict enforcement:
- **CLOSED**: Strictly blocks `TRADE_CANDIDATE` decisions for long strategies.
- **UNKNOWN**: Reduces confidence to LOW and adds data gaps.

### Confidence Logic
- **HIGH**: All key inputs present and aligned.
- **MEDIUM**: Capped if data gaps exist (e.g., missing calibration or smart money).
- **LOW**: Capped if price history is < 100 days or market gate is UNKNOWN.

### Trade Plan Preview
Structured object provided for candidates:
- **Entry Zone**: Type (BREAKOUT/PULLBACK), Preferred Range, and Rationale.
- **Risk Plan**: Stop Loss, Target Price, Reward/Risk Ratio, and Invalidation Rules.

## Persistence & Idempotency

Model: `StrategyDecisionResult`

Upsert Key: `instrumentId + strategy + modelVersion + generatedDate`
- `generatedDate` is normalized to UTC midnight.
- Repeated runs on the same day update the existing record rather than duplicating.

## API Surface

- `GET /api/v1/strategy/market-gate`: Current market condition.
- `POST /api/v1/strategy/evaluate`: Batch evaluation (supports pagination).
- `GET /api/v1/strategy/candidates`: List trade candidates with filters.
- `GET /api/v1/strategy/exits`: Portfolio risk review.
- `GET /api/v1/strategy/model`: Rule and weight metadata for UI transparency.
- `GET /api/v1/strategy/history/:instrumentId`: Past decisions for a stock.
- `GET /api/v1/strategy/:instrumentId`: Latest decision.

## Frontend

Dashboard available at `/strategy`.
- **Tabs**: Market Gate, Trade Candidates, Wait/Watch, Exit Risks, Rules & Model (Dynamic), Evaluate (Batch), Stock Lookup (History + Breakdown).
- **Compliance**: Clearly displays research-support disclaimer.

## Verification

```bash
# Backend Tests
npx jest tests/modules/strategy-decision-engine/

# Type Check
npx tsc
```

