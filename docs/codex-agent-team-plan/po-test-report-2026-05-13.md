# PO Application Test Report - 2026-05-13

## Purpose

Product Owner tested the local application before creating the first Top 5 requirements. The test focused on the current roadmap priority: intelligence accuracy, data trust, signal evidence, and research-support usefulness for personal `IN / STOCK` usage.

## Runtime Evidence

- Branch: `dev`.
- Active board before PO pass: empty Top 5 batch.
- Local infrastructure: PostgreSQL and Redis running; pgAdmin restarted but was not required for testing.
- Backend: existing local server reachable at `http://localhost:3000`; `/health` returned `{"status":"ok"}`.
- Frontend: existing local Vite server reachable at `http://127.0.0.1:5173`.
- Database: `npx prisma db push --skip-generate` succeeded.
- Prisma generate note: direct generate was blocked by a locked local query-engine DLL, likely from an existing Node process; schema push did not require regeneration.
- Auth baseline: login, logout, protected-route redirect, and dashboard load passed for `codex.test@example.com`.
- Frontend build: `npm run build` passed with only the existing Vite chunk-size warning.
- Focused UI smoke: 29 tests passed across Today Review, Market Data Foundation, Data Quality, Raw Signals, Signal Quality, Signal Calibration, Strategy Decision, Trade Plans, and Research Hub.
- Focused backend tests: 23 suites / 288 tests passed for Today Trade Review, Market Data Foundation, Data Quality Engine, Signal Quality Lab, Signal Calibration Engine, and Trade Plan Risk Engine.

## PO Findings

- Today Review loads and explains the research-support purpose, but the live run is `PARTIAL` with `PARTIAL` trust and no actionable shortlist counts in the top buckets.
- Market Data Foundation and Data Quality expose strong operational surfaces, but the product still needs a clear "what must be repaired next" path from universe trust to Today Review readiness.
- Raw Signals show many records, but Signal Quality reports that 5000 signals were found and 0 were evaluable for the selected 20D horizon.
- Signal Calibration correctly warns that calibration is limited because 0 signals have enough future price data, but the app needs explicit guardrails for when calibrated scores should not influence decisions.
- Research Hub says the market environment is healthy and high-quality setups are allowed, while Today Review is partial and Trade Plans have no paper-ready plans. This creates an actionability consistency risk.
- Trade Plans clearly states that no plans are paper-ready, but the proof chain from data quality, strategy proof, backtest evidence, and risk geometry needs to become a prioritized remediation workflow.
- Portfolio, Watchlists, and Alerts load cleanly, but they are secondary for the current intelligence-first phase unless linked to research readiness and review workflows.

## Top 5 Product Briefs

### Brief 1 - Trusted Review Universe Readiness And Repair Path

- Priority: 1.
- Target lane/module guess: Lane 1, `market-data-foundation` and `data-quality-engine`.
- User workflow: Before using Today Review, the user needs to know whether the scoped review universe is trustworthy and exactly what action repairs the next blocker.
- User value: Prevents research decisions from being based on incomplete or stale universe data.
- Domain assumptions: For `IN / STOCK`, catalog size is not the same as reviewable universe size. A smaller trusted universe is acceptable if it is explicitly provider-supported, price-ready, scoped, and current enough for review.
- Evidence: Today Review run was partial; Market Data and Data Quality expose readiness surfaces but PO needs a direct repair path tied to Today Review release readiness.
- Acceptance criteria:
  - Market Data/Data Quality exposes a single scoped readiness summary for `IN / STOCK` that explains whether Today Review can run as `FULL_REVIEW`, `LIMITED_REVIEW`, or `NO_REVIEW`.
  - The summary shows the top blocker categories, affected counts, and the next safest repair action.
  - Repair actions are bounded and do not trigger full-universe/provider-heavy jobs without explicit user action.
  - Today Review can consume or display the same readiness state without contradicting Market Data/Data Quality.
  - Empty or partial states explain whether the user should wait, repair data, or proceed with limited review.
- Out of scope: Paid data providers, broker execution, automated trading, and full scheduler automation.

### Brief 2 - Signal Outcome Maturity And Evaluable Coverage

- Priority: 2.
- Target lane/module guess: Lane 2, `signal-quality-lab` with dependencies on `signal-generation-engine` and price history from `market-data-foundation`.
- User workflow: The user needs to know whether historical signals have matured enough to measure forward outcomes before trusting signal quality statistics.
- User value: Prevents false confidence from signal quality dashboards when the selected horizon has no evaluable sample.
- Domain assumptions: A signal cannot be judged at a 20D horizon until future trading-day data exists. Shorter horizons may be useful if clearly separated from longer-horizon evidence.
- Evidence: Signal Quality reported 5000 signals found and 0 evaluable at the selected 20D horizon.
- Acceptance criteria:
  - Signal Quality shows total signals, mature/evaluable signals, not-yet-mature signals, missing-price signals, and selected horizon.
  - When evaluable count is zero, the page explains why and recommends the next valid action.
  - The user can compare available horizons without mixing immature and mature samples.
  - Recalculation requests remain scoped and bounded.
  - Downstream modules can tell whether signal-quality evidence is usable, limited, or unavailable.
- Out of scope: Machine learning models, paid AI, and external analytics services.

### Brief 3 - Calibration Readiness And Confidence Guardrails

- Priority: 3.
- Target lane/module guess: Lane 2, `signal-calibration-engine`.
- User workflow: The user needs calibrated signal scores only when enough historical outcome evidence exists; otherwise, the app should suppress or label calibration influence.
- User value: Prevents calibrated scores from appearing more reliable than the data supports.
- Domain assumptions: Calibration without enough outcome samples should be treated as limited evidence, not as an improved prediction.
- Evidence: Signal Calibration warned that 0 signals had enough future price data and scores were not aggressively adjusted.
- Acceptance criteria:
  - Calibration displays sample sufficiency, selected horizon, usable sample count, and confidence tier.
  - When sample sufficiency is too low, calibrated outputs are clearly labeled as limited and downstream decision influence is suppressed or downgraded.
  - The UI explains whether raw signal score, calibrated score, or no score should be treated as authoritative.
  - Batch calibration remains scoped and bounded.
  - Strategy Decision and Today Review can consume calibration readiness without overstating confidence.
- Out of scope: New paid model providers, black-box scoring, and direct buy/sell recommendations.

### Brief 4 - Cross-Module Actionability Consistency

- Priority: 4.
- Target lane/module guess: Lane 3 with cross-module contracts across `research-hub`, `today-trade-review`, `strategy-decision-engine`, and `trade-plan-risk-engine`.
- User workflow: The user needs one consistent answer to "Can I review actionable setups now?" across Research Hub, Today Review, Strategy Decision, and Trade Plans.
- User value: Avoids contradictory research guidance that could cause the user to overtrust a partial or unproven state.
- Domain assumptions: "Market healthy" is not the same as "actionable trade plans are ready." Data trust, strategy proof, calibration readiness, and paper-readiness must all influence actionability.
- Evidence: Research Hub displayed healthy/high-quality setup language while Today Review was partial and Trade Plans had no paper-ready plans.
- Acceptance criteria:
  - A shared actionability state distinguishes market environment, data readiness, signal evidence, strategy proof, and trade-plan readiness.
  - Research Hub does not say actionable setups are allowed when Today Review or Trade Plans are blocked by upstream trust/proof gates.
  - Today Review, Research Hub, Strategy Decision, and Trade Plans use consistent labels for `Ready`, `Limited`, `Blocked`, `Unproven`, and `Insufficient Data`.
  - The user sees the next best research action when actionability is limited or blocked.
  - Language remains research-support only and avoids transaction recommendations.
- Out of scope: Broker integration, order workflow, and financial advice language.

### Brief 5 - Trade Plan Paper-Readiness Proof Chain

- Priority: 5.
- Target lane/module guess: Lane 2, `trade-plan-risk-engine` with dependencies on `strategy-decision-engine`, `backtesting-strategy-lab`, and `data-quality-engine`.
- User workflow: The user needs to understand why no trade plan is paper-ready and what evidence would make a plan eligible for paper review.
- User value: Turns a dead-end "no plans ready" state into an evidence-based improvement path.
- Domain assumptions: A paper-ready plan should require adequate data quality, strategy proof, risk geometry, invalidation/target clarity, and acceptable blocker status.
- Evidence: Trade Plans reported no paper-ready plans and cited weak strategy proof, high risk grade, missing backtest summary, or insufficient data.
- Acceptance criteria:
  - Trade Plans shows a prioritized blocker funnel with counts by data, strategy proof, backtest, risk geometry, and scope.
  - Each blocker category links or points to the module/action that can resolve it.
  - Detail pages explain canonical hard blockers and do not show positive readiness reasons beside active hard blockers.
  - Batch generation remains bounded and scoped.
  - Today Review can use paper-readiness status without treating blocked plans as actionable candidates.
- Out of scope: Real-money execution, broker APIs, and automated trade placement.

## PO Handoff

- Current mode: Product Planning Mode complete for Top 5.
- Next mode: Orchestrator Intake Mode.
- Orchestrator action: verify the briefs, update active board state as needed, and move complete items to `Ready for Architecture`.
- QA action: start early verification planning from these briefs while Architect prepares contracts.
