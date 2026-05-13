# PO Roadmap Backlog - 2026-05-13 Cycle 3 Discovery

## Scope

Planning-only backlog beyond the Cycle 2 proposed Top 5. This does not authorize Orchestrator intake, active-board updates, source edits, paid providers, paid AI/services, broker integration, order placement, or live trading.

Default product scope remains personal/local `IN / STOCK` research support.

Cycle 2 dependency shorthand:

- C2-1: Trusted Universe Repair Workbench
- C2-2: Raw Signal Generation Scope And Model-Version Audit
- C2-3: Strategy Proof Registry And Evidence Index
- C2-4: Today Review Explainability And Exclusion Reasons
- C2-5: Research Thesis And Evidence Checklist

## Cycle 3 Candidate Backlog

### Candidate 1 - Evidence-Aware Advanced Screener

User value: Lets the user discover stocks using evidence gates, not raw score chasing.

Scope: Local saved screens for `IN / STOCK` with filters for data readiness, signal usability, calibration influence, strategy proof, trade-plan readiness, liquidity, sector, volatility, watchlist, and holding status.

Dependencies: C2-1, C2-2, C2-3, C2-4 stable.

Lane/module guess: Lane 3 discovery surface, with read-only inputs from Market Data, Signal Quality, Strategy Framework, Today Review, and Trade Plans.

Risk: If built before evidence contracts stabilize, the screener will amplify weak or inconsistent states.

### Candidate 2 - Review Run History And Diff

User value: Shows whether candidates improved, deteriorated, became newly eligible, or moved because of data repair.

Scope: Today Review run history, candidate bucket diff, score changes, blocker changes, readiness/proof changes, and data-repair attribution where possible.

Dependencies: C2-1 and C2-4 stable; benefits from C2-3.

Lane/module guess: Lane 3, `today-trade-review`.

Risk: Needs bounded retention and clear handling of incomplete historical snapshots.

### Candidate 3 - Portfolio And Watchlist Evidence Overlay

User value: Connects daily research to personal holdings and watchlists without implying trade action.

Scope: Mark candidates as held, watchlisted, or new; show evidence deterioration for holdings/watchlist items; route to thesis notes where available.

Dependencies: C2-4 and C2-5 stable.

Lane/module guess: Lane 3, `today-trade-review`, `portfolio-management`, `watchlist-management`.

Risk: Must avoid buy/sell/exit advice language.

### Candidate 4 - Research Hub Readiness Wiring

User value: Turns Research Hub from conservative placeholder into a useful cross-module readiness console.

Scope: Wire stable public outputs for data readiness, Signal Quality usability, Calibration readiness, Today Review readiness, Strategy Proof, and Trade Plan paper-readiness.

Dependencies: C2-1, C2-2, C2-3, C2-4 stable.

Lane/module guess: Lane 3, `research-hub`.

Risk: Cross-module coupling; use read-only contracts and conservative fallback.

### Candidate 5 - Strategy Decision Proof And Calibration Consumption

User value: Prevents strategy candidates from being promoted when calibration is unavailable or strategy proof is weak.

Scope: Strategy Decision consumes calibration readiness and strategy proof status, with explicit downgrade/blocker reasons.

Dependencies: C2-2 and C2-3 stable; benefits from C2-4.

Lane/module guess: Lane 2, `strategy-decision-engine`.

Risk: Must not silently change decision semantics without visible rationale.

### Candidate 6 - Instrument-Level Data Coverage Workbench

User value: Lets the user diagnose a specific stock's scoreability and repair blockers.

Scope: Per-instrument coverage for price history, latest freshness, volume, metadata, fundamentals, corporate actions, signal eligibility, and repair route.

Dependencies: C2-1 stable.

Lane/module guess: Lane 1, `market-data-foundation`, `data-quality-engine`.

Risk: Could overlap with repair work; should follow the repair workflow rather than compete with it.

### Candidate 7 - Local Event-Risk Awareness

User value: Flags earnings, dividends, splits, and other known event dates so signal/trade-plan interpretation reflects gap risk.

Scope: Local/free event fields where available; unknown event data labeled unknown; event-risk display in stock view, Today Review, and Trade Plans.

Dependencies: C2-1 and C2-4 stable.

Lane/module guess: Lane 1 event data support, Lane 3 display surfaces.

Risk: Free event data may be sparse; avoid broad provider expansion.

### Candidate 8 - Backtest Regime And Robustness Diagnostics

User value: Shows whether a strategy works broadly or only in narrow regimes/sectors/timeframes.

Scope: Regime, sector, liquidity, timeframe, model-version, sample-size, drawdown, and parameter-sensitivity breakdowns.

Dependencies: C2-2 and C2-3 stable.

Lane/module guess: Lane 2, `backtesting-strategy-lab`, `strategy-framework`.

Risk: Overfit risk; defaults must emphasize sample sufficiency and robustness limits.

### Candidate 9 - Evidence Deterioration Alerts

User value: Notifies the user when a watched/held/researched stock loses data readiness, signal usability, calibration confidence, strategy proof, or paper-readiness.

Scope: Local in-app alert templates and deduped notifications for evidence-state changes only.

Dependencies: C2-3, C2-4, C2-5 stable; benefits from Candidate 3.

Lane/module guess: Lane 3, `alerts-monitoring`, `notifications-delivery`.

Risk: Alert noise; require dedupe and user-controlled templates.

### Candidate 10 - Portfolio Risk And Exposure Diagnostics

User value: Helps the user understand concentration, sector exposure, volatility, and drawdown sensitivity before adding more research ideas.

Scope: Exposure by holding, sector, country/currency, liquidity, signal-risk group, and simple local stress scenarios.

Dependencies: C2-1 for data quality; Candidate 3 for portfolio/watchlist overlays.

Lane/module guess: Lane 3, `portfolio-intelligence`.

Risk: Missing data must produce limited/unknown states, not false precision.

## Future Top 5 Proposal After Cycle 2 Stabilizes

Do not intake these until the listed Cycle 2 dependencies are accepted and released.

1. Evidence-Aware Advanced Screener
   - Depends on C2-1, C2-2, C2-3, C2-4.
   - Rationale: highest discovery value once evidence gates are stable.

2. Review Run History And Diff
   - Depends on C2-1 and C2-4.
   - Rationale: makes daily review movement explainable over time.

3. Portfolio And Watchlist Evidence Overlay
   - Depends on C2-4 and C2-5.
   - Rationale: personalizes research without execution workflows.

4. Research Hub Readiness Wiring
   - Depends on C2-1 through C2-4.
   - Rationale: consolidates readiness after source contracts are reliable.

5. Strategy Decision Proof And Calibration Consumption
   - Depends on C2-2 and C2-3.
   - Rationale: closes a key downstream gap between proof/calibration and candidate promotion.

## Deferred From Future Top 5

- Instrument-Level Data Coverage Workbench: valuable, but likely follows or merges with C2-1 repair work.
- Local Event-Risk Awareness: high value, but needs free/local source feasibility discovery.
- Backtest Regime And Robustness Diagnostics: strong quant value, but should follow the Strategy Proof Registry.
- Evidence Deterioration Alerts: should wait until evidence-state transitions are stable.
- Portfolio Risk And Exposure Diagnostics: useful after portfolio/watchlist overlay establishes context.
