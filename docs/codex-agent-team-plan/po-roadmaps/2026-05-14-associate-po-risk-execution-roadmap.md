# Associate PO Roadmap - Risk And Execution - 2026-05-14

## Scope

Planning-only artifact for eventual personal-use Angel One automation. No code changes are authorized from this roadmap. Constraints remain local-first, no paid tools/providers/services, and strong safety defaults.

## Current Capability

| Area | Current capability | Current limit for execution |
| --- | --- | --- |
| Decision chain | Market Data -> Data Quality -> Signals -> Strategy Framework -> Backtesting -> Strategy Decision -> Today Review -> Trade Plans is in place. | The repo contract is still research-support only. |
| Trade plans | `trade-plan-risk-engine` already persists entry, stop, target, R:R, position sizing, risk grade, blockers, paper-readiness, and proof snapshots. | Plans are not orders, positions, or execution intents. No paper trader exists yet. |
| Daily shortlist | `today-trade-review` publishes persisted daily candidates with blockers, proof, and invalidation context. | It is a review surface, not an execution trigger. |
| Portfolio | `portfolio-management` supports manual portfolios, holdings, transactions, valuation, and allocation. | No broker sync, realized P&L engine, cash ledger, or authoritative live position state. |
| Portfolio risk | `portfolio-intelligence` provides health, concentration, and red-flag views. | No volatility/beta/correlation/stress engine and no automation limits. |
| Watchlists | `watchlist-management` provides curated lists with price/signal enrichment. | No execution staging, idea state machine, or broker linkage. |
| Alerts | `alerts-monitoring` supports in-app rules and deduped events. | Evaluation is manual only; no scheduler, escalation, or execution actions. |
| Notifications | `notifications-delivery` supports preferences, delivery logs, local/log email, and manual digests. | No real transport, no enforced quiet hours, no urgent operator channel. |
| Auth | `auth-identity` provides signup/login/JWT and ownership isolation. | No refresh tokens, revocation, MFA, or stronger operator controls for irreversible actions. |
| Broker/execution | No module owns broker execution, order placement, paper trading, or autonomous trading. | This is the core product gap. |

## Product Gaps

1. No execution domain exists: no `BrokerAccount`, `ExecutionIntent`, `Order`, `OrderAttempt`, `Position`, `AutomationPolicy`, `AutomationRun`, `KillSwitch`, or reconciliation model.
2. The current stack is EOD/research oriented. Safe intraday automation would require a separate live-price, live-order-state, and market-session contract.
3. Portfolio state is manual, so the system cannot safely trust current cash, open quantity, average price, realized P&L, or broker-side exits.
4. Trade Plan paper-readiness is necessary but not sufficient for live automation. There is no separate execution-eligibility contract.
5. Alerts and notifications are not yet operator-grade. Manual evaluation and log-email are insufficient for automated trading supervision.
6. Auth is adequate for research pages but weak for arming/disarming automation and approving live entries.
7. No audit ledger exists for full decision -> approval -> order -> fill -> cancel -> reconcile history.

## Priority Order

1. Automation eligibility and safety gate
2. Paper execution ledger and simulator
3. Portfolio truth and reconciliation
4. Risk-control plane and kill switch
5. Scheduler plus operator alerts/notifications
6. Broker abstraction plus Angel One dry-run adapter
7. Guarded live exits
8. Guarded live entries

## Automation Roadmap

### P0 - Automation Eligibility Gate

Goal: separate research readiness from execution readiness.

Acceptance criteria:
- Only framework-backed, scoped, fresh, non-blocked trade plans can emit an `execution-eligible` decision.
- `NO_REVIEW`, stale market data, weak/unproven proof, closed market gate, missing portfolio truth, or unresolved broker reconciliation must hard-block automation.
- Execution-block reasons are persisted and surfaced in the same proof chain style as Trade Plans.

Dependencies:
- Market Data readiness/trusted-universe stability
- Strategy proof registry and backtest evidence
- Strategy Decision proof/calibration consumption
- Trade Plan canonical geometry/readiness

### P1 - Paper Execution Ledger

Goal: add a broker-free execution domain before touching Angel One.

Acceptance criteria:
- New execution records capture intent, source plan, approval mode, simulated order lifecycle, fills, cancels, rejects, and resulting simulated positions.
- Paper mode never calls a broker API.
- Every paper action is idempotent and fully auditable from candidate to final position state.

Dependencies:
- P0 complete
- New execution module and data model
- Position state model distinct from manual research holdings

### P2 - Portfolio Truth And Reconciliation

Goal: stop relying on manual holdings for automated risk decisions.

Acceptance criteria:
- The system can distinguish manual portfolio records from execution-owned positions.
- Reconciliation detects mismatches between expected position state and imported/broker state and blocks automation until resolved.
- Realized P&L, cash impact, and open risk are available for automation limits.

Dependencies:
- P1 execution ledger
- Portfolio-management extension for cash/position truth
- Read-only broker import or CSV fallback for verification

### P3 - Risk-Control Plane And Kill Switch

Goal: make automation failure-safe.

Acceptance criteria:
- Global kill switch, per-strategy kill switch, and per-symbol blocklist exist and are testable.
- Controls include max order value, max risk per trade, max daily loss, max open positions, max per-symbol exposure, max per-sector exposure, duplicate-order cooldown, and exit-over-entry precedence.
- Arming automation requires an explicit user action; disarming is immediate and blocks new orders.

Dependencies:
- P1 and P2
- Portfolio-intelligence expansion for exposure/risk metrics

### P4 - Scheduler And Operator Supervision

Goal: create a bounded local automation loop with audit and operator visibility.

Acceptance criteria:
- Scheduled runs persist start/end time, inputs, actions, skips, failures, and kill-switch state.
- Alert evaluation becomes scheduled, not manual-only, for automation-critical conditions.
- Operator notifications support local high-signal warnings for rejects, mismatches, repeated retries, stale data, and kill-switch activation.

Dependencies:
- P3
- Alerts-monitoring scheduling
- Notifications-delivery upgrade beyond log-only for local operator use

### P5 - Broker Abstraction And Angel One Dry-Run

Goal: integrate the broker through a generic interface first, then Angel One.

Acceptance criteria:
- A broker port exists with read-only account/position/order sync plus place/cancel abstractions.
- Angel One adapter supports dry-run/shadow mode, request/response audit capture, idempotent client order IDs, and safe retry rules.
- Dry-run can compare planned orders vs broker-acceptable payloads without transmitting live orders.

Dependencies:
- P2, P3, P4
- Secure local credential handling
- Broker session/token lifecycle design

### P6 - Guarded Live Exits First

Goal: automate risk reduction before automating new entries.

Acceptance criteria:
- Live mode is limited initially to protective exits or reduce-risk actions for already reconciled positions.
- Every live exit is traceable to a persisted risk rule or approved strategy condition.
- Session guard, stale-data guard, idempotency, and post-order reconciliation all pass before the next action is allowed.

Dependencies:
- P5
- Broker reconciliation reliability
- Clear exit-policy ownership between Strategy Decision and execution module

### P7 - Guarded Live Entries Last

Goal: allow new position entry only after paper and exit automation are stable.

Acceptance criteria:
- Entry automation remains disabled unless paper/live shadow results stay within agreed tolerances over multiple sessions.
- Entries require strategy proof, execution eligibility, available cash, exposure headroom, no active kill switch, and clean broker reconciliation.
- The system can enforce one source of truth for open orders and positions and prevent duplicate entries.

Dependencies:
- P6 stable
- Proven paper/live parity
- Stronger operator auth for entry approval/arming

## Key Risks

1. **Data-timing risk:** the repo is optimized for EOD research. Intraday automation without a new market-data contract would be unsafe.
2. **Position-truth risk:** manual portfolio records can drift from actual broker positions and create false exits or duplicate entries.
3. **Control-plane risk:** current auth, alerts, and notifications are not strong enough for irreversible live actions.
4. **Proof drift risk:** paper-readiness can improve or degrade as upstream evidence changes; execution must use persisted execution-time snapshots.
5. **Broker-session risk:** broker auth/session expiry, rate limits, and reject handling can break unattended runs unless reconciliation is first-class.

## Recommendation

Do not start with direct Angel One entry automation. The safest sequence for this repo is:

1. execution-eligibility gate,
2. paper execution ledger,
3. reconciliation and kill switch,
4. Angel One dry-run/read-only sync,
5. live exits,
6. live entries.

That sequence fits the current architecture, preserves the research-support boundary while extending it carefully, and keeps risk controls ahead of broker actions.
