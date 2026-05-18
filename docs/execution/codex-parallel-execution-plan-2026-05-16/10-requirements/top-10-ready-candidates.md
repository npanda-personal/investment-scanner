# Top 10 Candidate Queue

Date: 2026-05-18

Status: Refreshed after Product Owner priority correction. This is a docs-only candidate list, not proof of implementation readiness. Team 00 owns all Ready queue movement.

Team 02 discovery note: this file remains a docs-only candidate view, not a Ready decision. Use the dispatch correction below for the actual next unassigned pull.

Current dispatch correction on 2026-05-18: `CF-W1-CAL-01` is no longer unassigned; it was accepted and committed as parked branch work. `CF-W1-TP-02` is active Team 06 implementation, and `CF-W1-SMI-01` is active Team 03 architecture prep. After excluding active, accepted, parked, and blocked items, the next top unassigned docs-only requirement is `CF-W1-RH-01`.

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
| 1 | `CF-W1-CAL-01` | Calibration trust drift is the next direct user-value layer after context evidence is clearer. | Team 03 architecture/contract prep, then Team 04 QA refresh. |
| 2 | `CF-W1-SQLAB-02` | Signal outcome learning connects measured outcomes to future judgment; durable storage remains split, but the post-preview path needs definition. | Team 03 post-preview packet prep after `SQLAB-02A` closes. |
| 3 | `CF-W1-STRAT-02` | Strategy provenance and DQ-gated trust are upstream to every signal/backtest claim. | Team 03/04 child-packet follow-up after accepted `STRAT-02A`. |
| 4 | `CF-W1-MD-02` | Durable market-data readiness/evidence remains the foundation for trustworthy signals and backtests. | ADR and split-packet prep only; no schema/source promotion. |
| 5 | `CF-W1-SQLAB-01` | Signal Quality outcome confidence needs a clear trusted-versus-untrusted contract before quality summaries shape judgment. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 6 | `CF-W1-UX-01` | Workbench trust remains useful, but it follows market-data/signals/backtest evidence unless backend trust evidence is source-supported. | Backend trust-evidence parent remains blocked until source-supported fields exist. |
| 7 | `CF-W1-L3-INTEL-03` | Portfolio concentration review is still useful, but it remains below the upstream market-intelligence trust stack unless a safety blocker requires earlier attention. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 8 | `CF-W1-L3-WATCH-01` | Watchlist review actionability can improve the trader review queue without waiting on convenience work. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 9 | `CF-W1-L3-INTEL-02` | Review traceability remains useful once higher-value trust layers are settled. | Team 03 architecture/contract prep, then Team 04 QA prep. |
| 10 | `CF-W1-L3-ALERT-03` | Post-trigger follow-through only matters after the evidence stack is stronger. | Team 03 architecture/contract prep, then Team 04 QA prep. |

## Demoted For This Cycle

The following remain valid backlog items, but should not preempt the market-intelligence stack above:

- `CF-W1-DQ-02`
- `CF-W1-MCTX-01`
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

Next docs-only handoff after excluding active, accepted, parked, and blocked items: `CF-W1-RH-01` to Team 03 for architecture/contract prep and Team 04 for QA-plan prep.

Next live Ready routing stays outside this docs-only candidate list; the routed market-context and Data Quality lanes remain excluded until Team 00 changes live routing.

Next dependent handoff: Team 04 QA verification for active implementation handoffs after Team 06 or Team 05 submits developer evidence.

Team 02 should keep discovering and reprioritizing market-intelligence requirements instead of filling the top queue with platform, notification, or alert convenience work.
