# Next Top 10 Candidates

Date: 2026-05-18

Prepared by Team 02 Requirement Factory for the next docs-only value-discovery and prioritization cycle.

Product Owner correction after this refresh:

- Prioritize direct investor/trader value first: market data reliability, Data Quality, signals, strategy trust, calibration, backtesting, historical context, market context, trade-plan research support, research evidence, reviewability, and explainability.
- Admin, settings, auth/subscription, notifications, and user-alert convenience work should be lowest priority unless they block correctness, privacy, or user-data safety.
- Alerts can return to the top only when they are tied to signal/backtest/market-data evidence quality, not as notification or inbox convenience work.

## Current Dispatch Filter

Apply this extra filter before Team 00 chooses the next pull:

- exclude active implementation, active architecture/QA prep, accepted branch commits parked for later integration, and items already blocked behind schema/durable-storage/shared-file gates;
- as of 2026-05-18, `CF-W1-MCTX-01` is already promoted in `12-ready-queue/ready-for-implementation.md` and assigned to Team 05, `CF-W1-RH-02A` is in active Team 03 architecture prep, `CF-W1-MD-03` is queued for Team 03 architecture after `CF-W1-RH-02A`, `CF-W1-TP-02` is in active implementation/review follow-up, `CF-W1-SMI-01` is in active Team 04 worktree QA verification, `CF-W1-RH-01` has a QA plan ready and is pending Team 00 Ready evaluation, `CF-W1-L3-TREV-02` is in active Team 04 QA planning, and `CF-W1-MD-02A` is queued for Team 04 QA review, so none of them belongs in the next unassigned pull;
- after those exclusions, the next top unassigned requirement is `CF-W1-STRAT-02B`, followed by `CF-W1-BT-01A`.

## Cycle Frame

- Open decisions: `0`
- This ranking is for the next requirement / contract / QA-prep pull, not for Ready queue movement.
- Team 00 keeps ownership of Ready promotion and live implementation routing.
- Team 03 currently owns active architecture prep for `CF-W1-MD-02A`, Team 06 currently owns active implementation for `CF-W1-SMI-01`, and Team 04 currently owns queued/active QA planning lanes for `CF-W1-RH-01` and `CF-W1-L3-TREV-02`, so backlog ranking must distinguish direct user value from current dispatchability.

## Active Investor-Value Work Kept Visible

These items stay visible because they are already in active branch, review, or accepted-branch-gate flow. They are not part of the unassigned top-10 ranking below.

| ID | Current state from current queue/docs | Why it stays visible |
| --- | --- | --- |
| `CF-W1-SIG-TRIGGER-02A` | Ready-promoted and actively implemented by Team 06 in a separate worktree | Direct signal auditability value is active already; do not route same-module follow-on prep that depends on its implementation outcome. |
| `CF-W1-SQLAB-01` | Accepted on branch and parked for later clean integration | Direct signal-quality trust-state value is already out of discovery. |
| `CF-W1-BT-02` | Accepted on branch and parked for later clean integration | Direct backtesting reviewability value is already out of discovery. |
| `CF-W1-CAL-01` | Accepted on branch and parked for later clean integration | Direct calibration trust-state value is already out of discovery. |
| `CF-W1-HCTX-01` | Accepted on branch and parked for later clean integration | Direct historical-context explainability value remains important even though it is no longer in discovery. |
| `CF-W1-MCTX-01` | Ready-promoted and assigned to Team 05 in `12-ready-queue/ready-for-implementation.md` on 2026-05-18 | Direct market-context explainability work is already out of unassigned discovery and should stay excluded from the next pull. |
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
- `CF-W1-MD-01`
- `CF-W1-NOTIF-02`
- `CF-W1-MCTX-01`
- `CF-W1-SQLAB-01`
- `CF-W1-SQLAB-02A`
- `CF-W1-SIG-TRIGGER-02A`
- `CF-W1-STRAT-02A`
- `CF-W1-TP-01B`
- `CF-W1-UX-01A`
- `CF-W1-AUTH-SUB-01`

## Re-Prioritized Top 10

| Rank | ID | User value | Acceptance criteria focus | Non-goals | Likely owner team | Expected architecture / QA gate | Likely file ownership risk | Dependencies | Parallel with `CF-W1-SIG-TRIGGER-02A`? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `CF-W1-STRAT-02B` | Preserves durable strategy-definition history so future rule updates do not erase the exact persisted version that older signals, backtests, and reviews relied on. | Version-keyed persistence, additive rule-revision snapshots, current-vs-durable history distinction, idempotent reseed behavior, and focused repository/service compatibility tests. | No reopen of `STRAT-02A`, no evaluator-math rewrite, no proof-status rewrite, no route/shared-UI change, no duplicate DQ logic. | Team 00 routing, then Team 03 architecture prep and Team 04 durable-child QA planning. | New bounded child is now explicit; architecture should start from schema/generated/repository impact instead of another no-schema trust pass. | High: Prisma/schema, generated artifacts, repository/service mapping, and focused tests likely move together in one writer set. | `CF-W1-STRAT-02A` is already accepted; parent `CF-W1-STRAT-02` stays blocked until this durable child is opened explicitly. | `Yes` for docs-only prep. No active file overlap with `signal-generation-engine`. |
| 2 | `CF-W1-BT-01A` | Backtesting still has an upstream DQ-fail-closed characterization gap, and the audit showed the current candidate list was thin on direct backtest trust evidence. | Characterization packet and QA plan for current backtesting DQ behavior. | No simulation rewrite, no route/shared-UI change, no schema/provider work. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Characterization should start from the current optional/fail-open behavior instead of changing simulation math. | Low: module-local backtesting tests and docs only in the first pass. | `CF-W1-BT-01` remains the parent blocked item; this is the bounded characterization child. | `Yes` for docs-only prep. Different module from active Signal Generation work. |
| 3 | `CF-W1-SQLAB-02` | Creates durable post-event learning so outcome review is not ephemeral. | Durable journal semantics, explicit evaluated vs unevaluable states, additive outcome-learning record, focused create/update/missing-data tests. | No signal scoring rewrite, no backtest rewrite, no alerting or execution behavior. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Bounded child split after `CF-W1-SQLAB-02A`; docs-only contract and QA plan can proceed once the active preview child closes. | Medium: module-local backend/frontend/test files, but storage path may escalate later. | `CF-W1-SQLAB-02A` learning-preview child must stay separate; no schema jump in the first prep pass. | `Yes` for docs-only prep. Different module from active Signal Generation work. |
| 4 | `CF-W1-MD-02` | Keeps the upstream durable-evidence parent visible while active Market Data child work is already consuming the first schema packet. | Parent ADR direction, durable-vs-derived evidence boundary, and blocked packet sequence stay explicit. | No source or schema work from the parent itself; no bypassing the `MD-02A/B/C/D` split. | Team 03 architecture ownership, Team 04 ADR QA visibility. | Parent-only holding item after the new child split. | Low in docs, high if misrouted into implementation. | `CF-W1-MD-02A` remains active and later follow-ons must stay sequenced. | `Yes` for docs-only planning. |
| 5 | `CF-W1-L3-INTEL-03` | Gives portfolio users explainable concentration review once upstream trust layers are stronger. | Explainable concentration findings, review-first language, deterministic reason summaries, focused bounded tests. | No optimizer, no rebalance advice, no alerting expansion. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract after upstream trust stack stabilizes further. | Medium: portfolio-intelligence frontend/backend/test surfaces. | Better after stronger strategy/market-data/trade-plan trust evidence. | `Yes`. No Team 06 dependency. |
| 6 | `CF-W1-L3-WATCH-01` | Helps triage watchlist ideas with deterministic review priority and reason summaries. | Explainable priority semantics, deterministic ranking reasons, safe empty states, focused tests. | No alerts convenience expansion, no provider changes, no speculative scoring engine. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract and QA plan only. | Medium: watchlist-management and related frontend/test files. | Should stay behind upstream evidence items. | `Yes`. No Team 06 dependency. |
| 7 | `CF-W1-L3-INTEL-02` | Improves portfolio review traceability once higher-value trust layers are in place. | Review-output explainability, traceable reason evidence, safe trust framing, focused tests. | No advisor-like recommendations, no wide portfolio workflow rewrite. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract and QA plan. | Medium: portfolio-intelligence surfaces. | Better after concentration and upstream trust packets. | `Yes`. No Team 06 dependency. |
| 8 | `CF-W1-L3-ALERT-03` | Adds post-trigger follow-through traceability after core evidence quality is stronger. | Outcome traceability, review-note semantics, additive alert history behavior, focused tests. | No scheduler/convenience scope, no notification-channel work. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Must stay behind active alert ownership/readiness work and current upstream trust stack. | Medium-high: alerts-monitoring overlap risk if active alert writers reopen. | Active/nearby alert work and lower Product Owner priority for convenience surfaces. | `Yes`, but lower priority than upstream investor-value items. |
| 9 | `CF-W1-UX-01` | Keeps the research workbench from overstating trust when source-backed proof is still incomplete. | Source-backed trust fields, blocker reasons, latest trusted data date, and downstream eligibility without advisory language. | No shared UI, no route changes, no provider/startup changes, no market-data or strategy-source rewrites. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | Backend trust-evidence parent remains blocked until source-supported fields are explicit. | High: stock-research-workbench spans backend and frontend trust surfaces. | Should stay behind core strategy, market-data, and signal evidence items. | `Yes`. No Team 06 dependency. |
| 10 | `CF-W1-RH-02` | Holds future Research Hub comparison-history work behind the fail-closed child instead of letting false delta claims return by drift. | Parent-only sequencing, true-delta/storage split guardrails, and explicit dependency on the bounded fail-closed child. | No immediate storage/system build, no broad Research Hub redesign, no upstream rewrites. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | Parent-only hold after `CF-W1-RH-02A`. | Low in docs, medium if misrouted into implementation. | Must stay behind `CF-W1-RH-02A`. | `Yes` for docs-only planning. |

## Top Parallel-Ready Prep Candidates

These are the clearest next docs-only candidates Team 00 can route now after excluding active, queued, accepted, parked, and blocked items:

1. `CF-W1-STRAT-02B`
2. `CF-W1-BT-01A`
3. `CF-W1-SQLAB-02`

## Additional Next-Wave Discovery Candidates

Ranking is unchanged. These were added because current source shows underdeveloped direct research-evidence value, but the existing top 5 still outrank them for the next routing cycle.

| ID | User value | Acceptance criteria focus | Non-goals | Likely owner team | Dependencies | File-conflict risk | Parallel with active Team 06 and Team 03 work? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `CF-W1-RH-01` | Makes Research Hub actionability stop treating stable upstream trust dimensions as permanent placeholders. | Wire Today Review / Trade Plan / Signal Quality / Calibration actionability dimensions through stable public outputs only, with additive evidence dates and blocker messages. | No new scoring engine, no upstream logic duplication, no shared UI/route/schema/provider scope. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | `CF-W1-L3-TREV-01`, `CF-W1-TP-02`, vocabulary alignment with `CF-W1-SQLAB-01` and `CF-W1-CAL-01`. | Medium. Clean child can stay in `research-hub`, but cross-module evidence pressure is real. | `Yes`. Discovery stays in `10-requirements/**`; later source work is outside Team 06's active files. |
| `CF-W1-RH-02A` | Fails Research Hub delta claims closed so the overview stops implying review-history evidence it cannot prove. | Comparison-basis status, compared-against timestamp when auditable, and unavailable-basis fallback instead of fake delta labels. | No new scheduler/journal system, no broad Research Hub redesign, no upstream module rewrite, no storage/schema work. | Team 03 prep, Team 04 QA prep, later Team 08 implementation. | Keeps semantic alignment with `CF-W1-RH-01`, but can proceed as a bounded child without waiting for the broader actionability packet to finish. | Medium. Child stays local unless architecture proves a later storage split is required. | `Yes`. Requirement work does not collide with Team 06 or Team 03 architecture-file ownership. |
| `CF-W1-SMI-01` | Makes Smart Money confirmation explain freshness, persisted-vs-missing evidence, and ownership-placeholder limits. | Persisted snapshot timing, range coverage, partial-trust semantics for missing ownership, and safe downstream "usable vs limited vs unavailable" framing. | No provider expansion, no market-data redesign, no DQ duplication, no schema/shared-UI work. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Semantically adjacent to `CF-W1-MD-02`, `CF-W1-HCTX-01`, and `CF-W1-MCTX-01`, but does not reopen them. | Medium. Module-local first child is plausible. | `Yes`. No active Team 06 writer currently owns `smart-money-intelligence`; requirement work is isolated. |
| `CF-W1-L3-TREV-02` | Makes Today Review candidate detail auditable by exposing source-module provenance and evidence timing for stored snapshots. | Candidate-level provenance labels, evidence dates, compatibility-only labels for partial/legacy snapshot shapes, and read-only detail semantics. | No scheduler rewrite, no Strategy Decision rewrite, no Trade Plan geometry rewrite, no schema/shared-UI scope. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | `CF-W1-L3-TREV-01` first; keep target-language cleanup separate under `CF-W1-TP-02`. | Medium. Child can stay in `today-trade-review`, but risk rises if snapshot normalization widens. | `Yes`. Requirement work is doc-only and does not overlap Team 06's active module. |

## Next Unassigned Pull Stack

1. `CF-W1-STRAT-02B`
2. `CF-W1-SQLAB-02`
3. `CF-W1-MD-02`

## Why This Ranking Changed

- `CF-W1-SIG-TRIGGER-02A` is now explicitly treated as active implementation work, so same-module follow-on prep cannot be presented as immediately parallel-safe.
- `CF-W1-TP-02` no longer belongs in the next unassigned pull because it is already in active Team 10 review after Team 04 QA ACCEPT.
- `CF-W1-SMI-01` no longer belongs in the next unassigned pull because it is already in active Team 04 QA-planning flow.
- `CF-W1-RH-01` no longer belongs in the next unassigned pull because it is already in active Team 03 architecture readiness.
- `CF-W1-L3-TREV-02` no longer belongs in the next unassigned pull because it is already queued as the next architecture candidate after `CF-W1-RH-01`.
- `CF-W1-MCTX-01` dropped out of the unassigned stack because `12-ready-queue/ready-for-implementation.md` now shows it promoted on 2026-05-18 and assigned to Team 05.
- `CF-W1-STRAT-02` was too broad for the next pull because Team 03 already marked the parent blocked after accepted `CF-W1-STRAT-02A`; Team 02 therefore opened the bounded durable-history child `CF-W1-STRAT-02B`.
- `CF-W1-RH-02A` and `CF-W1-MD-03` dropped out of the immediate unassigned pull because the latest Team 02 assignment exclusions place `RH-02A` in active Team 03 architecture prep and `MD-03` in active Team 03/QA follow-up.
- `CF-W1-MD-03` remains high value, but it is no longer an unassigned pull under the current exclusion list.
- `CF-W1-UX-01` stays in the upper half because it is a direct research surface, but it still trails upstream trust-evidence packets.
- Lane 3 convenience items remain behind signal/strategy/market-data/trade-plan evidence work unless correctness, privacy, or user-data safety demands earlier action.

## Why Lower-Value Items Stay Lower

- `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, `CF-W1-SUB-01`, and similar platform items remain low unless they block correctness, privacy, or user-data safety.
- `CF-W1-UX-02` and `CF-W1-UX-05` remain valid but are narrower Copilot-first trust/copy items and are less direct investor value than current signal, strategy, trade-plan, and market-data evidence gaps.
- `CF-W1-L3-AUTH-03` remains a correctness/safety item, not a market-intelligence priority item, unless alert ownership blocks active investor-value work.

## Next 3 Candidates Team 00 Should Evaluate

1. `CF-W1-STRAT-02B`
2. `CF-W1-BT-01A`
3. `CF-W1-SQLAB-02`

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged for already-active branches. For the next new docs-only pull after excluding active, queued, accepted, parked, and blocked items, route `CF-W1-STRAT-02B` to Team 03 for the approval-gated durable-history architecture packet. Keep `CF-W1-BT-01A` and `CF-W1-SQLAB-02` immediately behind it, with `CF-W1-MD-03` still visible but now in active Team 03/QA follow-up and `CF-W1-MD-02A` still queued behind it. Do not let admin/settings/auth/subscription/notifications or alert-convenience work preempt this stack unless a correctness, privacy, or user-data-safety blocker appears.
