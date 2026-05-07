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

### Paper Trading Readiness Audit

Current decision-to-plan flow status:

| Stage | Status | Issue | Severity | Current behavior | Expected behavior | Why it matters | Recommended fix | Safe now |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Market Data Foundation | PARTIAL | Latest price and history are consumed, but candidate listing does not join region/asset metadata directly. | MEDIUM | Generation reads latest price/history by instrument; persisted listing accepts `region`/`assetType` but cannot fully enforce them from the plan table alone. | Future paper review candidates must be scoped to region and `STOCK`. | Prevents cross-region or wrong-asset candidates. | Keep passing market scope to generation/listing; add natural scope fields to persisted plan model in a future migration. | No |
| Data Quality Engine | PASS | Readiness uses public service diagnostics/evaluations. | LOW | Blocks `UNUSABLE` coverage and `ILLIQUID`, warns on unknown/missing quality. | Data quality must be acceptable before paper review. | Avoids promoting stale or unusable data. | Continue consuming public service helpers; do not duplicate scoring. | Yes |
| Strategy Framework | PARTIAL | Old stored automation labels may exist. | HIGH | Repository maps old stored readiness values away for display; model now exposes conservative paper-test terminology. | No live-trading readiness label should be returned. | Prevents future paper module from confusing review readiness with live eligibility. | Keep mapping old values; run a future data cleanup migration. | Yes |
| Backtesting Strategy Lab | PARTIAL | Backtest proof is available through Strategy Framework performance summaries, not embedded in plans. | HIGH | Readiness classification checks for a Strategy Framework performance summary at list/generate time. | A selected timeframe backtest/rating must be present. | Future paper review needs historical simulation proof. | Persist selected timeframe/proof snapshot on plans in a future migration. | No |
| Strategy Decision Engine | PASS | Strategy decision proof is available through public service history/latest APIs. | LOW | Plan generation blocks CLOSED market gates and hard decision blockers. | Only candidate-level decisions with reasons and confidence may be promoted. | Prevents weak/blocked decisions from being reviewed as paper candidates. | Keep using public service APIs only. | Yes |
| Trade Plan & Risk Engine | PASS | Final readiness classifier added. | LOW | Plans now expose `paperReadinessStatus`, `paperReadinessReasons`, and `paperReadinessBlockers`; `paperReadyOnly=true` filters candidates. | Final pre-trade planning layer owns readiness classification. | Provides one safe upstream contract without creating paper trades. | Keep classifier here until a future paper module consumes it. | Yes |
| Research Hub | PARTIAL | Research priorities do not yet call Trade Plan readiness directly. | MEDIUM | Research Hub shows strategy proof and links users to plan review; wording avoids execution framing. | Hub may show "Paper Review Candidate" only as review context. | Prevents execution-like interpretation. | Future integration can read Trade Plan readiness through public API. | No |

### Paper Readiness Contract

`paperReadinessStatus` is a classification only. It does not create paper trades and does not enable broker execution, order placement, live trading, or autonomous trading.

Status values:
- `READY_FOR_PAPER_REVIEW`: All readiness checks pass.
- `WATCH_ONLY`: The setup is reviewable but has proof, confidence, rating, or data-gap concerns.
- `BLOCKED`: A hard blocker exists.
- `INSUFFICIENT_DATA`: Required proof, price, history, plan geometry, or data quality is missing.

Readiness thresholds:
- Strategy proof: `frameworkBacked = true`, strategy code/version present, rating not `WEAK` or `UNPROVEN`, readiness label not `NOT_AUTOMATION_READY`, and a backtest summary is available.
- Strategy decision: decision must be `TRADE_CANDIDATE` or equivalent entry candidate, market gate must not be `CLOSED`, confidence must be `MEDIUM` or `HIGH`, reasons must exist, and hard blockers must be absent.
- Trade plan: `planStatus = VALID`, `riskGrade = LOW` or `MEDIUM`, entry zone/stop/target/position sizing/invalidation rules present, no hard blockers, and reward/risk must be at least `1.5`.
- Data quality: latest price present, sufficient price history, coverage not `UNUSABLE`, liquidity not `ILLIQUID`, and stale price warnings handled.
- Scope: region must be provided from global market scope and `assetType` must be `STOCK`.
- Safety: actions are review, plan, simulate, and paper review candidate only.

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
- **Target Transparency**: 2R targets expose `target.method = REWARD_RISK_MULTIPLE`, `target.rationale = "Target is modeled at 2R by default."`, and target quality. This is modeled risk geometry, not a predicted price.
- **Position Sizing**: Safely scales based on `capitalBase` or actual connected portfolio value. Blocks quantities < 1. Exposes single-position portfolio concentration checks against a default 10% maximum.
- **Data Quality Integration**: Consumes `DataQualityEngineService`. Blocks on `UNUSABLE` coverage or `ILLIQUID` status.

## API Endpoints
- `GET /api/v1/trade-plans/health`
- `GET /api/v1/trade-plans/model` (Includes model rules, paper readiness criteria, thresholds, and safety constraints)
- `GET /api/v1/trade-plans/candidates` (Supports `region`, `assetType`, `strategyCode`, `planStatus`, `riskGrade`, `minRewardRisk`, `paperReadyOnly`, `portfolioId`, `limit`, `offset`, `sortBy`, `sortDirection`)
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

## Verification
- Backend build: `npm run build` from `backend`
- Backend focused tests: `npm test -- --runTestsByPath tests/trade-plan-risk-engine.paper-readiness.test.ts` from `backend`
- Frontend build: `npm run build` from `frontend`
