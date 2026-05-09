# Investment Intelligence Platform Roadmap

## Purpose

This roadmap captures the current state of the investment intelligence platform, the next priority phase, and the future roadmap.

The product direction is now **intelligence-first**:

- improve signal accuracy
- improve data quality
- validate outcomes
- reduce noise
- increase investor/trader decision confidence

Cosmetic UX, mobile polish, and monetization expansion are intentionally deferred until the core intelligence engine is stronger.

---

# 1. Completed So Far

The platform has already evolved from a simple market-data app into a modular investment intelligence system.

## Completed Modules

| # | Module | Status | Purpose |
|---:|---|---|---|
| 1 | Market Data Foundation | Done | Owns instruments, prices, fundamentals, corporate actions, FX rates, freshness, validation, and provider integration. |
| 2 | Stock Research Workbench | Done | Single-stock research page with overview, chart, performance, fundamentals, valuation, peers, and relative strength. |
| 3 | Signal Generation Engine | Done | Generates bullish/neutral/bearish signal scores with explanations and persisted signal results. |
| 4 | Portfolio Management | Done | Manual portfolios, holdings, transactions, valuation, allocation, and signal display for holdings. |
| 5 | Portfolio Intelligence | Done | Portfolio health score, red flags, holding review ranking, signal overlay, and good/bad/needs-review summaries. |
| 6 | Watchlist Management | Done | Watchlists, idea tracking, notes/tags, enriched items with price and signal context. |
| 7 | Alerts & Monitoring | Done | In-app alert rules, alert events, rule evaluation, read/dismiss actions, and alert inbox. |
| 8 | Market Context Intelligence | Done | Market regime, sector rotation, breadth, country/region strength, macro placeholder, and key takeaways. |
| 9 | Backtesting & Strategy Lab | Done | Daily-close historical simulation for simple signal/trend strategies with metrics, equity curve, and trade log. |
| 10 | Smart Money Intelligence | Done | Price-volume accumulation/distribution analysis and sector-level smart-money context using free/local data. |
| 11 | AI Investment Copilot | Done | Deterministic, cost-free plain-English summaries across stocks, portfolios, watchlists, alerts, and market context. |
| 12 | Subscription Billing | Done | MVP SaaS readiness with FREE/PRO/ADMIN plans, feature gates, usage counters, and optional billing-provider abstraction. |
| 13 | Auth Identity | Done | Real users, signup/login, token validation, profile identity, ownership isolation, and subscription integration. |
| 14 | Notifications Delivery | Done | Notification preferences, delivery records, local/log email provider, alert digest, daily digest, and weekly digest. |

---

## Completed Platform Capabilities

### Data & Research

- Instrument management
- Historical OHLCV prices
- Latest prices
- Persisted fundamentals
- Persisted corporate actions
- FX rates
- Data freshness/status metadata
- Stock overview page
- Price chart and performance metrics
- Peer comparison
- Valuation snapshot
- Relative strength

### Signals & Discovery

- Technical signals
- Momentum signals
- Fundamental signals
- Composite score
- Direction: bullish / neutral / bearish
- Explainability
- Signals dashboard
- Signal screener
- Signal widget in research page
- Current price and daily move in signals

### Portfolio & Watchlists

- Manual portfolios
- Holdings
- Transactions
- Portfolio valuation
- Allocation by holding, sector, country, currency
- Portfolio intelligence and red flags
- Watchlists
- Watchlist notes/tags
- Add to watchlist from signals/research
- Add signal stock to portfolio

### Monitoring & Context

- Alert rules
- Alert inbox
- Alert event lifecycle
- Duplicate alert suppression
- Market regime
- Sector rotation
- Breadth indicators
- Country/region strength
- Macro placeholder context
- Smart-money price-volume context

### Validation & Assistant Layers

- Backtesting lab
- Strategy persistence
- Backtest result persistence
- Trade log
- Equity curve
- AI Copilot deterministic summaries
- Cost-free operation, no paid LLM dependency

### SaaS Readiness

- Auth and user ownership
- Plan model
- Feature gating
- Usage counters
- Notification preferences
- Local/log delivery

---

# 2. Current Strategic Shift

## Previous Roadmap Focus

The earlier roadmap focused on building broad product surface area:

- data
- research
- signals
- portfolios
- watchlists
- alerts
- backtesting
- smart money
- copilot
- billing
- auth
- notifications

That foundation is now strong enough.

## New Roadmap Focus

The product should now prioritize:

1. signal accuracy
2. signal validation
3. signal calibration
4. data coverage
5. risk/context adjustment
6. research evidence quality

The next phase should not focus on:

- mobile/PWA
- Stripe billing
- UX polish
- collaboration
- social features
- prettier dashboards
- advanced AI chat

Those can come later.

The immediate bottleneck is:

> Are the signals accurate, stable, measurable, and supported by enough reliable data?

---

# 3. Next Phase Roadmap — Intelligence & Accuracy First

This is the recommended capability sequence. Execution should still be dependency-first: harden the least-dependent upstream modules before fixing modules that rely on their outputs. In practice, Market Data Foundation and Data Quality Engine should be verified before raw Signal Generation; raw Signal Generation should be verified before Signal Quality, Calibration, Strategy Decision, Research Hub, and Trade Plans.

---

## Phase A0 — Foundation And Raw Signal Hardening

### Priority

Current execution priority.

### Objective

Make the upstream chain reliable before measuring or calibrating outcomes:

```text
Market Data Foundation -> Data Quality Engine -> Signal Generation Engine
```

### Why This Comes First

Signal Quality and Calibration are only meaningful if the catalog, price history, data-readiness gates, and raw signal rows are already region-scoped, batch-safe, idempotent, and understandable in the UI.

### Done When

- Market Data Foundation provides clean region/asset-scoped instruments and prices.
- Data Quality Engine exposes coverage, liquidity, and signal-readiness diagnostics.
- Signal Generation Engine runs bounded batches, respects data-quality gates, stores idempotent raw signals, and keeps strategy/candidate language separate.

---

## Phase A1 — Signal Quality Lab

### Priority

Highest priority.

### Objective

Measure whether signals actually work.

### Why This Comes First

Signals feed almost everything else:

- research pages
- portfolios
- watchlists
- alerts
- copilot summaries
- backtesting
- smart-money interpretation

If signals are noisy, the whole product becomes less useful.

### Core Features

#### Signal History

Track every generated signal over time:

- instrument
- symbol
- company
- score
- direction
- confidence
- triggered signals
- negative signals
- explanation
- generated date
- scoring model version
- weights used
- market regime at generation time
- sector context at generation time
- smart-money context at generation time
- data quality status

#### Signal Outcome Tracking

For every signal, calculate forward returns:

- 1D return
- 5D return
- 10D return
- 20D return
- 60D return
- max favorable move
- max adverse move
- drawdown after signal
- volatility after signal

#### Accuracy Metrics

Measure:

- win rate
- average forward return
- median forward return
- average drawdown
- average adverse excursion
- hit rate by signal type
- hit rate by direction
- hit rate by sector
- hit rate by market regime
- hit rate by market cap bucket
- false-positive proxy

#### Signal Churn / Noise Detection

Detect:

- frequent signal flipping
- bullish today / bearish tomorrow
- high score with poor follow-through
- repeated low-confidence signals
- stale signals
- unstable instruments

### Suggested APIs

- `GET /api/v1/signals/quality/summary`
- `GET /api/v1/signals/quality/by-type`
- `GET /api/v1/signals/quality/by-sector`
- `GET /api/v1/signals/quality/by-regime`
- `GET /api/v1/signals/:instrumentId/history`
- `GET /api/v1/signals/:instrumentId/outcomes`
- `POST /api/v1/signals/quality/recalculate`

### Suggested UI

Route:

- `/signals/quality`

Views:

- overall signal quality dashboard
- best-performing signal types
- worst-performing signal types
- signal performance by sector
- signal performance by regime
- noisy signals list
- individual stock signal history
- signal outcome table

### Done When

You can answer:

- Which signals worked?
- Which signals failed?
- In which sector?
- In which market regime?
- Over which forward horizon?
- Which signals are noisy?

---

## Phase A2 — Signal Calibration Engine

### Objective

Improve signal accuracy and confidence using measured outcomes.

### Why Next

Once Signal Quality Lab tells what works and what fails, the scoring model can be improved with evidence.

### Core Features

#### Model Versioning

Every signal result should include:

- model version
- scoring weights
- thresholds
- rule set version
- generated date
- input data coverage

#### Improved Confidence Score

Confidence should include:

- historical success rate of similar signals
- signal confluence
- market regime alignment
- sector strength alignment
- smart-money confirmation
- volatility penalty
- liquidity penalty
- data freshness penalty
- data coverage penalty

#### Weighted Signal Model

Move from simple static categories:

- technical
- momentum
- fundamentals

To a more complete model:

- technical score
- momentum score
- fundamental score
- smart-money score
- market-context score
- valuation score
- risk penalty
- liquidity penalty
- data quality penalty

#### Regime-Aware Scoring

Examples:

- bullish momentum in `RISK_OFF` market gets penalized
- defensive outperformance in weak market gets rewarded
- breakout in weak breadth gets lower confidence

#### Sector-Aware Scoring

Examples:

- bullish stock in leading sector gets boosted
- bullish stock in lagging sector gets penalized
- bearish signal in weakening sector gets stronger confidence

#### Smart-Money Confirmation

Examples:

- accumulation boosts bullish signals
- distribution penalizes bullish signals
- unusual volume confirms momentum only when price behavior supports it

### Done When

You can explain:

- why a score changed
- why confidence is high/low
- how regime/sector/smart-money affected the result
- which model version produced each signal

---

## Phase A3 — Data Coverage & Quality Expansion

### Objective

Improve input quality so engines produce better outcomes.

### Why This Matters

Bad data creates bad signals.

Before adding more provider integrations, first measure data quality clearly.

### Core Features

#### Data Coverage Dashboard

Show per instrument:

- price history length
- missing price rows
- stale latest price
- missing fundamentals
- stale fundamentals
- missing corporate actions
- volume quality
- sector/industry availability
- latest sync freshness
- provider source
- data status

#### Signal Readiness Score

For each instrument:

- price history completeness
- volume reliability
- fundamental availability
- sector/industry availability
- corporate action coverage
- liquidity/tradability
- signal eligibility flag

#### Universe Quality Scoring

Create:

- tradability score
- liquidity score
- history completeness score
- fundamentals coverage score
- signal readiness score

#### Data Gap Detection

Flag:

- stale prices
- incomplete history
- missing fundamentals
- missing sector/industry
- suspicious zero volume
- split-adjustment issues
- duplicate symbols
- exchange ambiguity
- provider failures

#### Free Provider Expansion

Only add providers if they improve measurable gaps.

Possible free/local sources:

- SEC companyfacts for US fundamentals
- FRED for macro indicators
- ECB / Eurostat for Europe macro
- Stooq for EOD price backup
- Alpha Vantage free tier where justified
- Twelve Data free tier where justified
- Yahoo Finance remains baseline

### Strict Rule

Do not add a data provider because it sounds useful.

Add it only when the Data Coverage Dashboard proves a coverage gap.

### Done When

You can answer:

- Which stocks are safe to score?
- Which stocks have weak data?
- Which fields are missing most often?
- Which provider improves coverage?
- Which instruments should be excluded from signals?

---

## Phase A4 — Earnings & Events Intelligence

### Objective

Add catalyst awareness to stock, portfolio, watchlist, and signal decisions.

### Why This Matters

A bullish signal before earnings is not the same as a bullish signal during a quiet period.

Events change risk.

### Core Features

#### Event Calendar

Track:

- earnings dates
- dividend dates
- ex-dividend dates
- split dates
- investor days
- major economic events
- central bank events if available

#### Event Proximity Flags

For each stock:

- event within 3 days
- event within 7 days
- event within 30 days
- event risk warning

#### Portfolio / Watchlist Events

Show:

- upcoming events for holdings
- upcoming events for watchlist stocks
- event-heavy week warning

#### Signal Near-Event Warning

Flag:

- bullish signal near earnings
- bearish signal near earnings
- signal after dividend/split
- post-event price reaction

#### Post-Event Reaction Tracking

Track:

- return after event
- volume spike after event
- signal change after event
- gap up/down

### Done When

You can answer:

- Which holdings have upcoming catalysts?
- Which signals are event-risky?
- How did stocks react after recent events?
- Should this idea be reviewed before/after earnings?

---

## Phase A5 — Risk Engine & Exposure Analytics

### Objective

Protect capital and improve portfolio decision quality.

### Why This Matters

A strategy can find winners and still fail if risk is unmanaged.

### Core Features

#### Portfolio Risk

- portfolio beta
- portfolio volatility
- portfolio max drawdown
- risk contribution by holding
- concentration risk
- sector exposure risk
- country exposure risk

#### Correlation

- correlation matrix
- correlation clusters
- hidden overlap
- diversification score

#### Stress Tests

Simulate:

- market -5%
- market -10%
- market -20%
- sector shock
- country shock
- high-volatility shock

#### Holding Risk Ranking

Rank holdings by:

- volatility
- drawdown
- signal deterioration
- allocation size
- beta
- contribution to risk

### Done When

You can answer:

- What can hurt this portfolio most?
- Which holding contributes most risk?
- How much downside is possible in a market shock?
- Is the portfolio actually diversified?

---

## Phase A6 — Advanced Screener / Discovery Engine

### Objective

Discover better candidates using calibrated intelligence.

### Why Later

A screener built on noisy signals just helps users find bad ideas faster.

Build this after signal quality improves.

### Core Features

- multi-factor screening
- calibrated signal score filters
- signal quality filters
- regime-aware filters
- sector leader filters
- smart-money confirmation filters
- liquidity filters
- data-quality filters
- event-risk filters
- saved screens
- top setups dashboard

### Example Screens

- Quality Momentum Leaders
- Bullish Signals in Leading Sectors
- Smart-Money Confirmed Breakouts
- Low-Risk Pullback Candidates
- High-Quality Stocks Near Earnings
- Bearish Deterioration Watch

### Done When

You can find stocks based on:

- signal quality
- context alignment
- data reliability
- risk filters
- event awareness

---

## Phase A7 — Research Evidence / Thesis Engine

### Objective

Turn signals into disciplined investment decisions.

### Core Features

- bull case
- bear case
- evidence checklist
- contradictory signal detection
- thesis notes
- expected catalyst
- decision reason logging
- what changed since last review
- review reminders
- conviction explanation

### Done When

Users can document:

- why they are interested
- what would invalidate the idea
- what changed since they last reviewed it
- whether evidence supports action

---

# 4. Future Roadmap — Next Product Phases

These features remain valuable but are not the immediate priority.

---

## Phase B1 — Execution & Trade Planner

### Objective

Turn ideas into executable plans.

### Features

- entry price planning
- stop-loss planning
- target price planning
- reward/risk ratio
- ATR-based position sizing
- risk-per-trade calculator
- scale-in / scale-out plans
- trade checklist
- pre-trade simulation

### Best For

- traders
- swing traders
- active investors

### Dependency

- better signals
- risk engine

---

## Phase B2 — Advanced Valuation Engine

### Objective

Improve valuation conviction.

### Features

- historical valuation bands
- peer-relative valuation
- growth-adjusted valuation
- DCF-lite model
- margin of safety
- bull/base/bear valuation cases
- valuation vs signal alignment
- scenario valuation

### Dependency

- better fundamentals coverage

---

## Phase B3 — News / Transcript Intelligence

### Objective

Improve qualitative research depth.

### Features

- earnings transcript ingestion
- transcript summarization
- management tone analysis
- guidance sentiment
- news clustering
- news risk flags
- narrative shift detection
- “what changed this week?” summary

### Dependency

- free/available source feasibility
- copilot summaries

---

## Phase B4 — Alternative Data Intelligence

### Objective

Add real-world demand indicators.

### Features

- web traffic trends
- app download trends
- search trends
- hiring trends
- job posting trends
- product review sentiment
- social trend proxies
- company-specific external indicators

### Dependency

- free/local data availability

---

## Phase B5 — Advanced Smart Money

### Objective

Go beyond price-volume proxies.

### Features

- insider transactions where free data exists
- institutional ownership where free data exists
- ETF flow proxy
- short interest where available
- 13F tracking for US equities
- fund ownership changes
- accumulation/distribution history
- smart-money trend changes

### Dependency

- free data availability

---

## Phase B6 — Advanced Backtesting

### Objective

Improve strategy validation quality.

### Features

- walk-forward testing
- regime-based backtesting
- sector-based performance
- slippage assumptions
- liquidity constraints
- strategy comparison
- parameter sensitivity
- out-of-sample testing
- signal model version comparison

### Dependency

- signal versioning
- signal outcome tracking

---

## Phase B7 — Journal & Decision Review

### Objective

Make users better investors over time.

### Features

- trade/investment journal
- decision reason logging
- expected thesis
- expected catalyst
- mistake tagging
- post-trade review
- outcome vs thesis
- behavioral bias detection
- lessons learned dashboard

### Dependency

- portfolio history
- signal history
- thesis engine

---

## Phase B8 — Advanced Alerts

### Objective

Move from basic alerts to intelligent monitoring.

### Features

- compound alerts
- alert templates
- signal deterioration alerts
- event proximity alerts
- portfolio risk alerts
- watchlist opportunity alerts
- digest customization
- alert priority scoring
- scheduled evaluation

### Dependency

- signal quality lab
- events intelligence
- risk engine

---

## Phase B9 — Real Notification Delivery

### Objective

Move from local/log delivery to real user delivery.

### Features

- SMTP provider activation
- email templates
- daily digest email
- weekly digest email
- browser notifications
- mobile push later
- unsubscribe/preference polish

### Dependency

- production readiness
- auth

---

## Phase B10 — Broker / CSV Import Integrations

### Objective

Reduce manual portfolio input.

### Features

- CSV holdings import
- broker statement import
- transaction import
- dividend import
- cost basis import
- reconciliation

### Dependency

- portfolio model stability

---

## Phase B11 — Tax & Cost Engine

### Objective

Calculate real returns.

### Features

- fees
- taxes
- dividend tax
- realized/unrealized tax impact
- short/long-term gains
- country-specific tax rules
- net performance

### Dependency

- transactions
- cost basis
- user country support

---

## Phase B12 — Collaboration / Sharing

### Objective

Make research shareable.

### Features

- share watchlists
- share research snapshots
- share backtest results
- public/private notes
- investment group workflows

### Dependency

- user permissions
- auth maturity

---

## Phase B13 — Mobile / PWA / UX Polish

### Objective

Improve access and retention.

### Features

- PWA installability
- mobile dashboard
- mobile alerts inbox
- watchlist mobile view
- portfolio mobile cards
- performance optimization
- visual polish

### Dependency

- core value validated

---

## Phase B14 — Monetization Phase 2

### Objective

Turn validated value into business.

### Features

- Stripe integration
- checkout
- subscription management
- usage-based limits
- premium modules
- admin dashboard
- invoices later
- plan experiments

### Dependency

- signal quality confidence
- user validation

---

## Phase B15 — Enterprise / Advanced Platform

### Objective

Support team and enterprise workflows later.

### Features

- team accounts
- SSO
- advanced RBAC
- organization workspaces
- shared portfolios
- audit logs
- seat billing

### Dependency

- proven individual product value
- commercial demand

---

# 5. Combined Priority View

## Do Now

1. Finish dependency-first hardening of Market Data Foundation, Data Quality Engine, and Signal Generation Engine.
2. Signal Quality Lab.
3. Signal Calibration Engine.
4. Earnings & Events Intelligence.
5. Risk Engine & Exposure Analytics.
6. Advanced Screener / Discovery Engine.
7. Research Evidence / Thesis Engine.

## Do Next Phase

8. Execution & Trade Planner
9. Advanced Valuation Engine
10. News / Transcript Intelligence
11. Alternative Data Intelligence
12. Advanced Smart Money
13. Advanced Backtesting
14. Journal & Decision Review
15. Advanced Alerts
16. Real Notification Delivery
17. Broker / CSV Import
18. Tax & Cost Engine

## Do Later

19. Collaboration / Sharing
20. Mobile / PWA / UX Polish
21. Monetization Phase 2
22. Enterprise / Teams / SSO

---

# 6. Strict Product Owner Recommendation

The next implementation should follow the dependency chain, not only feature ambition:

```text
Market Data Foundation -> Data Quality Engine -> Signal Generation Engine -> Signal Quality Lab -> Signal Calibration Engine
```

Do not build more investor-facing decision features until the platform can answer:

- Which signals worked?
- Which signals failed?
- Which signal types are noisy?
- Which sectors respond best?
- Which regimes improve or weaken signals?
- What forward return does each signal produce?
- Which stocks should be excluded due to poor data?

This is the most important next step for building a serious investor/trader intelligence platform.

---

# 7. Guiding Principle

From this point forward, prioritize features that improve:

1. accuracy
2. reliability
3. evidence quality
4. signal confidence
5. risk awareness
6. data completeness

Defer features that mainly improve:

1. appearance
2. monetization
3. distribution
4. collaboration
5. advanced AI polish

until the intelligence engine is proven.
