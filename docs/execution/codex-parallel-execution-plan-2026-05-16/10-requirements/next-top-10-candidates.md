# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next docs-only value-discovery and prioritization cycle.

## Cycle Frame

- Open decisions: `0`
- This ranking is for the next requirement / contract / QA-prep pull, not for Ready queue movement.
- Team 00 keeps ownership of Ready promotion and live implementation routing.

Excluded from this ranking because they are already promoted, pulled, accepted, or in active QA / review flow:

- `CF-W1-UX-01A`
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
| 1 | `CF-W1-UX-01` | Stock Research Workbench is already the research cockpit most likely to shape investor trust. The active `UX-01A` child only removes overclaim risk; the remaining gap is real trust proof: verified scope, latest trusted date, blocker provenance, and downstream widget eligibility. | Wait for `CF-W1-UX-01A` to clear its active gate; current API boundary still does not carry `region` / `assetType` or DQ-backed trust evidence. | Team 03, Team 08, then Team 04 |
| 2 | `CF-W1-HCTX-01` | Historical lookup provenance is the cleanest post-event learning gap still visible in source. Selected snapshot date, lag, and lookback explanation directly affect calibration and review trust. | Needs bounded additive lookup contract; must stay backward-compatible for downstream consumers. | Team 03, then Team 04 |
| 3 | `CF-W1-MCTX-01` | Market regime labels still compress partial evidence into a single regime chip and score. Traders need persisted-versus-fresh provenance, denominator clarity, and missing-input framing. | Depends on bounded regime-evidence contract and no breaking drift for downstream Market Context consumers. | Team 03, then Team 04 |
| 4 | `CF-W1-CAL-01` | Calibration still risks looking authoritative when DQ or context evidence is weak. After HCTX/MCTX, this is the next direct trust layer in the investor workflow. | Best sequenced after HCTX/MCTX contract prep; must not introduce new scoring or model behavior. | Team 03, then Team 04 |
| 5 | `CF-W1-BT-02` | Backtesting already exposes warnings, coverage, benchmark, and repair evidence, but users still lack one canonical review-disposition label across list and detail views. | Needs bounded review-label contract only; no simulation math, benchmark engine, or schema change. | Team 03, then Team 04 |
| 6 | `CF-W1-L3-INTEL-03` | Portfolio Intelligence already ranks holdings and flags concentration, but the concentration-review workflow is not yet explicit enough to support a disciplined risk review over current holdings. | Best after accepted readiness DTO foundations; must stay read-only and avoid optimizer or rebalance advice. | Team 03, then Team 07 / Team 04 when lane capacity opens |
| 7 | `CF-W1-L3-WATCH-01` | Watchlist Management still behaves like storage plus sorting, not a true review queue. A deterministic review-priority layer would convert passive tracking into useful investor workflow value. | Must stay module-local and avoid alerting, recommendations, or shared-component scope. | Team 03, then Team 07 / Team 04 when lane capacity opens |
| 8 | `CF-W1-L3-ALERT-03` | Alert inbox follow-through is the missing link between trigger detection and what the user learned after review. This closes a high-trust workflow gap. | Sequence after the active alerts lane clears enough file ownership; do not overlap with active `alerts-monitoring` writers. | Team 03 after Team 07 lane clears, then Team 04 |
| 9 | `CF-W1-L3-INTEL-02` | Portfolio review output still carries reliability ambiguity and action-like wording risk. A bounded traceability child would make existing review output more trustworthy without widening the product. | Depends on accepted portfolio readiness groundwork and should follow concentration-review framing, not precede it. | Team 03, then Team 07 / Team 04 |
| 10 | `CF-W1-SQLAB-02` | The learning loop remains strategically important because it connects signal outcomes to future judgment. The no-schema preview child is already active elsewhere, but the parent requirement still needs the next post-preview path defined. | Durable-storage child remains blocked behind a separate storage packet; do not widen while `CF-W1-SQLAB-02A` is active. | Team 03 after `CF-W1-SQLAB-02A` closes |

## Why Other Candidates Fell Out Of The Top 10

- `CF-W1-DQ-02` and `CF-W1-STRAT-02` still matter, but their currently promoted child slices (`DQ-02A`, `STRAT-02A`) have already captured the highest immediate trust value for this cycle.
- `CF-W1-UX-02` and `CF-W1-UX-05` are valid and prepared, but they are narrower Copilot-first trust-copy work and are less direct investor value than Workbench, context, calibration, backtesting, and portfolio-review gaps.
- `CF-W1-AUTH-01`, `CF-W1-SUB-01`, and `CF-W1-L3-AUTH-03` are important implementation candidates, but they are promotion-watch items rather than the next value-discovery priorities.

## Promotion Watch

These are not part of the docs-only top 10 because they are implementation-routing items, but they are the next Team 00 promotion watchlist:

| Order | ID | Why it is the best promotion watch candidate now | Blocker |
| --- | --- | --- | --- |
| 1 | `CF-W1-AUTH-01` | Cleanest next unpulled trust/safety implementation candidate after current Team 09 work settles; fail-closed auth behavior protects every downstream user-owned workflow. | Sequence with current Team 09 capacity and with `CF-W1-SUB-01` file overlap planning. |
| 2 | `CF-W1-L3-AUTH-03` | Already packeted and directly protects cross-user alert-rule references. | Do not promote while `CF-W1-L3-ALERT-01` still owns overlapping `alerts-monitoring` files. |
| 3 | `CF-W1-SUB-01` | Prepared backend-only policy slice with clear local-first constraints. | Should sequence behind or with `CF-W1-AUTH-01`, not race it. |

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged in this cycle. For the next docs-only pull, route `CF-W1-UX-01` follow-on trust evidence first, then `CF-W1-HCTX-01`, then `CF-W1-MCTX-01`, with `CF-W1-CAL-01` immediately behind that trio.
