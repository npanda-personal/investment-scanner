# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next docs-only value-discovery and prioritization cycle.

## Cycle Frame

- Open decisions: `0`
- This ranking is for the next requirement / contract / QA-prep pull, not for Ready queue movement.
- Team 00 keeps ownership of Ready promotion and live implementation routing.

Excluded from this ranking because they are already promoted, pulled, accepted, or in active QA / review flow:

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
| 1 | `CF-W1-BT-02` | Backtesting already exposes availability, benchmark, repair, and weak-exit evidence, but users still lack one canonical review-disposition label across list and detail views. This is the clearest next trust upgrade on an already active investor workflow. | Team 03/04 packets exist but need refresh to the narrower canonical-label scope before any Ready evaluation. | Team 03, then Team 04 |
| 2 | `CF-W1-HCTX-01` | Historical lookup provenance is the strongest remaining evidence gap behind post-event review. Requested date, selected snapshot date, lag, and per-slice gap explanation directly affect trust in context lookups. | Needs additive lookup-provenance contract; must stay backward-compatible for downstream consumers. | Team 03, then Team 04 |
| 3 | `CF-W1-MCTX-01` | Market regime labels still compress partial evidence into one chip and score. Traders need persisted-versus-fresh provenance, denominator clarity, and explicit missing-macro framing. | Depends on bounded regime-evidence contract and no breaking drift for downstream Market Context consumers. | Team 03, then Team 04 |
| 4 | `CF-W1-CAL-01` | Calibration already has trust-state machinery, but weak DQ or sparse context can still look too authoritative. After HCTX/MCTX, this is the next direct trust layer in the investor workflow. | Best sequenced after HCTX/MCTX contract prep; must not introduce new scoring or model behavior. | Team 03, then Team 04 |
| 5 | `CF-W1-L3-WATCH-01` | Watchlist Management still behaves like storage plus fixed sorting, not a real review queue. A deterministic review-priority layer would convert passive tracking into immediate investor workflow value with module-local data. | Must stay module-local and avoid alerting, recommendations, or shared-component scope. | Team 03, then Team 07 / Team 04 when lane capacity opens |
| 6 | `CF-W1-L3-INTEL-03` | Portfolio Intelligence already emits concentration red flags, but the concentration-review workflow is not yet explicit enough to support a disciplined risk pass over current holdings without advice-like wording. | Best after accepted readiness DTO foundations; must stay read-only and avoid optimizer or rebalance advice. | Team 03, then Team 07 / Team 04 when lane capacity opens |
| 7 | `CF-W1-UX-01` | Stock Research Workbench still matters, but this cycle is prioritizing nearer investor-review evidence gaps before returning to the broader trust-surface child behind active `UX-01A`. | Wait for `CF-W1-UX-01A` to clear its active gate; current API boundary still does not carry `region` / `assetType` or DQ-backed trust evidence. | Team 03, Team 08, then Team 04 |
| 8 | `CF-W1-L3-ALERT-03` | Alert inbox follow-through remains high trust value, but it is not the best next unblocked pick while `alerts-monitoring` has active writer contention and Ready-lane alert work ahead of it. | Sequence after the active alerts lane clears enough file ownership; do not overlap with active `alerts-monitoring` writers. | Team 03 after Team 07 lane clears, then Team 04 |
| 9 | `CF-W1-L3-INTEL-02` | Portfolio review output still carries reliability ambiguity and action-like wording risk. A bounded traceability child would make existing review output more trustworthy without widening the product. | Depends on accepted portfolio readiness groundwork and should follow concentration-review framing, not precede it. | Team 03, then Team 07 / Team 04 |
| 10 | `CF-W1-SQLAB-02` | The learning loop remains strategically important because it connects signal outcomes to future judgment. The no-schema preview child is already active elsewhere, but the parent requirement still needs the next post-preview path defined. | Durable-storage child remains blocked behind a separate storage packet; do not widen while `CF-W1-SQLAB-02A` is active. | Team 03 after `CF-W1-SQLAB-02A` closes |

## Why Other Candidates Fell Out Of The Top 10

- `CF-W1-DQ-02` and `CF-W1-STRAT-02` still matter, but this cycle is favoring nearer user-visible review workflows over upstream trust-governance packets.
- `CF-W1-UX-02` and `CF-W1-UX-05` are valid and prepared, but they are narrower Copilot-first trust-copy work and are less direct investor value than backtesting, context, calibration, watchlist, and concentration-review gaps.
- `CF-W1-AUTH-01` and `CF-W1-SUB-01` moved out of this discovery ranking because Team 09 is actively implementing the combined `CF-W1-AUTH-SUB-01` slice in a separate worktree.

## Promotion Watch

These are not part of the docs-only top 10 because they are implementation-routing items, but they are the next Team 00 promotion watchlist:

| Order | ID | Why it is the best promotion watch candidate now | Blocker |
| --- | --- | --- | --- |
| 1 | `CF-W1-L3-AUTH-03` | Already packeted and directly protects cross-user alert-rule references. | Do not promote while `CF-W1-L3-ALERT-01` still owns overlapping `alerts-monitoring` files. |
| 2 | `CF-W1-MD-01` | Prepared validation-only packet tightens upstream market-data trust without widening provider or storage scope. | Needs Team 05 readiness acceptance before Team 00 promotion. |
| 3 | `CF-W1-NOTIF-02` | Prepared backend-only platform slice improves privacy/trust with limited blast radius. | Wait for Team 09 capacity after the active combined auth/sub worktree. |

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged in this cycle. For the next docs-only prep pull, route `CF-W1-BT-02` packet refresh first, then `CF-W1-HCTX-01`, then `CF-W1-MCTX-01`, with `CF-W1-CAL-01` and unblocked `CF-W1-L3-WATCH-01` immediately behind that group.
