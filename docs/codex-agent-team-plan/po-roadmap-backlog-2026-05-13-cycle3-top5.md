# PO Roadmap Backlog - 2026-05-13 Cycle 3 Top 5 Proposal

## Scope

Planning-only Product Owner proposal for the next priority batch after Cycle 2 acceptance gates. This document does not authorize implementation. Orchestrator intake, final architecture contracts, QA planning, work packets, WIP clearance, and `Ready for Implementation` are still required before any source edits.

Default product scope remains personal/local `IN / STOCK` research support. No paid libraries, paid data providers, paid AI/services, broker APIs, order placement, live-trading workflows, or financial-advice language are allowed.

## Dependency Context

Cycle 3 should not start implementation until the relevant Cycle 2 source contracts are accepted, checked in, or explicitly split by the Orchestrator:

- C2-WP-01: Trusted Universe Repair Workbench.
- C2-WP-02: Raw Signal Generation Scope And Model-Version Audit.
- C2-WP-03: Strategy Proof Registry And Evidence Index.
- C2-WP-04: Today Review Explainability And Exclusion Reasons.
- C2-WP-05: Research Thesis And Evidence Checklist.

Current Cycle 2 QA state: C2-WP-01 through C2-WP-04 have static QA evidence and are blocked on centralized runtime UI/API evidence. C2-WP-05 remains blocked by the schema slot until C2-WP-02 is validated or explicitly coordinated.

## Top 5 Proposal

### 1. Evidence-Aware Advanced Screener

User workflow: The user opens a screener, selects evidence-first filters, and receives a shortlist of stocks that are actually reviewable instead of merely high-scoring.

User value: Helps a trader/investor discover candidates with trustworthy data, usable signals, sufficient proof, and visible blockers before spending research time.

Domain assumptions:

- A high score is not useful when the data foundation, signal audit, calibration readiness, strategy proof, or trade-plan readiness is weak.
- Personal research workflows need exclusion reasons and evidence status more than broad-market ranking noise.
- Default scope is local `IN / STOCK`.

Acceptance criteria:

- Screener supports filters for data readiness, signal usability, model/ruleset version, strategy proof status, Today Review eligibility, watchlist/holding status, liquidity, sector, and volatility.
- Results display evidence state, missing evidence, last source date, and next research action for every row.
- Results never imply buy/sell/execute advice.
- Screener uses read-only public contracts from source modules and does not duplicate source-module business rules.
- Empty or blocked states explain why no stock qualifies and which evidence gate is limiting the result.

Lane/module guess: Lane 3 user workflow surface with read-only inputs from Market Data, Signal Generation/Quality, Strategy Framework, Today Review, Watchlists, and Trade Plans.

Priority rationale: Highest user value after Cycle 2 because it turns the new evidence contracts into daily discovery capability.

Dependencies: C2-WP-01, C2-WP-02, C2-WP-03, and C2-WP-04 accepted; C2-WP-02 Signal Quality model-version scope clarified.

### 2. Review Run History And Diff

User workflow: The user compares today's review run with previous runs to see newly eligible stocks, dropped stocks, changed blockers, score movement, and data-repair effects.

User value: Makes daily review explainable over time and reduces confusion when a candidate appears, disappears, or changes bucket.

Domain assumptions:

- Traders need movement reasons, not just current-state lists.
- Data repair can change eligibility and should be visible in the historical explanation.
- Historical retention must be bounded and local.

Acceptance criteria:

- Today Review exposes run history with dates, scope, candidate counts, excluded counts, and key blocker counts.
- Diff view identifies newly eligible, newly excluded, improved, deteriorated, and unchanged candidates.
- Candidate diff shows score movement, blocker changes, proof/readiness changes, and data-repair attribution where available.
- Missing snapshots produce limited/unknown states rather than false precision.
- Runtime and storage behavior remains bounded for personal local use.

Lane/module guess: Lane 3, `today-trade-review`; read-only links to Market Data and Strategy Framework evidence.

Priority rationale: High practical value for repeated use because it explains why the daily review changed.

Dependencies: C2-WP-01 and C2-WP-04 accepted; benefits from C2-WP-03.

### 3. Portfolio And Watchlist Evidence Overlay

User workflow: The user views Today Review or a stock detail and immediately sees whether the stock is already held, watchlisted, or new, plus whether evidence is improving or deteriorating.

User value: Personalizes research without adding execution workflows, so the user can prioritize holdings and watched names.

Domain assumptions:

- Personal portfolio/watchlist context changes research priority.
- Evidence deterioration on a held/watchlisted item is more important than a new generic candidate.
- The app must avoid sell/exit/add advice wording.

Acceptance criteria:

- Stocks can be marked as held, watchlisted, or new through existing/local portfolio and watchlist ownership boundaries.
- Today Review and relevant detail pages display membership state and evidence deterioration/improvement context.
- Overlay links to research thesis notes when available.
- Copy remains research-support language only; no buy/sell/exit/add recommendations.
- Unknown portfolio/watchlist state is shown explicitly instead of hidden.

Lane/module guess: Lane 3, `portfolio-management`, `watchlist-management`, `today-trade-review`, later `stock-research-workbench`.

Priority rationale: Strong personal-use value and aligns the scanner with the user's real research universe.

Dependencies: C2-WP-04 accepted; C2-WP-05 accepted for thesis links.

### 4. Research Hub Readiness Wiring

User workflow: The user opens Research Hub and sees a consolidated readiness console for data, signals, calibration, strategy proof, Today Review, trade-plan proof, and thesis state.

User value: Turns Research Hub into the central evidence dashboard rather than a placeholder or disconnected module.

Domain assumptions:

- Cross-module readiness is useful only if each source module remains the source of truth.
- Conservative fallback is better than overconfident aggregation.
- The hub should help the user decide where to inspect next, not issue recommendations.

Acceptance criteria:

- Research Hub reads stable public outputs from Market Data, Signal Quality/Generation, Calibration, Strategy Framework, Today Review, Trade Plans, and Research Thesis where available.
- Each readiness card shows state, source module, last updated time/source date, missing evidence, and next inspect action.
- Unavailable modules show `UNKNOWN` or `NOT_READY` with a clear reason.
- No source module is mutated by the hub.
- No paid service, hosted AI, broker, or advice workflow is introduced.

Lane/module guess: Lane 3, `research-hub` as read-only aggregator.

Priority rationale: Creates a coherent home for the evidence-first architecture after Cycle 2.

Dependencies: C2-WP-01 through C2-WP-04 accepted; C2-WP-05 accepted if thesis state is included.

### 5. Strategy Decision Proof And Calibration Consumption

User workflow: The user reviews strategy decisions and sees whether weak calibration or weak strategy proof downgraded, blocked, or limited a strategy outcome.

User value: Prevents promotion of strategies that look attractive but lack enough calibration confidence or proof evidence.

Domain assumptions:

- Strategy decisions must be explainable through source proof and calibration readiness.
- Promotion should be conservative when evidence is missing, stale, or insufficient.
- A decision engine must show rationale, not silently change ranking semantics.

Acceptance criteria:

- Strategy Decision consumes calibration readiness and Strategy Proof status through public contracts.
- Decisions show downgrade/blocker reasons for missing calibration, weak proof, insufficient sample size, stale source data, or capped confidence.
- Strategy promotion cannot hide missing proof or calibration blockers.
- API/UI copy remains research-support only and does not imply execution readiness.
- Tests cover proven, limited, blocked, missing, stale, and insufficient-sample states.

Lane/module guess: Lane 2, `strategy-decision-engine`; read-only inputs from `signal-calibration-engine` and `strategy-framework`.

Priority rationale: Closes an important quant integrity gap between evidence production and strategy promotion.

Dependencies: C2-WP-02 and C2-WP-03 accepted; calibration readiness contracts must be stable.

## Deferred Candidates

- Instrument-Level Data Coverage Workbench: valuable, but should follow C2-WP-01 acceptance to avoid overlapping repair semantics.
- Local Event-Risk Awareness: useful, but needs free/local data feasibility discovery before commitment.
- Backtest Regime And Robustness Diagnostics: high quant value, but should follow accepted Strategy Proof Registry.
- Evidence Deterioration Alerts: should wait until evidence-state transitions and portfolio/watchlist overlay are stable.
- Portfolio Risk And Exposure Diagnostics: useful after portfolio/watchlist overlay establishes personal context.

## Orchestrator Intake Notes

- Candidate 1 and Candidate 4 are cross-module read-only aggregators; Architect must keep source-of-truth rules strict.
- Candidate 2 may require retention/snapshot decisions and bounded local storage.
- Candidate 3 should be split into membership source APIs first, display overlays second.
- Candidate 5 belongs in Lane 2 and should not mutate calibration or proof source modules.
- No Cycle 3 implementation should start while Cycle 2 runtime QA blockers remain unresolved unless the Orchestrator explicitly creates a non-conflicting discovery-only packet.
