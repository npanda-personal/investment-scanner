# PO Roadmap Backlog - 2026-05-13 Cycle 2

## Planning Constraints

- Personal/local-use app only.
- No paid libraries, paid data providers, paid AI services, paid hosted tooling, broker APIs, order placement, or live-trading workflows.
- Default scope: `IN / STOCK`.
- Prefer bounded, user-triggered jobs over full-universe/provider-heavy automation.
- Prioritize intelligence, accuracy, evidence quality, and research support.

## Broader Candidate Backlog

### Candidate 1 - Trusted Universe Repair Workbench

Build a bounded repair workflow for provider validation, price backfill, stale EOD repair, catalog identity repair, retry status, and repair-result reconciliation against the Market Data readiness summary.

Lane/module guess: Lane 1, `market-data-foundation` and `data-quality-engine`.

### Candidate 2 - Raw Signal Generation Scope And Model-Version Audit

Make raw signal generation scoped, idempotent, and traceable to model/ruleset version, source data date, scoring inputs, and data-quality eligibility.

Lane/module guess: Lane 2, `signal-generation-engine`.

### Candidate 3 - Strategy Proof Registry And Evidence Index

Create a shared strategy proof source of truth with proof status, backtest summary, sample size, timeframe, scope, model version, and latest evaluation date.

Lane/module guess: Lane 2, `strategy-framework` and `backtesting-strategy-lab`.

### Candidate 4 - Today Review Explainability And Exclusion Reasons

Expose why each stock was promoted, watched, blocked, unproven, insufficient-data, or excluded, including readiness, signal, calibration, strategy proof, and trade-plan proof-chain context.

Lane/module guess: Lane 3, `today-trade-review`.

### Candidate 5 - Research Thesis And Evidence Checklist

Add private/local thesis notes with bull case, bear case, invalidation, catalyst, evidence checklist, status, and links to current data/signal/proof readiness.

Lane/module guess: Lane 3, `stock-research-workbench` or a narrow `research-hub` slice.

### Candidate 6 - Instrument-Level Data Coverage Workbench

Show per-stock price history length, latest freshness, volume quality, sector/industry availability, fundamentals availability, corporate-action availability, and signal eligibility.

Lane/module guess: Lane 1, `market-data-foundation` and `data-quality-engine`.

### Candidate 7 - Research Hub Readiness Wiring

Wire Research Hub actionability to stable public outputs from Market Data readiness, Signal Quality maturity, Calibration readiness, Today Review state, and Trade Plan proof chain.

Lane/module guess: Lane 3, `research-hub`.

### Candidate 8 - Strategy Decision Calibration And Proof Consumption

Make Strategy Decision consume calibration readiness and strategy proof status without promoting candidates when calibration evidence is unavailable or proof is weak.

Lane/module guess: Lane 2, `strategy-decision-engine`.

### Candidate 9 - Review Run History And Diff

Show what changed between Today Review runs: bucket changes, score changes, blocker changes, data-repair-driven changes, and readiness/proof changes.

Lane/module guess: Lane 3, `today-trade-review` plus optional `research-hub`.

### Candidate 10 - Evidence-Aware Advanced Screener

Create screens that filter by data readiness, signal evidence usability, calibration influence, strategy proof, trade-plan readiness, sector, liquidity, volatility, and watchlist/holding status.

Lane/module guess: Lane 3, discovery or signals dashboard slice.

### Candidate 11 - Event-Risk Awareness

Add local/free event awareness for earnings, dividends, splits, and major date risks where available, clearly labeling missing data as unknown.

Lane/module guess: Lane 1 data support plus Lane 3 display surfaces.

### Candidate 12 - Portfolio And Watchlist Overlay For Review

Label Today Review candidates as held, watchlisted, or new, and surface evidence deterioration for holdings/watchlist items without implying transaction advice.

Lane/module guess: Lane 3, `today-trade-review`, `portfolio-management`, `watchlist-management`.

## Recommended Next Top 5

### 1. Trusted Universe Repair Workbench

Workflow: User opens Market Data/Data Quality after seeing `NO_REVIEW`, reviews blocker counts, runs only the next bounded repair action, tracks repair progress, and sees readiness reconcile back to Today Review.

User value: Converts the current empty daily-review state into a repairable workflow without requiring broad provider expansion.

Market/quant/domain assumptions: A smaller trusted `IN / STOCK` universe is acceptable if provider support, current EOD data, sufficient history, and catalog identity are proven. Repair should improve review eligibility, not silently expand scope.

Acceptance criteria:
- Show repair lanes for `PROVIDER_VALIDATION`, `PRICE_BACKFILL`, `STALE_EOD`, `CATALOG_IDENTITY`, and `INSUFFICIENT_TRUSTED_UNIVERSE`.
- Each action displays affected count, bounded batch size, expected effect, last run, success count, failure count, skipped count, and retryable failures.
- Running a repair requires explicit user action and keeps scope `IN / STOCK`.
- Readiness summary refreshes after repair and explains what blocker remains next.
- Today Review remains `NO_REVIEW` until readiness thresholds are met.

Lane/module guess: Lane 1, `market-data-foundation` and `data-quality-engine`.

Dependencies: Builds on released WP-01 readiness summary and repair-plan contracts.

Risk: Provider/free-source behavior can be slow or inconsistent; keep this bounded, resumable, and transparent.

Priority rationale: Live state is blocked at `trustedCount=0`; this is the fastest path to unlocking the core daily review workflow.

Parallelization note: Reserve only Market Data/Data Quality surfaces; avoid Today Review edits except read-only verification.

### 2. Raw Signal Generation Scope And Model-Version Audit

Workflow: User runs or inspects signal generation and can verify which scope, model version, data date, scoring rules, and duplicate/idempotent behavior produced the raw signals.

User value: Prevents quality and calibration results from mixing incompatible signal generations or untraceable scoring rules.

Market/quant/domain assumptions: Outcome analysis is valid only when signals can be traced to a stable model version, horizon, source data date, and data eligibility state.

Acceptance criteria:
- Signal Generation shows latest run scope, model/ruleset version, batch size, generated, skipped, duplicate/idempotent, failed, and duration counts.
- Each signal records or exposes model version, source data date, scoring input summary, and data-quality eligibility at generation time.
- Re-running the same scoped generation does not create duplicate active signals for the same instrument/date/model.
- Signal Quality can filter or group by model version without mixing generations.
- Batch generation remains bounded and manual.

Lane/module guess: Lane 2, `signal-generation-engine`; downstream read-only coordination with `signal-quality-lab`.

Dependencies: Uses released Signal Quality maturity diagnostics from WP-02.

Risk: Schema or migration work may be needed; Architect should decide whether the first slice is response-derived or persisted.

Priority rationale: Signal accuracy work is weak unless raw signals are auditable and reproducible.

Parallelization note: Does not need Market Data repair files or Today Review files.

### 3. Strategy Proof Registry And Evidence Index

Workflow: User reviews a strategy registry to see which strategies are proven, limited, unproven, blocked, or missing evidence before trusting Trade Plans or Strategy Decision candidates.

User value: Explains the current live blocker where all `22` generated plans are prevented from paper readiness by weak or unproven strategy proof.

Market/quant/domain assumptions: Strategy proof must be scoped by market, asset type, model version, backtest timeframe, sample count, and regime/sector breakdown where available.

Acceptance criteria:
- Strategy Framework exposes proof status: `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, or Architect-approved equivalents.
- Registry rows include strategy code/version, scope, selected backtest timeframe, sample size, win/loss and drawdown summary, last evaluation date, and missing evidence reason.
- Trade Plan proof chain and Strategy Decision consume the same proof status contract where practical.
- Missing proof produces a next action to run or inspect a bounded local backtest.
- No workflow implies buy/sell advice or live readiness.

Lane/module guess: Lane 2, `strategy-framework` and `backtesting-strategy-lab`; later consumers in `trade-plan-risk-engine` and `strategy-decision-engine`.

Dependencies: Builds on released WP-05A proof-chain blocker categories.

Risk: Backtest results can be overfit or sparse; the registry must show sample sufficiency and limitations.

Priority rationale: Strategy proof is the largest current Trade Plan blocker and a prerequisite for better downstream confidence.

Parallelization note: Reserve Strategy Framework/Backtesting first; avoid Trade Plan edits until contract is accepted.

### 4. Today Review Explainability And Exclusion Reasons

Workflow: User opens Today Review and sees why each stock is promoted, watched, blocked, unproven, insufficient-data, or excluded from the trusted universe.

User value: Reduces selection bias and turns the daily shortlist into an auditable research workflow rather than a black-box ranking.

Market/quant/domain assumptions: Ranking only visible candidates can mislead. Exclusion reasons are as important as promotion reasons for disciplined research.

Acceptance criteria:
- Today Review summary shows excluded counts by readiness, data, signal maturity, calibration, strategy proof, trade-plan proof-chain, and outside-scope reasons.
- Candidate detail shows ranking components, hard blockers, readiness state, signal evidence, calibration readiness, strategy proof, and trade-plan paper-readiness state.
- Excluded examples are inspectable but not promoted as actionable candidates.
- Today Review consumes public Trade Plan proof-chain and Calibration readiness outputs without optimistic fallback.
- Language remains research-support only.

Lane/module guess: Lane 3, `today-trade-review`.

Dependencies: Released WP-01, WP-03A, and WP-05A source contracts; best after Candidate 1 begins unlocking trusted instruments.

Risk: Cross-module reads can create coupling; keep first slice additive and read-only against source modules.

Priority rationale: Once repair starts to unlock candidates, the user needs explanation before any shortlist is useful.

Parallelization note: Reserve Today Review only; consume existing APIs rather than editing source modules.

### 5. Research Thesis And Evidence Checklist

Workflow: User starts a thesis from a stock, watchlist item, Today Review candidate, or Research Hub page and records thesis, counter-evidence, invalidation, catalyst, checklist state, and review status.

User value: Converts signal discovery into disciplined personal research and reduces impulsive interpretation of scores.

Market/quant/domain assumptions: A research idea is higher quality when invalidation, counter-evidence, and evidence sufficiency are written before any action is considered.

Acceptance criteria:
- Thesis note supports bull case, bear case, invalidation, catalyst, evidence checklist, status, and review date.
- Checklist can reference data readiness, Signal Quality usability, Calibration readiness, Strategy Proof, Today Review bucket, and Trade Plan paper-readiness.
- Status values include `WATCH`, `ACTIVE_RESEARCH`, `INVALIDATED`, `DEFERRED`, and `ARCHIVED`.
- Notes are private/local to the authenticated user.
- No execution, advice, or recommendation language is introduced.

Lane/module guess: Lane 3, `stock-research-workbench` first; optional links from `research-hub` and Today Review later.

Dependencies: Benefits from released actionability/proof language; no hard dependency on repair completion.

Risk: Scope creep into a generic notes system; keep it evidence-checklist first.

Priority rationale: This adds direct investor workflow value while upstream repair and proof work proceed in parallel.

Parallelization note: Reserve Stock Research Workbench or a new narrow research-thesis module; avoid Research Hub if Candidate 7 starts separately.

## Deferred But Valuable

- Instrument-Level Data Coverage Workbench: strong follow-up to Candidate 1, but it overlaps Lane 1 write scope if done in the same cycle.
- Research Hub Readiness Wiring: valuable after Today Review and Strategy Proof outputs stabilize.
- Strategy Decision Calibration And Proof Consumption: important, but should follow the proof registry contract.
- Review Run History And Diff: best after Today Review explainability stabilizes.
- Evidence-Aware Advanced Screener: should wait until repair, signal audit, proof, and explainability are stronger.
- Event-Risk Awareness: high investment value, but source feasibility should be discovered before implementation.
- Portfolio And Watchlist Overlay For Review: useful personalization after Today Review can explain candidates and exclusions.

## Orchestrator Intake Notes

- Recommended parallel first wave:
  - Lane 1: Trusted Universe Repair Workbench.
  - Lane 2A: Raw Signal Generation Audit.
  - Lane 2B: Strategy Proof Registry, if file reservations avoid Signal Generation.
  - Lane 3A: Today Review Explainability, using read-only source contracts.
  - Lane 3B: Research Thesis Checklist, preferably in Stock Research Workbench to avoid Today Review conflicts.
- Do not start provider-heavy or full-universe jobs as part of acceptance unless the work packet explicitly defines a bounded local run.
- PO acceptance should verify live local `IN / STOCK` behavior and confirm no paid/provider/broker scope was introduced.
