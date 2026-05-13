# PO Roadmap Backlog - 2026-05-13

## Purpose

This backlog prepares the next priority batch while the current Top 5 from `po-test-report-2026-05-13.md` move through architecture, QA, implementation, and acceptance.

The current active batch is still the priority for downstream teams:

1. Trusted Review Universe Readiness And Repair Path
2. Signal Outcome Maturity And Evaluable Coverage
3. Calibration Readiness And Confidence Guardrails
4. Cross-Module Actionability Consistency
5. Trade Plan Paper-Readiness Proof Chain

This document does not change the active board. It records broader next-priority candidates for PO planning and future Orchestrator intake.

## Acceptance Persona And Constraints

- Future PO acceptance persona/account: `codex.po@example.com`.
- Do not record passwords in planning, test evidence, fixtures, screenshots, or handoff notes.
- Product constraint: personal/local usage first.
- Tooling/provider constraint: no paid tools, paid market-data providers, paid AI services, paid hosted testing, paid hosted infrastructure, or broker execution integrations.
- Provider assumption: use existing local data and existing free/local provider paths only unless a future PO brief explicitly approves a bounded free provider experiment based on a measured data gap.
- Investment boundary: research support only. Avoid financial advice, transaction recommendations, broker workflows, order placement, or real-money execution language.
- Default scope unless a future brief says otherwise: `IN / STOCK`.

## Roadmap Direction

The next batch should continue the intelligence-first direction:

- improve trust in upstream data and signals,
- expose evidence quality before showing confidence,
- keep decision workflows consistent across modules,
- turn blocked or partial states into concrete research actions,
- defer monetization, collaboration, mobile polish, and paid integrations.

## Next-Priority Candidate Requirements

### Candidate 1 - Raw Signal Generation Scope, Idempotence, And Model-Version Audit

- Problem statement: Raw signal rows exist, but future quality and calibration work needs stronger proof that generation is scoped, repeatable, bounded, and tied to a model/ruleset version.
- User/investment value: Prevents the user from trusting quality statistics that were produced from mixed scopes, duplicate generations, or untraceable scoring rules.
- Domain assumptions: Signal outcome analysis only has value when each signal can be traced to the same scope, generation date, model version, data-quality state, and scoring inputs.
- Acceptance criteria sketch:
  - Signal Generation shows latest run scope, batch size, generated count, skipped count, duplicate/idempotent count, and failed count.
  - Each generated signal exposes model version, scoring weights/ruleset version, source data date, and data-quality eligibility at generation time.
  - Re-running the same scoped generation does not create duplicate active signals for the same instrument/date/model.
  - Signal Quality can filter or group results by model version without mixing incompatible generations.
  - Batch actions remain bounded and manual.
- Likely lane/module: Lane 2, `signal-generation-engine`; downstream `signal-quality-lab` and `signal-calibration-engine`.
- Dependencies on current Top 5: Depends on Brief 1 for trusted scope, Brief 2 for maturity diagnostics, and Brief 3 for calibration evidence consumption.
- Priority rationale: This is the next upstream integrity step after readiness and evidence usability. If raw generation is not auditable, later accuracy work is weaker.

### Candidate 2 - Instrument-Level Data Coverage Workbench

- Problem statement: The current batch creates a scoped readiness and repair path, but the user still needs an instrument-level workbench to inspect which fields make a specific stock scoreable or excluded.
- User/investment value: Lets the user diagnose whether a stock is excluded for stale prices, inadequate history, liquidity, missing metadata, missing fundamentals, or provider ambiguity.
- Domain assumptions: For personal `IN / STOCK` usage, a smaller trusted universe is acceptable if exclusions are explicit and repairable where possible.
- Acceptance criteria sketch:
  - Data Coverage shows per-instrument price history length, latest price freshness, volume quality, sector/industry availability, fundamentals availability, corporate-action coverage if available, and signal eligibility.
  - The user can filter by scoreable, excluded, stale, missing history, missing metadata, and provider issue.
  - Each excluded instrument shows the primary blocker and the next bounded repair or manual action.
  - Coverage summary reconciles with the scoped readiness summary from the current Top 5.
  - No page load triggers provider-heavy repair automatically.
- Likely lane/module: Lane 1, `market-data-foundation` and `data-quality-engine`.
- Dependencies on current Top 5: Builds on Brief 1 readiness summary and repair taxonomy.
- Priority rationale: This turns universe-level trust into stock-level transparency, which improves all downstream research workflows.

### Candidate 3 - Strategy Proof Registry And Evidence Index

- Problem statement: Trade Plans and Strategy Decision need a clearer source of truth for which strategies are proven, weak, unproven, or unsupported by backtest evidence.
- User/investment value: Prevents plans or candidates from appearing credible when the strategy behind them has weak or missing proof.
- Domain assumptions: Strategy proof must be specific to signal model version, scope, horizon/timeframe, and market context where possible.
- Acceptance criteria sketch:
  - Strategy Framework exposes a registry of strategies with proof status, latest backtest summary, sample size, timeframe, scope, and last evaluation date.
  - Strategies have consistent labels: `PROVEN`, `LIMITED`, `UNPROVEN`, `BLOCKED`, or equivalent Architect-approved names.
  - Strategy Decision and Trade Plans consume the same strategy proof status rather than duplicating rules.
  - Missing backtest evidence produces a clear next action, not silent downgrade.
  - Backtest summaries remain local and deterministic.
- Likely lane/module: Lane 2, `strategy-framework`, `backtesting-strategy-lab`, `strategy-decision-engine`.
- Dependencies on current Top 5: Depends on Brief 5 proof-chain blocker taxonomy and Brief 4 shared actionability labels.
- Priority rationale: This is the strongest bridge between signal evidence and paper-readiness after the current proof-chain work.

### Candidate 4 - Today Review Candidate Explainability And Exclusion Reasons

- Problem statement: Today Review can show candidates or partial states, but the next step is explaining why each stock landed in a bucket or was excluded from review.
- User/investment value: Helps the user trust the daily shortlist and avoid over-focusing on visible candidates while ignoring excluded stocks with repairable blockers.
- Domain assumptions: Ranking without exclusion visibility can create selection bias. The user needs both included and excluded evidence for a research-support workflow.
- Acceptance criteria sketch:
  - Today Review detail shows the ranking components, hard blockers, data-readiness state, signal evidence state, calibration readiness, strategy proof, and trade-plan readiness used for the candidate.
  - Today Review summary includes excluded counts by reason for the scoped universe.
  - Excluded examples are inspectable without promoting them as actionable candidates.
  - Candidate and exclusion language remains research-support only.
  - Today Review snapshots preserve the key evidence state used at run time.
- Likely lane/module: Lane 3 primary `today-trade-review`; dependencies from Lane 1 and Lane 2 modules.
- Dependencies on current Top 5: Depends on all current briefs, especially Brief 1 readiness, Brief 2 evidence usability, Brief 3 calibration readiness, Brief 4 actionability labels, and Brief 5 paper-readiness.
- Priority rationale: Once the current Top 5 produce consistent gates, Today Review should expose those gates at candidate level.

### Candidate 5 - Research Thesis And Evidence Checklist

- Problem statement: The app identifies research candidates, but it does not yet help the user document a thesis, counter-evidence, invalidation, catalyst, and decision reason.
- User/investment value: Turns signal-driven discovery into disciplined investment research and reduces impulsive interpretation of daily scores.
- Domain assumptions: A good research workflow records what evidence would confirm or invalidate an idea before any action is considered.
- Acceptance criteria sketch:
  - A candidate, stock, watchlist item, or portfolio holding can have a local thesis note with bull case, bear case, invalidation, catalyst, evidence checklist, and review status.
  - The checklist can reference current data quality, signal evidence, calibration readiness, strategy proof, and trade-plan readiness.
  - The user can mark a thesis as watch, active research, invalidated, deferred, or archived.
  - No workflow implies execution or advice.
  - Notes are private/local to the authenticated user.
- Likely lane/module: Lane 3, new slice under `research-hub` or `stock-research-workbench` with links from Today Review and Watchlists.
- Dependencies on current Top 5: Best after Brief 4 actionability consistency and Brief 5 proof-chain language are stable.
- Priority rationale: This is a high-value user workflow, but it should follow evidence gate stabilization so notes reference reliable states.

### Candidate 6 - Earnings, Dividends, And Event-Risk Awareness

- Problem statement: Signals and plans do not yet account for upcoming or recent catalysts such as earnings, dividends, splits, and major market events.
- User/investment value: Helps the user distinguish a normal signal from one exposed to event-driven gap risk or post-event reaction.
- Domain assumptions: Event proximity changes risk interpretation. A bullish score before earnings should not be treated the same as a bullish score in a quiet period.
- Acceptance criteria sketch:
  - Event calendar stores or displays available local/free event dates for instruments in scope.
  - Stock, Today Review, Watchlists, Portfolio, and Trade Plans show event proximity warnings where data exists.
  - Event risk is separated from signal quality and calibration evidence.
  - Missing event data is explicitly labeled as unknown, not safe.
  - Any provider addition requires a measured gap and must be free/local or disabled by default.
- Likely lane/module: Lane 1 data source support plus Lane 3 display surfaces; likely `market-data-foundation`, `research-hub`, `today-trade-review`, `watchlists`.
- Dependencies on current Top 5: Depends on Brief 4 actionability wording so event risk does not create contradictory readiness language.
- Priority rationale: High investment value, but only after the current trust and evidence states are stabilized.

### Candidate 7 - Portfolio And Watchlist Overlay For Today Review

- Problem statement: Today Review is scoped to market candidates, but the user also needs to know whether candidates intersect with current holdings and watchlists.
- User/investment value: Makes daily review more useful by separating new opportunities, existing holding review, exit-risk review, and watchlist follow-up.
- Domain assumptions: Holdings and watchlist items should not automatically become actionable; they should add context and prioritization only.
- Acceptance criteria sketch:
  - Today Review labels candidates that are currently held, watchlisted, or neither.
  - Portfolio holdings with deteriorating evidence can appear as review items without becoming transaction instructions.
  - Watchlist items can show current readiness, signal evidence, and next research action.
  - User ownership is respected for portfolio/watchlist overlays.
  - Empty portfolio/watchlist states do not block Today Review.
- Likely lane/module: Lane 3, `today-trade-review`, `portfolio-management`, `watchlist-management`.
- Dependencies on current Top 5: Depends on Brief 4 actionability consistency and Brief 5 paper-readiness consumption.
- Priority rationale: This makes the core daily workflow more personal without adding execution complexity.

### Candidate 8 - Intelligent Alert Templates For Evidence Deterioration

- Problem statement: Existing alerts are useful but not yet tied to evidence degradation such as data trust loss, signal maturity changes, calibration downgrade, strategy proof changes, or paper-readiness blockers.
- User/investment value: Helps the user monitor important changes without manually checking every module.
- Domain assumptions: Alerts should notify research-state changes, not advise transactions.
- Acceptance criteria sketch:
  - Alert templates exist for data readiness downgrade, signal evidence becomes usable/unavailable, calibration influence changes, strategy proof downgrade, trade-plan readiness change, event proximity if available, and portfolio/watchlist evidence deterioration.
  - Alerts include source module, old state, new state, evidence date, and target route.
  - Duplicate suppression prevents noisy repeated alerts.
  - Alerts remain local/in-app or existing local/log notification delivery unless separately approved.
  - Alert creation and evaluation are bounded and user-controlled.
- Likely lane/module: Lane 3, `alerts-monitoring`, `notifications-delivery`, with producers from Lane 1 and Lane 2.
- Dependencies on current Top 5: Depends on stable status labels from Briefs 1 through 5.
- Priority rationale: Valuable after status semantics stabilize; premature before then because alert meaning would churn.

### Candidate 9 - Portfolio Risk And Exposure Analytics

- Problem statement: Portfolio Intelligence shows health and review ranking, but deeper risk exposure, concentration, and stress impact are not yet first-class.
- User/investment value: Helps the user understand what can hurt the portfolio most before adding new ideas from signals or Today Review.
- Domain assumptions: A good candidate can still be unsuitable if it worsens concentration, country/sector exposure, volatility, or drawdown risk.
- Acceptance criteria sketch:
  - Portfolio Risk shows concentration by holding, sector, country, currency, and signal-risk group.
  - Risk contribution and volatility/drawdown proxies are computed from local price history where available.
  - Simple stress scenarios show estimated impact for market, sector, and country shocks.
  - Missing or inadequate data produces limited/unknown labels.
  - Today Review and Trade Plans can display whether a candidate worsens known portfolio exposure, without blocking non-portfolio users.
- Likely lane/module: Lane 3, `portfolio-intelligence`; support from Lane 1 price history and Lane 2 signal/trade-plan states.
- Dependencies on current Top 5: Benefits from Brief 1 data readiness and Brief 4 actionability labels; no hard dependency on calibration beyond optional context.
- Priority rationale: High user value, but it should follow core signal/trade-plan evidence work.

### Candidate 10 - Evidence-Aware Advanced Screener

- Problem statement: A screener built on raw scores can amplify noise if it does not filter by data trust, signal evidence, calibration readiness, strategy proof, and event/risk constraints.
- User/investment value: Lets the user find better candidates using evidence-aware filters rather than chasing high scores alone.
- Domain assumptions: Discovery should rank only what can be measured and should clearly label limited or unproven evidence.
- Acceptance criteria sketch:
  - Screener filters include data readiness, signal evidence usability, calibration influence, strategy proof status, trade-plan readiness, sector, liquidity, volatility proxy, watchlist/holding status, and event risk if available.
  - Saved screens are local/user-owned.
  - Result rows show why each stock matched and which evidence gates are weak or blocked.
  - Default screens avoid untrusted or insufficient-data instruments.
  - No result uses direct buy/sell language.
- Likely lane/module: Lane 3, `signals-dashboard` or new discovery slice; inputs from Lane 1 and Lane 2.
- Dependencies on current Top 5: Depends on all current Top 5 plus Candidates 1 through 4 for best value.
- Priority rationale: Important roadmap item, but it should not precede evidence and explainability hardening.

### Candidate 11 - Advanced Backtesting Diagnostics And Regime Breakdown

- Problem statement: Existing backtesting supports strategy validation, but the user needs better diagnostics by regime, sector, timeframe, model version, and parameter sensitivity.
- User/investment value: Helps identify which strategies work only in specific conditions and prevents overgeneralizing one aggregate result.
- Domain assumptions: Strategy evidence should be segmented. A strategy that works in one regime or sector can fail elsewhere.
- Acceptance criteria sketch:
  - Backtesting result summary includes regime, sector, market-cap/liquidity bucket if available, model version, sample count, win rate, average return, drawdown, and adverse excursion.
  - Strategy comparison can show whether a result is robust, limited, or overfit-risk.
  - Parameter sensitivity can be run with bounded local limits.
  - Results can feed the Strategy Proof Registry.
  - Missing segmentation data is explicit.
- Likely lane/module: Lane 2, `backtesting-strategy-lab` and `strategy-framework`.
- Dependencies on current Top 5: Depends on Brief 2 maturity/evaluable coverage, Brief 3 model/evidence guardrails, and Candidate 3 Strategy Proof Registry.
- Priority rationale: Strong validation value, but best after the Strategy Proof Registry defines how downstream modules consume proof.

### Candidate 12 - Review Run History, Diff, And Decision Audit

- Problem statement: The user can inspect current module states, but there is limited visibility into what changed between review runs and why a candidate moved buckets.
- User/investment value: Helps the user understand whether a new candidate is truly improving, deteriorating, newly eligible, or simply affected by data repair.
- Domain assumptions: Change over time is central to research quality. A daily review needs explainable movement, not only a fresh snapshot.
- Acceptance criteria sketch:
  - Today Review history lists recent runs with mode, trust status, candidate counts, blocker counts, and generated time.
  - Candidate diff shows bucket changes, score changes, blocker changes, calibration/evidence changes, and trade-plan readiness changes between two runs.
  - The user can annotate a run or candidate decision with local notes.
  - Data-repair-driven changes are distinguishable from market/signal changes when possible.
  - History remains bounded and local.
- Likely lane/module: Lane 3, `today-trade-review` and `research-hub`; optional links to thesis notes.
- Dependencies on current Top 5: Depends on current Top 5 snapshot fields, especially Brief 1 readiness snapshot and Brief 4 actionability consistency.
- Priority rationale: Useful for acceptance and user trust after the candidate-level explanation work lands.

## Recommended Next Top 5 After Current Batch

### 1. Raw Signal Generation Scope, Idempotence, And Model-Version Audit

Reasoning: This is the next dependency-first item. Signal Quality and Calibration become more credible only if raw signal generation is auditable, scoped, idempotent, and model-versioned.

### 2. Instrument-Level Data Coverage Workbench

Reasoning: The current readiness repair path should be followed by stock-level coverage transparency. It helps the user understand exclusions and gives Lane 1 a practical next slice without broad provider expansion.

### 3. Strategy Proof Registry And Evidence Index

Reasoning: Trade Plan paper-readiness and cross-module actionability need a stronger shared proof source. This also prepares the ground for advanced backtesting diagnostics.

### 4. Today Review Candidate Explainability And Exclusion Reasons

Reasoning: After the current Top 5 establish consistent gates, the daily review should expose those gates at candidate and excluded-instrument level so the shortlist becomes explainable.

### 5. Research Thesis And Evidence Checklist

Reasoning: Once evidence states are stable and explainable, the next product value is disciplined research capture. This keeps the workflow personal/local and research-support focused without moving into execution.

## Deferred From Next Top 5

- Earnings, Dividends, And Event-Risk Awareness: high value, but it may require source feasibility work and should follow current readiness/actionability stabilization.
- Portfolio And Watchlist Overlay For Today Review: useful personalization, but candidate explainability should come first so overlays inherit stable language.
- Intelligent Alert Templates For Evidence Deterioration: depends on stable state transitions from the current Top 5 and next evidence modules.
- Portfolio Risk And Exposure Analytics: high value, but less urgent than fixing the evidence chain that feeds decisions.
- Evidence-Aware Advanced Screener: should wait until raw signals, proof, and Today Review explainability are stronger.
- Advanced Backtesting Diagnostics And Regime Breakdown: should follow the Strategy Proof Registry.
- Review Run History, Diff, And Decision Audit: useful after explainability and stable snapshot fields are in place.

## PO Handoff Notes

- This backlog is ready for Orchestrator review after the current Top 5 are implemented or far enough along that dependencies are stable.
- Do not move these candidates to active work until the active board is updated by the Orchestrator.
- PO acceptance for future batches should use `codex.po@example.com` and should verify local behavior only.
- No candidate in this backlog authorizes paid providers, paid tools, paid hosted verification, broker execution, or automated trading.
