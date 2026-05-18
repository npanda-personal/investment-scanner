# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next docs-only value-discovery and prioritization cycle.

Product Owner correction after this refresh:

- Prioritize direct investor/trader value first: market data reliability, Data Quality, signals, strategy trust, calibration, backtesting, historical context, market context, trade-plan research support, research evidence, reviewability, and explainability.
- Admin, settings, auth/subscription, notifications, and user-alert convenience work should be lowest priority unless they block correctness, privacy, or user-data safety.
- Alerts can return to the top only when they are tied to signal/backtest/market-data evidence quality, not as notification or inbox convenience work.

## Cycle Frame

- Open decisions: `0`
- This ranking is for the next requirement / contract / QA-prep pull, not for Ready queue movement.
- Team 00 keeps ownership of Ready promotion and live implementation routing.

## Active Investor-Value Work Kept Visible

These items stay visible because they are already in active branch, review, or accepted-branch-gate flow. They are not part of the unassigned top-10 ranking below.

| ID | Current state from current queue/docs | Why it stays visible |
| --- | --- | --- |
| `CF-W1-TP-01B` | Implemented in Team 06 worktree; Team 10 review pending | Direct trade-plan research support and DQ hard-block value; do not let lower-value platform work jump ahead of its gate completion. |
| `CF-W1-BT-02` | Promoted and assigned to Team 06 | Direct backtesting reviewability value. |
| `CF-W1-CAL-01` | Promoted and assigned to Team 06 | Direct calibration trust-state value; no longer an unassigned candidate. |
| `CF-W1-SQLAB-01` | Promoted and assigned to Team 06 | Direct signal-quality trust-state value; no longer an unassigned candidate. |
| `CF-W1-HCTX-01` | Accepted on branch and parked for later clean integration | Direct historical-context explainability value remains important even though it is no longer in discovery. |
| `CF-W1-MD-01` | Accepted on branch and parked for later clean integration | Upstream market-data validation value remains important even though it is no longer in discovery. |

## Excluded From The Unassigned Ranking

These items are already promoted, pulled, accepted, or in active QA / review flow:

- `CF-W1-BT-02`
- `CF-W1-CAL-01`
- `CF-W1-DQ-02`
- `CF-W1-DQ-02A`
- `CF-W1-HCTX-01`
- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-PORT-01A`
- `CF-W1-L3-TREV-01`
- `CF-W1-MCTX-01`
- `CF-W1-MD-01`
- `CF-W1-NOTIF-02`
- `CF-W1-SQLAB-01`
- `CF-W1-SQLAB-02A`
- `CF-W1-STRAT-02A`
- `CF-W1-TP-01B`
- `CF-W1-UX-01A`
- `CF-W1-AUTH-SUB-01`

## Re-Prioritized Top 10

| Rank | ID | Why this is next highest user value | Main dependency / blocker | Recommended next owner(s) |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-SQLAB-02` | Durable post-event learning is still a direct investor workflow gap. The active no-schema preview child proves interest, but the parent still needs the next bounded path defined so learning does not stay ephemeral. | Keep sequenced behind the active `CF-W1-SQLAB-02A` preview child; durable storage remains a separate later packet. | Team 03, then Team 04 |
| 2 | `CF-W1-STRAT-02` | Strategy provenance and DQ-gate trust are upstream to signal credibility, backtest interpretation, and trade-plan review. | Must stay bounded to rule provenance and DQ policy exposure; no silent rule-behavior rewrite. | Team 03, then Team 04 |
| 3 | `CF-W1-MD-02` | Durable market-data readiness evidence is the strongest remaining upstream trust gap for signals, backtests, calibration, and review surfaces. | ADR-only for now; no schema/source promotion without separate approval. | Team 03 |
| 4 | `CF-W1-SIG-TRIGGER-02` | The current optional trigger projection still leaves signals short of contract-complete trigger auditability. This is a direct explainability gap for downstream review workflows. | Must stay additive and module-local to Signal Generation first; no downstream consumer rewrites or schema jump. | Team 03, then Team 04 |
| 5 | `CF-W1-TP-02` | Trade-plan research support still needs explicit exit and invalidation semantics so output does not read like arbitrary target-price advice. | Keep separate from the active `CF-W1-TP-01B` backend compatibility child and avoid broad API/UI migration. | Team 03, then Team 04 |
| 6 | `CF-W1-UX-01` | Stock Research Workbench is a real investor-facing surface, but its next value step should come after upstream evidence contracts are clearer. | Parent still needs verified scope, latest trusted date, blocker provenance, and downstream eligibility evidence. | Team 03, Team 08, then Team 04 |
| 7 | `CF-W1-L3-INTEL-03` | Portfolio concentration review is useful, but it still sits below upstream market-data/signal/strategy/trade-plan trust work. | Keep it bounded to explainable review-first language and avoid optimizer or rebalance advice. | Team 03, then Team 04 |
| 8 | `CF-W1-L3-WATCH-01` | Watchlist review actionability can help triage ideas, but it should not jump ahead of core evidence and explainability work. | Keep it bounded to deterministic review priority and reason summary; no alerting/provider changes. | Team 03, then Team 04 |
| 9 | `CF-W1-L3-INTEL-02` | Portfolio review traceability remains useful once stronger upstream trust layers are settled. | Keep it bounded to review-output explainability and avoid overclaiming trust. | Team 03, then Team 04 |
| 10 | `CF-W1-L3-ALERT-03` | Post-trigger follow-through matters only after evidence quality and reviewability are stronger upstream. | Keep it bounded to outcome traceability and avoid scheduler/convenience scope. | Team 03, then Team 04 |

## Why This Ranking Changed

- `CF-W1-CAL-01` and `CF-W1-SQLAB-01` were removed from the unassigned ranking because the current Ready queue already shows them promoted and assigned.
- `CF-W1-SIG-TRIGGER-02` is added because the current Signal Generation module still documents the trigger contract as an incomplete optional projection, which is a direct signal explainability and auditability gap.
- `CF-W1-TP-02` is pulled forward because Trade Plan still needs explicit exit/invalidation semantics to avoid target-price-like interpretation.
- Lane 3 convenience items remain behind signal/strategy/market-data/trade-plan evidence work.

## Why Lower-Value Items Stay Lower

- `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, `CF-W1-SUB-01`, and similar platform items remain low unless they block correctness, privacy, or user-data safety.
- `CF-W1-UX-02` and `CF-W1-UX-05` remain valid but are narrower Copilot-first trust/copy items and are less direct investor value than current signal, strategy, trade-plan, and market-data evidence gaps.
- `CF-W1-L3-AUTH-03` remains a correctness/safety item, not a market-intelligence priority item, unless alert ownership blocks active investor-value work.

## Next 3 Candidates Team 00 Should Evaluate

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-MD-02`

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged for already-active branches. For the next docs-only prep pull, evaluate `CF-W1-SQLAB-02`, then `CF-W1-STRAT-02`, then `CF-W1-MD-02`, while keeping the newly surfaced `CF-W1-SIG-TRIGGER-02` and the refined `CF-W1-TP-02` close behind. Do not let admin/settings/auth/subscription/notifications or alert-convenience work preempt this stack unless a correctness, privacy, or user-data-safety blocker appears.
