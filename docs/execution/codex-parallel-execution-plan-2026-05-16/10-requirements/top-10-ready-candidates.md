# Top 10 Candidate Queue

Date: 2026-05-18

Status: Refreshed after Product Owner priority correction. This is a docs-only candidate list, not proof of implementation readiness. Team 00 owns all Ready queue movement.

## Priority Rule

Future routing prioritizes direct investor/trader value:

- market data and Data Quality evidence;
- signals, strategy trust, calibration, backtesting, Trade Plan research support;
- historical context, market context, signal-quality learning, and research evidence.

Admin, settings, auth/subscription, notifications, and alert convenience work are lowest priority unless they block correctness, privacy, or user-data safety.

## Current Cycle Non-Active Value Focus

These are docs-only backlog priorities. They are not Ready-evaluation results.

| Rank | ID | Why now | Next gate |
| --- | --- | --- | --- |
| 1 | `CF-W1-BT-02` | Backtesting already exposes availability, benchmark, repair, and weak-exit evidence, but users still lack one canonical review-disposition label across list and detail views. | Team 03 architecture/contract refresh, then Team 04 QA refresh. |
| 2 | `CF-W1-HCTX-01` | Historical lookup provenance is a direct post-event learning gap: requested date, selected snapshot date, lag, and gaps should be explicit. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 3 | `CF-W1-MCTX-01` | Market regime labels need evidence, denominator clarity, and partial-context framing before downstream trust claims. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 4 | `CF-W1-CAL-01` | Calibration trust drift is the next investor-value layer after historical and market-context provenance. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 5 | `CF-W1-SQLAB-02` | Signal outcome learning connects measured outcomes to future judgment; durable storage remains split, but the post-preview path needs definition. | Team 03 post-preview packet prep after `SQLAB-02A` closes. |
| 6 | `CF-W1-STRAT-02` | Strategy provenance and DQ-gated trust are upstream to every signal/backtest claim. | Team 03/04 child-packet follow-up after accepted `STRAT-02A`. |
| 7 | `CF-W1-DQ-02` | Upstream currentness and provider-gap evidence affect downstream signals, strategies, backtests, and research surfaces. | Team 03/04 follow-up after accepted `DQ-02A`. |
| 8 | `CF-W1-TP-01B` | Trade Plan no-target/DQ hard-block behavior protects paper-readiness language. | Reconcile branch/review state before any new work. |
| 9 | `CF-W1-MD-02` | Durable market-data readiness/evidence remains the foundation for trustworthy signals and backtests. | ADR and split-packet prep only; no schema/source promotion. |
| 10 | `CF-W1-UX-01` | Workbench trust remains useful, but it follows market-data/signals/backtest evidence unless backend trust evidence is source-supported. | Backend trust-evidence parent remains blocked until source-supported fields exist. |

## Demoted For This Cycle

The following remain valid backlog items, but should not preempt the market-intelligence stack above:

- `CF-W1-L3-WATCH-01`
- `CF-W1-L3-INTEL-03`
- `CF-W1-L3-INTEL-02`
- `CF-W1-L3-ALERT-03`
- `CF-W1-NOTIF-02`
- `CF-W1-AUTH-01`
- `CF-W1-SUB-01`
- `CF-W1-UX-02`
- `CF-W1-UX-05`

Exceptions: route one of these earlier only if it blocks correctness, privacy, user-data safety, or an already active accepted branch gate.

## Implementation-Ready Result

No available application-code item is currently waiting unassigned in Ready.

Already promoted, pulled, accepted, or parked branch work should stay out of the docs-only discovery ranking:

- `CF-W1-L3-PORT-01A`
- `CF-W1-TP-01B`
- `CF-W1-NOTIF-02`
- `CF-W1-L3-ALERT-01`
- `CF-W1-MD-01`
- `CF-W1-L3-TREV-01`
- `CF-W1-SQLAB-01`
- `CF-W1-DQ-02A`
- `CF-W1-STRAT-02A`
- `CF-W1-UX-01A`
- `CF-W1-AUTH-SUB-01`

## Next Team 00 Pull

Next docs-only handoff: `CF-W1-BT-02` to Team 03 for architecture/contract refresh.

Next dependent handoff: Team 04 QA refresh for `CF-W1-BT-02` after Team 03 completes.

Team 02 should keep discovering and reprioritizing market-intelligence requirements instead of filling the top queue with platform, notification, or alert convenience work.
