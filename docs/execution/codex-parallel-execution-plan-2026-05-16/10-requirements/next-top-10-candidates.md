# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next docs-only value-discovery and prioritization cycle.

Product Owner correction after this refresh:

- Prioritize direct investor/trader value first: market data, Data Quality, signals, strategy trust, backtests, calibration, historical context, market context, trade-plan research support, and research evidence.
- Admin, settings, auth/subscription, notifications, and user-alert convenience work should be lowest priority unless they block correctness, privacy, or user-data safety.
- Alerts can return to the top only when they are tied to signal/backtest/market-data evidence quality, not as notification or inbox convenience work.

## Cycle Frame

- Open decisions: `0`
- This ranking is for the next requirement / contract / QA-prep pull, not for Ready queue movement.
- Team 00 keeps ownership of Ready promotion and live implementation routing.

Excluded from this ranking because they are already promoted, pulled, accepted, or in active QA / review flow:

- `CF-W1-BT-02`
- `CF-W1-HCTX-01`
- `CF-W1-UX-01A`
- `CF-W1-AUTH-SUB-01`
- `CF-W1-TP-01B`
- `CF-W1-NOTIF-02`
- `CF-W1-L3-ALERT-01`
- `CF-W1-L3-TREV-01`
- `CF-W1-SQLAB-01`
- `CF-W1-SQLAB-02A`
- `CF-W1-DQ-02A`
- `CF-W1-STRAT-02A`
- `CF-W1-MD-01`

## Re-Prioritized Top 10

| Rank | ID | Why this is next highest user value | Main dependency / blocker | Recommended next owner(s) |
| --- | --- | --- | --- | --- |
| 1 | `CF-W1-DQ-02` | Session-aware currentness is the upstream fail-closed gate for every downstream trust surface. If currentness still looks calendar-fresh instead of session-fresh, every signal, strategy, backtest, and review surface can overstate evidence quality. | Keep it additive and bounded to currentness evidence; do not widen into durable storage or provider rewrites. | Team 03, then Team 04 |
| 2 | `CF-W1-MCTX-01` | Market regime labels still compress partial evidence into one chip and score. Traders need persisted-versus-fresh provenance, denominator clarity, and explicit missing-macro framing. | Depends on bounded regime-evidence contract and no breaking drift for downstream Market Context consumers. | Team 03, then Team 04 |
| 3 | `CF-W1-CAL-01` | Calibration already has trust-state machinery, but weak DQ or sparse context can still look too authoritative. After context evidence is clearer, this is the next direct trust layer in the investor workflow. | Best sequenced after HCTX/MCTX contract prep; must not introduce new scoring or model behavior. | Team 03, then Team 04 |
| 4 | `CF-W1-SQLAB-02` | The learning loop remains strategically important because it connects signal outcomes to future judgment. The no-schema preview child is already active elsewhere, but the parent requirement still needs the next post-preview path defined. | Durable-storage child remains blocked behind a separate storage packet; do not widen while `CF-W1-SQLAB-02A` is active. | Team 03 after `CF-W1-SQLAB-02A` closes |
| 5 | `CF-W1-STRAT-02` | Strategy Framework provenance and DQ-gated strategy trust are closer to market-intelligence correctness than Lane 3 convenience work. | Durable rule-history storage remains a later architecture decision; keep this as docs/contract prep. | Team 03, then Team 04 |
| 6 | `CF-W1-MD-02` | Durable market-data readiness/evidence remains the biggest upstream foundation for trustworthy signals and backtests. | Prisma/schema/source implementation remains blocked; continue ADR and split-packet prep only. | Team 03 |
| 7 | `CF-W1-TP-01B` | Trade Plan no-target and hard DQ blocking directly affects paper-readiness trust and research-review safety. | Existing implementation/review branch state must be reconciled before new work; keep no-target/DQ semantics bounded. | Team 00 / Team 06 / Team 10 |
| 8 | `CF-W1-SQLAB-01` | Signal Quality outcome confidence is the next learning-step after measured outcomes and currentness because it decides whether quality outputs are trusted, limited, diagnostic, or untrusted. | Existing audit-derived trust-state draft needs upstream policy alignment; keep research-only semantics intact. | Team 03, then Team 04 |
| 9 | `CF-W1-UX-01` | Stock Research Workbench trust remains useful, but it should follow market-data/signals/backtest evidence work unless it needs source-supported backend trust evidence. | Parent still needs backend verified scope, DQ readiness, and latest trusted date evidence. | Team 03, Team 08, then Team 04 |
| 10 | `CF-W1-L3-INTEL-03` | Portfolio concentration review is still useful, but it remains below the upstream market-data/signals/backtest trust stack unless a safety blocker requires earlier attention. | Keep it bounded to explainable review-first language and avoid optimizer or rebalance advice. | Team 03, then Team 04 |

## Why Other Candidates Fell Out Of The Top 10

- `CF-W1-L3-WATCH-01` and `CF-W1-L3-INTEL-02` remain useful but are below the direct market-data/signal/backtest/calibration stack.
- `CF-W1-L3-ALERT-03`, `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, and `CF-W1-SUB-01` are explicitly lowest priority for future routing unless they block correctness, privacy, or user-data safety.
- `CF-W1-UX-02` and `CF-W1-UX-05` are valid and prepared, but they are narrower Copilot-first trust-copy work and are less direct investor value than backtesting, currentness, context, calibration, market-data, signal-quality, and trade-plan gaps.

## Promotion Watch

These are not part of the docs-only top 10 because they are implementation-routing items, but they are the next Team 00 promotion watchlist:

| Order | ID | Why it is the best promotion watch candidate now | Blocker |
| --- | --- | --- | --- |
| 1 | `CF-W1-TP-01B` | Trade Plan DQ hard-block and no-target wording are direct research-readiness value. | Reconcile existing branch/review state before any new work. |
| 2 | `CF-W1-MD-01` | Prepared validation-only packet tightens upstream market-data trust without widening provider or storage scope. | Already parked/accepted on branch; use as integration reference before new MD work. |
| 3 | `CF-W1-MD-02` | Durable readiness evidence ADR is upstream foundation for every downstream signal/backtest claim. | ADR/source/schema split only; no schema/source promotion without separate approval. |
| 4 | `CF-W1-L3-AUTH-03` | Correctness/safety item only; keep low unless cross-user alert ownership blocks active market-intelligence work. | Do not promote while `alerts-monitoring` writers remain active. |
| 5 | `CF-W1-NOTIF-02` | Privacy/safety item only; lowest priority after current platform branch is parked. | Do not pull ahead of market-data/signal/backtest work. |

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged for already-active branches, but route future factory capacity toward direct investor/trader value. For the next docs-only prep pull, treat `CF-W1-DQ-02` as the top unassigned item, then `CF-W1-MCTX-01`, `CF-W1-CAL-01`, `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, `CF-W1-MD-02`, and `CF-W1-TP-01B`. `CF-W1-BT-02` and `CF-W1-HCTX-01` stay in their active lanes and should not be re-routed here. Keep admin/settings/auth/subscription/notifications and alert convenience items lowest unless they block correctness or user-data safety.
