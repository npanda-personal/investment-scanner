# Strategy Framework

## Signal Generation Integration

Signal Generation consumes Strategy Framework evaluators for optional strategy matching enrichment. It should use registered definitions/evaluators instead of duplicating rule logic, and it should present matches as confirmation context rather than trade decisions.

## Audit Report

### Strategy rules are hardcoded inside Strategy Decision Engine
- Affected module/file: `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- Severity: HIGH
- Why it matters: `TREND_MOMENTUM`, `PULLBACK_IN_UPTREND`, and `DEFENSIVE_EXIT` are embedded as private methods, so other modules cannot reuse the same definitions safely.
- Recommended fix: Move definitions and reusable evaluation contracts into Strategy Framework; let Strategy Decision consume public framework exports over time.
- Safe to fix now: yes, via additive framework and incremental adapter.

### Trend decision references missing sector context
- Affected module/file: `backend/src/modules/strategy-decision-engine/strategy-decision-engine.service.ts`
- Severity: BLOCKER
- Why it matters: `ctx.sectors.find(...)` is used without loading `sectors`, which can fail trend evaluation.
- Recommended fix: Strategy Framework context builder loads sector context; Strategy Decision should migrate to framework evaluator next.
- Safe to fix now: yes, by using Strategy Framework for new evaluation paths.

### Signal primitives and strategy signals are mixed
- Affected module/file: `backend/src/modules/signal-generation-engine/signal-generation-engine.service.ts`
- Severity: HIGH
- Why it matters: raw indicators such as SMA, RSI, breakout, momentum, and fundamentals are useful primitives, but strategy-specific concepts like trend continuation or breakout confirmation were not declared as reusable strategies.
- Recommended fix: Keep raw signal generation in Signal Generation Engine; attach optional `strategyMatches` from Strategy Framework.
- Safe to fix now: yes, additive and opt-in.

### Backtesting has disconnected entry/exit rules
- Affected module/file: `backend/src/modules/backtesting-strategy-lab/backtesting-strategy-lab.service.ts`
- Severity: HIGH
- Why it matters: backtests used `signalProxy`, SMA rules, and separate config instead of the same strategies used by signal/decision flows.
- Recommended fix: Add `strategyCode`, `strategyVersion`, and `timeframe` to backtest config and evaluate registered strategies when present.
- Safe to fix now: yes, old configs still work.

### Backtest performance is not strategy-rated
- Affected module/file: `backend/prisma/schema.prisma`, `backtesting-strategy-lab`
- Severity: HIGH
- Why it matters: the app cannot rank strategies or describe proven/unproven automation readiness.
- Recommended fix: Persist idempotent `StrategyPerformanceSummary` rows keyed by strategy/version/timeframe/region/asset/universe.
- Safe to fix now: yes, new table only.

### Strategy catalog fields are missing
- Affected module/file: all audited modules
- Severity: MEDIUM
- Why it matters: no single API exposes purpose, entry rules, exit rules, filters, required inputs, supported markets, or automation eligibility.
- Recommended fix: Add `StrategyDefinition` registry and `/api/v1/strategies` endpoints.
- Safe to fix now: yes.

### Signal reliability/noise rules are duplicated conceptually
- Affected module/file: `signal-calibration-engine`, `data-quality-engine`, `strategy-decision-engine`, `backtesting-strategy-lab`
- Severity: MEDIUM
- Why it matters: data readiness, stale prices, illiquidity, overextension, market gate, weak sector, and smart-money contradiction appear as separate penalties/filters.
- Recommended fix: Declare reusable noise filters in Strategy Framework while source calculations remain in their owning modules.
- Safe to fix now: partial; full migration should be incremental.

### Strategy Decision language differs from target product language
- Affected module/file: `strategy-decision-engine.types.ts`, `strategy-decision-engine.service.ts`
- Severity: MEDIUM
- Why it matters: older `TRADE_CANDIDATE` language is less aligned with "candidate", "consider review", and "risk level".
- Recommended fix: Strategy Framework outputs `ENTRY_CANDIDATE`, `EXIT_CANDIDATE`, `REDUCE_RISK`, `AVOID`, and avoids direct advice.
- Safe to fix now: yes for new APIs; old API preserved.

### Missing historical availability checks
- Affected module/file: `backtesting-strategy-lab`
- Severity: MEDIUM
- Why it matters: 10Y/15Y backtests must not pretend full history exists.
- Recommended fix: Strategy Framework backtest response returns availability status and marks no-trade/short-history results as unavailable/partial.
- Safe to fix now: yes, MVP.

### Persistence migration needed
- Affected module/file: `backend/prisma/schema.prisma`
- Severity: HIGH
- Why it matters: strategy definitions and performance summaries need stable query surfaces.
- Recommended fix: Add `StrategyDefinition` and `StrategyPerformanceSummary`; run `npx prisma generate` and a migration/db push before production use.
- Safe to fix now: yes.

## Design Summary

### Module Ownership
Strategy Framework owns strategy definitions, versions, metadata, rule declarations, evaluator contracts, strategy registry, performance summaries, ratings, and future automation eligibility flags. It does not own raw market data, indicator source data, signal persistence, backtest simulation internals, portfolios, broker execution, live trading, or order placement.

### Strategy Definition Schema
Definitions include code, name, description, category, style, timeframe, asset types, supported regions, version, status, required inputs, entry rules, exit rules, noise filters, risk rules, market gate rules, parameters, explanation template, and examples.

### Registry Pattern
`strategy-framework.registry.ts` contains 10 deterministic built-in strategies. The database can persist the same definitions through `POST /strategies/seed`, but TypeScript registry remains the MVP source of truth so local development works without seed state.

### Evaluation Interface
`StrategyFrameworkEvaluator` implements:
- `evaluateSignalCandidate(context)`
- `evaluateEntry(context)`
- `evaluateExit(context)`
- `getBacktestConfig(input)`

The MVP uses typed JSON rule declarations plus TypeScript evaluators, not a scripting language.

Strategy Decision Engine consumes this public evaluator for `TREND_MOMENTUM`, `PULLBACK_IN_UPTREND`, and `DEFENSIVE_EXIT`, adapting framework output back into the existing Strategy Decision API response shape.

### Rule Models
Entry, exit, noise, risk, and market gate rules are declared as typed JSON with `code`, `label`, `kind`, `input`, optional `threshold`, and optional `weight`. Evaluators are deterministic and return reasons, blockers, warnings, data gaps, passed entry rules, triggered exit rules, and triggered noise filters.

### Required Data Inputs
The common context can include instrument metadata, latest price, price history, SMA50/SMA200, RSI, 20D return, 52-week high/low, volatility, volume, raw signal, calibrated signal, reliability/noise result, data quality, market gate/regime, sector leadership, country strength, smart-money status, holdings, and backtest assumptions. Missing required inputs are reported as `dataGaps`.

### Signal Integration
Signal Generation remains owner of raw bullish/bearish/neutral signal primitives. New request/query options can attach `strategyMatches` and `blockedStrategies` without changing default behavior:
- `strategyCode`
- `includeStrategyMatches`
- `onlyStrategyEligible`
- `excludeNoiseFiltered`

### Backtesting Integration
Backtesting Strategy Lab owns detailed simulation internals, run history, equity curves, drawdowns, and trade logs. Strategy Framework owns definitions, versions, ratings, readiness labels, and compact performance summaries. Registered strategy backtests use `mode: REGISTERED_STRATEGY`, `strategyCode`, `strategyVersion`, `timeframe`, `region`, `assetType`, and a universe key. Backtesting Lab calls the Strategy Framework evaluator for entry/exit decisions and then syncs the compact summary back to Strategy Framework.

Strategy Framework does not duplicate the detailed backtest experience. Its catalog, detail, rankings, and performance matrix link into Backtesting Lab with URLs such as:

`/backtests?mode=registered&strategyCode=TREND_MOMENTUM&timeframe=3Y`

### Strategy Rating Model
Ratings use CAGR, max drawdown, Sharpe, win rate, profit factor, trade count, sample sufficiency, data coverage, benchmark excess CAGR, average holding period, exposure, and end-of-test exit concentration. Grades are `EXCELLENT`, `GOOD`, `AVERAGE`, `WEAK`, and `UNPROVEN`.

Ratings return:

- `ratingReasons[]`
- `ratingWarnings[]`
- `ratingCapsApplied[]`

Caps:

- too few trades or unavailable CAGR/Sharpe: `UNPROVEN`
- draft strategy: `UNPROVEN`
- poor data coverage: `UNPROVEN`
- partial data coverage: `WEAK`
- high/severe drawdown: `AVERAGE` or `WEAK`
- material benchmark underperformance: `WEAK`
- dominant end-of-test exits: `WEAK`

This keeps optimistic backtests from ranking aggressively when evidence is weak.

### Automation Eligibility
User-facing readiness labels are conservative: `RESEARCH_ONLY`, `WATCHLIST_CANDIDATE`, `PAPER_TEST_CANDIDATE`, and `NOT_AUTOMATION_READY`. The API model exposes `PAPER_TEST_CANDIDATE` instead of paper-trading eligibility wording. Existing stored historical eligibility values are mapped away in API/readiness display and should be cleaned in a future data migration.

### Versioning
Each strategy has a semantic `version`. Performance summaries are unique by strategy code, version, timeframe, region, asset type, and universe key.

### Persistence Model
`StrategyDefinition` stores the registry definition shape. `StrategyPerformanceSummary` stores idempotent summary metrics and rating fields. Its natural key is `strategyCode + strategyVersion + timeframe + region + assetType + universeKey`, so rerunning the same registered strategy/timeframe/region/universe updates the existing summary. Large backtest internals remain in `BacktestRun`.

### API Design
Endpoints under `/api/v1`:
- `GET /strategies`
- `GET /strategies/:code`
- `GET /strategies/:code/performance`
- `POST /strategies/:code/backtest`
- `GET /strategies/rankings`
- `POST /strategies/evaluate`
- `GET /strategies/model`
- `GET /strategies/health`

### Frontend UX
`/strategies` provides tabs for catalog, detail, performance, rankings, and stock evaluation. The performance tab shows a compact 1Y/3Y/5Y/10Y/15Y matrix and links to Backtesting Lab for detailed simulation. Backtests are manual only and run in Backtesting Lab.

### Built-In Strategies
Active: `TREND_MOMENTUM`, `PULLBACK_IN_UPTREND`, `BREAKOUT_CONFIRMATION`, `SMART_MONEY_ACCUMULATION`, `SECTOR_LEADER_MOMENTUM`, `DEFENSIVE_EXIT`, `RISK_OFF_AVOIDANCE`, `LOW_QUALITY_DATA_REJECTION`.

Draft: `QUALITY_TREND`, `MEAN_REVERSION_PULLBACK`.

## Strategy Quality Audit - 2026-05-06

| Strategy | Finding | Severity | Expected behavior | Fix |
| --- | --- | --- | --- | --- |
| `TREND_MOMENTUM` | Exit relied mostly on SMA50/end of test. | HIGH | Trend strategy should have a bounded hold and protective trailing stop. | Added default max holding and trailing-stop risk rules. |
| `PULLBACK_IN_UPTREND` | Pullback failure risk was not explicit. | HIGH | Pullback should fail fast when the setup breaks. | Added default stop-loss approximation and max holding rule. |
| `BREAKOUT_CONFIRMATION` | Failed breakout risk was under-specified. | HIGH | Breakouts need stop-loss, trailing stop, and extension filter. | Added default stop/trailing/max-hold risk rules. |
| `SMART_MONEY_ACCUMULATION` | Current data is price-volume only; external smart-money inputs are unavailable. | MEDIUM | Missing institutional/insider proof should reduce confidence. | Added warning risk rule and conservative stop/max-hold defaults. |
| `SECTOR_LEADER_MOMENTUM` | Sector context can be missing historically. | MEDIUM | Missing sector leadership should produce data gaps. | Existing evaluator reports gaps; rating now penalizes coverage. |
| `DEFENSIVE_EXIT` | Not an entry strategy. | MEDIUM | Should be treated as exit/reduce-risk review only. | Documented; default registered config remains bounded. |
| `RISK_OFF_AVOIDANCE` | Gate strategy can be misread as an entry strategy. | MEDIUM | Should block entries, not rank as proven trade logic. | Evaluator marks gates not eligible for registered backtest. |
| `LOW_QUALITY_DATA_REJECTION` | Filter strategy can look like a trade strategy. | MEDIUM | Should remain a filter and not duplicate DQE scoring. | Uses public Data Quality Engine filter; no repository imports. |
| `QUALITY_TREND` | Fundamentals are partial/free-local. | HIGH | Strategy should not rank as proven. | Remains `DRAFT`; rating caps drafts at `UNPROVEN`. |
| `MEAN_REVERSION_PULLBACK` | Falling-knife handling is not historically proven. | HIGH | Strategy should remain conservative. | Remains `DRAFT`; rating caps drafts at `UNPROVEN`. |

## Default Risk Rules

Registered strategies may declare conservative risk defaults in `parameters` and `riskRules`. Current examples include max holding days, stop-loss percent, and trailing-stop percent. These defaults are not optimized parameters; they are guardrails to make results harder to fool.

### Migration Plan
1. Add Strategy Framework registry, evaluator, persistence, and UI.
2. Keep old Signal Generation, Strategy Decision, and Backtesting APIs working.
3. Let Signal Generation attach framework matches opt-in.
4. Let Backtesting run registered strategies through `strategyCode`.
5. Migrate Strategy Decision Engine to call Strategy Framework for the three overlapping strategies.
6. Move any remaining duplicated thresholds into framework definitions after behavior is verified.

### Known Limitations
- Sector/country context is available where snapshots exist; missing context returns data gaps.
- Backtest registered strategies use historical price-derived context and local data quality proxies, not full historical calibrated signals.
- Benchmark fields are consumed from Backtesting Lab summaries when present; historical persisted rows may not have warning/cap fields until rerun.
- Backtesting Lab is the detailed surface; Strategy Framework intentionally shows only compact summaries and deep links.
- Conservative readiness labels are available now. Historical rows with live-trading placeholder eligibility need a follow-up cleanup if present.
- Signal reliability engine is not a separate active backend module in this repo; noise hooks are declared and ready for a future/public reliability export.
- Fundamentals remain partial/free-local and draft for `QUALITY_TREND`.
- No live trading, broker execution, or order placement exists.

### Verification Commands
- `npx prisma generate`
- `npm.cmd run build` in `backend`
- `npm.cmd test -- strategy-framework --runInBand` in `backend`
- `npm.cmd run build` in `frontend`
