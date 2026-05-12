# Investment Scanner Architecture

## Objective

The application is a local-first market data analytics and investment research platform. Its goal is to turn raw market data into a structured research workflow:

```text
Market Data → Data Quality → Signals → Signal Quality → Calibration → Strategy Framework → Backtesting → Strategy Decision → Today Trade Review / Research Hub → Trade Plans → Future Paper/Algo Trading
```

The system is intentionally modular. Each module owns one business capability, exposes public services/APIs, and should not import another module's repository directly. Downstream modules consume upstream outputs through public module exports or API contracts.

This application is **research support only**. It does not provide financial advice, broker execution, live trading, order placement, or autonomous trading.

---

## Architecture Principles

### 1. Market data is the foundation

Every intelligence module depends on clean, region-scoped, duplicate-free market data. If Market Data Foundation is wrong, signals, backtests, strategies, trade plans, and research outputs become unreliable.

Persisted provider data must be safe to read as well as safe to ingest. When a natural key or idempotency rule is corrected, the owning module must also handle already-visible duplicates through an idempotent cleanup, read-time dedupe, or explicit legacy marker.

Catalog presence is not the reviewable universe. Market Data Foundation owns the explicit universe readiness contract (`CATALOG_ONLY`, `PROVIDER_SUPPORTED`, `PRICE_READY`, `CONTEXT_READY`, `REVIEW_READY`, `UNSUPPORTED`, `STALE_OR_INCOMPLETE`, `DELISTED_OR_INACTIVE`) and exposes universe health before downstream modules run review workflows. Provider `UNKNOWN`, missing prices/history/volume, stale latest candles, and missing sector/industry/country/currency metadata must be quantified instead of hidden behind generic `PARTIAL` status or active catalog counts.

Market-data repair is a first-class foundation workflow, not a downstream workaround. Provider validation, catalog identity repair, provider business metadata repair, manual metadata import, and price backfill must run through bounded Market Data Foundation APIs with explicit progress and persisted results. Provider validation is staged: fresh `UNKNOWN` provider rows are the first queue, retryable `VALIDATION_FAILED` rows are an explicit second queue, and clean `UNSUPPORTED` rows remain visible but excluded from downstream metadata/price blockers. Operational repair runs may orchestrate these actions in dependency order, but they must stay bounded, persist before/after health and repair-plan snapshots, stop as `PARTIAL` on action failure or unfinished requested queues, and continue to show remaining blockers instead of implying the universe is fixed. `COMPLETED` means no requested action has `hasMore`/`anotherRunNeeded`, no requested queue still has an expected next action, and no action threw. Drain mode must not stop on retry-failed provider rows while fresh unknown provider rows remain; retry failures are retried only after the unknown queue is drained. Mutating repair queues must repeatedly process the first remaining page; stable source-list repairs such as catalog/manual CSV imports may use source-list offsets only when the source fingerprint matches the previous run. The fingerprint includes source identity and content/row hashes; if the catalog URL contents, catalog source, import mode, or manual CSV text changes, the offset restarts at 0. Within one operational repair run action, catalog identity repair must load the catalog source once into a stable rows/fingerprint snapshot and reuse that same snapshot for every batch; re-downloading or reparsing the catalog per batch can apply offsets to a different source and is not allowed. If the stable source cannot be loaded, the action must fail as `PARTIAL` before any previous offset is reused. Advancing offsets over shrinking predicates or changed source inputs can skip rows. Provider business metadata repair must persist an audit trail and a durable current repair state: no-provider/no-op/partial rows become `MANUAL_REQUIRED`, `FAILED_RETRYABLE.nextRetryAt` is honored before retry selection, and `RESOLVED` is allowed only when sector, industry, and positive numeric market cap are all valid. Manual metadata import is the fallback for that full business metadata set, so repair-plan/UI contracts must count market-cap-only gaps in `manualBusinessMetadataRequired`; sector/industry-only counts are detail/compatibility fields. Repair-plan counts must be distinct stocks by current state, not attempt rows or recent time windows, and downstream blocker counts must be based on provider-supported rows only. Catalog identity repair must update the already matched stock id, not re-run a broad symbol upsert. `PRICE_READY` requires the latest stored EOD date to be at or after the expected latest completed trading date, rolling-window price coverage, acceptable date gaps, volume coverage, and explicit adjusted-close fallback status; market-calendar uncertainty is a blocker, not an implicit freshness tolerance. Price repair may bypass cooldown, but it must not fetch in-progress daily candles for EOD review workflows.

Market Data Foundation health exposes both exact universe-state buckets and readiness dimensions. Downstream gates, including Today Trade Review, must use `counts.readiness.priceReady`, `counts.readiness.contextReady`, and `counts.readiness.reviewReady` for readiness decisions. `counts.byUniverseState.*` answers the narrower question "what final state did each instrument land in" and can differ from readiness dimensions, for example a `REVIEW_READY` instrument is also price-ready but is not counted in `byUniverseState.PRICE_READY`.

Market Data Foundation signoff is the strict full-catalog operator gate. Health, repair-plan, and repair-run responses expose `universeSignoff` with `status`, configured minimum review-ready threshold, blocker list, `nextAction`, and `downstreamAllowed`. For the default `IN / STOCK` scope, signoff passes only when provider unknowns, retry-failed provider validations, provider-supported catalog identity repair, provider-supported business metadata auto/manual/retry queues, provider-supported price backfill, stale latest EOD, minimum review-ready count, review-ready percentage, and `trustStatus` all pass. Broad-universe downstream claims must use `universeSignoff.downstreamAllowed`, not catalog size or raw active-stock count. Today Trade Review Lite is the explicit exception: it may run from the separate Trusted Review Universe subset while full-catalog signoff remains failed, but it must never publish a candidate outside the persisted trusted-universe snapshot.

### 2. Raw signals are not trade decisions

The Signal Generation Engine classifies instruments as raw `BULLISH`, `NEUTRAL`, or `BEARISH`. These are confirmation inputs only. A raw bullish signal does not mean a trade should be taken.

### 3. Strategies are reusable definitions

Strategy Framework is the source of truth for reusable strategy definitions, versions, rule declarations, evaluator contracts, ratings, and readiness labels. Signals, Strategy Decision, and Backtesting should consume strategies from the framework rather than duplicating strategy rules.

### 4. Backtesting proves strategies

Backtesting Strategy Lab owns detailed historical simulation. Strategy Framework owns compact performance summaries and ratings. A strategy should not be trusted just because it produces candidates; it must have evidence.

Backtest trade returns must reconcile to cash P&L over committed entry capital. If old saved runs contain stale trade percentages or unreconciled aggregate capital, the read path must repair the trade display from source inputs or mark the aggregate proof as legacy invalid.

### 5. Strategy Decision is the decision layer

Strategy Decision Engine converts data from signals, calibration, market context, data quality, smart money, and Strategy Framework into candidate/watch/avoid/exit decisions.

### 6. Research Hub is a command center, not a data dump

Research Hub should prioritize strategy-proof-driven candidates and next actions. It should not simply duplicate all child module pages.

### 7. Trade Plans are pre-paper-trading risk plans

Trade Plan & Risk Management Engine converts strategy-backed decisions into reviewable plans with entry zone, stop, target, reward/risk, position sizing, data gaps, and paper-readiness status. It does not create trades.

### 7a. Today Trade Review is the daily shortlist publisher

Today Trade Review composes persisted Strategy Decision, Strategy Framework proof, Data Quality, Market Context, Signal/Calibration support, Smart Money, and Trade Plan snapshots into one daily before-market research-support shortlist. It owns daily run orchestration, candidate ranking, candidate state mapping, and persisted TodayReviewRun/TodayReviewCandidate snapshots. It does not own raw signal generation, proof calculation, trade-plan geometry, market-data ingestion, or live/paper execution.

Raw signals alone must never create a promoted Today Review candidate. Today Review must first obtain a Trusted Review Universe snapshot and load the trusted membership reliably; if the health snapshot is unavailable, membership loading fails, or the mode is `NO_REVIEW`, it publishes zero candidates with an explicit warning. Strategy Decision, Trade Plan, calibration, smart-money, and market-context rows are supporting evidence only and are filtered to instruments present in that loaded trusted snapshot. Promoted long review candidates require Strategy Framework proof, acceptable data quality, an acceptable market gate, and valid trade-plan geometry. Hard blockers override score and positive reasons, and the persisted Today Review candidate snapshots the conservative state used at publication time.

### 8. Batch work must be bounded

Backend endpoints process bounded batches. Frontend orchestration loops through batches using `offset/cursor`, `nextOffset/nextCursor`, and `hasMore`. User-triggered batch operations should show progress.

### 9. Region and asset scope are global

The app uses a global market scope, currently defaulting to `IN / STOCK`. Pages that list or select instruments should respect this scope unless explicitly overridden.

Scoped historical/persisted reads must propagate the same scope to generation, coverage, lookup, and list APIs. A persisted row from `GLOBAL`, `US`, or another asset class must not satisfy an `IN / STOCK` lookup unless the owning module explicitly documents that fallback.

Visible persisted rows are part of the product contract. Fixes that only affect future generated rows are incomplete when rejected examples already exist in the browser; the module must repair, recompute, dedupe, hide, or clearly mark stale persisted/displayed rows within its ownership boundary.

### 9a. Candidate taxonomy is product language, API names are compatibility

Strategy Decision may keep API enum/field names such as `TRADE_CANDIDATE` and `tradeCandidates` for compatibility, but user-facing Strategy Decision, Research Hub, and Trade Plan surfaces should call these review candidates. Raw bullish signals remain confirmation inputs and must not be promoted into review candidates without Strategy Decision proof.

### 10. UI verification is local and mandatory

UI-facing module changes must be covered by local smoke tests when practical. The project standard is the free/open-source Playwright suite in `frontend/tests/ui`. Smoke tests should verify authenticated page load, primary headings/actions, filters/tabs, table columns, route correctness, common error states, meaningful empty states, and the specific UI regression fixed by the change.

UI smoke tests should mirror module ownership. Keep scenarios in module-named spec files under `frontend/tests/ui` and centralize only reusable setup/assertions under `frontend/tests/ui/support`. Do not let the suite collapse into one catch-all smoke file.

Authenticated smoke suites that use the shared local test account should run with one Playwright worker unless worker-isolated test users/storage state are introduced. Protected-route navigation/auth setup should stay in shared UI test helpers so module specs focus on module behavior. A slower deterministic suite is preferable to parallel auth/session flakes.

For data-bearing modules, smoke tests must prove more than "the page renders." They should assert that scoped data is visible when expected, or that a domain-specific empty state explains missing/stale data and the refresh/evaluation action available to the user.

Large data-load and calculation workflows should not be executed as part of every UI smoke run. For workflows such as catalog import, OHLCV sync, data-quality evaluation, signal generation, and smart-money snapshot refresh, use Playwright to cover the controls, request parameters, progress/disabled/final states, and empty-state behavior, and use manual browser verification for the real bulk run when the change affects user-visible data.

Do not add paid hosted browser testing, paid visual regression tools, paid UI libraries, paid market-data providers, or paid AI services. This project remains local-first and non-commercial unless explicitly changed by the product owner.

---

## Module Overview

| Area | Module | Primary Objective |
|---|---|---|
| Foundation | Market Data Foundation | Instrument catalog, price/fundamental/corporate action ingestion, provider integration, scheduler, FX |
| Foundation | Data Quality Engine | Evaluate whether instruments have enough clean data for signals, strategies, backtests, and plans |
| Research | Signal Generation Engine | Generate raw bullish/neutral/bearish signal classifications and primitive evidence |
| Intelligence Lab | Signal Quality Lab | Measure historical forward-return outcomes of raw signals |
| Intelligence Lab | Signal Calibration Engine | Adjust raw signal scores using explainable historical/context evidence, with sample safety |
| Strategy | Strategy Framework | Reusable strategy registry, evaluator, rules, ratings, and readiness labels |
| Intelligence Lab | Backtesting Strategy Lab | Detailed historical simulation for registered strategies and custom rules |
| Research | Strategy Decision Engine | Convert strategy/context inputs into candidate/watch/avoid/exit decisions |
| Research | Today Trade Review | Persisted before-market shortlist built from proof, context, data quality, and trade-plan snapshots |
| Research | Research Hub | Strategy-proof-driven command center and daily research triage layer |
| Research | Smart Money Intelligence | Price-volume accumulation/distribution context and confirmation/contradiction layer |
| Research | Market Context Intelligence | Market regime, breadth, sector/country context, market gate support |
| Intelligence Lab | Historical Context Snapshots | Persist historical market/context snapshots for later evaluation/calibration |
| Portfolio | Portfolio Management | Manual portfolios, holdings, transactions, valuation, allocation summaries |
| Portfolio | Portfolio Intelligence | Portfolio risk, exposure, concentration, and holding-level intelligence |
| Portfolio | Trade Plan & Risk Management Engine | Entry/stop/target/R:R/position sizing plans and paper-readiness snapshots |
| Portfolio | Watchlist Management | User-curated instrument lists and research monitoring lists |
| Portfolio | Alerts Monitoring | Alert definitions and monitoring for instruments, signals, strategies, and plans |
| Account | Auth Identity | User identity, authentication, ownership, and access control |
| Account | Subscription Billing | Local/product subscription limits, usage gates, and plan controls |
| Account | Notifications Delivery | Notification routing and delivery for alerts/system messages |
| Account | AI Investment Copilot | Research assistant interface that consumes public module outputs |

---

# Modules

## 1. Market Data Foundation

### Objective

Own the application's baseline market data capabilities: instrument catalog, OHLCV price data, latest price snapshots, fundamentals, corporate actions, FX rates, ingestion, provider integration, validation, scheduler, queue/worker glue, and market-data health.

### Owns

- Instrument/company master data
- Catalog import from configured/public sources or manual CSV
- Provider symbol mapping and provider support status
- Daily OHLCV through `PriceTick`
- Latest price snapshots
- Fundamentals and corporate actions where provider supports them
- FX rates
- Market-aware scheduled ingestion
- Sync freshness gate and no-op candle persistence
- Market data status/health endpoints
- Universe repair plan, provider validation, metadata enrichment, and price backfill actions

### Does Not Own

- Data quality scoring
- Signal generation
- Strategy decisions
- Backtesting simulations
- Trade planning or execution

### Key Outputs

- Instruments/stocks
- Price history
- Latest price
- Market data health
- Universe readiness health and review-ready counts
- Universe repair plan and bounded repair summaries
- Scheduler status
- Catalog import summaries
- Provider support status

### Relationships

| Consumes | Provides To |
|---|---|
| Free provider integrations such as Yahoo Finance | Data Quality Engine |
| Public catalog files / CSVs | Signal Generation Engine |
| Manual instrument input | Signal Quality Lab |
|  | Signal Calibration Engine |
|  | Strategy Framework / Backtesting |
|  | Strategy Decision Engine |
|  | Trade Plan & Risk Engine |
|  | Portfolio Management / Portfolio Intelligence |

### Notes

Market Data Foundation should be verified before all downstream modules. It must enforce region/asset scope, prevent duplicate price ticks, preserve non-null metadata, and avoid unnecessary repeated provider calls.

---

## 2. Data Quality Engine

### Objective

Evaluate whether instruments have sufficient clean market data to be trusted by signals, strategies, backtests, calibration, and trade plans.

### Owns

- Coverage status
- Signal readiness status
- Liquidity status
- Readiness scores
- Data blockers/warnings
- Data-quality filtering and diagnostics

### Does Not Own

- Market data ingestion
- Signal scoring
- Strategy rules
- Trade decisions

### Key Outputs

- Coverage score/status
- Signal readiness score/status
- Liquidity score/status
- Eligibility flags for signals/calibration/planning
- Data-quality warnings and blockers

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation price/history/latest price | Signal Generation Engine |
| Market Data Foundation metadata | Signal Calibration Engine |
|  | Strategy Decision Engine |
|  | Backtesting Strategy Lab |
|  | Trade Plan & Risk Engine |
|  | Research Hub |

---

## 3. Signal Generation Engine

### Objective

Generate raw, daily/on-demand, explainable signal classifications for instruments: `BULLISH`, `NEUTRAL`, or `BEARISH`. It owns raw composite scoring and raw signal persistence.

### Owns

- Raw signal generation
- Technical/momentum/fundamental primitive signals
- Raw composite score
- Raw direction
- Raw confidence
- Triggered and negative signal evidence
- Daily idempotent `SignalResult` rows
- Optional Strategy Framework match enrichment

### Does Not Own

- Historical outcome measurement
- Calibration
- Strategy decisioning
- Trade plans
- Recommendations

### Key Outputs

- Raw signal result
- Score/direction/confidence
- Triggered signals
- Negative signals
- Optional `strategyMatches[]` and `blockedStrategies[]`

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation price/history/latest price | Signal Quality Lab |
| Data Quality Engine, optionally | Signal Calibration Engine |
| Strategy Framework, optionally for match enrichment | Strategy Decision Engine |
|  | Research Hub confirmation summary |
|  | Trade Plan chain indirectly through Strategy Decision |

### Notes

Raw bullish is not a trade candidate. Signal Generation should be labelled as raw confirmation input.

---

## 4. Signal Quality Lab

### Objective

Measure historical performance of raw Signal Generation outputs by calculating forward returns and quality metrics.

### Owns

- On-demand forward-return outcome calculation
- Win-rate measurement
- Performance by signal type, sector, score bucket, regime, and data quality
- Noisy/churning signal diagnostics
- Horizon availability and evaluation diagnostics

### Does Not Own

- Raw signal creation
- Score calibration
- Strategy optimization
- Trading recommendations

### Key Outputs

- Evaluated signal counts
- Win rates
- Average/median/best/worst forward returns
- Horizon availability
- Evaluation diagnostics
- Noisy signal flags

### Relationships

| Consumes | Provides To |
|---|---|
| Signal Generation Engine raw signals | Signal Calibration Engine |
| Market Data Foundation price history | Research/diagnostic UI |
| Data Quality Engine filters |  |
| Historical Context Snapshots |  |

### Notes

Outcomes require future prices after signal generation. Fresh signals may have zero evaluable outcomes for longer horizons.

---

## 5. Signal Calibration Engine

### Objective

Apply explainable, sample-safe score adjustments to raw signals based on Signal Quality outcomes, context snapshots, and data-quality evidence. Raw signals remain unchanged.

### Owns

- Calibrated score/direction/confidence
- Calibration evidence
- Sample-size confidence
- Boosts/penalties
- Calibration model version
- Calibrated result persistence

### Does Not Own

- Raw signal generation
- Strategy rules
- Trading decisions
- Strategy optimization

### Key Outputs

- Calibrated signal result
- Raw-vs-calibrated comparison
- Calibration confidence
- Evidence status
- Boost/penalty reasons
- Data gaps/warnings

### Relationships

| Consumes | Provides To |
|---|---|
| Signal Generation Engine | Strategy Decision Engine |
| Signal Quality Lab diagnostics | Research Hub |
| Data Quality Engine | Strategy Framework as optional context |
| Historical Context Snapshots | Trade Plan chain indirectly |

### Notes

Calibration must not overfit tiny/zero sample groups. If evidence is insufficient, it should preserve raw score or apply only tiny bounded changes.

---

## 6. Strategy Framework

### Objective

Provide the reusable strategy registry and evaluator that becomes the source of truth for strategy definitions, versions, entry/exit/noise/risk rules, ratings, and conservative readiness labels.

### Owns

- Strategy definitions
- Strategy versions
- Entry/exit/noise/risk rule declarations
- Strategy evaluator contracts
- Strategy metadata
- Strategy performance summaries
- Strategy ratings
- Conservative readiness labels

### Does Not Own

- Raw signal generation
- Backtest simulation internals
- Trade plan risk sizing
- Broker execution

### Key Outputs

- Strategy catalog
- Strategy detail/model
- Strategy evaluation result
- Strategy performance summary
- Strategy rankings
- Strategy readiness label

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation context as needed | Signal Generation Engine strategy matching |
| Signal/calibration/context inputs when evaluating | Backtesting Strategy Lab |
| Backtesting results for performance summaries | Strategy Decision Engine |
|  | Research Hub |
|  | Trade Plan Risk Engine indirectly via decisions/proof |

### Notes

Strategy Framework defines strategies; Backtesting Lab simulates them; Strategy Decision uses them; Research Hub prioritizes them.

Strategy categories are part of the contract. Active `ENTRY` definitions can be presented as standalone candidate strategies and registered backtests. `EXIT`, `GATE`, `FILTER`, and `DRAFT` definitions are support semantics and should remain visible as rules/diagnostics, but they must not expose enabled standalone backtest actions until a module implements the matching simulation semantics.

---

## 7. Backtesting Strategy Lab

### Objective

Run detailed historical simulations for registered strategies and custom rule experiments using daily close/adjusted-close data.

### Owns

- Backtest runs
- Backtest configuration
- Equity curve
- Drawdown curve
- Trade log
- Simulation diagnostics
- Detailed run history

### Does Not Own

- Strategy definitions/rules
- Strategy ratings as source of truth
- Live trading
- Broker execution
- Portfolio optimization

### Key Outputs

- Backtest metrics
- Equity/drawdown curves
- Trade logs
- Data coverage diagnostics
- StrategyPerformanceSummary update through Strategy Framework

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation price history | Strategy Framework performance summaries |
| Strategy Framework evaluator | Research Hub proof snippets |
| Data Quality Engine filters | Trade Plan Risk Engine proof snapshots indirectly |

### Notes

Registered Strategy mode should be the primary path. Custom Rules remain secondary/experimental. Registered backtests expose active `ENTRY` Strategy Framework definitions as standalone simulations; `EXIT`, `GATE`, `FILTER`, and `DRAFT` definitions require dedicated portfolio/exit-risk or gating semantics before their outputs can be treated as strategy proof.

---

## 8. Strategy Decision Engine

### Objective

Convert data from research modules into structured decisions such as trade candidate, watch, avoid, hold, reduce-risk, or exit candidate.

### Owns

- Market tradeability gate integration
- Strategy-backed decision output
- Decision score/confidence
- Decision reasons/blockers/warnings/data gaps
- Daily idempotent StrategyDecisionResult
- Candidate/exits endpoints

### Does Not Own

- Strategy definitions
- Backtesting
- Raw signals
- Trade plan calculations
- Broker execution

### Key Outputs

- Market gate
- Strategy decisions
- Trade candidates
- Watch/wait candidates
- Avoid/risk candidates
- Exit/reduce-risk candidates

### Relationships

| Consumes | Provides To |
|---|---|
| Strategy Framework | Research Hub |
| Signal Generation Engine | Trade Plan & Risk Engine |
| Signal Calibration Engine | Portfolio Intelligence, indirectly |
| Market Context Intelligence |  |
| Smart Money Intelligence |  |
| Data Quality Engine |  |
| Portfolio Management/Intelligence |  |

### Notes

Overlapping strategy logic should come from Strategy Framework. Missing context must produce gaps/warnings, not crashes.

---

## 9. Research Hub

### Objective

Act as the Research Command Center and triage layer. It should guide the user toward what matters now, not duplicate all module details.

### Owns

- Market readiness summary
- Strategy-proof-driven research priorities
- Trade/watch/avoid/exit priority buckets
- Confirmation summaries
- What-changed summary
- Next actions

### Does Not Own

- Signal generation
- Backtest execution
- Strategy evaluation runs
- Trade plan calculations

### Key Outputs

- Market readiness
- Trade candidates
- Watch candidates
- Avoid candidates
- Exit candidates
- Strategy proof summary
- Confirmation summary
- Next actions

### Relationships

| Consumes | Provides To |
|---|---|
| Strategy Decision Engine | User-facing daily workflow |
| Strategy Framework performance summaries | Drilldowns to child modules |
| Signal Generation summary |  |
| Smart Money Intelligence |  |
| Market Context Intelligence |  |
| Trade Plan Risk Engine links/readiness context |  |

### Notes

Raw bullish signals are confirmation context only. They should not be promoted to trade candidates unless a valid Strategy Decision exists.

---

## 10. Smart Money Intelligence

### Objective

Provide price-volume based accumulation/distribution context and confirmation/contradiction signals.

### Owns

- Accumulation/distribution diagnostics
- Smart-money score/status
- Sector or instrument smart-money summaries
- Confirmation/contradiction evidence

### Does Not Own

- Raw signal scoring
- Strategy decisions
- Backtesting
- Trade planning

### Key Outputs

- Smart-money status
- Accumulation candidates
- Distribution warnings
- Sector smart-money context

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation OHLCV | Strategy Decision Engine |
|  | Research Hub |
|  | Strategy Framework context |
|  | Trade Plan warnings indirectly |

---

## 11. Market Context Intelligence

### Objective

Evaluate broader market conditions, regime, breadth, and sector/country context.

### Owns

- Market regime
- Market breadth
- Sector leadership/weakness
- Country/region context
- Market gate support

### Does Not Own

- Strategy rules
- Raw signals
- Backtesting
- Trade plan risk

### Key Outputs

- Market condition
- Market gate input
- Breadth metrics
- Leading/weak sectors
- Context warnings

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation prices | Strategy Decision Engine |
| Historical Context Snapshots | Research Hub |
|  | Strategy Framework context |
|  | Signal Calibration context |

---

## 12. Historical Context Snapshots

### Objective

Persist historical market/context snapshots so signal outcomes, calibration, regime grouping, and strategy analysis can refer to context as of a past date.

### Owns

- Historical market regime snapshots
- Sector context snapshots
- Smart-money/data-quality context snapshots where implemented
- Snapshot retrieval by date/window

### Does Not Own

- Current market calculation
- Signal scoring
- Backtesting

### Key Outputs

- Historical context for a date
- Regime grouping inputs
- Sector/smart-money/data-quality context by date

### Relationships

| Consumes | Provides To |
|---|---|
| Market Context Intelligence | Signal Quality Lab |
| Smart Money Intelligence | Signal Calibration Engine |
| Data Quality Engine | Backtesting/Strategy analysis where needed |

---

## 13. Portfolio Management

### Objective

Own manual portfolios, holdings, transactions, valuation, allocation, and lightweight holding signal display.

### Owns

- Portfolios
- Holdings
- Manual transactions
- Valuation summary
- Allocation by holding/sector/country/currency

### Does Not Own

- Portfolio risk intelligence
- Strategy decisions
- Trade plan calculations
- Broker sync/execution

### Key Outputs

- Portfolio details
- Holding list
- Valuation
- Allocation
- Transactions

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation latest prices | Portfolio Intelligence |
| Signal Generation/Strategy info optionally | Trade Plan Risk Engine |
|  | Strategy Decision Engine for defensive exits |

---

## 14. Portfolio Intelligence

### Objective

Analyze portfolio-level risks, exposure, concentration, holding risks, and decision support.

### Owns

- Portfolio exposure risk
- Concentration diagnostics
- Holding-level risk context
- Portfolio intelligence summaries

### Does Not Own

- Portfolio transaction ledger
- Market data ingestion
- Strategy definitions
- Trade plan calculations

### Key Outputs

- Risk flags
- Exposure diagnostics
- Concentration warnings
- Holding health context

### Relationships

| Consumes | Provides To |
|---|---|
| Portfolio Management | Strategy Decision Engine defensive exits |
| Market Data Foundation | Trade Plan Risk Engine portfolio impact |
| Strategy Decision/Signals where needed | Research Hub/Portfolio views |

---

## 15. Trade Plan & Risk Management Engine

### Objective

Convert strategy-backed candidates into practical trade-review plans and final paper-readiness classifications.

### Owns

- Entry zone
- Stop loss
- Target
- Reward/risk ratio
- Position sizing
- Portfolio impact checks
- Risk grade
- Plan status
- Invalidation rules
- Paper-readiness status/reasons/blockers
- Persisted proof snapshots

### Does Not Own

- Raw signals
- Strategy rules
- Backtest simulation
- Portfolio holdings ledger
- Paper trade creation
- Broker execution

### Key Outputs

- TradePlanResult
- Entry/stop/target/R:R
- Position sizing estimate
- Portfolio impact warnings
- Paper readiness status
- Persisted proof snapshots

### Relationships

| Consumes | Provides To |
|---|---|
| Strategy Decision Engine | Future Paper Trading Simulator |
| Strategy Framework performance summaries | Research Hub links/context |
| Market Data Foundation latest price/history | Portfolio review |
| Data Quality Engine |  |
| Portfolio Management/Intelligence |  |

### Notes

Future Paper Trading must consume Trade Plan public output and persisted snapshots only. It must not reconstruct eligibility by reaching into upstream repositories.

---

## 16. Watchlist Management

### Objective

Provide user-curated lists of instruments for monitoring, research, and batch workflows.

### Owns

- Watchlists
- Watchlist items
- Watchlist-level metadata

### Does Not Own

- Signal generation
- Strategy decisions
- Trade plans

### Key Outputs

- Watchlist instruments
- Watchlist membership

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation instruments | Strategy Decision batch evaluation |
|  | Backtesting universe selection |
|  | Trade Plan batch generation |
|  | Alerts Monitoring |

---

## 17. Alerts Monitoring

### Objective

Monitor alert conditions for instruments, signals, strategy decisions, trade plans, and other research events.

### Owns

- Alert definitions
- Alert status
- Alert trigger checks
- Alert lifecycle

### Does Not Own

- Notification delivery transport
- Signal generation
- Trading execution

### Key Outputs

- Triggered alerts
- Alert events

### Relationships

| Consumes | Provides To |
|---|---|
| Market Data Foundation | Notifications Delivery |
| Signal Generation Engine | User workflows |
| Strategy Decision Engine |  |
| Trade Plan Risk Engine |  |
| Watchlist Management |  |

---

## 18. Auth Identity

### Objective

Own authentication, user identity, and ownership boundaries.

### Owns

- Users
- Authentication state
- Ownership/access metadata
- User-scoped data access

### Provides To

- Portfolio Management
- Watchlists
- Alerts
- Backtesting runs
- Billing/subscription
- Any user-owned module

---

## 19. Subscription Billing

### Objective

Own product plan/usage gating and subscription-related controls.

### Owns

- Plans
- Usage counters
- Limits/gates
- Billing status where implemented

### Provides To

- Backtesting Strategy Lab run limits
- Potential future batch/run limits
- Account UI

---

## 20. Notifications Delivery

### Objective

Deliver system/user notifications generated by alerts or other modules.

### Owns

- Notification records
- Delivery status
- Notification channels where implemented

### Consumes From

- Alerts Monitoring
- System events
- Future scheduled tasks

---

## 21. AI Investment Copilot

### Objective

Provide a conversational research assistant UI over the application's public module outputs.

### Owns

- Copilot UI/workflow
- User-facing explanation orchestration
- Safe research-support language

### Does Not Own

- Raw data computation
- Signal scoring
- Strategy rules
- Trade execution

### Consumes

- Research Hub
- Signal Generation
- Strategy Decision
- Strategy Framework
- Backtesting summaries
- Trade Plans
- Portfolio views
- Market Data Foundation

---

# End-to-End Data Flow

## Daily Research Flow

```text
1. Market Data Foundation updates instrument catalog and OHLCV data.
2. Data Quality Engine evaluates instrument readiness.
3. Signal Generation Engine creates raw BULLISH / NEUTRAL / BEARISH signals.
4. Signal Quality Lab measures historical outcomes when enough future price data exists.
5. Signal Calibration Engine applies sample-safe calibrated adjustments.
6. Strategy Framework evaluates strategy matches and stores strategy proof/rating.
7. Backtesting Strategy Lab simulates registered strategies and updates performance summaries.
8. Strategy Decision Engine produces candidate/watch/avoid/exit decisions.
9. Research Hub prioritizes strategy-backed research actions.
10. Trade Plan & Risk Engine creates review plans and paper-readiness classifications.
```

## Future Paper Trading Flow

```text
1. Trade Plan has paperReadinessStatus = READY_FOR_PAPER_REVIEW.
2. Future Paper Trading Simulator consumes Trade Plan public output and persisted proof snapshots.
3. Simulator creates paper-only positions.
4. No broker execution, no live trading, no real orders.
```

---

# Module Dependency Direction

```text
Market Data Foundation
  ↓
Data Quality Engine
  ↓
Signal Generation Engine
  ↓
Signal Quality Lab
  ↓
Signal Calibration Engine
  ↓
Strategy Framework ↔ Backtesting Strategy Lab
  ↓
Strategy Decision Engine
  ↓
Research Hub
  ↓
Trade Plan & Risk Management Engine
  ↓
Future Paper Trading Simulator
```

Cross-cutting modules:

```text
Auth Identity → all user-owned records
Subscription Billing → usage-gated workflows
Watchlist Management → universes and monitoring lists
Alerts Monitoring → triggered research/market events
Notifications Delivery → user/system message delivery
AI Copilot → explanation layer over public outputs
Historical Context Snapshots → historical context for quality/calibration/backtesting
Smart Money Intelligence → confirmation/contradiction context
Market Context Intelligence → market gate/regime/breadth context
Portfolio Management/Intelligence → holdings/risk/exposure context
```

---

# Safety Boundaries

The application must not claim to provide financial advice. Safe wording includes:

```text
candidate
review
watch
avoid
risk level
paper review candidate
research support
historical simulation
```

Avoid wording such as:

```text
buy now
sell now
guaranteed
execute order
live trading ready
```

No module currently owns live broker execution, order placement, or autonomous trading.

---

# Market Data Readiness Gates

Market Data Foundation now exposes two separate readiness contracts:

1. **Full Catalog Health** is the strict data-ops contract. It covers provider validation, identity, metadata, price history, repair queues, and `universeSignoff`. It can remain `NOT_TRUSTWORTHY` while bad catalog rows are still being classified or repaired.
2. **Trusted Review Universe** is the user-facing review input. It includes only active `IN / STOCK` instruments with supported provider status, current latest EOD price, at least 120 OHLCV bars, recent volume, adjusted-close coverage or a documented close fallback, and no critical corporate-action blocker. Missing sector, industry, market cap, ISIN, or listing date is a context gap, not a hard blocker for price-action review.

Trusted Review Universe health publishes `targetTradingDate`, `requiredDataThroughDate`, and `storedDataThroughDate`. A pre-market review for session `T` requires EOD data through the previous completed session, while a post-close refresh for the next session can require the just-completed session after the final candle window. Today Trade Review must use Trusted Review Universe mode (`FULL_REVIEW`, `LIMITED_REVIEW`, or `NO_REVIEW`) for run eligibility, not full-catalog signoff or raw catalog size. Full-catalog signoff remains the operator gate for data quality repair and downstream broad-universe claims. Today Review candidate snapshots must also record membership load status, membership load failure reason, scan completeness, and outside-trusted-universe Strategy Decision exclusions. `LOAD_FAILED` means fail-closed `NO_REVIEW`; `CONFIGURED_PARTIAL` is valid only when a configured scan limit intentionally caps the loaded trusted set and is disclosed in the API/UI.

---

# Known Architectural Limitations

1. `Stock.symbol` is still globally unique. Long-term, `symbol + exchange` or instrument-level identity is safer.
2. Market Data Foundation uses Yahoo Finance for provider validation/enrichment/history, but Yahoo is not a complete exchange master catalog.
3. Actual futures contracts require a real expiry-level contract source and provider support validation. F&O underlyings are not futures contracts.
4. Signal Quality outcomes are currently calculated on demand, not persisted in a `SignalOutcome` table.
5. Strategy backtests use daily data and local assumptions; no intraday fills, slippage model depth, or broker execution exists.
6. Paper trading is not yet implemented. The Trade Plan engine is prepared to feed a future paper simulator.
7. Global multi-asset support is partially modeled but current production scope is primarily `IN / STOCK`.

---

# Recommended Verification Order

1. Market Data Foundation
2. Data Quality Engine
3. Signal Generation Engine
4. Signal Quality Lab
5. Signal Calibration Engine
6. Strategy Framework
7. Backtesting Strategy Lab
8. Strategy Decision Engine
9. Research Hub
10. Trade Plan & Risk Management Engine
11. Portfolio modules
12. Alerts/Notifications
13. AI Copilot
14. Future Paper Trading Simulator

For frontend-affecting changes in any module above, also run:

```text
cd frontend
npm run test:ui
```

If the UI suite cannot run, record the blocker explicitly and do not treat backend-only tests as a substitute for UI verification.

For UI-facing fixes, use this order:

1. write/update the UI test,
2. execute the UI test,
3. fix the issue exposed by the test,
4. run relevant backend tests,
5. rerun the UI test suite.

The final verification for visible behavior is the UI suite passing after the fix.
