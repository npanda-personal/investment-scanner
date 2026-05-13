# Lead PO Roadmap - Strategy-Led Market Decision And Broker Automation

Date: 2026-05-14  
Lead PO mode: Product Planning Mode  
Scope: personal-use `IN / STOCK` first, free/local-first, no paid providers/tools/services.

## Lead PO Decision

The product direction changes from "research dashboard with generic trade-plan geometry" to "strategy-led decision system with a safe path to broker automation."

The end state is not a page that shows fixed 1:2 reward/risk plans. The end state is a system that:

1. decides whether the market regime permits new long trades, long exits, new short trades, or short exits,
2. selects instruments only when trusted market data, data quality, strategy proof, and side-specific evidence agree,
3. derives entries, invalidations, stops, targets, exits, and covers from the strategy's mathematics and observed evidence,
4. proves the logic through backtests and paper execution before any broker action,
5. can later connect to Angel One through a guarded, audited broker abstraction.

Market health alone is never enough. Trade permission requires agreement across market regime, trusted data, usable signal evidence, proven strategy logic, portfolio/risk state, and strategy-native exit math.

## Associate PO Inputs

| Associate PO | Artifact | Main conclusion |
|---|---|---|
| Market Regime / Trade Permission | [associate-po-market-regime-roadmap](2026-05-14-associate-po-market-regime-roadmap.md) | Add a canonical permission contract for `newLong`, `exitLong`, `newShort`, and `exitShort`; market health alone cannot promote trades. |
| Strategy Math / Entry / Exit | [associate-po-strategy-math-roadmap](2026-05-14-associate-po-strategy-math-roadmap.md) | Replace fixed 2R targets with strategy-owned entry, invalidation, stop, target, exit, and cover rules. |
| Risk / Execution / Angel One | [associate-po-risk-execution-roadmap](2026-05-14-associate-po-risk-execution-roadmap.md) | Build execution eligibility, paper ledger, reconciliation, kill switches, and dry-run broker adapter before any live orders. |
| Data Foundation / Quality / Operations | [associate-po-data-foundation-roadmap](2026-05-14-associate-po-data-foundation-roadmap.md) | Do not expand downstream intelligence until trusted `IN / STOCK` data and full-history coverage are locally proven. |

## Current App Changes Needed

### Market Data Foundation

- Keep current work as the highest priority until trusted `IN / STOCK` data is durable.
- Full-history coverage must mean 15 years of daily OHLCV, or listing-date-to-latest completed EOD for newer listings.
- Free official/public fallback sources must be operational when Yahoo is incomplete.
- Long-running data repair must be pollable, resumable, cancellable, and visible in the UI.

### Data Quality Engine

- Split readiness into use-case tiers:
  - daily review readiness,
  - signal readiness,
  - backtest readiness,
  - calibration readiness,
  - automation readiness.
- Consume Market Data Foundation freshness and history contracts instead of only simple stale-day heuristics.

### Market Context / Trade Permission

- Add a versioned trade-permission engine that returns:
  - `newLong`
  - `exitLong`
  - `newShort`
  - `exitShort`
- Each permission must return `READY`, `LIMITED`, `BLOCKED`, `UNPROVEN`, or `INSUFFICIENT_DATA`, with reasons and next action.
- Research Hub, Today Review, Strategy Decision, and Trade Plans must consume the same permission contract.

### Strategy Framework

- Strategy definitions must become the source of truth for:
  - side and lifecycle intent,
  - entry trigger math,
  - invalidation/stop math,
  - target/exit/cover math,
  - risk constraints,
  - backtest eligibility,
  - automation eligibility.
- Current long-entry bias must be expanded to long entry, long exit, short entry, and short exit.

### Signal Quality And Calibration

- Add side-aware strategy outcome evidence:
  - stop-hit rate,
  - target-hit rate,
  - MFE/MAE,
  - average bars to exit,
  - exit-method performance,
  - long-vs-short behavior.
- Calibration should not influence execution/automation until the selected side and strategy have enough evidence.

### Backtesting

- Backtests must support long and short positions.
- Backtests must measure the strategy's actual exit rules, not a generic fixed target.
- Registered Strategy Framework strategies should produce comparable proof for entries and exits.

### Strategy Decision

- Replace loose candidate semantics with a lifecycle action contract:
  - `LONG_ENTRY`
  - `LONG_EXIT`
  - `SHORT_ENTRY`
  - `SHORT_EXIT`
  - `REDUCE_RISK`
  - `WATCH`
  - `AVOID`
- `strategy=ALL` should remain batch-safe and should not duplicate context work.

### Trade Plan Risk Engine

- Remove fixed 1:2 RR from the promoted path.
- Trade plans must be generated from strategy-native geometry:
  - structural entry,
  - structural invalidation,
  - stop from volatility/structure/strategy rule,
  - target/exit/cover from strategy rule or measured market structure.
- Generic RR fallback may remain only as a disclosed low-trust fallback that cannot promote a plan to automation eligibility.

### Today Review / Research Hub

- Become the daily decision surface, not a raw signal dashboard.
- Show whether the market allows:
  - new long review,
  - long exit review,
  - short review,
  - short cover review.
- Candidate lists should come from the canonical permission + strategy proof + trade-plan contract.

### Portfolio / Risk / Execution

- Manual portfolios are not enough for automation.
- Add portfolio truth, cash ledger, execution ledger, broker reconciliation, risk limits, and kill switches before any live broker order.

## New Feature Roadmap

### Phase 0 - Trusted Data Baseline

Goal: the system can trust its universe before making downstream decisions.

Acceptance criteria:
- `IN / STOCK` has durable `LIMITED_REVIEW` minimum, then target `FULL_REVIEW`.
- Every active stock has explicit classification: complete, fallback needed, incomplete after fallback, listing-date missing, identity repair needed, retry-blocked, or manual review.
- Data Quality shows separate readiness tiers by use case.

### Phase 1 - Canonical Trade Permission

Goal: one engine answers what the system is allowed to consider today.

Acceptance criteria:
- One API/contract returns permissions for long entry, long exit, short entry, and short exit.
- It includes market regime, trusted data, data quality, signal evidence, strategy proof, and risk blockers.
- All user-facing decision pages consume the same contract.

### Phase 2 - Strategy-Native Entry And Exit Math

Goal: stop using fixed 2R geometry as the primary plan.

Acceptance criteria:
- Each promoted strategy owns entry, invalidation, stop, target, exit, and cover logic.
- Trade plans show which strategy rule produced each number.
- Fixed-RR fallback is clearly marked as fallback and cannot be automation-eligible.

### Phase 3 - Side-Aware Proof And Backtesting

Goal: prove strategy math before it influences real decisions.

Acceptance criteria:
- Backtesting supports long and short lifecycle simulation.
- Signal Quality reports strategy-side metrics, not only raw forward returns.
- Strategy ratings include side, market-regime fit, data sufficiency, and exit quality.

### Phase 4 - Decision Surfaces

Goal: make the app answer the user's actual question.

Acceptance criteria:
- Dashboard shows market permission first.
- Today Review lists long candidates, exit candidates, short candidates, and cover candidates separately.
- Research Hub explains why the system is not allowed to act when blocked.
- Trade Plans show mathematical proof and blockers, not generic RR templates.

### Phase 5 - Paper Execution System

Goal: simulate execution with full audit before broker integration.

Acceptance criteria:
- Execution intents are generated only from execution-eligible plans.
- Paper orders, fills, cancels, rejects, positions, cash, and P&L are persisted.
- Paper mode proves idempotency, risk controls, and reconciliation without broker calls.

### Phase 6 - Broker Abstraction And Angel One Dry Run

Goal: integrate Angel One safely without making live trades.

Acceptance criteria:
- Generic broker port supports account, holdings, positions, orders, trades, place, modify, cancel, and status sync.
- Angel One adapter starts in read-only plus dry-run/shadow mode.
- Broker request/response, client order IDs, rate-limit handling, and daily session lifecycle are audited.
- Current Angel One SmartAPI docs and terms are re-verified before implementation.

### Phase 7 - Guarded Live Automation

Goal: live automation only after paper and dry-run evidence are stable.

Acceptance criteria:
- Live exits/reduce-risk are enabled before live entries.
- Global kill switch, strategy kill switch, symbol blocklist, max risk, max exposure, duplicate-order prevention, and stale-data guards are enforced.
- Live entries require explicit arming, clean reconciliation, market permission, strategy proof, execution eligibility, and available cash.

## Priority Sequence

| Priority | Requirement | Owner lane |
|---|---|---|
| P0.1 | Finish trusted `IN / STOCK` data and full-history coverage | Data Foundation |
| P0.2 | Add Data Quality use-case tiers | Data Foundation / Data Quality |
| P1.1 | Define canonical trade-permission contract | Market Regime / Architect |
| P1.2 | Add lifecycle action taxonomy across Strategy Decision, Today Review, Trade Plans | Strategy / Signals / Risk |
| P2.1 | Replace promoted fixed-RR target logic with strategy-native geometry | Trade Plan / Strategy Framework |
| P2.2 | Add long exit, short entry, and short exit strategy definitions | Strategy Framework |
| P3.1 | Add side-aware backtesting and strategy outcome evidence | Backtesting / Signal Quality |
| P4.1 | Rebuild Today Review and Research Hub around permission + candidate lifecycle | Today Review / Research Hub |
| P5.1 | Build paper execution ledger and risk-control plane | Portfolio / Execution |
| P6.1 | Build broker abstraction and Angel One dry-run/read-only adapter | Broker Automation |
| P7.1 | Enable guarded live exits, then guarded live entries | Broker Automation / Risk |

## Product Guardrails

- No paid libraries, hosted tools, paid data providers, paid AI services, or commercial paid queues.
- No broker automation before trusted data, strategy proof, paper execution, reconciliation, and kill switches are complete.
- No new live entry automation before live exit automation has been proven.
- No action is automation-eligible from raw signals alone.
- No action is automation-eligible from generic fixed-RR geometry.
- No short candidate is automation-eligible until shortability/product eligibility and cover rules are explicit.
- User-facing language can remain review-safe, but internal domain contracts must represent real lifecycle actions precisely.

## Lead PO Signoff

Approved for roadmap direction and future Orchestrator intake. This document does not authorize implementation by itself. Each roadmap item must still go through:

`Lead PO brief -> Orchestrator Intake -> Architecture Contract -> QA Plan -> Work Packet -> Implementation -> QA -> Lead -> Architect -> PO -> GitHub Check-In`

The previous backlog remains parked unless it directly supports this roadmap or the user re-prioritizes it.
