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
- Team 06 currently owns active implementation for `CF-W1-SIG-TRIGGER-02A`, so backlog ranking must distinguish direct user value from same-module dispatch safety.

## Active Investor-Value Work Kept Visible

These items stay visible because they are already in active branch, review, or accepted-branch-gate flow. They are not part of the unassigned top-10 ranking below.

| ID | Current state from current queue/docs | Why it stays visible |
| --- | --- | --- |
| `CF-W1-SIG-TRIGGER-02A` | Ready-promoted and actively implemented by Team 06 in a separate worktree | Direct signal auditability value is active already; do not route same-module follow-on prep that depends on its implementation outcome. |
| `CF-W1-SQLAB-01` | Accepted on branch and parked for later clean integration | Direct signal-quality trust-state value is already out of discovery. |
| `CF-W1-BT-02` | Accepted on branch and parked for later clean integration | Direct backtesting reviewability value is already out of discovery. |
| `CF-W1-CAL-01` | Accepted on branch and parked for later clean integration | Direct calibration trust-state value is already out of discovery. |
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
- `CF-W1-SIG-TRIGGER-02A`
- `CF-W1-STRAT-02A`
- `CF-W1-TP-01B`
- `CF-W1-UX-01A`
- `CF-W1-AUTH-SUB-01`

## Re-Prioritized Top 10

| Rank | ID | User value | Acceptance criteria focus | Non-goals | Likely owner team | Expected architecture / QA gate | Likely file ownership risk | Dependencies | Parallel with `CF-W1-SIG-TRIGGER-02A`? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `CF-W1-SQLAB-02` | Creates durable post-event learning so outcome review is not ephemeral. | Durable journal semantics, explicit evaluated vs unevaluable states, additive outcome-learning record, focused create/update/missing-data tests. | No signal scoring rewrite, no backtest rewrite, no alerting or execution behavior. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Bounded child split after `CF-W1-SQLAB-02A`; docs-only contract and QA plan can proceed now. | Medium: module-local backend/frontend/test files, but storage path may escalate later. | `CF-W1-SQLAB-02A` learning-preview child must stay separate; no schema jump in the first prep pass. | `Yes` for docs-only prep. Different module from active Signal Generation work. |
| 2 | `CF-W1-STRAT-02` | Makes strategy provenance and DQ gate policy explicit before more signals, backtests, and trade plans rely on strategy trust. | Stable strategy version plus durable rule revision marker, explicit DQ gate policy, blocked vs limited trust exposure, focused proof-state tests. | No strategy math rewrite, no signal math rewrite, no backtest realism rewrite. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Bounded Strategy Framework contract and QA packet; stop if schema uniqueness is required. | Medium: strategy-framework backend/frontend/test files; possible later shared contract pressure. | Must preserve existing strategy behavior; may need later schema decision if rule revision persistence is not additive. | `Yes` for docs-only prep. No active Team 06 write overlap with `signal-generation-engine`. |
| 3 | `CF-W1-TP-02` | Replaces target-like trade-plan interpretation with explicit exit and invalidation research semantics. | Exit-condition language, invalidation rule/version evidence, capped/validated reward-risk inputs, rejection of unsupported target-like output. | No broad route/UI/schema migration, no Today Review or Backtesting redesign in the same pass. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Split broader semantics child cleanly away from committed `CF-W1-TP-01B` compatibility slice. | Medium: trade-plan-risk-engine backend/types/tests, with possible later frontend/API touch if scope widens. | Must remain separate from `CF-W1-TP-01B`; depends on earlier no-target policy direction already resolved. | `Yes` for docs-only prep. Same lane as Team 06, but different module and no active worktree file overlap. |
| 4 | `CF-W1-MD-02` | Defines the durable upstream market-data evidence needed before downstream trust claims become contract-grade. | ADR covers natural key, provenance fields, DQE handoff, migration/rollback/query/test strategy, and durable vs derived evidence boundary. | No source, Prisma, migration, provider, startup, scheduler, or UI implementation in this phase. | Team 03 architecture prep with Team 04 ADR QA checklist; later Team 05 implementation only after approval. | ADR-only architecture packet plus QA checklist; no Ready promotion from this docs pass. | High: future schema, generated types, repository/service contracts, and DQ handoff. | ADR direction accepted; implementation remains blocked until separate approval. | `Yes` for docs-only prep. No Team 06 file dependency. |
| 5 | `CF-W1-UX-01` | Turns Stock Research Workbench into a more trustworthy research cockpit by proving scope, blocker reasons, trusted date, and downstream eligibility. | Additive trust fields, trusted/limited/blocked explanation, explicit scope refetch expectations, later focused backend/frontend/UI tests. | No shared UI, shared navigation, Prisma, provider, or widget logic rewrite in the first child. | Team 03 + Team 08 prep, Team 04 QA prep, later Team 08 implementation. | Backend trust-evidence child after `CF-W1-UX-01A`; stop if shared UI or widget internals are required. | Medium: stock-research-workbench backend/frontend/UI smoke coverage. | Depends on accepted `CF-W1-UX-01A` framing child and public upstream trust outputs. | `Yes` for docs-only prep. No active Team 06 overlap. |
| 6 | `CF-W1-SIG-TRIGGER-02` | Closes remaining trigger auditability gaps for direct signal review evidence. | Bounded persisted or owned trigger evidence for trigger price/timestamp/status/rule provenance, explicit incomplete-field signaling, additive read compatibility tests. | No downstream consumer rewrite, no normalized trigger table, no schema jump without separate split. | Team 03 prep, Team 04 QA prep, later Team 06 implementation. | Must wait for current `CF-W1-SIG-TRIGGER-02A` implementation outcome before the next same-module child is routed. | Medium-high: same module as active Team 06 work, with repository/type/test overlap risk. | Active `CF-W1-SIG-TRIGGER-02A` branch outcome; any schema need forces another split. | `No` for immediate dispatch. Same module as Team 06 active implementation. |
| 7 | `CF-W1-L3-INTEL-03` | Gives portfolio users explainable concentration review once upstream trust layers are stronger. | Explainable concentration findings, review-first language, deterministic reason summaries, focused bounded tests. | No optimizer, no rebalance advice, no alerting expansion. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract after upstream trust stack stabilizes further. | Medium: portfolio-intelligence frontend/backend/test surfaces. | Better after stronger strategy/market-data/trade-plan trust evidence. | `Yes`. No Team 06 dependency. |
| 8 | `CF-W1-L3-WATCH-01` | Helps triage watchlist ideas with deterministic review priority and reason summaries. | Explainable priority semantics, deterministic ranking reasons, safe empty states, focused tests. | No alerts convenience expansion, no provider changes, no speculative scoring engine. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract and QA plan only. | Medium: watchlist-management and related frontend/test files. | Should stay behind upstream evidence items. | `Yes`. No Team 06 dependency. |
| 9 | `CF-W1-L3-INTEL-02` | Improves portfolio review traceability once higher-value trust layers are in place. | Review-output explainability, traceable reason evidence, safe trust framing, focused tests. | No advisor-like recommendations, no wide portfolio workflow rewrite. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Lane 3 bounded contract and QA plan. | Medium: portfolio-intelligence surfaces. | Better after concentration and upstream trust packets. | `Yes`. No Team 06 dependency. |
| 10 | `CF-W1-L3-ALERT-03` | Adds post-trigger follow-through traceability after core evidence quality is stronger. | Outcome traceability, review-note semantics, additive alert history behavior, focused tests. | No scheduler/convenience scope, no notification-channel work. | Team 03 prep, Team 04 QA prep, later Team 07 implementation. | Must stay behind active alert ownership/readiness work and current upstream trust stack. | Medium-high: alerts-monitoring overlap risk if active alert writers reopen. | Active/nearby alert work and lower Product Owner priority for convenience surfaces. | `Yes`, but lower priority than upstream investor-value items. |

## Top Parallel-Ready Prep Candidates

These are the clearest next docs-only candidates Team 00 can route to Team 03 and Team 04 without waiting for Team 06 implementation files from `CF-W1-SIG-TRIGGER-02A`:

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-TP-02`
4. `CF-W1-MD-02`
5. `CF-W1-UX-01`

## Why This Ranking Changed

- `CF-W1-SIG-TRIGGER-02A` is now explicitly treated as active implementation work, so same-module follow-on prep cannot be presented as immediately parallel-safe.
- `CF-W1-TP-02` moved ahead of `CF-W1-MD-02` and `CF-W1-SIG-TRIGGER-02` because it is both direct investor/trader value and cleaner to prep in parallel right now.
- `CF-W1-MD-02` stays near the top because it is upstream and high value, but it remains ADR-only and therefore less dispatchable than the first three items.
- `CF-W1-UX-01` stays in the upper half because it is a direct research surface, but it still trails upstream trust-evidence packets.
- Lane 3 convenience items remain behind signal/strategy/market-data/trade-plan evidence work unless correctness, privacy, or user-data safety demands earlier action.

## Why Lower-Value Items Stay Lower

- `CF-W1-NOTIF-02`, `CF-W1-AUTH-01`, `CF-W1-SUB-01`, and similar platform items remain low unless they block correctness, privacy, or user-data safety.
- `CF-W1-UX-02` and `CF-W1-UX-05` remain valid but are narrower Copilot-first trust/copy items and are less direct investor value than current signal, strategy, trade-plan, and market-data evidence gaps.
- `CF-W1-L3-AUTH-03` remains a correctness/safety item, not a market-intelligence priority item, unless alert ownership blocks active investor-value work.

## Next 3 Candidates Team 00 Should Evaluate

1. `CF-W1-SQLAB-02`
2. `CF-W1-STRAT-02`
3. `CF-W1-TP-02`

## Team 02 Recommendation

Keep Team 00's live Ready / review routing unchanged for already-active branches. For the next docs-only prep pull, route `CF-W1-SQLAB-02`, `CF-W1-STRAT-02`, and `CF-W1-TP-02` first, with `CF-W1-MD-02` as the parallel ADR packet and `CF-W1-UX-01` as the next frontend-facing trust child. Keep `CF-W1-SIG-TRIGGER-02` visible as a high-value follow-on, but do not dispatch it until Team 06 finishes the active `CF-W1-SIG-TRIGGER-02A` slice and Team 00 can verify the next same-module reservation. Do not let admin/settings/auth/subscription/notifications or alert-convenience work preempt this stack unless a correctness, privacy, or user-data-safety blocker appears.
