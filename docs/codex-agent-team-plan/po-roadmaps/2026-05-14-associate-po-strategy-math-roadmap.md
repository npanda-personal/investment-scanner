# Associate PO Roadmap - Strategy Math, Signals, Backtesting, Entry/Exit

## Scope
Replace fixed 1:2 reward/risk stop-loss-target behavior with strategy-derived entry and exit math across buy, sell/exit, short entry, and short exit flows.

## Current Capability
- `strategy-framework` is the shared strategy source, but active registered strategies are almost entirely long-entry strategies plus one `DEFENSIVE_EXIT` review strategy. There is no first-class short-entry strategy family yet.
- `signal-generation-engine` produces raw bullish/neutral/bearish signals and optional strategy matches. It provides confirmation context, not executable entry/exit geometry.
- `signal-quality-lab` measures forward signal outcomes by horizon. It does not measure trade-plan outcomes such as stop-hit rate, target-hit rate, MFE/MAE by strategy side, or exit-method quality.
- `signal-calibration-engine` adjusts raw signal confidence from historical evidence, but it does not own entry, stop, target, or cover math.
- `strategy-decision-engine` can produce long-entry and exit-risk decisions, but its public decision taxonomy is not yet a complete long/short lifecycle contract.
- `trade-plan-risk-engine` currently generates long-entry plans only. It hardcodes target math from reward/risk multiple and documents the default target as 2R. Exit and risk-reduction decisions are explicitly excluded from long-entry plan generation.
- `today-trade-review` has a separate Lite short-review path with short geometry, but that path is OHLCV-only research support and is not the shared strategy/trade-plan/backtest engine.
- `backtesting-strategy-lab` supports long-only entry/exit simulation with percent stop, trailing stop, take profit, and fixed holding rules. Registered backtests accept active `ENTRY` strategies only; no short-position simulation exists.

## Product Gaps
- No canonical domain contract for `LONG_ENTRY`, `LONG_EXIT`, `SHORT_ENTRY`, and `SHORT_EXIT`.
- Target math is not strategy-owned; the current trade-plan engine falls back to modeled reward/risk targets instead of deriving exits from strategy structure.
- Exit logic is fragmented across Strategy Framework, Strategy Decision, Trade Plan, Today Review Lite, and Backtesting.
- Short capability is inconsistent: present in Today Review Lite, absent in Strategy Framework registry, Trade Plan generation, and Backtesting.
- Signal quality and calibration are side-agnostic; they do not validate whether a strategy's stop/target/exit math is historically effective.
- Registered backtests cannot prove exit-only strategies or short-entry strategies, so strategy ratings are biased toward long-entry semantics.

## Required Strategy Engine Changes
1. Add a shared position-intent contract across Strategy Framework, Strategy Decision, Trade Plan, Today Review, and Backtesting:
   - `LONG_ENTRY`
   - `LONG_EXIT`
   - `SHORT_ENTRY`
   - `SHORT_EXIT`
2. Extend `StrategyDefinition` so each strategy owns:
   - side and lifecycle intent
   - entry trigger model
   - invalidation/stop model
   - target/cover model
   - forced-exit rules
   - backtest eligibility by side
3. Replace fixed target defaults in `trade-plan-risk-engine` with strategy-derived geometry:
   - structural stops from price context or strategy parameters
   - structural targets/cover zones from strategy parameters or measured exit logic
   - fallback math allowed only as explicit low-trust fallback, never silent default proof
4. Upgrade `strategy-decision-engine` output so review candidates and actions map cleanly to the full lifecycle, not only long entry plus defensive exit.
5. Add first-class short strategies in `strategy-framework`, with strategy-owned rules and proof semantics instead of Today Review Lite-only short setups.
6. Upgrade `backtesting-strategy-lab` to simulate both long and short positions, including:
   - short entry
   - short cover
   - side-aware P&L, stop, target, slippage, and exit reasons
   - registered strategy simulation for short-entry strategies
7. Extend `signal-quality-lab` to publish strategy-math evidence:
   - stop-hit rate
   - target-hit rate
   - average bars to stop/target/exit
   - MFE/MAE by strategy and side
   - exit-method performance by strategy
8. Keep `signal-calibration-engine` downstream of this work. Calibration should only influence side-specific strategy math after side-specific quality evidence exists.

## Acceptance Criteria
- No promoted strategy-backed trade plan uses a hidden default "2R by default" target when the strategy can provide explicit exit math.
- The system can represent and explain all four actions: buy/open long, sell/exit long, short/open short, buy-to-cover/exit short.
- Strategy Framework exposes at least one registered, testable short-entry strategy and one explicit exit/lifecycle strategy contract.
- Trade Plan can generate valid long-entry, long-exit, short-entry, and short-exit review plans from shared strategy contracts.
- Backtesting can run registered long and short strategies and report side-aware exit diagnostics.
- Signal quality exposes side-aware outcome evidence for strategy math, not only raw signal forward returns.
- Today Review consumes the shared strategy/trade-plan semantics for promoted short review candidates instead of relying on a separate Lite-only short path for core product proof.

## Dependencies
- `market-data-foundation`: reliable OHLCV history, latest price freshness, and enough history for side-aware stop/target testing
- `strategy-framework`: strategy registry/schema changes and backtest-config export changes
- `strategy-decision-engine`: lifecycle action taxonomy and proof-safe persistence
- `trade-plan-risk-engine`: side-aware geometry generation and persistence migration
- `backtesting-strategy-lab`: short-position engine, side-aware metrics, and registered-strategy eligibility changes
- `signal-quality-lab`: new strategy outcome metrics
- `today-trade-review`: shared consumption of short and exit plan outputs
- `portfolio-management` or future holdings context for true exit/cover semantics on owned positions

## Risks
- Shorting is market- and instrument-dependent; product semantics must distinguish "short thesis exists" from "short is actually tradable here."
- Exit strategies depend on holdings or position context; instrument-only evaluation can overstate exit certainty.
- Historical context coverage is weaker for some upstream modules than for plain price history, so strategy math must degrade explicitly when proof inputs are missing.
- Migration risk is high for persisted trade plans, strategy decisions, and backtest summaries because current rows encode long-only assumptions.
- Mixing research-support language with execution-style long/short lifecycle language can create UX ambiguity if taxonomy is not unified first.

## Priority Order
1. Canonical lifecycle contract and Strategy Framework schema changes
2. Trade Plan replacement of fixed 2R target math with strategy-owned entry/exit geometry
3. Backtesting support for short positions and side-aware registered strategies
4. Signal Quality side-aware strategy outcome evidence
5. Strategy Decision and Today Review adoption of unified long/exit/short semantics
6. Calibration updates after strategy-math evidence is available
